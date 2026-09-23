import type { ProjectState, Thread, ThreadScopeEntry } from './model.ts';
/** Frozen wording is discourse history, never a replacement for canonical Field state. */
export function captureThreadScope(project: ProjectState, ids: readonly string[]): Record<string, ThreadScopeEntry> {
    return Object.fromEntries([...new Set(ids)].filter(key => !!project.thoughts[key]).slice(0, 24).flatMap(key => {
        const thought = project.thoughts[key];
        return thought ? [[key, { id: key, text: thought.text, kind: thought.kind, ...(thought.sourceId ? { sourceId: thought.sourceId } : {}) }]] : [];
    }));
}
export function threadScope(thread: Thread, project: ProjectState): ThreadScopeEntry[] {
    return thread.scopeIds.map(key => thread.scopeSnapshot?.[key] ?? project.thoughts[key]).filter((item): item is ThreadScopeEntry => !!item);
}
