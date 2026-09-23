import { AttentionTracker } from './attention.ts';
import { type ProjectState, type SessionState, type Ghost, type Phenomenon, type StructureProposal, type Thought, type InputRecord, type Point, emptySession, id } from './model.ts';
import { type Command, type DomainEvent, userEvent } from './events.ts';
import { reduceProject } from './reducer.ts';
export interface CoreSnapshot {
    project: ProjectState;
    session: SessionState;
    dirty: boolean;
    persistenceError: string | null;
}
export type SaveProject = (state: ProjectState) => Promise<void>;

const undoable = new Set(['thought.create', 'thought.edit', 'thought.move', 'thought.delete', 'thought.keep', 'thought.release', 'ghost.claim', 'crystal.form', 'crystal.create', 'crystal.continue', 'relation.confirm', 'relation.remove', 'source.add', 'fork.bring', 'field.rename']);
/** One user-level history step: the Field before the action, plus transient objects it consumed. */
interface HistoryStep {
    project: ProjectState;
    ghosts?: Ghost[];
}
export class ProjectController {
    private current: CoreSnapshot;
    private listeners = new Set<() => void>();
    private undoStack: HistoryStep[] = [];
    private redoStack: HistoryStep[] = [];
    /** Claimed Ghosts are transient objects the action consumed; Undo must return all of them. */
    private claimedGhost: Ghost | null = null;
    private save: SaveProject;
    private queue: Promise<void> = Promise.resolve();
    private generation = 0;
    private pendingSave: { state: ProjectState; generation: number } | null = null;
    private saving = false;
    private attention = new AttentionTracker();
    private batchOpen = false;
    private batching = 0;
    constructor(project: ProjectState, save: SaveProject) { this.current = { project, session: emptySession(), dirty: false, persistenceError: null }; this.save = save; }
    getSnapshot = (): CoreSnapshot => this.current;
    subscribe = (fn: () => void): (() => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
    private emit() { for (const fn of this.listeners)
        fn(); }
    private persist() {
        this.current = { ...this.current, dirty: true };
        this.pendingSave = { state: this.current.project, generation: ++this.generation };
        if (!this.saving) this.drainSaves();
    }
    /** At most one active write plus one latest snapshot; obsolete writes never accumulate. */
    private drainSaves() {
        this.saving = true;
        this.queue = Promise.resolve().then(async () => {
            while (this.pendingSave) {
                const request = this.pendingSave;
                this.pendingSave = null;
                try {
                    await this.save(request.state);
                    if (request.generation === this.generation) {
                        this.current = { ...this.current, dirty: false, persistenceError: null };
                        this.emit();
                    }
                } catch (error) {
                    this.current = { ...this.current, dirty: true, persistenceError: error instanceof Error ? error.message : String(error) };
                    this.emit();
                }
            }
        }).finally(() => {
            this.saving = false;
            if (this.pendingSave) this.drainSaves();
        });
    }
    flush = async (): Promise<void> => { while (this.saving || this.pendingSave) await this.queue; };
    /** Several user dispatches that are one deliberate action share a single history step. */
    batch(work: () => void): void {
        const outermost = this.batching === 0;
        if (outermost)
            this.batchOpen = false;
        this.batching += 1;
        try {
            work();
        }
        finally {
            this.batching -= 1;
            if (this.batching === 0)
                this.batchOpen = false;
        }
    }
    clearAttention() { this.attention.clear(); }
    coolUnderPressure(activeSession: boolean, eligibleIds: string[], protectedIds: string[]) {
        const pressure = this.attention.take(activeSession, eligibleIds, protectedIds);
        if (pressure.activeSession && pressure.interactions >= 3) this.dispatch({ type: 'lifecycle.tick', pressure }, 'system');
    }
    retrySave() { this.persist(); this.emit(); }
    dispatch(command: Command, actor: 'user' | 'system' = 'user', at = Date.now()): void {
        const before = this.current.project;
        const event = { ...command, actor, at } as DomainEvent;
        const next = reduceProject(before, event);
        if (next === before)
            return;
        if (actor === 'user' && undoable.has(command.type) && !this.batchOpen) {
            this.undoStack.push({ project: before, ghosts: this.claimedGhost ? [this.claimedGhost] : undefined });
            if (this.undoStack.length > 60)
                this.undoStack.shift();
            this.redoStack = [];
            // Inside batch(), later dispatches belong to the step already recorded above.
            if (this.batching > 0)
                this.batchOpen = true;
        }
        else if (actor === 'user' && command.type === 'ghost.claim' && this.batchOpen && this.claimedGhost) {
            const step = this.undoStack.at(-1);
            if (step) step.ghosts = [...(step.ghosts ?? []), this.claimedGhost];
        }
        this.current = { ...this.current, project: next };
        if (actor === 'user' && ['thought.create', 'thought.edit', 'thought.move', 'thought.keep', 'thought.wake', 'ghost.claim'].includes(command.type)) {
            const keys = 'thought' in command ? [command.thought.id] : 'positions' in command ? Object.keys(command.positions) : 'ids' in command ? command.ids : 'id' in command ? [command.id] : [];
            this.attention.note(keys.filter(key => !!next.thoughts[key]));
        }
        this.persist();
        this.emit();
    }
    setSession(session: SessionState) { this.current = { ...this.current, session }; this.emit(); }
    recordInput(text: string, now = Date.now(), inputId = id('input')): InputRecord {
        const input: InputRecord = { id: inputId, text, createdAt: now };
        this.dispatch({ type: 'input.record', input });
        return input;
    }
    addGhost(ghost: Ghost) {
        if (this.current.project.thoughts[ghost.id])
            return;
        const existing = Object.values(this.current.session.ghosts).sort((a, b) => a.createdAt - b.createdAt);
        const ghosts = Object.fromEntries(existing.slice(-9).map(g => [g.id, g]));
        this.setSession({ ...this.current.session, ghosts: { ...ghosts, [ghost.id]: ghost } });
    }
    moveGhost(key: string, point: Point, options: { detach?: boolean } = {}) {
        const ghost = this.current.session.ghosts[key];
        if (!ghost) return;
        const spatialDetached = options.detach ? true : ghost.spatialDetached;
        if (ghost.x === point.x && ghost.y === point.y && spatialDetached === ghost.spatialDetached) return;
        this.setSession({ ...this.current.session, ghosts: { ...this.current.session.ghosts, [key]: { ...ghost, ...point, ...(spatialDetached ? { spatialDetached: true as const } : {}) } } });
    }
    addPhenomenon(p: Phenomenon) {
        const items = { ...this.current.project.thoughts, ...this.current.session.ghosts };
        if (!items[p.a] || !items[p.b] || p.a === p.b)
            return;
        const previous = Object.values(this.current.session.phenomena).filter(x => x.id !== p.id).slice(-7);
        this.setSession({ ...this.current.session, phenomena: Object.fromEntries([...previous, p].map(x => [x.id, x])) });
    }
    addStructureProposal(proposal: StructureProposal) {
        const thoughtIds = new Set(Object.keys(this.current.project.thoughts));
        if (proposal.scopeIds.some(key => !thoughtIds.has(key))) return;
        const structures = Object.fromEntries(Object.values(this.current.session.structures).filter(item => item.id !== proposal.id).slice(-2).map(item => [item.id, item]));
        this.setSession({ ...this.current.session, structures: { ...structures, [proposal.id]: proposal } });
    }
    dismissStructureProposal(key: string) {
        const proposal = this.current.session.structures[key];
        if (!proposal) return;
        const relationIds = new Set(proposal.relationIds);
        const phenomena = Object.fromEntries(Object.entries(this.current.session.phenomena).filter(([id, relation]) => !relationIds.has(id) && relation.structureId !== key));
        const structures = { ...this.current.session.structures };
        delete structures[key];
        this.setSession({ ...this.current.session, phenomena, structures });
    }
    applyStructureProposal(key: string) {
        const proposal = this.current.session.structures[key];
        if (!proposal) return;
        const relationIds = [...proposal.relationIds];
        this.batch(() => {
            for (const relationId of relationIds) if (this.current.session.phenomena[relationId]) this.confirmPhenomenon(relationId);
        });
        const structures = { ...this.current.session.structures };
        delete structures[key];
        this.setSession({ ...this.current.session, structures });
    }
    updatePhenomenon(key: string, patch: Partial<Pick<Phenomenon, 'label' | 'explanation'>>) {
        const phenomenon = this.current.session.phenomena[key];
        if (!phenomenon)
            return;
        const label = patch.label === undefined ? phenomenon.label : patch.label.trim();
        if (!label)
            return;
        const explanation = patch.explanation === undefined ? phenomenon.explanation : patch.explanation.trim() || undefined;
        this.setSession({ ...this.current.session, phenomena: { ...this.current.session.phenomena, [key]: { ...phenomenon, ...patch, label, explanation } } });
    }
    claim(key: string): Thought | null {
        const ghost = this.current.session.ghosts[key];
        if (!ghost)
            return this.current.project.thoughts[key] ?? null;
        const now = Date.now();
        // Causal lineage crosses the AI -> Ghost -> Human Keep boundary only here. Scope geometry
        // stays transient; only canonical parent identities and the explicit action become durable.
        const derivedFrom = ghost.proposalAction
            ? [...new Set(ghost.scopeIds.filter(parentId => parentId !== ghost.id && !!this.current.project.thoughts[parentId]))]
            : [];
        const thought: Thought = {
            id: ghost.id, text: ghost.text, x: ghost.x, y: ghost.y, kind: 'thought', life: 'active', kept: false,
            createdAt: now, updatedAt: now, touchedAt: now, origin: ghost.origin,
            ...(derivedFrom.length ? { derivedFrom, generationAction: ghost.proposalAction } : {}),
        };
        // Remove the transient object first; no frame contains two instances of its identity.
        const ghosts = { ...this.current.session.ghosts };
        delete ghosts[key];
        this.current = { ...this.current, session: { ...this.current.session, ghosts } };
        this.claimedGhost = ghost;
        try {
            this.dispatch({ type: 'ghost.claim', thought });
        }
        finally {
            this.claimedGhost = null;
        }
        return thought;
    }
    claimAll(keys: string[]): Thought[] {
        const claimed: Thought[] = [];
        this.batch(() => {
            for (const key of [...new Set(keys)]) {
                const thought = this.claim(key);
                if (thought) claimed.push(thought);
            }
        });
        return claimed;
    }
    dismissGhost(key: string) {
        if (!this.current.session.ghosts[key]) return;
        const ghosts = { ...this.current.session.ghosts };
        delete ghosts[key];
        const phenomena = Object.fromEntries(Object.entries(this.current.session.phenomena).filter(([, relation]) => relation.a !== key && relation.b !== key));
        this.setSession({ ...this.current.session, ghosts, phenomena });
    }
    dismissInputProposals(inputId: string) {
        const removed = new Set(Object.values(this.current.session.ghosts).filter(ghost => ghost.origin?.inputId === inputId).map(ghost => ghost.id));
        if (!removed.size) return;
        const ghosts = Object.fromEntries(Object.entries(this.current.session.ghosts).filter(([key]) => !removed.has(key)));
        const phenomena = Object.fromEntries(Object.entries(this.current.session.phenomena).filter(([, relation]) => !removed.has(relation.a) && !removed.has(relation.b)));
        this.setSession({ ...this.current.session, ghosts, phenomena });
    }
    recall(keys: string[]) { this.setSession({ ...this.current.session, recalls: [...new Set([...this.current.session.recalls, ...keys.filter(k => !!this.current.project.thoughts[k])])].slice(-3) }); }
    touch(keys: string[], now = Date.now()) {
        this.attention.note(keys.filter(key => !!this.current.project.thoughts[key]));
        const ids = keys.filter(k => { const t = this.current.project.thoughts[k]; return t && (t.life !== 'active' || now - t.touchedAt >= 60000); });
        if (ids.length)
            this.dispatch({ type: 'thought.touch', ids }, 'user', now);
    }
    wake(key: string) {
        if (!this.current.project.thoughts[key])
            return;
        this.current = { ...this.current, session: { ...this.current.session, recalls: this.current.session.recalls.filter(k => k !== key) } };
        this.dispatch({ type: 'thought.wake', ids: [key] });
    }
    expireSession(now = Date.now(), protectedIds: string[] = []) {
        const protectedSet = new Set(protectedIds);
        const ghosts = Object.fromEntries(Object.entries(this.current.session.ghosts).filter(([k, g]) => protectedSet.has(k) || now - g.createdAt < 5 * 60000));
        if (Object.keys(ghosts).length !== Object.keys(this.current.session.ghosts).length)
            this.setSession({ ...this.current.session, ghosts });
    }
    confirmPhenomenon(key: string) {
        const p = this.current.session.phenomena[key];
        if (!p) return;
        // Confirming a candidate is explicit user commitment. If its endpoints are still proposals,
        // claiming them is part of that same explicit act; AI never crosses this boundary itself.
        this.batch(() => {
            this.claim(p.a);
            this.claim(p.b);
            this.dispatch({ type: 'relation.confirm', relation: { ...p, status: 'confirmed', createdAt: Date.now() } });
        });
        const phenomena = { ...this.current.session.phenomena };
        delete phenomena[key];
        this.setSession({ ...this.current.session, phenomena });
    }
    dismissPhenomenon(key: string) { const phenomena = { ...this.current.session.phenomena }; delete phenomena[key]; this.setSession({ ...this.current.session, phenomena }); }
    private restore(target: ProjectState, label: string) {
        const present = this.current.project;
        // Raw conversations and completed extraction are not erased by spatial Undo.
        const sources = Object.fromEntries(Object.entries(target.sources).map(([key, s]) => [key, present.sources[key] ?? s]));
        const inputs = { ...target.inputs, ...present.inputs };
        const changed = [...new Set([...Object.keys(target.thoughts), ...Object.keys(present.thoughts)])].filter(k => JSON.stringify(target.thoughts[k]) !== JSON.stringify(present.thoughts[k]));
        const project = { ...target, camera: present.camera, threads: present.threads, sources, inputs, history: [...present.history, { id: id('h'), kind: 'undo', summary: label, thoughtIds: changed, at: Date.now() }], updatedAt: Date.now() };
        this.current = { ...this.current, project };
        this.persist();
        this.emit();
    }
    undo() {
        const step = this.undoStack.pop();
        if (!step)
            return;
        this.redoStack.push({ project: this.current.project, ghosts: step.ghosts });
        this.restore(step.project, 'Reconsidered the last deliberate change');
        if (step.ghosts?.length)
            this.setSession({ ...this.current.session, ghosts: { ...this.current.session.ghosts, ...Object.fromEntries(step.ghosts.map(ghost => [ghost.id, ghost])) } });
    }
    redo() {
        const step = this.redoStack.pop();
        if (!step)
            return;
        this.undoStack.push({ project: this.current.project, ghosts: step.ghosts });
        if (step.ghosts?.length) {
            const ghosts = { ...this.current.session.ghosts };
            for (const ghost of step.ghosts) delete ghosts[ghost.id];
            this.setSession({ ...this.current.session, ghosts });
        }
        this.restore(step.project, 'Restored the reconsidered change');
    }
    get canUndo() { return this.undoStack.length > 0; }
    get canRedo() { return this.redoStack.length > 0; }
}
