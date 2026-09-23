import type { Camera, Point } from '../core/model.ts';
import type { ProjectController } from '../core/controller.ts';
import type { ScopePlacement } from '../ui/scope/scopePlacement.ts';
import { dismissGhostWithDissolve, presentSpatialTransition } from '../ui/motion/spatialGrammar.ts';
import { correctSevereOverlap } from './spatial/collision.ts';
import { screenToWorld, viewportBounds, type Bounds } from './spatial/geometry.ts';
import type { GeometryCache } from './spatial/index.ts';

interface ViewportRect { left: number; top: number; width: number; height: number; }

export function correctSingleDraggedThought(positions: Record<string, Point>, bypass: boolean, geometry: GeometryCache, itemIds: string[], camera: Camera, viewport: ViewportRect): string[] {
    const movedIds = Object.keys(positions);
    if (movedIds.length !== 1 || bypass) return movedIds;
    const key = movedIds[0];
    const current = geometry.get(key);
    if (!current) return movedIds;
    const desired = { ...current, ...positions[key] };
    const occupied = itemIds.filter(id => id !== key).map(id => geometry.get(id)).filter((bounds): bounds is Bounds => !!bounds);
    positions[key] = correctSevereOverlap(desired, occupied, viewportBounds(camera, viewport.width, viewport.height, 0));
    return movedIds;
}


/** Commit one drag without collapsing transient and canonical authority into one path.
 * Canonical Thoughts get one undoable `thought.move`; Ghosts stay in SessionState and are marked
 * detached because the person explicitly repositioned them. */
export function commitDraggedItems(controller: ProjectController, positions: Record<string, Point>): { canonical: string[]; ghosts: string[] } {
    const snapshot = controller.getSnapshot();
    const canonicalPositions: Record<string, Point> = {};
    const ghostMoves: Array<[string, Point]> = [];
    for (const [key, point] of Object.entries(positions)) {
        if (snapshot.project.thoughts[key]) canonicalPositions[key] = point;
        else if (snapshot.session.ghosts[key]) ghostMoves.push([key, point]);
    }
    const canonical = Object.keys(canonicalPositions);
    if (canonical.length) controller.dispatch({ type: 'thought.move', positions: canonicalPositions });
    for (const [key, point] of ghostMoves) controller.moveGhost(key, point, { detach: true });
    return { canonical, ghosts: ghostMoves.map(([key]) => key) };
}
export function correctMeasuredGhost(key: string, corrected: Set<string>, controller: ProjectController, geometry: GeometryCache, itemIds: string[], camera: Camera, viewport: ViewportRect): void {
    if (corrected.has(key) || !controller.getSnapshot().session.ghosts[key]) return;
    const bounds = geometry.get(key);
    if (!bounds) return;
    corrected.add(key);
    const occupied = itemIds.filter(id => id !== key).map(id => geometry.get(id)).filter((candidate): candidate is Bounds => !!candidate);
    const point = correctSevereOverlap(bounds, occupied, viewportBounds(camera, viewport.width, viewport.height, 0));
    if (Math.abs(point.x - bounds.x) > .5 || Math.abs(point.y - bounds.y) > .5) controller.moveGhost(key, point);
}

export function keepRelationCandidate(controller: ProjectController, relationId: string): void {
    const relation = controller.getSnapshot().session.phenomena[relationId];
    if (!relation) return;
    presentSpatialTransition('settle', [relation.a, relation.b]);
    controller.confirmPhenomenon(relationId);
}

export function ignoreRelationCandidate(controller: ProjectController, relationId: string): void {
    const relation = controller.getSnapshot().session.phenomena[relationId];
    if (!relation) return;
    presentSpatialTransition('dissolve', [relation.a, relation.b]);
    const dismiss = () => controller.dismissPhenomenon(relationId);
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) dismiss();
    else setTimeout(dismiss, 150);
}

export function deleteFieldSelection(controller: ProjectController, selection: string[]): boolean {
    const snapshot = controller.getSnapshot();
    const canonical = selection.filter(key => !!snapshot.project.thoughts[key]);
    const ghosts = selection.filter(key => !!snapshot.session.ghosts[key]);
    if (canonical.length) controller.dispatch({ type: 'thought.delete', ids: canonical });
    for (const key of ghosts) dismissGhostWithDissolve(controller, key);
    return canonical.length + ghosts.length > 0;
}

export function relationPlacementObstacles(visible: string[], geometry: GeometryCache, camera: Camera, viewport: ViewportRect, scopePlacement: ScopePlacement | null): Bounds[] {
    const screenRectToWorld = (bounds: Bounds): Bounds => {
        const point = screenToWorld({ x: bounds.x - viewport.left, y: bounds.y - viewport.top }, camera);
        return { x: point.x, y: point.y, width: bounds.width / camera.zoom, height: bounds.height / camera.zoom };
    };
    const obstacles = visible.map(key => geometry.get(key)).filter((bounds): bounds is Bounds => !!bounds);
    obstacles.push(screenRectToWorld({ x: viewport.left + viewport.width - 190, y: viewport.top, width: 190, height: 90 }));
    if (scopePlacement) obstacles.push(screenRectToWorld(scopePlacement));
    return obstacles;
}
