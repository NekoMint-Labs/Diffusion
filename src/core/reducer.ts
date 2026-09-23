import { DomainError } from './errors.ts';
export { DomainError } from './errors.ts';
import { validateSourceRecord } from './validation.ts';
import { attentionDebt as initialAttentionDebt, attentionLife } from './attention.ts';
import { captureThreadScope } from './thread.ts';
import type { DomainEvent } from './events.ts';
import { type ProjectState, type Thought, type Life, id } from './model.ts';
const systemAllowed = new Set(['source.update', 'lifecycle.tick', 'region.observe', 'thread.message', 'thread.capsule', 'camera.commit']);
const textLimit = 20000;
function finite(n: number): boolean { return Number.isFinite(n) && Math.abs(n) <= 1e7; }
function validateThought(t: Thought): void {
    const lineage = t.derivedFrom;
    const lineageValid = lineage === undefined || Array.isArray(lineage) && lineage.length > 0 && lineage.length <= 32 && lineage.every(parentId => typeof parentId === 'string' && !!parentId && parentId.length <= 200 && parentId !== t.id) && new Set(lineage).size === lineage.length;
    const actionValid = lineage === undefined
        ? t.generationAction === undefined
        : t.generationAction !== undefined && ['continue', 'angle', 'question'].includes(t.generationAction);
    if (typeof t.id !== 'string' || !t.id || t.id.length > 200 || ['__proto__', 'constructor', 'prototype'].includes(t.id) || typeof t.text !== 'string' || !finite(t.x) || !finite(t.y) || t.text.length > textLimit || !['thought', 'crystal', 'source'].includes(t.kind) || !['active', 'cooling', 'peripheral', 'memory'].includes(t.life) || typeof t.kept !== 'boolean' || [t.createdAt, t.updatedAt, t.touchedAt].some(n => !Number.isFinite(n) || n < 0) || !lineageValid || !actionValid)
        throw new DomainError('Invalid thought');
}
/** Compatibility helper: elapsed wall-clock time alone never changes ordinary life. */
export function lifecycle(t: Thought, _now: number): Life {
    return t.kind === 'crystal' ? 'active' : t.life;
}
export function reduceProject(state: ProjectState, event: DomainEvent): ProjectState {
    if (!['user', 'system', 'ai'].includes(event.actor))
        throw new DomainError('Unknown event authority');
    if (event.actor === 'ai')
        throw new DomainError('AI may only submit semantic candidates, never domain mutations');
    if (event.actor === 'system' && !systemAllowed.has(event.type))
        throw new DomainError('System event lacks authority');
    if (!Number.isFinite(event.at) || event.at < 0)
        throw new DomainError('Invalid timestamp');
    const s: ProjectState = { ...state, updatedAt: event.at };
    let summary = '';
    let affected: string[] = [];
    const get = (key: string): Thought => { const t = s.thoughts[key]; if (!t)
        throw new DomainError('Thought not found'); return t; };
    const update = (key: string, patch: Partial<Thought>) => {
        const t = { ...get(key), ...patch, updatedAt: event.at };
        validateThought(t);
        s.thoughts = { ...s.thoughts, [key]: t };
    };
    switch (event.type) {
        case 'input.record': {
            const input = event.input;
            if (typeof input.id !== 'string' || !input.id || input.id.length > 200 || typeof input.text !== 'string' || input.text.length > 65000 || !Number.isFinite(input.createdAt) || input.createdAt < 0)
                throw new DomainError('Invalid input record');
            if (s.inputs[input.id])
                throw new DomainError('Duplicate input record');
            s.inputs = { ...s.inputs, [input.id]: input };
            break;
        }
        case 'thought.create':
        case 'ghost.claim':
        case 'fork.bring': {
            const t = event.thought;
            validateThought(t);
            if (event.type === 'fork.bring') {
                for (const source of event.sources ?? []) {
                    validateSourceRecord(source);
                    if (!s.sources[source.id])
                        s.sources = { ...s.sources, [source.id]: source };
                }
                if (t.kind === 'source' && (!t.sourceId || !s.sources[t.sourceId]))
                    throw new DomainError('A brought Source needs its provenance record.');
            }
            if (s.thoughts[t.id])
                throw new DomainError('Duplicate thought');
            if (event.type !== 'fork.bring' && t.kind !== 'thought')
                throw new DomainError('Use explicit source or crystal action');
            s.thoughts = { ...s.thoughts, [t.id]: event.type === 'fork.bring' ? { ...t, origin: event.origin } : t };
            summary = event.type === 'ghost.claim' ? 'Made a possibility my own' : event.type === 'fork.bring' ? 'Brought a chosen thought from a fork' : 'Placed a thought';
            affected = [t.id];
            break;
        }
        case 'thought.edit': {
            if (event.text.length > textLimit)
                throw new DomainError('Thought is too long');
            if (get(event.id).kind === 'source')
                throw new DomainError('Source excerpts are not editable thoughts');
            update(event.id, { text: event.text, life: 'active', attentionDebt: 0, touchedAt: event.at });
            summary = `Reframed: ${event.text.slice(0, 500)}`;
            affected = [event.id];
            break;
        }
        case 'thought.move': {
            for (const [key, point] of Object.entries(event.positions)) {
                if (!finite(point.x) || !finite(point.y))
                    throw new DomainError('Invalid position');
                update(key, { ...point, touchedAt: event.at, life: 'active', attentionDebt: 0 });
            }
            break; // Geometry is persisted, not written as noisy trajectory entries.
        }
        case 'thought.delete': {
            const removed = new Set(event.ids);
            s.thoughts = { ...s.thoughts };
            for (const key of removed)
                delete s.thoughts[key];
            // Deleting an ancestor cannot leave a durable dangling lineage edge. Descendants keep
            // their words/positions; only the no-longer-reconstructable causal reference is pruned.
            s.thoughts = Object.fromEntries(Object.entries(s.thoughts).map(([key, thought]) => {
                if (!thought.derivedFrom?.some(parentId => removed.has(parentId))) return [key, thought];
                const derivedFrom = thought.derivedFrom.filter(parentId => !removed.has(parentId));
                const next = { ...thought };
                if (derivedFrom.length) next.derivedFrom = derivedFrom;
                else { delete next.derivedFrom; delete next.generationAction; }
                return [key, next];
            }));
            s.relations = Object.fromEntries(Object.entries(s.relations).filter(([, r]) => !removed.has(r.a) && !removed.has(r.b)));
            s.regions = Object.fromEntries(Object.entries(s.regions).map(([k, r]) => [k, { ...r, members: r.members.filter(x => !removed.has(x)) }]).filter(([, r]) => (r as import('./model.ts').Region).members.length >= 2));
            summary = 'Let go of a thought';
            affected = event.ids;
            break;
        }
        case 'thought.release': {
            for (const key of event.ids) {
                const thought = get(key);
                if (thought.kind !== 'thought') throw new DomainError('Only unfinished Thoughts can be allowed to fade.');
                update(key, { kept: false, life: 'cooling', attentionDebt: Math.max(4, thought.attentionDebt ?? 0), touchedAt: event.at });
            }
            summary = 'Allowed an unfinished thought to fade';
            affected = event.ids;
            break;
        }
        case 'thought.keep':
        case 'thought.wake':
        case 'thought.touch': {
            for (const key of event.ids)
                update(key, { life: 'active', attentionDebt: 0, touchedAt: event.at, ...(event.type === 'thought.keep' ? { kept: true } : {}) });
            summary = event.type === 'thought.touch' ? '' : event.type === 'thought.keep' ? 'Kept an unfinished thought' : 'Returned to an earlier thought';
            affected = event.ids;
            break;
        }
        case 'crystal.create': {
            const t = event.thought;
            validateThought(t);
            if (s.thoughts[t.id] || t.kind !== 'crystal' || !t.text.trim() || !event.basedOn.length || event.basedOn.some(k => !s.thoughts[k]))
                throw new DomainError('A new Crystal requires explicit valid scope and wording.');
            s.thoughts = { ...s.thoughts, [t.id]: { ...t, kept: true, life: 'active' } };
            summary = 'Formed a Crystal from a chosen thought scope';
            affected = [...event.basedOn, t.id];
            break;
        }
        case 'crystal.form': {
            if (get(event.id).kind !== 'thought' || !event.text.trim())
                throw new DomainError('Select a thought and confirm its wording');
            update(event.id, { kind: 'crystal', text: event.text, kept: true, life: 'active', attentionDebt: 0, touchedAt: event.at });
            summary = `Committed to a Crystal: ${event.text.slice(0, 500)}`;
            affected = [event.id];
            break;
        }
        case 'crystal.continue': {
            if (get(event.from).kind !== 'crystal')
                throw new DomainError('Continue needs a Crystal');
            const t = { ...event.thought, origin: { projectId: s.id, thoughtId: event.from }, derivedFrom: [event.from], generationAction: 'continue' as const };
            validateThought(t);
            if (s.thoughts[t.id] || t.kind !== 'thought')
                throw new DomainError('Invalid continuation');
            s.thoughts = { ...s.thoughts, [t.id]: t };
            summary = 'Grew new thought without rewriting the Crystal';
            affected = [event.from, t.id];
            break;
        }
        case 'relation.confirm': {
            const r = event.relation;
            get(r.a);
            get(r.b);
            if (r.a === r.b || !['resonance', 'tension', 'gap', 'support', 'bridge'].includes(r.kind))
                throw new DomainError('Invalid relation');
            s.relations = { ...s.relations, [r.id]: { ...r, status: 'confirmed' } };
            summary = `Confirmed ${r.kind}: ${r.label}`;
            affected = [r.a, r.b];
            break;
        }
        case 'relation.remove': {
            const r = s.relations[event.id];
            s.relations = { ...s.relations };
            delete s.relations[event.id];
            if (r) {
                summary = 'Reconsidered a relation';
                affected = [r.a, r.b];
            }
            break;
        }
        case 'source.add': {
            validateSourceRecord(event.source);
            validateThought(event.thought);
            if (s.thoughts[event.thought.id] || s.sources[event.source.id])
                throw new DomainError('Duplicate source');
            if (event.thought.kind !== 'source' || event.thought.sourceId !== event.source.id)
                throw new DomainError('Invalid source reference');
            s.sources = { ...s.sources, [event.source.id]: event.source };
            s.thoughts = { ...s.thoughts, [event.thought.id]: event.thought };
            summary = 'Brought in an external reference';
            affected = [event.thought.id];
            break;
        }
        case 'source.update': {
            if (!s.sources[event.source.id])
                return state; // Completion of an undone import is harmless.
            validateSourceRecord(event.source);
            s.sources = { ...s.sources, [event.source.id]: event.source };
            break;
        }
        case 'thread.create': {
            if (s.threads[event.thread.id])
                throw new DomainError('Duplicate Thread');
            s.threads = { ...s.threads, [event.thread.id]: { ...event.thread, scopeIds: [...new Set(event.thread.scopeIds)].filter(k => !!s.thoughts[k]).slice(0, 24), scopeSnapshot: captureThreadScope(s, event.thread.scopeIds) } };
            summary = 'Opened a line of reasoning';
            affected = event.thread.scopeIds;
            break;
        }
        case 'thread.message':
        case 'thread.scope':
        case 'thread.capsule': {
            const t = s.threads[event.id];
            if (!t)
                throw new DomainError('Thread not found');
            const changed = event.type === 'thread.message' ? { ...t, messages: [...t.messages, event.message] } : event.type === 'thread.scope' ? { ...t, scopeIds: [...new Set([...t.scopeIds, ...event.ids.filter(k => !!s.thoughts[k])])].slice(0, 24), scopeSnapshot: { ...captureThreadScope(s, [...t.scopeIds, ...event.ids]), ...t.scopeSnapshot } } : { ...t, capsule: event.capsule };
            s.threads = { ...s.threads, [t.id]: changed };
            if (event.type === 'thread.scope') {
                summary = 'Explicitly expanded a Thread scope';
                affected = event.ids;
            }
            break;
        }
        case 'field.rename': {
            const title = event.title.trim().slice(0, 120);
            if (!title)
                throw new DomainError('A Field needs a name');
            s.title = title;
            summary = `Named this Field: ${title}`;
            break;
        }
        case 'region.rename': {
            if (!s.regions[event.id] || !event.name.trim())
                throw new DomainError('Region not found or empty name');
            s.regions = { ...s.regions, [event.id]: { ...s.regions[event.id], name: event.name.trim().slice(0, 100) } };
            break;
        }
        case 'region.observe': {
            s.regions = Object.fromEntries(event.regions.map(r => [r.id, r]));
            break;
        }
        case 'camera.commit': {
            const c = event.camera;
            if (!finite(c.x) || !finite(c.y) || !Number.isFinite(c.zoom) || c.zoom < 0.08 || c.zoom > 2.5)
                throw new DomainError('Invalid camera');
            s.camera = { ...c };
            break;
        }
        case 'lifecycle.tick': {
            const pressure = event.pressure;
            if (!pressure?.activeSession || !Number.isFinite(pressure.interactions) || pressure.interactions < 3) return state;
            const eligible = new Set(pressure.eligibleIds.filter(key => s.thoughts[key]?.kind === 'thought' && s.thoughts[key].life !== 'memory'));
            if (eligible.size < 12) return state;
            const protectedIds = new Set(pressure.participants);
            for (const relation of Object.values(s.relations)) {
                if (pressure.participants.includes(relation.a)) protectedIds.add(relation.b);
                if (pressure.participants.includes(relation.b)) protectedIds.add(relation.a);
            }
            const step = Math.min(2, Math.floor(pressure.interactions / 3));
            let changed = false;
            s.thoughts = Object.fromEntries(Object.entries(state.thoughts).map(([key, thought]) => {
                if (!eligible.has(key) || protectedIds.has(key)) return [key, thought];
                const attentionDebt = Math.min(thought.kept ? 24 : 32, initialAttentionDebt(thought) + step);
                if (attentionDebt === thought.attentionDebt) return [key, thought];
                changed = true;
                return [key, { ...thought, attentionDebt, life: attentionLife(thought, attentionDebt) }];
            }));
            if (!changed) return state;
            break;
        }
        default: throw new DomainError('Unknown domain event');
    }
    if (summary && ['thought.create', 'ghost.claim', 'fork.bring'].includes(event.type) && 'thought' in event)
        summary += `: ${event.thought.text.slice(0, 500)}`;
    if (summary)
        s.history = [...s.history, { id: id('h'), kind: event.type, summary, thoughtIds: affected, at: event.at }];
    return s;
}
