import { z } from 'zod';

// A separate trial notebook. No Core/Dexie objects, Field IDs, settings or credentials enter it.
const key = z.string().min(1).max(80);
export const noteSchema = z.object({
    id: key, action: z.enum(['user', 'explore', 'assess-source', 'recall', 'ask-user', 'finish']),
    reason: z.string().max(800), text: z.string().min(1).max(1600),
    status: z.enum(['proposed', 'kept', 'dismissed']), origin: z.enum(['user', 'demo', 'model']),
    at: z.number().finite().nonnegative(),
    briefRevision: z.number().int().nonnegative(), questionRevision: z.number().int().nonnegative(),
    citation: z.object({ sourceId: key, quote: z.string().min(12).max(1200),
        outcome: z.enum(['support', 'challenge', 'partial', 'inconclusive']) }).strict().optional(),
}).strict();
const branchSchema = z.object({
    id: key, title: z.string().min(1).max(120), question: z.string().max(2000), questionRevision: z.number().int().nonnegative(),
    notes: z.array(noteSchema).max(80), sourceIds: z.array(key).max(3), recalledIds: z.array(key).max(3),
}).strict();
export const notebookSchema = z.object({
    version: z.literal(1), revision: z.number().int().nonnegative(), briefRevision: z.number().int().nonnegative(),
    goal: z.string().max(4000), priorities: z.string().max(2000),
    activeId: key, branches: z.array(branchSchema).min(1).max(12),
    sources: z.array(z.object({ id: key, title: z.string().min(1).max(200), body: z.string().min(12).max(6000) }).strict()).max(12),
    sharedIds: z.array(key).max(8), requests: z.number().int().nonnegative(),
    phase: z.enum(['idle', 'running', 'paused', 'waiting', 'complete', 'failed']),
    checkpoint: z.string().max(800),
}).strict().superRefine((state, context) => {
    const ids = [...state.branches.map(b => b.id), ...state.sources.map(s => s.id), ...state.branches.flatMap(b => b.notes.map(n => n.id))];
    if (new Set(ids).size !== ids.length || !state.branches.some(b => b.id === state.activeId))
        context.addIssue({ code: 'custom', message: 'Invalid notebook identities.' });
    const sources = new Map(state.sources.map(s => [s.id, s]));
    const notes = state.branches.flatMap(b => b.notes);
    if (state.sharedIds.some(id => !notes.some(n => n.id === id && n.status === 'kept')))
        context.addIssue({ code: 'custom', message: 'Shared discoveries require an explicitly kept note.' });
    for (const branch of state.branches) {
        if (new Set(branch.sourceIds).size !== branch.sourceIds.length || branch.sourceIds.some(id => !sources.has(id))
            || branch.recalledIds.some(id => !branch.notes.some(n => n.id === id && n.status !== 'dismissed')))
            context.addIssue({ code: 'custom', message: 'Invalid branch references.' });
        for (const note of branch.notes) if (note.citation && !sources.get(note.citation.sourceId)?.body.includes(note.citation.quote))
            context.addIssue({ code: 'custom', message: 'A citation must match the supplied original text.' });
    }
});
export type Notebook = z.infer<typeof notebookSchema>;
export type TrialNote = z.infer<typeof noteSchema>;
export const TRIAL_STORAGE_KEY = 'diffusion-next-exploration-v1';
export const newId = () => crypto.randomUUID();
export function emptyNotebook(): Notebook {
    const id = newId();
    return { version: 1, revision: 0, briefRevision: 0, goal: '', priorities: '', activeId: id,
        branches: [{ id, title: '1', question: '', questionRevision: 0, notes: [], sourceIds: [], recalledIds: [] }],
        sources: [], sharedIds: [], requests: 0, phase: 'idle', checkpoint: '' };
}
export function restoreNotebook(raw: string | null): Notebook {
    if (!raw) return emptyNotebook();
    if (raw.length > 8_000_000) throw new Error('Notebook exceeds the trial limit.');
    const state = notebookSchema.parse(JSON.parse(raw));
    // A reload is never permission to restart requests. Interrupted work resumes only on a click.
    return state.phase === 'running' ? { ...state, phase: 'paused', checkpoint: 'interrupted' } : state;
}
export function activeBranch(state: Notebook) { return state.branches.find(branch => branch.id === state.activeId)!; }

/** Goal and priorities are pinned verbatim. Other branches contribute only explicit shared notes.
 * Older detail remains addressable inside the current branch rather than being silently merged. */
export function buildTrialContext(state: Notebook) {
    const branch = activeBranch(state);
    const relevant = branch.notes.filter(n => n.status !== 'dismissed');
    const recent = relevant.slice(-8);
    const recentIds = new Set(recent.map(n => n.id));
    const archive = relevant.filter(n => !recentIds.has(n.id));
    const supplied = (note: TrialNote, owner = branch, limit = 1200) => ({ id: note.id, text: note.text.slice(0, limit), textExcerpted: note.text.length > limit, status: note.status,
        needsReview: note.briefRevision !== state.briefRevision || note.questionRevision !== owner.questionRevision,
        origin: note.origin, action: note.action, ...(note.citation ? { citation: { ...note.citation, quote: note.citation.quote.slice(0, 200), quoteExcerpted: note.citation.quote.length > 200 } } : {}) });
    return {
        overview: { goal: state.goal, priorities: state.priorities,
            shared: state.branches.flatMap(b => b.notes.filter(n => state.sharedIds.includes(n.id))
                .map(n => ({ ...supplied(n, b, 500), branchTitle: b.title }))) },
        branch: { id: branch.id, title: branch.title, question: branch.question,
            recent: recent.map(n => supplied(n)), recalled: archive.filter(n => branch.recalledIds.includes(n.id)).map(n => supplied(n, branch, 1600)),
            archiveIndex: archive.map(n => ({ id: n.id, excerpt: n.text.slice(0, 80), origin: n.origin, status: n.status })),
            dismissed: branch.notes.filter(n => n.status === 'dismissed').slice(-4).map(n => n.text.slice(0, 160)) },
        sources: state.sources.filter(s => branch.sourceIds.includes(s.id)).map(s => ({ ...s, provenance: 'user-pasted; not fetched or independently verified' })),
        permissions: { web: false, fieldMutation: false },
    };
}
