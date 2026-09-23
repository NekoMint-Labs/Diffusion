import type { ProjectState } from '../../core/model.ts';
/** Deterministic local matching for Find in Field. No AI, no remote call, no semantic Recall.
 * Ordered in reading order (top to bottom, then left to right) so navigation is predictable.
 */
export function findMatches(project: ProjectState, query: string): string[] {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle)
        return [];
    const sourceText = new Map(Object.values(project.sources).map(source => [source.id, `${source.title} ${source.excerpt}`.toLocaleLowerCase()]));
    return Object.values(project.thoughts)
        .filter(thought => thought.text.toLocaleLowerCase().includes(needle) || (thought.sourceId ? sourceText.get(thought.sourceId)?.includes(needle) ?? false : false))
        .sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id))
        .map(thought => thought.id);
}
