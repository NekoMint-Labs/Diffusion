import type { Camera, Point } from '../core/model.ts';
import type { ProjectController } from '../core/controller.ts';
import type { ScopeRect } from '../ui/scope/scopePlacement.ts';
import { dismissGhostWithDissolve, presentSpatialTransition } from '../ui/motion/spatialGrammar.ts';
import { correctSevereOverlap } from './spatial/collision.ts';
import { CONTINUATION_DISTANCE, packVisibleProposals, RESULT_PREFERRED_DISTANCE } from './spatial/proposalPlacement.ts';
import { intersects, screenToWorld, unionBounds, viewportBounds, type Bounds } from './spatial/geometry.ts';
import type { GeometryCache } from './spatial/index.ts';
import type { ProposalArrivals } from './spatial/proposalArrivals.ts';

/** Inputs, surfaces and a long Find result own their scrolling instead of zooming the canvas. */
export function ownsWheelInput(target: HTMLElement): boolean {
    if (target.closest('textarea,input,[data-surface]')) return true;
    const reading = target.closest<HTMLElement>('[data-find="current"] .thought-preview');
    return !!reading && reading.scrollHeight > reading.clientHeight;
}

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
export function correctMeasuredGhost(key: string, controller: ProjectController, geometry: GeometryCache, itemIds: string[], camera: Camera, viewport: ViewportRect, screenObstacles: readonly Bounds[] = [], arrivals?: ProposalArrivals): void {
    const ghost = controller.getSnapshot().session.ghosts[key];
    if (!ghost || ghost.spatialDetached || arrivals && !arrivals.batch(key)) return;
    const bounds = geometry.get(key);
    if (!bounds) return;
    const occupied = itemIds.filter(id => id !== key).map(id => geometry.get(id)).filter((candidate): candidate is Bounds => !!candidate);
    const reserved = screenObstacles.map(rect => {
        const point = screenToWorld({ x: rect.x - viewport.left - 12, y: rect.y - viewport.top - 12 }, camera);
        return { ...point, width: (rect.width + 24) / camera.zoom, height: (rect.height + 24) / camera.zoom };
    });
    // A pending arrival must clear even a small obstruction. Intentional canonical overlaps
    // still use the separate severe-overlap policy in the drag path.
    const gap = 6 / camera.zoom;
    const exclusions = occupied.map(box => ({ x: box.x - gap, y: box.y - gap, width: box.width + gap * 2, height: box.height + gap * 2 }));
    const view = viewportBounds(camera, viewport.width, viewport.height, 0);
    if (ghost.proposalAction === 'continue') view.height = Math.max(0, view.height - 64 / camera.zoom);
    const sources = ghost.scopeIds.filter(id => itemIds.includes(id)).map(id => geometry.get(id)).filter((box): box is Bounds => !!box && intersects(box, view));
    // Follow only currently visible sources; a later layout pass must not pull old suggestions
    // into an unrelated camera view. Detached proposals are protected above.
    const scope = unionBounds(sources);
    if (!scope && ghost.scopeIds.length) return;
    const point = correctSevereOverlap(bounds, [], view, [...exclusions, ...reserved], !!scope, scope ?? undefined, ghost.proposalAction === 'continue' ? CONTINUATION_DISTANCE : RESULT_PREFERRED_DISTANCE);
    if (Math.abs(point.x - bounds.x) > .5 || Math.abs(point.y - bounds.y) > .5) {
        controller.moveGhost(key, point);
        geometry.setPosition(key, point.x, point.y);
    }
}

/** Recover an overflowing Continue batch using only its automatic, uncommitted cards. */
export function correctMeasuredProposalBatch(controller: ProjectController, geometry: GeometryCache, itemIds: string[], camera: Camera, viewport: ViewportRect, screenObstacles: readonly Bounds[], arrivals: ProposalArrivals): void {
    const ghosts = Object.values(controller.getSnapshot().session.ghosts);
    const view = viewportBounds(camera, viewport.width, viewport.height, 0);
    view.height = Math.max(0, view.height - 64 / camera.zoom);
    const contains = (box: Bounds) => box.x >= view.x && box.y >= view.y && box.x + box.width <= view.x + view.width && box.y + box.height <= view.y + view.height;
    const groups = new Map<string, typeof ghosts>();
    for (const ghost of ghosts) {
        if (ghost.spatialDetached || ghost.proposalAction !== 'continue' || !itemIds.includes(ghost.id)) continue;
        const batch = arrivals.batch(ghost.id);
        if (!batch) continue;
        const key = JSON.stringify([batch, [...ghost.scopeIds].sort()]);
        groups.set(key, [...groups.get(key) ?? [], ghost]);
    }
    for (const group of groups.values()) {
        const boxes = group.map(ghost => geometry.get(ghost.id));
        if (boxes.some(box => !box) || boxes.every(box => contains(box!))) continue;
        const scope = unionBounds(group[0].scopeIds.filter(id => itemIds.includes(id)).map(id => geometry.get(id)).filter((box): box is Bounds => !!box && intersects(box, view)));
        if (!scope) continue;
        const groupIds = new Set(group.map(ghost => ghost.id)), gap = 6 / camera.zoom;
        const fixed = itemIds.filter(id => !groupIds.has(id)).map(id => geometry.get(id)).filter((box): box is Bounds => !!box).map(box => ({ x: box.x - gap, y: box.y - gap, width: box.width + gap * 2, height: box.height + gap * 2 }));
        for (const rect of screenObstacles) {
            const point = screenToWorld({ x: rect.x - viewport.left - 12, y: rect.y - viewport.top - 12 }, camera);
            fixed.push({ ...point, width: (rect.width + 24) / camera.zoom, height: (rect.height + 24) / camera.zoom });
        }
        const clear = (box: Bounds) => fixed.every(other => box.x >= other.x + other.width || box.x + box.width <= other.x || box.y >= other.y + other.height || box.y + box.height <= other.y);
        const packed = packVisibleProposals(boxes as Bounds[], scope, view, clear, CONTINUATION_DISTANCE, gap);
        if (!packed) continue;
        group.forEach((ghost, index) => { controller.moveGhost(ghost.id, packed[index]); geometry.setPosition(ghost.id, packed[index].x, packed[index].y); });
    }
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

export function relationPlacementObstacles(visible: string[], geometry: GeometryCache, camera: Camera, viewport: ViewportRect, scopePlacement: ScopeRect | null, actionBounds: ReadonlyMap<string, Bounds> = new Map()): Bounds[] {
    const screenRectToWorld = (bounds: Bounds): Bounds => {
        const point = screenToWorld({ x: bounds.x - viewport.left, y: bounds.y - viewport.top }, camera);
        return { x: point.x, y: point.y, width: bounds.width / camera.zoom, height: bounds.height / camera.zoom };
    };
    const obstacles = visible.flatMap(key => {
        const bounds = geometry.get(key);
        if (!bounds) return [];
        const actions = actionBounds.get(key);
        return actions ? [bounds, { ...actions, x: bounds.x + actions.x, y: bounds.y + actions.y }] : [bounds];
    });
    obstacles.push(screenRectToWorld({ x: viewport.left + viewport.width - 190, y: viewport.top, width: 190, height: 90 }));
    if (scopePlacement) obstacles.push(screenRectToWorld(scopePlacement));
    return obstacles;
}

/** Run after coalesced layout, using all mounted reading boxes and current UI exclusions. */
export function correctVisibleGhosts(controller: ProjectController, geometry: GeometryCache, camera: Camera, viewport: ViewportRect, field: HTMLElement | null, world: HTMLElement | null, arrivals: ProposalArrivals, measure = false): void {
    // Initial layout runs before paint. Read every mounted box so child order cannot leave
    // the source at its earlier flat-card size when the first proposal is placed.
    if (measure) for (const element of world?.querySelectorAll<HTMLElement>('[data-thought-id]') ?? []) {
        geometry.measure(element.dataset.thoughtId!, element.offsetWidth, element.offsetHeight);
    }
    const reserved = [...field?.closest('.app')?.querySelectorAll<HTMLElement>('.identity, .global-actions, [data-testid="speak"], .notice') ?? []]
        .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
        .map(element => element.getBoundingClientRect());
    const snapshot = controller.getSnapshot(), ids = [...world?.querySelectorAll<HTMLElement>('[data-thought-id]') ?? []].map(element => element.dataset.thoughtId!);
    for (const ghost of Object.values(snapshot.session.ghosts)) {
        if (world?.querySelector(`[data-thought-id="${CSS.escape(ghost.id)}"]`))
            correctMeasuredGhost(ghost.id, controller, geometry, ids, camera, viewport, reserved, arrivals);
    }
    correctMeasuredProposalBatch(controller, geometry, ids, camera, viewport, reserved, arrivals);
}
