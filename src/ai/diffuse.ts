import { t } from '../shared/i18n.ts';
import { discoveryCandidate } from '../evidence/pipeline.ts';
import { id, type EvidenceCandidate } from '../core/model.ts';
import type { ProjectController } from '../core/controller.ts';
import type { WebEvidenceProvider } from '../evidence/contracts.ts';
import { abortableDelay } from './contracts.ts';
import type { AIRuntime } from './runtime.ts';
export interface DiffuseConfig {
    scopeIds: string[];
    prompt: string;
    steps: number;
    seconds: number;
    projectSources: boolean;
    web: boolean;
    /** Explicit action semantics for the 3D.1 Another Angle preview. Generic Diffuse stays separate. */
    mode?: 'diffuse' | 'angle';
}
export interface DiffuseState {
    phase: 'idle' | 'running' | 'paused' | 'stopped' | 'complete';
    runId: string;
    config: DiffuseConfig | null;
    used: number;
    remainingSeconds: number;
    reason: string;
    evidence: EvidenceCandidate[];
}
const angles = ['Name a missing question.', 'Try a counterexample.', 'Expose a hidden assumption.', 'Look for a boundary where the thought stops applying.', 'Offer an unexpected but grounded bridge.', 'Propose a small observation, without turning it into a task list.'];
const reframingAxes = ['Reverse one assumption behind the current framing.', 'Reframe this through opportunity cost rather than immediate benefit.', 'Change the time horizon used to see the problem.', 'Ask what alternative path could satisfy the same need.', 'Reframe around what the user is actually optimizing for.'];
export class DiffuseSession {
    private state: DiffuseState = { phase: 'idle', runId: '', config: null, used: 0, remainingSeconds: 0, reason: '', evidence: [] };
    private controller: ProjectController;
    private runtime: Pick<AIRuntime, 'run' | 'cancel'>;
    private provider: () => WebEvidenceProvider | null;
    private delay: number;
    private listeners = new Set<() => void>();
    private abort: AbortController | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;
    private serial = 0;
    private deadline = 0;
    private searched = false;
    private claimedCandidates = new Set<string>();
    private baseTexts = new Map<string, string>();
    private unsubscribe: () => void;
    constructor(controller: ProjectController, runtime: Pick<AIRuntime, 'run' | 'cancel'>, provider: () => WebEvidenceProvider | null, stepDelay = 450) { this.controller = controller; this.runtime = runtime; this.provider = provider; this.delay = stepDelay; this.unsubscribe = controller.subscribe(() => this.observeUserOwnership()); }
    getSnapshot = () => this.state;
    subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
    private update(patch: Partial<DiffuseState>) { this.state = { ...this.state, ...patch }; for (const fn of this.listeners)
        fn(); }
    start(config: DiffuseConfig): void {
        const project = this.controller.getSnapshot().project;
        if (!Number.isInteger(config.steps) || config.steps < 1 || config.steps > 6 || !Number.isFinite(config.seconds) || config.seconds < 10 || config.seconds > 180)
            throw new Error(t('Choose between 1 and 6 angles and a time limit between 10 seconds and 3 minutes.'));
        const scope = [...new Set(config.scopeIds)];
        if (!scope.length || scope.length > 24 || scope.some(k => !project.thoughts[k]))
            throw new Error(t('Start from between 1 and 24 thoughts of your own. A possibility has to be claimed before it can start an exploration.'));
        if (!config.prompt.trim() || config.prompt.length > 9000)
            throw new Error(t('Say what this exploration should look for (at most 9000 characters).'));
        if (config.web && !this.provider())
            throw new Error(t('Turn on a search source in Settings before including a web search.'));
        this.stop(t('Restarted explicitly.'));
        this.searched = false;
        this.claimedCandidates.clear();
        this.baseTexts = new Map(scope.map(k => [k, project.thoughts[k].text]));
        this.deadline = Date.now() + config.seconds * 1000;
        this.update({ phase: 'running', runId: id('diffuse'), config: { ...config, scopeIds: scope }, used: 0, remainingSeconds: config.seconds, reason: '', evidence: [] });
        this.timer = setInterval(() => { const remaining = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000)); this.update({ remainingSeconds: remaining }); if (!remaining)
            this.stop(t('The time limit was reached.')); }, 1000);
        void this.drive();
    }
    pause() { if (this.state.phase !== 'running')
        return; this.serial++; this.abort?.abort(); this.runtime.cancel(); this.update({ phase: 'paused', reason: t('Paused. The time limit keeps counting.') }); }
    resume() { if (this.state.phase !== 'paused')
        return; if (Date.now() >= this.deadline) {
        this.stop(t('The time limit was reached.'));
        return;
    } this.update({ phase: 'running', reason: '' }); void this.drive(); }
    stop(reason = t('Stopped by you.')) {
        this.serial++;
        this.abort?.abort();
        this.runtime.cancel();
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.state.phase !== 'idle')
            this.update({ phase: 'stopped', reason });
    }
    clear() { this.stop(); this.update({ phase: 'idle', config: null, reason: '', evidence: [] }); }
    dispose() { this.stop(t('Project closed.')); this.unsubscribe(); this.listeners.clear(); }
    private observeUserOwnership() {
        if (!['running', 'paused'].includes(this.state.phase))
            return;
        const p = this.controller.getSnapshot().project;
        for (const key of this.claimedCandidates)
            if (p.thoughts[key]) {
                this.stop(t('You claimed a possibility, so this exploration stopped.'));
                return;
            }
        for (const [key, text] of this.baseTexts)
            if (p.thoughts[key]?.text !== text) {
                this.stop(t('One of the starting thoughts changed. Start a new exploration to use its new wording.'));
                return;
            }
    }
    private async drive() {
        const config = this.state.config;
        if (!config)
            return;
        const ticket = ++this.serial;
        const abort = new AbortController();
        this.abort = abort;
        const valid = () => ticket === this.serial && this.state.phase === 'running' && !abort.signal.aborted && Date.now() < this.deadline;
        try {
            if (config.web && !this.searched) {
                this.searched = true;
                const provider = this.provider();
                if (!provider)
                    throw new Error(t('The search source is no longer available.'));
                const query = (config.prompt + ' ' + config.scopeIds.map(k => this.controller.getSnapshot().project.thoughts[k]?.text ?? '').join(' ')).slice(0, 3000);
                const candidates = await provider.search(query, { limit: 3, signal: abort.signal });
                if (!valid())
                    return;
                this.update({ evidence: candidates.slice(0, 3).map((candidate, index) => ({ ...discoveryCandidate(candidate), id: `web_${this.state.runId}_${index}` })) });
            }
            while (valid() && this.state.used < config.steps) {
                const step = this.state.used;
                this.update({ used: step + 1 });
                const angleMode = config.mode === 'angle';
                const stepContract = angleMode ? reframingAxes[step % reframingAxes.length] : angles[step % angles.length];
                const result = await this.runtime.run(angleMode ? 'angle' : 'diffuse', `${config.prompt}\n\nStep ${step + 1}: ${stepContract}\nUse only the supplied owned scope and permitted sources. Never build on an unclaimed possibility.`, config.scopeIds, { runId: this.state.runId, signal: abort.signal, projectSources: config.projectSources, web: config.web, evidence: [], maxCandidates: angleMode ? 1 : 2, activity: 'radiate', onEmission: key => this.claimedCandidates.add(key) });
                if (!valid())
                    return;
                if (result.status === 'failed') {
                    this.stop(result.reason || t('The provider failed, so this exploration stopped.'));
                    return;
                }
                if (result.status === 'cancelled') {
                    this.stop(t('The active request was cancelled.'));
                    return;
                }
                if (this.state.used < config.steps)
                    await abortableDelay(this.delay, abort.signal);
            }
            if (valid()) {
                if (this.timer)
                    clearInterval(this.timer);
                this.timer = null;
                this.update({ phase: 'complete', reason: t('The exploration finished. Nothing further will be sent.') });
            }
        }
        catch (error) {
            if (valid())
                this.stop(error instanceof Error ? error.message : String(error));
        }
    }
}
