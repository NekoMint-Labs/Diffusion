import type { ProjectState } from '../core/model.ts';
import type { ContextPacket } from '../core/semantics.ts';

export const LINEAGE_LIMITS = { depth: 4, visited: 32, direct: 4, ancestors: 2, ancestorCharacters: 800, localCharacters: 6400 } as const;
/** An input identity establishes authorship, not approval or evidence. Legacy model notes
 * without an input identity stay unknown rather than being promoted to a user decision. */
export function authoredContext(project: ProjectState, key: string): boolean {
    const thought = project.thoughts[key];
    return !!thought && thought.kind === 'thought' && (!!(thought.origin?.inputId && project.inputs[thought.origin.inputId])
        || !thought.generationAction && !thought.origin?.note && !thought.sourceId && !thought.origin?.sourceId);
}
export function boundedLineage(project: ProjectState, scopeIds: string[]) {
    const scope = new Set(scopeIds), background = new Set<string>();
    const continuations: NonNullable<ContextPacket['continuations']> = [];
    for (const key of scopeIds) {
        const sourceIds: string[] = [];
        for (const parent of new Set(project.thoughts[key]?.derivedFrom ?? [])) {
            if (parent === key || !project.thoughts[parent]) continue;
            if (!scope.has(parent) && !background.has(parent)) {
                if (background.size >= LINEAGE_LIMITS.direct) continue;
                background.add(parent);
            }
            sourceIds.push(parent);
            if (sourceIds.length === LINEAGE_LIMITS.direct) break;
        }
        if (sourceIds.length) continuations.push({ thoughtId: key, sourceIds });
    }
    const queue = continuations.flatMap(link => link.sourceIds.map(key => [link.thoughtId, key]));
    const visited = new Set<string>();
    const candidates: { thoughtId: string; path: string[]; authored: boolean }[] = [];
    for (let index = 0; index < queue.length && visited.size < LINEAGE_LIMITS.visited; index++) {
        const path = queue[index], key = path.at(-1)!;
        const visit = path[0] + '\0' + key;
        if (visited.has(visit)) continue;
        visited.add(visit);
        if (path.length > 2 && !scope.has(key) && !background.has(key))
            candidates.push({ thoughtId: path[0], path, authored: authoredContext(project, key) });
        if (path.length - 1 >= LINEAGE_LIMITS.depth) continue;
        for (const parent of [...new Set(project.thoughts[key]?.derivedFrom ?? [])].slice(0, LINEAGE_LIMITS.direct)) {
            if (!project.thoughts[parent] || path.includes(parent)) continue;
            queue.push([...path, parent]);
        }
    }
    // Direct sources stay first. Nearest authored decisions outrank more distant authored
    // goals; unknown/model ancestors are fallback background, never user instructions.
    candidates.sort((a, b) => Number(b.authored) - Number(a.authored) || a.path.length - b.path.length);
    const ancestorIds = new Set<string>();
    const ancestry: NonNullable<ContextPacket['ancestry']> = [];
    for (const candidate of candidates) {
        const key = candidate.path.at(-1)!;
        if (!ancestorIds.has(key) && ancestorIds.size >= LINEAGE_LIMITS.ancestors) continue;
        ancestorIds.add(key);
        ancestry.push({ thoughtId: candidate.thoughtId, path: candidate.path });
        if (ancestry.length === 24) break;
    }
    return { background, continuations, ancestorIds, ancestry };
}
