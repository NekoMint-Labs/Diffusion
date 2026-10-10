import { t } from '../shared/i18n.ts';
import { id, type InputRange, type Point, type ThinkingActivityKind, type ThinkingOperation, type ThinkingOperationKind } from '../core/model.ts';
import { permissionFor, type ContextPacket, type SemanticIntent, type UserIntent } from '../core/semantics.ts';
import type { ProjectController } from '../core/controller.ts';
import { compileContext, rebuildCapsule, type CompileOptions } from './context.ts';
import { abortableDelay, type AIProvider } from './contracts.ts';
import { ThinkingError, failureText, type ThinkingFailure } from './errors.ts';
import type { Bounds } from '../field/spatial/geometry.ts';
import { placePossibility } from '../field/spatial/placement.ts';
import { SuggestionHistory, repeatedWording } from './diversity.ts';
import { intentAllowedForAction, relationWordingAllowed, semanticQualityAllowed } from './prompt.ts';
import { omitRepeatedRelations } from './relationQuality.ts';
export { intentAllowedForAction, semanticQualityAllowed } from './prompt.ts';
import { registerOperationCancellation } from './operationControl.ts';

const REQUEST_TIMEOUT_MS = 45000;

/** Names the model that answered alongside the provider, without inventing one the provider never
 * reported. A substitution is disclosed here rather than left for someone to discover. */
export function credited(label: string, model?: { requested: string; effective: string | null }): string {
    if (!model || !model.requested) return label;
    if (!model.effective) return `${label} - ${model.requested}`;
    return model.effective === model.requested ? `${label} - ${model.requested}` : `${label} - ${model.requested} (provider ran ${model.effective})`;
}

export interface RuntimeHooks {
    /** Compatibility projection for controls that only need disabled/enabled. The operation below is
     * the source of truth; this boolean must never be used to identify a request. */
    pending: (busy: boolean) => void;
    operation?: (operation: ThinkingOperation) => void;
    notice: (text: string) => void;
    /** A provider failure, already attributed to the product's bounded failure vocabulary. */
    failure?: (failure: ThinkingFailure, subject: string) => void;
    route: (kind: 'thread' | 'deep' | 'crystal', text: string, scopeIds: string[], provider: string) => void;
    anchor: () => Point;
    visibleIds?: () => ReadonlySet<string> | undefined;
    bounds?: () => Bounds;
    measurements?: () => Readonly<Record<string, Bounds>>;
}
export interface RunOptions extends CompileOptions {
    runId?: string;
    signal?: AbortSignal;
    onEmission?: (id: string) => void;
    /** Exploration-local exclusion only; never expands ContextPacket or canonical scope. */
    excludeTexts?: readonly string[];
    /** Presentation meaning only; provider semantics stay in UserIntent. */
    activity?: ThinkingActivityKind;
}
export type IngestionEvent =
    | { type: 'started'; requestId: string; inputId: string }
    | { type: 'unit'; requestId: string; inputId: string; ghostId: string; ranges: InputRange[] }
    | { type: 'completed'; requestId: string; inputId: string; proposalIds: string[] }
    | { type: 'failed' | 'cancelled'; requestId: string; inputId: string };
export interface IngestOptions {
    signal?: AbortSignal;
    anchor?: Point;
    /** Submission-edge timestamp used only for development performance instrumentation. */
    submittedAt?: number;
    onStart?: (requestId: string) => void;
    onEvent?: (event: IngestionEvent) => void;
}
export interface RunResult {
    status: 'completed' | 'cancelled' | 'failed';
    emitted: number;
    reason?: string;
}
export interface IngestionRunResult extends RunResult {
    inputId: string;
    proposalIds: string[];
    /** One grounded thought means the caller can commit the original wording directly. */
    single: boolean;
}

function operationKind(kind: UserIntent['kind']): ThinkingOperationKind {
    if (kind === 'probe' || kind === 'diffuse' || kind === 'continue' || kind === 'angle' || kind === 'question' || kind === 'organize') return kind;
    return 'ask';
}

/** One response per invocation. Only DiffuseSession can schedule bounded subsequent calls. */
export class AIRuntime {
    private controller: ProjectController;
    private provider: () => Promise<AIProvider>;
    private hooks: RuntimeHooks;
    private active: AbortController | null = null;
    private serial = 0;
    private suggestions = new SuggestionHistory();
    requestCount = 0;
    constructor(controller: ProjectController, provider: () => Promise<AIProvider>, hooks: RuntimeHooks) { this.controller = controller; this.provider = provider; this.hooks = hooks; }
    cancel() { this.active?.abort(); }
    dispose() { this.serial++; this.active?.abort(); this.active = null; this.suggestions.clear(); }

    private begin(kind: ThinkingOperationKind, scopeIds: string[], parent?: AbortSignal, activity?: ThinkingActivityKind) {
        this.cancel();
        const ticket = ++this.serial;
        const abort = new AbortController();
        this.active = abort;
        const requestId = id('request');
        const abortParent = () => abort.abort();
        parent?.addEventListener('abort', abortParent, { once: true });
        if (parent?.aborted) abort.abort();
        const timeout = setTimeout(() => abort.abort('timeout'), REQUEST_TIMEOUT_MS);
        const operation: ThinkingOperation = { id: requestId, kind, phase: 'pending', scopeIds: [...scopeIds], activity };
        const unregisterCancel = registerOperationCancellation(requestId, () => abort.abort());
        this.hooks.operation?.(operation);
        this.hooks.pending(true);
        return { ticket, abort, requestId, abortParent, timeout, parent, operation, unregisterCancel };
    }
    private settle(started: ReturnType<AIRuntime['begin']>, phase: ThinkingOperation['phase'], resultCount?: number) {
        if (started.ticket !== this.serial) return;
        this.active = null;
        this.hooks.operation?.({ ...started.operation, phase, ...(resultCount === undefined ? {} : { resultCount }) });
        this.hooks.pending(false);
    }
    private cleanup(started: ReturnType<AIRuntime['begin']>) {
        clearTimeout(started.timeout);
        started.unregisterCancel();
        started.parent?.removeEventListener('abort', started.abortParent);
    }

    /** Structured ingestion is one narrow decomposition request in the normal case. The authored
     * InputRecord/Seed already exists before this starts; real grounded units become Ghosts as the
     * result is revealed. Relation discovery is a separate explicit intent. */
    async ingest(text: string, inputId: string, options: IngestOptions = {}): Promise<IngestionRunResult> {
        const started = this.begin('ingest', [], options.signal, 'unfold');
        options.onStart?.(started.requestId);
        options.onEvent?.({ type: 'started', requestId: started.requestId, inputId });
        const began = performance.now();
        let subject = 'The provider';
        const proposalIds: string[] = [];
        this.hooks.notice(t('Structuring this thought...'));
        try {
            if (started.abort.signal.aborted) {
                this.settle(started, 'cancelled');
                options.onEvent?.({ type: 'cancelled', requestId: started.requestId, inputId });
                return { status: 'cancelled', emitted: 0, inputId, proposalIds, single: false };
            }
            const provider = await this.provider();
            subject = provider.label;
            const { extractThoughts } = await import('./ingestion.ts');
            // Count the primary attempt before awaiting it so a failed request is still a request.
            this.requestCount++;
            const extraction = await extractThoughts(provider, text, inputId, started.abort.signal);
            this.requestCount += Math.max(0, extraction.requests - 1);
            const semanticAt = performance.now();
            if (started.abort.signal.aborted || started.ticket !== this.serial) {
                if (started.ticket === this.serial && started.abort.signal.reason === 'timeout') throw new ThinkingError('timeout', subject);
                if (started.ticket === this.serial) this.settle(started, 'cancelled');
                options.onEvent?.({ type: 'cancelled', requestId: started.requestId, inputId });
                return { status: 'cancelled', emitted: 0, inputId, proposalIds, single: false };
            }
            if (extraction.units.length <= 1) {
                this.hooks.notice(t(extraction.mock ? 'Demo structure checked. The original remains one thought.' : 'This reads as one thought.'));
                this.settle(started, 'completed', 0);
                options.onEvent?.({ type: 'completed', requestId: started.requestId, inputId, proposalIds });
                if (import.meta.env?.MODE === 'development') console.debug('[diffusion] ingestion', { enterToSemanticMs: options.submittedAt === undefined ? undefined : Math.round(semanticAt - options.submittedAt), requestToDoneMs: Math.round(performance.now() - began), modelRequests: extraction.requests, promptCharacters: extraction.promptCharacters, outputCharacters: extraction.outputCharacters, rechecked: extraction.rechecked });
                return { status: 'completed', emitted: 0, inputId, proposalIds, single: true };
            }
            const anchor = options.anchor ?? this.hooks.anchor();
            for (let index = 0; index < extraction.units.length; index++) {
                if (started.abort.signal.aborted || started.ticket !== this.serial) {
                    if (started.ticket === this.serial && started.abort.signal.reason === 'timeout') throw new ThinkingError('timeout', subject);
                    if (started.ticket === this.serial) this.settle(started, 'cancelled');
                    options.onEvent?.({ type: 'cancelled', requestId: started.requestId, inputId });
                    return { status: 'cancelled', emitted: proposalIds.length, inputId, proposalIds, single: false };
                }
                const unit = extraction.units[index];
                const key = id('ghost');
                const snapshot = this.controller.getSnapshot();
                const point = placePossibility(snapshot.project, snapshot.session, anchor, index, [], this.hooks.bounds?.(), unit.text, 'default', this.hooks.visibleIds?.(), this.hooks.measurements?.());
                const providerCredit = extraction.providerLabel || provider.label;
                this.controller.addGhost({
                    id: key, text: unit.text, ...point, createdAt: Date.now(), scopeIds: [],
                    origin: { projectId: snapshot.project.id, inputId, ranges: unit.sourceRanges, note: `Structured from original input / ${providerCredit}` },
                    proposal: true, runId: started.requestId,
                });
                proposalIds.push(key);
                options.onEvent?.({ type: 'unit', requestId: started.requestId, inputId, ghostId: key, ranges: unit.sourceRanges });
                if (index < extraction.units.length - 1) await abortableDelay(90, started.abort.signal);
            }
            this.hooks.notice(t(extraction.dropped ? 'Structure proposed. Invalid unsupported pieces were left out.' : 'Structure proposed. Keep, edit, or leave each part.'));
            if (import.meta.env?.MODE === 'development') console.debug('[diffusion] ingestion', { enterToSemanticMs: options.submittedAt === undefined ? undefined : Math.round(semanticAt - options.submittedAt), requestToDoneMs: Math.round(performance.now() - began), modelRequests: extraction.requests, promptCharacters: extraction.promptCharacters, outputCharacters: extraction.outputCharacters, rechecked: extraction.rechecked });
            this.settle(started, 'completed', proposalIds.length);
            options.onEvent?.({ type: 'completed', requestId: started.requestId, inputId, proposalIds: [...proposalIds] });
            return { status: 'completed', emitted: proposalIds.length, inputId, proposalIds, single: false };
        }
        catch (error) {
            // The deadline uses the same AbortController as Stop, but it is a provider failure,
            // not a user cancellation. Keep the distinction all the way to the operation state so
            // a slow or unavailable model cannot leave the Field saying only “Stopped”.
            if (started.ticket === this.serial && started.abort.signal.reason === 'timeout') {
                const timeoutText = failureText('timeout', subject);
                if (this.hooks.failure) this.hooks.failure('timeout', subject);
                else this.hooks.notice(timeoutText);
                this.settle(started, 'failed');
                options.onEvent?.({ type: 'failed', requestId: started.requestId, inputId });
                return { status: 'failed', emitted: proposalIds.length, inputId, proposalIds, single: false, reason: timeoutText };
            }
            if ((error instanceof DOMException && error.name === 'AbortError') || started.abort.signal.aborted) {
                if (started.ticket === this.serial) this.hooks.notice(t('Structuring stopped. The original input is still saved.'));
                this.settle(started, 'cancelled');
                options.onEvent?.({ type: 'cancelled', requestId: started.requestId, inputId });
                return { status: 'cancelled', emitted: proposalIds.length, inputId, proposalIds, single: false };
            }
            const reason = error instanceof Error ? error.message : String(error);
            if (error instanceof ThinkingError && this.hooks.failure) this.hooks.failure(error.failure, subject);
            else this.hooks.notice(t('The structure could not be verified. The original input is still saved.'));
            this.settle(started, 'failed');
            options.onEvent?.({ type: 'failed', requestId: started.requestId, inputId });
            return { status: 'failed', emitted: proposalIds.length, inputId, proposalIds, single: false, reason: error instanceof ThinkingError ? failureText(error.failure, subject) : reason };
        }
        finally { this.cleanup(started); }
    }

    async run(kind: UserIntent['kind'], text: string, selection: string[], options: RunOptions = {}): Promise<RunResult> {
        const started = this.begin(operationKind(kind), selection, options.signal, options.activity ?? (kind === 'probe' || kind === 'organize' ? 'bridge' : kind === 'diffuse' || kind === 'angle' || kind === 'question' ? 'radiate' : kind === 'continue' ? 'unfold' : undefined));
        let emitted = 0;
        let relationLabel = '';
        if (kind === 'probe') this.hooks.notice(t('Finding a relation...'));
        let subject = 'The provider';
        try {
            if (started.abort.signal.aborted) {
                this.settle(started, 'cancelled');
                return { status: 'cancelled', emitted };
            }
            const packet = compileContext(this.controller.getSnapshot().project, selection, { ...options, allowScopedSources: ['diffuse', 'angle', 'continue', 'question'].includes(kind) ? !!options.projectSources : undefined, query: kind === 'ask' ? text : undefined });
            const provider = await this.provider();
            subject = provider.label;
            if (started.abort.signal.aborted || started.ticket !== this.serial) {
                if (started.ticket === this.serial && started.abort.signal.reason === 'timeout') throw new ThinkingError('timeout', subject);
                if (started.ticket === this.serial) this.settle(started, 'cancelled');
                return { status: 'cancelled', emitted };
            }
            this.requestCount++;
            for (const source of packet.retrieved.sources) {
                const record = this.controller.getSnapshot().project.sources[source.id];
                if (record) this.controller.dispatch({ type: 'source.update', source: { ...record, lastSubmitted: { at: Date.now(), provider: provider.label, characters: source.excerpt.length, requestId: started.requestId } } }, 'system');
            }
            const trackSuggestions = (kind === 'continue' || kind === 'angle' || kind === 'question') && !options.threadId;
            const previousSuggestions = trackSuggestions ? this.suggestions.forContext(packet) : [];
            // Question is the generated-question action; the user's own Ask and frozen Threads
            // retain their authored prompt. A batch prefers previously unattempted unknown types.
            const questionFocus = kind === 'question' && trackSuggestions ? this.suggestions.nextQuestionFocus(packet.maxCandidates, 12000 - text.length - 2) : '';
            const focusedText = questionFocus ? `${text}\n\n${questionFocus}` : text;
            const response = await provider.respond(packet, { kind, text: focusedText, requestId: started.requestId }, started.abort.signal);
            if (started.abort.signal.aborted || started.ticket !== this.serial) {
                if (started.ticket === this.serial && started.abort.signal.reason === 'timeout') throw new ThinkingError('timeout', subject);
                if (started.ticket === this.serial) this.settle(started, 'cancelled');
                return { status: 'cancelled', emitted };
            }
            const provenance = credited(response.providerLabel || provider.label, response.model);
            const validScope = () => { const project = this.controller.getSnapshot().project; return project.id === packet.projectId && packet.scope.every(item => (options.threadId ? (project.threads[options.threadId]?.scopeSnapshot?.[item.id] ?? project.thoughts[item.id]) : project.thoughts[item.id])?.text.slice(0, 1600) === item.text); };
            const validContinuation = () => {
                const project = this.controller.getSnapshot().project;
                return (packet.continuations ?? []).every(link => link.sourceIds.every(key => {
                    const supplied = packet.scope.find(item => item.id === key) ?? packet.local.find(item => item.id === key);
                    return project.thoughts[link.thoughtId]?.derivedFrom?.includes(key) && supplied && project.thoughts[key]?.text.slice(0, 1600) === supplied.text;
                }));
            };
            if (!validScope() || !validContinuation()) throw new Error(t('The scope changed while thinking. Ask again with its new wording.'));
            const surfacedWording: string[] = [];
            const currentState = this.controller.getSnapshot();
            // Avoid echoes only against context actually supplied to this request, plus pending
            // proposals attached to this scope. Unrelated canvas content is not duplicate evidence.
            const scopeIds = new Set(packet.scope.map(item => item.id));
            const existingWording = [
                ...previousSuggestions,
                ...(options.excludeTexts ?? []),
                ...packet.scope.map(item => item.text),
                ...packet.local.map(item => item.text),
                ...packet.retrieved.thoughts.map(item => item.text),
                ...Object.values(currentState.session.ghosts)
                    .filter(ghost => ghost.scopeIds.some(scopeId => scopeIds.has(scopeId)))
                    .map(ghost => ghost.text),
            ];
            const seenRelations = new Set<string>();
            const accepted = response.intents.slice(0, packet.maxCandidates)
                .filter(candidate => intentAllowedForAction(kind, candidate.type))
                .filter(candidate => permissionFor(candidate, packet, this.controller.getSnapshot().project).allowed)
                .map(candidate => omitRepeatedRelations(candidate, currentState.project, currentState.session, relationWordingAllowed, seenRelations))
                .filter((candidate): candidate is SemanticIntent => candidate !== null)
                .filter(candidate => semanticQualityAllowed(kind, candidate))
                .filter(candidate => !options.runId || ['surface_possibility', 'surface_question', 'surface_relation', 'surface_structure', 'respond_in_field', 'surface_evidence', 'request_recall'].includes(candidate.type))
                .filter(candidate => {
                    const wordingIsProposal = (kind === 'continue' || kind === 'angle' || kind === 'diffuse') && candidate.type === 'surface_possibility'
                        || kind === 'question' && candidate.type === 'surface_question';
                    if (!wordingIsProposal) return true;
                    const previous = [...existingWording, ...surfacedWording];
                    if (repeatedWording(candidate.text, previous)) return false;
                    surfacedWording.push(candidate.text);
                    return true;
                });
            if (options.threadId) {
                const body = accepted.map(candidate => 'text' in candidate ? candidate.text : candidate.type === 'surface_relation' ? `${candidate.kind}: ${candidate.label}` : '').filter(Boolean).join('\n\n');
                if (body) {
                    this.controller.dispatch({ type: 'thread.message', id: options.threadId, message: { id: id('message'), role: 'assistant', text: body, at: Date.now(), provider: provenance } }, 'system');

                    emitted++;
                    const thread = this.controller.getSnapshot().project.threads[options.threadId];
                    if (thread) this.controller.dispatch({ type: 'thread.capsule', id: thread.id, capsule: rebuildCapsule(thread, this.controller.getSnapshot().project) }, 'system');
                }
            }
            else {
                for (let index = 0; index < accepted.length; index++) {
                    if (started.abort.signal.aborted || started.ticket !== this.serial) {
                        if (started.ticket === this.serial && started.abort.signal.reason === 'timeout') throw new ThinkingError('timeout', subject);
                        if (started.ticket === this.serial) this.settle(started, 'cancelled');
                        return { status: 'cancelled', emitted };
                    }
                    if (!validScope() || !validContinuation()) throw new Error(t('The scope changed during reveal. Remaining possibilities were discarded.'));
                    const candidate = accepted[index];
                    this.emit(candidate, packet, provenance, options, kind, index);
                    if (candidate.type === 'surface_relation') relationLabel = candidate.label;
                    if (trackSuggestions && (candidate.type === 'surface_possibility' || candidate.type === 'surface_question')) this.suggestions.remember(candidate.text);
                    emitted++;
                    if (index < accepted.length - 1) await abortableDelay(220, started.abort.signal);
                }
            }
            if (kind === 'probe') this.hooks.notice(emitted && relationLabel ? t('Found a candidate relation: {label}. You decide whether to keep it.', { label: relationLabel }) : t(emitted ? 'A relation candidate is ready. Nothing was confirmed.' : 'No clear relation found.'));
            else if (!emitted) this.hooks.notice(t('No new suggestion was surfaced this time.'));
            else if (kind === 'question') this.hooks.notice(t(response.mock ? 'Demo questions / no live model was used.' : 'Questions returned. Nothing was committed.'));
            else if (kind === 'organize') this.hooks.notice(t(response.mock ? 'Demo structure / no live model was used.' : 'A structure proposal is ready. Nothing was changed yet.'));
            else this.hooks.notice(t(response.mock ? 'Demo possibilities / no live model was used.' : 'Possibilities returned. No commitment was made on your behalf.'));
            this.settle(started, 'completed', emitted);
            return { status: 'completed', emitted };
        }
        catch (error) {
            // The deadline uses the same AbortController as Stop, but it is a provider failure,
            // not a user cancellation. Keep the distinction all the way to the operation state so
            // a slow or unavailable model cannot leave the Field saying only “Stopped”.
            if (started.ticket === this.serial && started.abort.signal.reason === 'timeout') {
                const timeoutText = failureText('timeout', subject);
                if (this.hooks.failure) this.hooks.failure('timeout', subject);
                else this.hooks.notice(timeoutText);
                this.settle(started, 'failed');
                return { status: 'failed', emitted, reason: timeoutText };
            }
            if ((error instanceof DOMException && error.name === 'AbortError') || started.abort.signal.aborted) {
                if (started.ticket === this.serial) this.hooks.notice(t('Thinking stopped. Only already surfaced possibilities remain.'));
                this.settle(started, 'cancelled');
                return { status: 'cancelled', emitted };
            }
            const reason = error instanceof Error ? error.message : String(error);
            if (error instanceof ThinkingError && this.hooks.failure) {
                this.hooks.failure(error.failure, subject);
                this.settle(started, 'failed');
                return { status: 'failed', emitted, reason: failureText(error.failure, subject) };
            }
            this.hooks.notice(reason);
            this.settle(started, 'failed');
            return { status: 'failed', emitted, reason };
        }
        finally { this.cleanup(started); }
    }

    private emit(candidate: SemanticIntent, packet: ContextPacket, provider: string, options: RunOptions, action: UserIntent['kind'], index: number) {
        const { project, session } = this.controller.getSnapshot();
        const scopeIds = packet.scope.map(item => item.id);
        const source = 'sourceId' in candidate ? packet.retrieved.sources.find(item => item.id === candidate.sourceId) : undefined;
        const provenance = { projectId: project.id, sourceId: source && project.sources[source.id] ? source.id : undefined, url: source?.url, note: provider + (source ? ` / Submitted context: ${source.inspected}` : '') };
        switch (candidate.type) {
            case 'respond_in_field':
            case 'surface_possibility':
            case 'surface_evidence': {
                const key = id('ghost');
                const text = candidate.type === 'surface_evidence' ? `${candidate.outcome}: ${candidate.text}` : candidate.text;
                const proposalAction = action === 'continue' || action === 'angle' ? action : undefined;
                const mode = candidate.type === 'surface_evidence' ? 'evidence' : action === 'continue' ? 'continue' : action === 'angle' ? 'branch' : 'default';
                const point = placePossibility(project, session, this.hooks.anchor(), index, scopeIds, this.hooks.bounds?.(), text, mode, this.hooks.visibleIds?.(), this.hooks.measurements?.());
                this.controller.addGhost({ id: key, text, ...point, createdAt: Date.now(), scopeIds, runId: options.runId, origin: provenance, proposalKind: 'thought' as const, ...(proposalAction ? { proposalAction } : {}) });
                options.onEmission?.(key);
                break;
            }
            case 'surface_question': {
                const key = id('ghost');
                const point = placePossibility(project, session, this.hooks.anchor(), index, scopeIds, this.hooks.bounds?.(), candidate.text, 'question', this.hooks.visibleIds?.(), this.hooks.measurements?.());
                this.controller.addGhost({ id: key, text: candidate.text, ...point, createdAt: Date.now(), scopeIds, runId: options.runId, origin: provenance, proposalKind: 'question', proposalAction: 'question' });
                options.onEmission?.(key);
                break;
            }
            case 'surface_relation': {
                const key = id('phenomenon');
                this.controller.addPhenomenon({ id: key, a: candidate.a, b: candidate.b, kind: candidate.kind, label: candidate.label, explanation: candidate.explanation, runId: options.runId, provenance });
                options.onEmission?.(key);
                break;
            }
            case 'surface_structure': {
                const structureId = id('structure');
                const relationIds: string[] = [];
                for (const relation of candidate.relations) {
                    const relationId = id('phenomenon');
                    this.controller.addPhenomenon({ ...relation, id: relationId, runId: options.runId, structureId, provenance });
                    relationIds.push(relationId);
                }
                this.controller.addStructureProposal({ id: structureId, scopeIds, groups: candidate.groups, note: candidate.note, relationIds, createdAt: Date.now(), runId: options.runId });
                options.onEmission?.(structureId);
                break;
            }
            case 'request_recall': this.controller.recall([candidate.thoughtId]); break;
            case 'request_thread': this.hooks.route('thread', candidate.text, scopeIds, provider); break;
            case 'request_deep_dive': this.hooks.route('deep', candidate.text, scopeIds, provider); break;
            case 'request_crystal_preview': this.hooks.route('crystal', candidate.text, scopeIds, provider); break;
        }
    }
}
