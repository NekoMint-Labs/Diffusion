import { useRef, useState } from 'react';
import { t } from '../../shared/i18n.ts';
import { compileContext } from '../../ai/context.ts';
import type { AIRuntime } from '../../ai/runtime.ts';
import type { SourceImporter } from '../../evidence/importer.ts';
import { id, makeThought, type EvidenceCandidate, type Point, type Thread } from '../../core/model.ts';
import { continuedThought } from '../../core/world.ts';
import type { ProjectController } from '../../core/controller.ts';
import type { FieldHandle } from '../../field/Field.tsx';
import type { ResultPlacementMode } from '../../field/spatial/placement.ts';
import { useUI, type Surface as SurfaceName } from '../store.ts';
import type { CrystalDraft } from '../surfaces/CrystalPreview.tsx';
import type { Settings } from '../settings.ts';
import { aiOffNotice, deviceFailureNotice, notice } from './notice.ts';
import { useFirstThoughtEmergence } from '../motion/signature.ts';
import { presentMaterialSettle, presentSpatialTransition } from '../motion/spatialGrammar.ts';
import { sendThreadMessage } from '../thread/threadFlow.ts';

/** Every deliberate way a person's intent becomes thinking.
 *
 * The temporary writing surface, a Thread over a scope, a Crystal preview, continuing from a
 * Crystal, and a reference brought back to the Field. What they share is the boundary: words
 * and a scope become a request or a commitment, and nothing here commits a Crystal, confirms a
 * relation or claims a possibility on the user's behalf — those stay explicit.
 */
export function useThinkingIntents({ controller, field, speak, surfaces, freePoint, observe, runtime, importer, settingsRef, stopDiffuseForIntent, closeMenu }: {
    controller: ProjectController;
    field: { current: FieldHandle | null };
    speak: { current: HTMLTextAreaElement | null };
    surfaces: { openSurface: (surface: SurfaceName, origin?: Point) => void; setDraft: (draft: CrystalDraft | null) => void };
    freePoint: (scopeIds?: string[], text?: string, mode?: ResultPlacementMode) => Point;
    observe: (ids: string[]) => void;
    runtime: AIRuntime;
    importer: SourceImporter;
    settingsRef: { current: Settings };
    stopDiffuseForIntent: () => void;
    closeMenu: () => void;
}) {
    const [words, setWords] = useState('');
    const [speakScope, setSpeakScope] = useState<string[] | null>(null);
    const emergeFirstThought = useFirstThoughtEmergence();
    /** Whether the words currently in the composer are the ones a running request came from.
     *
     * Only that request can be retried by resending the composer; a failure from a Thread's own
     * input, an exploration or a Diffuse run has nothing there to resend, and the failure line must
     * not offer a control that would send an unrelated sentence into the wrong place. */
    const retryable = useRef(false);

    function exitSpeak() { setSpeakScope(null); useUI.getState().patch({ speakFocused: false }); }
    /** Writing over a selection speaks about that scope; focusing the surface states it. */
    function compose() { setSpeakScope([...useUI.getState().selection]); }
    /** Ask reopens the writing surface with the current scope, as an explicit grounding. */
    function ask(ids = useUI.getState().selection) { closeMenu(); stopDiffuseForIntent(); useUI.getState().patch({ speakFocused: true }); setSpeakScope([...ids]); }
    function findRelation(ids: string[]) {
        stopDiffuseForIntent();
        useUI.getState().patch({ selection: ids });
        void runtime.run('probe', 'Explore the relation without assuming one exists.', ids, { activity: 'bridge' });
    }
    function openThread(scopeIds = useUI.getState().selection, deep = false, body?: string, provider?: string) {
        const project = controller.getSnapshot().project;
        let ids: string[];
        try {
            ids = compileContext(project, scopeIds).scope.map(item => item.id);
        }
        catch (error) {
            // Not a device failure: the chosen scope held no live content to build a Thread from, so
            // the Field's own scope could not be read. 'read' is the closest honest category, and its
            // promise (nothing changed, the current Field is still open) is exactly what happens.
            deviceFailureNotice('read', error);
            return;
        }
        const thread: Thread = { id: id('thread'), title: project.thoughts[ids[0]]?.text.slice(0, 70) || t('An open question'), scopeIds: ids, messages: body ? [{ id: id('message'), role: 'assistant', text: body, at: Date.now(), provider }] : [], createdAt: Date.now() };
        controller.dispatch({ type: 'thread.create', thread });
        surfaces.openSurface(deep ? 'thread-focus' : 'thread');
        useUI.getState().patch({ threadId: thread.id });
    }
    /** A Crystal is never formed here: this only opens the editable preview. */
    function previewCrystal(scopeIds = useUI.getState().selection, text?: string) {
        const project = controller.getSnapshot().project;
        const ids = scopeIds.filter(key => !!project.thoughts[key] && project.thoughts[key].kind !== 'source');
        if (!ids.length || ids.length === 1 && project.thoughts[ids[0]].kind === 'crystal') {
            notice(t('Select an unfinished Thought or a neighborhood. Use Continue to grow from a Crystal.'));
            return;
        }
        surfaces.setDraft({ targetId: ids.length === 1 ? ids[0] : undefined, scopeIds: ids, text: text ?? ids.map(key => project.thoughts[key].text).join('\n\n').slice(0, 20000) });
        presentSpatialTransition('converge', ids);
        surfaces.openSurface('crystal');
    }
    /** Continuing grows a new Thought beside the Crystal; it never rewrites the commitment. */
    function continueCrystal(key: string) {
        try {
            const project = controller.getSnapshot().project;
            const thought = continuedThought(project, key, freePoint([key], '', 'continue'));
            controller.dispatch({ type: 'crystal.continue', from: key, thought });
            closeMenu();
            useUI.getState().patch({ selection: [thought.id], editing: thought.id });
            field.current?.focus();
        }
        catch (error) {
            // 'read': the target was not a Crystal, so the Field content could not be used to continue.
            // Nothing was written and the current Field is untouched.
            deviceFailureNotice('read', error);
        }
    }
    async function bringEvidence(candidate: EvidenceCandidate, existingSourceId?: string): Promise<string | undefined> {
        const operation = { id: id('request'), kind: 'bring' as const, phase: 'pending' as const, scopeIds: [candidate.id], activity: 'arrive' as const };
        useUI.getState().patch({ operation, busy: true });
        notice(t('Bringing reference...'));
        // Yield once so the action visibly acknowledges itself before the local import completes.
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        try {
            const source = importer.candidate(candidate, freePoint(useUI.getState().selection, candidate.title, 'evidence'), existingSourceId);
            // A brought reference keeps its existing directional arrival; no radial creation bloom.
            const placed = Object.values(controller.getSnapshot().project.thoughts).find(item => item.sourceId === source.id);
            if (placed) presentSpatialTransition('arrive', [placed.id]);
            if (useUI.getState().operation?.id === operation.id)
                useUI.getState().patch({ operation: { ...operation, phase: 'completed', scopeIds: placed ? [placed.id] : operation.scopeIds, resultCount: placed ? 1 : 0 }, busy: false });
            notice(t('Reference brought to the Field with its actual inspection status.'));
            return source.id;
        }
        catch (error) {
            if (useUI.getState().operation?.id === operation.id)
                useUI.getState().patch({ operation: { ...operation, phase: 'failed' }, busy: false });
            deviceFailureNotice('import', error);
        }
    }
    /** The one place words become a request. Nothing is sent without this explicit intent.
     *
     * For an explicitly scoped request the composed intent is *retained until the request reaches a
     * terminal state*. The audit found the words being cleared before the request was even
     * dispatched, which destroyed the retry path: a person who mistyped a key, hit a rate limit or
     * lost the network had to write their sentence again. Now a failure, a cancellation and a timeout
     * all leave the words exactly where they were, so fixing the cause and pressing Enter again is
     * the whole recovery.
     *
     * The two branches that produce something durable release the words immediately, and both are
     * honest commits rather than losses: a message sent into a Thread belongs to that Thread's
     * history, and unscoped words are recorded as an `InputRecord` — the exact authored text, saved —
     * before anything else happens to them. That record is what lets the unscoped path acknowledge the
     * person locally instead of making them wait for a model, and it is why a failed structuring can
     * still fall back to their own wording without the composer ever being its only copy.
     */
    function commitOriginalInput(inputId: string, originalText: string, point: Point, wasEmpty: boolean) {
        const thought = makeThought(originalText.trim(), point);
        thought.origin = { projectId: controller.getSnapshot().project.id, inputId, ranges: originalText.length ? [{ inputId, start: 0, end: originalText.length }] : undefined };
        controller.dismissInputProposals(inputId);
        controller.dispatch({ type: 'thought.create', thought });
        useUI.getState().patch({ selection: [thought.id] });
        observe([thought.id]);
        if (wasEmpty)
            emergeFirstThought(thought.id, speak.current?.closest<HTMLElement>('.speak-positioner') ?? null);
        return thought;
    }
    function proposalInputId(ids: string[]): string | null {
        const session = controller.getSnapshot().session;
        const ghosts = ids.map(key => session.ghosts[key]).filter((ghost): ghost is NonNullable<typeof ghost> => !!ghost && !!ghost.proposal);
        if (!ghosts.length || ghosts.length !== ids.length) return null;
        const inputIds = [...new Set(ghosts.map(ghost => ghost.origin?.inputId).filter((value): value is string => !!value))];
        return inputIds.length === 1 ? inputIds[0] : null;
    }
    function keepAllProposals(ids = useUI.getState().selection) {
        const inputId = proposalInputId(ids);
        if (!inputId) return;
        const proposalIds = Object.values(controller.getSnapshot().session.ghosts).filter(ghost => ghost.proposal && ghost.origin?.inputId === inputId).map(ghost => ghost.id);
        presentMaterialSettle(proposalIds);
        const claimed = controller.claimAll(proposalIds);
        if (!claimed.length) return;
        useUI.getState().patch({ selection: claimed.map(thought => thought.id) });
        observe(claimed.map(thought => thought.id));
        notice(t('Kept the proposed thoughts. Relations are still only candidates until you confirm them.'));
    }
    function keepOriginalProposal(ids = useUI.getState().selection) {
        const inputId = proposalInputId(ids);
        if (!inputId) return;
        const snapshot = controller.getSnapshot();
        const input = snapshot.project.inputs[inputId];
        if (!input) return;
        const first = ids.map(key => snapshot.session.ghosts[key]).find(Boolean);
        const wasEmpty = !Object.keys(snapshot.project.thoughts).length;
        const thought = commitOriginalInput(inputId, input.text, first ? { x: first.x, y: first.y } : freePoint(), wasEmpty);
        notice(t('Kept the original as one thought.'));
        field.current?.reveal([thought.id]);
    }
    /** The one place words become either authored Field material or an explicitly scoped request.
     * Unscoped words become durable input and a local acknowledgement first, and are structured
     * afterwards. Scoped words remain a question/action over an existing scope. */
    async function submit(options: { localOnly?: boolean } = {}) {
        const originalText = words;
        const text = originalText.trim();
        if (!text)
            return;
        stopDiffuseForIntent();
        const state = useUI.getState();
        const scope = speakScope ?? state.selection;
        const relationWords = /relation|relate|between|compare|explore|\u5173\u7cfb|\u4e4b\u95f4/i.test(text);
        const deep = /go deeper|deep dive|\u6df1\u5165/i.test(text);
        if ((state.surface === 'thread' || state.surface === 'thread-focus') && state.threadId) {
            const thread = controller.getSnapshot().project.threads[state.threadId];
            if (thread) {
                setWords('');
                exitSpeak();
                await sendThreadMessage({ controller, runtime, threadId: thread.id, text, deep: state.surface === 'thread-focus' });
                return;
            }
        }
        // No selection means these are the person's own Field words, not a question about an
        // existing scope. Their own words are acknowledged locally and at once: the composer clears,
        // the submitted sentence stays visible as a transient acknowledgement, and only then is any
        // provider asked for structure. Local actions feel local, and AI latency is never allowed to
        // become the latency of being heard.
        if (!scope.length) {
            const submittedAt = performance.now();
            const before = controller.getSnapshot();
            const wasEmpty = !Object.keys(before.project.thoughts).length && !Object.keys(before.session.ghosts).length;
            const input = controller.recordInput(originalText);
            const providerOff = settingsRef.current.provider === 'off';
            if (options.localOnly || providerOff) {
                commitOriginalInput(input.id, originalText, freePoint(), wasEmpty);
                setWords('');
                exitSpeak();
                // A step may keep the words local, but it may not take away the one sentence — and the
                // one control — that explain why nothing was called. With the provider off there is no
                // request to protect the tutorial from, so the honest answer is always given.
                if (providerOff || !options.localOnly) aiOffNotice();
                speak.current?.blur();
                return;
            }
            // Everything below is model work, and none of it can delay what is above it. The exact
            // authored words become a Field Seed at a stable world point before the provider starts.
            const seedPoint = freePoint();
            setWords('');
            useUI.getState().patch({ structuring: { inputId: input.id, text: originalText, point: seedPoint, phase: 'active' } });
            if (import.meta.env?.MODE === 'development' && typeof requestAnimationFrame === 'function') requestAnimationFrame(() => {
                if (document.querySelector('[data-testid="input-seed"]')) console.debug('[diffusion] input seed', { enterToSeedMs: Math.round(performance.now() - submittedAt) });
            });
            exitSpeak();
            speak.current?.blur();
            void runtime.ingest(originalText, input.id, {
                anchor: seedPoint,
                submittedAt,
                onStart: requestId => {
                    const current = useUI.getState().structuring;
                    if (current?.inputId === input.id) useUI.getState().patch({ structuring: { ...current, requestId } });
                },
                onEvent: event => {
                    if (event.type !== 'unit') return;
                    const current = useUI.getState().structuring;
                    if (current?.inputId !== input.id || current.requestId && current.requestId !== event.requestId) return;
                    useUI.getState().patch({ structuring: { ...current, requestId: event.requestId, phase: 'partial', highlight: event.ranges, proposalIds: [...(current.proposalIds ?? []), event.ghostId] } });
                },
            }).then(outcome => {
                // A request cannot outlive its Field: if another one was opened while this structure
                // was on its way, the words stay exactly where they already are, in the InputRecord of
                // the Field they were written in.
                if (!controller.getSnapshot().project.inputs[input.id])
                    return;
                const state = useUI.getState();
                // Whether this submission still owns the person's attention. A newer submission may have
                // taken over the acknowledgement line, and the person may have selected something
                // themselves while this structure was arriving. Either way this submission still keeps
                // its words in the Field — it just does not take the selection back from them.
                const owns = state.structuring?.inputId === input.id && !state.selection.length;
                if (!outcome.proposalIds.length) {
                    // Nothing arrived to look at, so the person's own wording is what the Field keeps.
                    commitOriginalInput(input.id, originalText, seedPoint, wasEmpty);
                    if (!owns)
                        useUI.getState().patch({ selection: state.selection });
                }
                else if (owns) {
                    // Offer the review controls for what did arrive.
                    state.patch({ selection: outcome.proposalIds });
                }
            }).finally(() => {
                // Only this submission may recede this Seed; a newer request owns its own activity.
                const current = useUI.getState().structuring;
                if (current?.inputId !== input.id) return;
                useUI.getState().patch({ structuring: { ...current, phase: 'settling', highlight: undefined } });
                setTimeout(() => {
                    if (useUI.getState().structuring?.inputId === input.id) useUI.getState().patch({ structuring: null });
                }, 220);
            });
            return;
        }
        if (settingsRef.current.provider === 'off') {
            aiOffNotice();
            return; // Scoped words have not been committed anywhere; keep them for a later retry.
        }
        retryable.current = true;
        let outcome;
        const kind = deep ? 'deep' : scope.length === 2 && relationWords ? 'probe' : 'ask';
        try {
            // A scoped ask is an outward-looking question from the scope, so its activity is the
            // grammar's `radiate`; probe and deep carry their own default activity.
            outcome = await runtime.run(kind, text, scope, kind === 'ask' ? { activity: 'radiate' } : undefined);
        }
        finally {
            retryable.current = false;
        }
        if (outcome.status === 'completed') {
            setWords('');
            exitSpeak();
        }
    }
    return { words, setWords, speakScope, exitSpeak, compose, ask, findRelation, submit, openThread, previewCrystal, continueCrystal, bringEvidence, keepAllProposals, keepOriginalProposal, retryable };
}
