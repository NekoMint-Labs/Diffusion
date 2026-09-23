import type { AIProposalAction, Point, ProjectState } from '../../core/model.ts';
import { center, type Bounds } from '../spatial/geometry.ts';
import { boundaryToward, type GeometryLookup } from './describe.ts';

export type CausalTraceState = 'sleep' | 'parent' | 'wake';

export interface CausalEdge {
    id: string;
    parentId: string;
    childId: string;
    action: AIProposalAction;
}

export interface CausalTrace extends CausalEdge {
    state: CausalTraceState;
    a: Point;
    b: Point;
    path: string;
}

/** Canonical lineage is intentionally tiny: parent ids plus the action on the child. Relations do
 * not participate here, and no visual geometry is ever persisted back into a Thought. */
export function causalEdges(project: ProjectState): CausalEdge[] {
    const edges: CausalEdge[] = [];
    for (const child of Object.values(project.thoughts)) {
        if (!child.derivedFrom?.length || !child.generationAction) continue;
        for (const parentId of child.derivedFrom) {
            if (parentId === child.id || !project.thoughts[parentId]) continue;
            edges.push({ id: `causal:${parentId}:${child.id}`, parentId, childId: child.id, action: child.generationAction });
        }
    }
    return edges.sort((a, b) => a.childId.localeCompare(b.childId) || a.parentId.localeCompare(b.parentId));
}

/** Selecting a Thought wakes its ancestry and one local branch depth. Hover is intentionally more
 * restrained: only the immediate parent edge wakes. This makes the journey legible without turning
 * the resting Field into a graph. */
export function causalTraceStates(project: ProjectState, selection: readonly string[], hoveredId?: string | null): Map<string, CausalTraceState> {
    const edges = causalEdges(project);
    const byChild = new Map<string, CausalEdge[]>();
    const byParent = new Map<string, CausalEdge[]>();
    for (const edge of edges) {
        byChild.set(edge.childId, [...(byChild.get(edge.childId) ?? []), edge]);
        byParent.set(edge.parentId, [...(byParent.get(edge.parentId) ?? []), edge]);
    }

    const wake = new Set<string>();
    const ancestry = new Set(selection.filter(id => !!project.thoughts[id]));
    const queue = [...ancestry];
    while (queue.length) {
        const childId = queue.shift()!;
        for (const edge of byChild.get(childId) ?? []) {
            wake.add(edge.id);
            if (!ancestry.has(edge.parentId)) {
                ancestry.add(edge.parentId);
                queue.push(edge.parentId);
            }
        }
    }
    // One local branch depth from every node on the visible ancestry is enough to reveal nearby
    // alternatives without recursively waking a whole tree.
    for (const parentId of ancestry)
        for (const edge of byParent.get(parentId) ?? []) wake.add(edge.id);

    const hoveredParents = new Set((hoveredId && project.thoughts[hoveredId] ? byChild.get(hoveredId) : [])?.map(edge => edge.id) ?? []);
    return new Map(edges.map(edge => [edge.id, wake.has(edge.id) ? 'wake' : hoveredParents.has(edge.id) ? 'parent' : 'sleep']));
}

function curvedPath(action: AIProposalAction, a: Point, b: Point): string {
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / length, uy = dy / length;
    const px = -uy, py = ux;

    if (action === 'angle') {
        const bend = Math.max(28, Math.min(92, length * .2));
        const sign = Math.abs(dy) > 8 ? Math.sign(dy) : dx >= 0 ? 1 : -1;
        const c1 = { x: a.x + dx * .28 + px * bend * sign, y: a.y + dy * .28 + py * bend * sign };
        const c2 = { x: b.x - dx * .25 + px * bend * sign, y: b.y - dy * .25 + py * bend * sign };
        return `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`;
    }

    if (Math.abs(dx) >= Math.abs(dy)) {
        const pull = Math.max(30, Math.min(150, Math.abs(dx) * .42));
        return `M${a.x},${a.y} C${a.x + Math.sign(dx || 1) * pull},${a.y} ${b.x - Math.sign(dx || 1) * pull},${b.y} ${b.x},${b.y}`;
    }
    const pull = Math.max(30, Math.min(150, Math.abs(dy) * .42));
    return `M${a.x},${a.y} C${a.x},${a.y + Math.sign(dy || 1) * pull} ${b.x},${b.y - Math.sign(dy || 1) * pull} ${b.x},${b.y}`;
}

export function describeCausalEdge(edge: CausalEdge, geometry: GeometryLookup, state: CausalTraceState = 'sleep'): CausalTrace | null {
    const parent = geometry.get(edge.parentId), child = geometry.get(edge.childId);
    if (!parent || !child) return null;
    const parentCenter = center(parent), childCenter = center(child);
    const a = boundaryToward(parent, childCenter);
    const b = boundaryToward(child, parentCenter);
    return { ...edge, state, a, b, path: curvedPath(edge.action, a, b) };
}

export function describeCausalTraces(project: ProjectState, geometry: GeometryLookup, selection: readonly string[], hoveredId?: string | null, visibleIds?: ReadonlySet<string>): CausalTrace[] {
    const states = causalTraceStates(project, selection, hoveredId);
    const traces: CausalTrace[] = [];
    for (const edge of causalEdges(project)) {
        if (visibleIds && !visibleIds.has(edge.parentId) && !visibleIds.has(edge.childId) && states.get(edge.id) === 'sleep') continue;
        const trace = describeCausalEdge(edge, geometry, states.get(edge.id));
        if (trace) traces.push(trace);
    }
    return traces;
}

/** A geometry lookup that mirrors the Field's drag preview without mutating canonical coordinates. */
export function causalDragGeometry(geometry: GeometryLookup, positions: Record<string, Point>, delta: Point): GeometryLookup {
    return {
        get(id: string): Bounds | undefined {
            const bounds = geometry.get(id);
            const origin = positions[id];
            return bounds && origin ? { ...bounds, x: origin.x + delta.x, y: origin.y + delta.y } : bounds;
        },
    };
}
