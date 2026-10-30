import { activeBranch, newId, notebookSchema, type Notebook, type TrialNote } from './state.ts';
import { decisionSchema, type DecideStep, type StepResult } from './decision.ts';

async function boundedStep(decide: DecideStep, state: Notebook, signal: AbortSignal) {
    signal.throwIfAborted();
    let onAbort!: () => void;
    const interrupted = new Promise<never>((_resolve, reject) => {
        onAbort = () => reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'));
        signal.addEventListener('abort', onAbort, { once: true });
    });
    try { return await Promise.race([decide(state, signal), interrupted]); }
    finally { signal.removeEventListener('abort', onAbort); }
}

export class ExplorationSession {
    private state: Notebook;
    private listeners = new Set<() => void>();
    private active: AbortController | null = null;
    private serial = 0;
    error = '';
    constructor(initial: Notebook, private readonly persist: (state: Notebook) => void) { this.state = notebookSchema.parse(initial); }
    getSnapshot = () => this.state;
    subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
    private publish() { for (const fn of this.listeners) fn(); }
    private commit(state: Notebook) {
        const parsed = notebookSchema.parse(state);
        this.persist(parsed); // Saving the checkpoint must succeed before another request is sent.
        this.error = '';
        this.state = parsed;
        this.publish();
    }
    private fail(error: unknown) {
        // Provider messages can contain supplied text. The trial shows a bounded, product-owned error.
        this.error = error instanceof Error && error.message === 'citation' ? 'citation' : 'request';
        this.state = { ...this.state, phase: 'failed' };
        this.publish();
    }
    edit(change: (draft: Notebook) => void) {
        this.cancelActive();
        const next = structuredClone(this.state);
        change(next);
        if (next.goal !== this.state.goal || next.priorities !== this.state.priorities) next.briefRevision++;
        for (const branch of next.branches) {
            const previous = this.state.branches.find(b => b.id === branch.id);
            if (previous && previous.question !== branch.question) branch.questionRevision++;
        }
        next.revision++;
        next.phase = 'idle';
        next.checkpoint = 'changed';
        try { this.commit(next); }
        catch (error) { this.state = { ...this.state, phase: 'paused' }; this.publish(); throw error; }
    }
    pause() {
        this.cancelActive();
        try { this.commit({ ...this.state, phase: 'paused', checkpoint: 'paused' }); }
        catch (error) { this.state = { ...this.state, phase: 'paused' }; this.publish(); throw error; }
    }
    dispose() { this.cancelActive(); this.listeners.clear(); }
    private cancelActive() { this.serial++; this.active?.abort(); this.active = null; }

    async run(decide: DecideStep, limit: 1 | 3, timeoutMs = 45000) {
        if (this.active) return;
        if (!this.state.goal.trim() || !activeBranch(this.state).question.trim()) return;
        const ticket = ++this.serial;
        const abort = new AbortController();
        this.active = abort;
        try {
            for (let used = 0; used < limit; used++) {
                if (abort.signal.aborted || ticket !== this.serial) return;
                if (activeBranch(this.state).notes.length >= 80) throw new Error('capacity');
                this.commit({ ...this.state, phase: 'running', requests: this.state.requests + 1, checkpoint: 'requested' });
                const requestState = structuredClone(this.state);
                const timeout = new AbortController();
                const timer = setTimeout(() => timeout.abort(new DOMException('Step deadline reached', 'TimeoutError')), timeoutMs);
                const signal = AbortSignal.any([abort.signal, timeout.signal]);
                let result: StepResult;
                try { result = await boundedStep(decide, requestState, signal); signal.throwIfAborted(); }
                finally { clearTimeout(timer); }
                if (ticket !== this.serial || abort.signal.aborted) return;
                this.apply(result);
                if (this.state.phase === 'waiting' || this.state.phase === 'complete') return;
            }
            this.commit({ ...this.state, phase: 'paused', checkpoint: 'budget' });
        }
        catch (error) {
            if (ticket !== this.serial || abort.signal.aborted) return;
            this.fail(error);
        }
        finally { if (ticket === this.serial) this.active = null; }
    }
    private apply(result: StepResult) {
        const decision = decisionSchema.parse(result.decision);
        const next = structuredClone(this.state);
        const branch = activeBranch(next);
        const repeated = branch.notes.some(n => n.origin !== 'user' && n.text.normalize('NFKC').replace(/\s/g, '') === decision.text.normalize('NFKC').replace(/\s/g, ''));
        if (repeated) { this.commit({ ...next, phase: 'complete', checkpoint: 'repeated' }); return; }
        const note: TrialNote = { id: newId(), action: decision.action, reason: decision.reason, text: decision.text,
            status: 'proposed', origin: result.origin, at: Date.now(), briefRevision: next.briefRevision, questionRevision: branch.questionRevision };
        if (decision.action === 'assess-source') {
            const source = next.sources.find(s => s.id === decision.sourceId && branch.sourceIds.includes(s.id));
            if (!source?.body.includes(decision.quote)) throw new Error('citation');
            note.citation = { sourceId: source.id, quote: decision.quote, outcome: decision.outcome };
        }
        if (decision.action === 'recall') {
            const eligible = branch.notes.filter(n => n.status !== 'dismissed').slice(0, -8);
            if (decision.noteIds.some(id => !eligible.some(n => n.id === id))) throw new Error('scope');
            if (decision.noteIds.every(id => branch.recalledIds.includes(id))) {
                this.commit({ ...next, phase: 'complete', checkpoint: 'repeated' }); return;
            }
            branch.recalledIds = [...new Set(decision.noteIds)];
        }
        branch.notes.push(note);
        next.phase = decision.action === 'finish' ? 'complete' : decision.action === 'ask-user' ? 'waiting' : 'running';
        next.checkpoint = decision.action;
        this.commit(next);
    }
}
