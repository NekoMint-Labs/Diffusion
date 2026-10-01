import type { AIProposalAction, Ghost, Point, ProjectState } from '../../core/model.ts';
import { thoughtHierarchy } from '../../core/hierarchy.ts';
import type { ConnectionStyle } from '../../ui/appearance.ts';
import { routeCausalTrace } from './causalRouting.ts';
import { type Bounds } from '../spatial/geometry.ts';
import { type GeometryLookup } from './describe.ts';

export type CausalTraceState = 'sleep' | 'parent' | 'wake';

export interface CausalEdge {
    id: string;
    parentId: string;
    childId: string;
    action: AIProposalAction;
    relationship?: 'source' | 'organization';
    pending?: boolean;
    depth?: number;
    style?: ConnectionStyle;
    obstacleIds?: string[];
}

export interface CausalTrace extends CausalEdge {
    state: CausalTraceState;
    a: Point;
    b: Point;
    path: string;
    routeBounds?: Bounds;
}

/** Canonical lineage is intentionally tiny: parent ids plus the action on the child. Relations do
 * not participate here, and no visual geometry is ever persisted back into a Thought. */
export function causalEdges(project: ProjectState, ghosts: Record<string, Ghost> = {}): CausalEdge[] {
    const edges: CausalEdge[] = [];
    const hierarchy = thoughtHierarchy({ ...project.thoughts, ...ghosts });
    for (const child of Object.values(project.thoughts)) {
        if (!child.derivedFrom?.length || !child.generationAction) continue;
        for (const parentId of child.derivedFrom) {
            if (parentId === child.id || !project.thoughts[parentId]) continue;
            edges.push({ id: `causal:${parentId}:${child.id}`, parentId, childId: child.id, action: child.generationAction, relationship: 'source', depth: hierarchy.depth.get(child.id) });
        }
    }
    for (const ghost of Object.values(ghosts)) for (const parentId of ghost.scopeIds) {
        if (project.thoughts[parentId]) edges.push({ id: `causal:${parentId}:${ghost.id}`, parentId, childId: ghost.id, action: ghost.proposalAction ?? 'continue', relationship: 'source', pending: true, depth: hierarchy.depth.get(ghost.id) });
    }
    for (const child of Object.values(project.thoughts)) {
        const parentId = child.organizingParentId;
        if (parentId && project.thoughts[parentId] && hierarchy.parent.get(child.id) === parentId && !child.derivedFrom?.includes(parentId)) edges.push({ id: `organization:${parentId}:${child.id}`, parentId, childId: child.id, action: 'continue', relationship: 'organization', depth: hierarchy.depth.get(child.id) });
    }
    return edges.sort((a, b) => a.childId.localeCompare(b.childId) || a.parentId.localeCompare(b.parentId));
}

/** Selecting a Thought wakes its ancestry and one local branch depth. Hover is intentionally more
 * restrained: only the immediate parent edge wakes. This makes the journey legible without turning
 * the resting Field into a graph. */
export function causalTraceStates(project: ProjectState, selection: readonly string[], hoveredId?: string | null, ghosts: Record<string, Ghost> = {}): Map<string, CausalTraceState> {
    const edges = causalEdges(project, ghosts);
    const byChild = new Map<string, CausalEdge[]>();
    const byParent = new Map<string, CausalEdge[]>();
    for (const edge of edges) {
        byChild.set(edge.childId, [...(byChild.get(edge.childId) ?? []), edge]);
        byParent.set(edge.parentId, [...(byParent.get(edge.parentId) ?? []), edge]);
    }

    const wake = new Set<string>();
    const ancestry = new Set(selection.filter(id => !!project.thoughts[id] || !!ghosts[id]));
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

    const hoveredParents = new Set((hoveredId ? byChild.get(hoveredId) : [])?.map(edge => edge.id) ?? []);
    return new Map(edges.map(edge => [edge.id, wake.has(edge.id) ? 'wake' : hoveredParents.has(edge.id) ? 'parent' : 'sleep']));
}

export function describeCausalEdge(edge: CausalEdge, geometry: GeometryLookup, state: CausalTraceState = 'sleep'): CausalTrace | null {
    const parent = geometry.get(edge.parentId), child = geometry.get(edge.childId);
    if (!parent || !child) return null;
    const obstacles = (edge.obstacleIds ?? []).filter(id => id !== edge.parentId && id !== edge.childId).map(id => geometry.get(id)).filter((box): box is Bounds => !!box);
    const route = routeCausalTrace(parent, child, edge.style ?? 'curve', obstacles);
    return route ? { ...edge, state, ...route } : null;
}

export function describeCausalTraces(project: ProjectState, geometry: GeometryLookup, selection: readonly string[], hoveredId?: string | null, visibleIds?: ReadonlySet<string>, ghosts: Record<string, Ghost> = {}, style: ConnectionStyle = 'curve'): CausalTrace[] {
    const states = causalTraceStates(project, selection, hoveredId, ghosts);
    const traces: CausalTrace[] = [];
    const obstacleIds = visibleIds ? [...visibleIds] : [];
    for (const edge of causalEdges(project, ghosts)) {
        if (visibleIds && (!visibleIds.has(edge.parentId) || !visibleIds.has(edge.childId))) continue;
        const trace = describeCausalEdge({ ...edge, style, obstacleIds }, geometry, states.get(edge.id));
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
