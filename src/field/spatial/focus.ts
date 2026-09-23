import type { ProjectState, SessionState, Relation, Phenomenon } from '../../core/model.ts';
export interface Focus {
    selected: Set<string>;
    direct: Set<string>;
    nearby: Set<string>;
    peripheral: Set<string>;
    activeRelations: (Relation | Phenomenon)[];
}
/** Pure visual attention. Nearby means geometric proximity, never an invented relation. */
export function focusFor(project: ProjectState, session: SessionState, selection: string[]): Focus {
    const items = { ...project.thoughts, ...session.ghosts };
    const selected = new Set(selection.filter(key => !!items[key]));
    const direct = new Set<string>(), nearby = new Set<string>(), peripheral = new Set<string>();
    if (!selected.size) return { selected, direct, nearby, peripheral, activeRelations: [] };
    const anchors = selection.map(key => items[key]).filter(Boolean);
    const candidates = [...Object.values(project.relations), ...Object.values(session.phenomena)]
        .filter(relation => (selected.has(relation.a) || selected.has(relation.b)) && items[relation.a] && items[relation.b]);
    candidates.sort((a, b) => Number(selected.has(b.a) && selected.has(b.b)) - Number(selected.has(a.a) && selected.has(a.b)) || a.id.localeCompare(b.id));
    // All direct neighbors retain prominence, even when the visible phenomenon budget is full.
    for (const relation of candidates) for (const key of [relation.a, relation.b]) if (!selected.has(key)) direct.add(key);
    for (const item of Object.values(items)) {
        if (selected.has(item.id) || direct.has(item.id)) continue;
        const distance = Math.min(...anchors.map(anchor => Math.hypot(item.x - anchor.x, item.y - anchor.y)));
        if (distance <= 460) nearby.add(item.id);
        else if (distance > 1050) peripheral.add(item.id);
    }
    return { selected, direct, nearby, peripheral, activeRelations: candidates.slice(0, 12) };
}
