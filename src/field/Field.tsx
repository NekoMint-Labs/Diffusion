import { readableLabels, recallEdge, semanticExcerpt } from './spatial/representation.ts';
import { t } from '../shared/i18n.ts';
import { activeFrontiers } from './spatial/regions.ts';
import { type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type AIProposalKind, type Camera, type Point, type Ghost, type Thought } from '../core/model.ts';
import type { ProjectController } from '../core/controller.ts';
import { useProject } from '../ui/hooks.ts';
import { useUI } from '../ui/store.ts';
import { ThoughtView } from '../ui/thought/ThoughtView.tsx';
import { ScopeHub } from '../ui/scope/ScopeHub.tsx';
import { StructureOverlay } from './phenomena/StructureOverlay.tsx';
import type { ContextualAction } from '../ui/commands/contextualActionModel.ts';
import { computeScopeHubPlacement, unionScopeBounds } from '../ui/scope/scopePlacement.ts';
import { GeometryCache } from './spatial/index.ts';
import { disclosureBox, estimateThoughtSize } from './spatial/collision.ts';
import { center, distanceBetween, fitCameraToBounds, rectangle, scaleLevel, unionBounds, viewportBounds, worldToScreen, type Bounds } from './spatial/geometry.ts';
import { focusFor } from './spatial/focus.ts';
import { CameraController } from './camera/controller.ts';
import { interactionTarget, ownsDoubleClick, ownsKeyboard, ownsPointerGesture, resolveContextTarget, thoughtIdAt } from './spatial/pointerTarget.ts';
import { describeRelations } from './phenomena/describe.ts';
import { paintConfirmedDragRelations } from './phenomena/dragPreview.ts';
import { marqueeCovers } from './spatial/marquee.ts';
import { DRAG_THRESHOLD, PROBE_HOLD, resolveWheelZoom, SCOPE_HANDLE_SELECTOR, type Gesture, type WheelZoomGesture } from './spatial/gesture.ts';
import { CausalTraceLayer, RelationLabels, RelationLayer } from './phenomena/index.ts';
import { describeCausalTraces } from './phenomena/causalTrace.ts';
import { paintCausalDragTraces } from './phenomena/causalDragPreview.ts';
import { FieldBackgroundLayer } from '../ui/fieldBackgrounds/FieldBackgroundLayer.tsx';
import { SpatialActivityLayer } from '../ui/motion/SpatialActivityLayer.tsx';
import { claimWithSettle, dismissGhostWithDissolve, presentMaterialSettle } from '../ui/motion/spatialGrammar.ts';
import type { FieldStyleId } from '../ui/appearance.ts';
import { commitDraggedItems, correctMeasuredGhost, correctSingleDraggedThought, deleteFieldSelection, ignoreRelationCandidate, keepRelationCandidate, relationPlacementObstacles } from './interactionHygiene.ts';
export interface FieldHandle {
    focus: () => void;
    camera: () => Camera;
    restore: (c: Camera) => void;
    centerOn: (ids: string[]) => void;
    reveal: (ids: string[]) => void;
    centerPoint: () => Point;
    zoomOut: () => void;
    visibleIds: () => string[];
    screenPoint: (point: Point) => Point;
    viewBounds: () => Bounds;
}
export interface FieldFind {
    matches: Set<string>;
    current: string | null;
}
interface Props {
    controller: ProjectController;
    onProbeRelation: (ids: string[]) => void;
    scopeActions: ContextualAction[];
    onScopeAction: (id: string) => void;
    onKeepAllProposals: (ids: string[]) => void;
    onKeepOriginalProposal: (ids: string[]) => void;
    onAIProposalAction: (ids: string[], action: 'keep' | 'continue' | 'angle' | 'answer' | 'ignore') => void;
    onMore: (trigger: HTMLElement) => void;
    onRegion: (id: string, point: Point) => void;
    onRelation: (id: string, point: Point) => void;
    onDropText: (text: string, point: Point) => void;
    onSource: (sourceId: string) => void;
    onDropFiles: (files: File[], point: Point) => void;
    onObserve: (ids: string[]) => void;
    onCreateThought: (point: Point) => void;
    onContextMenu: (menu: { scope: 'thought' | 'blank'; point: Point; world: Point }) => void;
    onRevealMatch: (key: string) => void;
    find: FieldFind | null;
    fieldStyle: FieldStyleId;
}
export const Field = forwardRef<FieldHandle, Props>(function Field({ controller, fieldStyle, onProbeRelation, scopeActions, onScopeAction, onKeepAllProposals, onKeepOriginalProposal, onAIProposalAction, onMore, onRegion, onRelation, onDropText, onSource, onDropFiles, onObserve, onCreateThought, onContextMenu, onRevealMatch, find }, forwardedRef) {
    const { project, session } = useProject(controller);
    const ui = useUI();
    const viewport = useRef<HTMLDivElement>(null);
    const world = useRef<HTMLDivElement>(null);
    const lasso = useRef<SVGRectElement>(null);
    const cue = useRef<SVGGElement>(null);
    const relationLayer = useRef<SVGGElement>(null);
    const causalTraceLayer = useRef<SVGGElement>(null);
    const camera = useRef<CameraController | null>(null);
    const geometry = useMemo(() => new GeometryCache(), []);
    const known = useRef(new Set<string>());
    const rect = useRef({ left: 0, top: 0, width: 1440, height: 900 });
    const gesture = useRef<Gesture | null>(null);
    const wheelZoom = useRef<WheelZoomGesture | null>(null);
    const lastClickTarget = useRef<string | undefined>(undefined);
    const space = useRef(false);
    const frame = useRef<number | null>(null);
    const syncPanningCursor = useCallback(() => {
        const element = viewport.current;
        if (!element) return;
        if (space.current || gesture.current?.kind === 'pan') element.dataset.panning = 'true';
        else delete element.dataset.panning;
    }, []);
    const probeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastCull = useRef(0);
    const [visible, setVisible] = useState<string[]>([]);
    const [stableCamera, setStableCamera] = useState(project.camera);
    const [level, setLevel] = useState(scaleLevel(project.camera.zoom));
    const [hoveredThought, setHoveredThought] = useState<string | null>(null);
    const items = useMemo(() => ({ ...project.thoughts, ...session.ghosts }) as Record<string, Thought | Ghost>, [project.thoughts, session.ghosts]);
    const liveItems = useRef(items);
    liveItems.current = items;
    const focus = useMemo(() => focusFor(project, session, ui.selection), [project, session, ui.selection]);
    const correctedGhosts = useRef(new Set<string>());
    useLayoutEffect(() => {
        const state = useUI.getState();
        const selection = state.selection.filter(key => !!items[key]);
        if (selection.length !== state.selection.length || state.editing && !items[state.editing]) state.patch({ selection, editing: state.editing && items[state.editing] ? state.editing : null });
    }, [items]);
    const refreshVisible = useCallback((cam: Camera, force = false) => {
        const now = performance.now();
        if (!force && now - lastCull.current < 85)
            return;
        lastCull.current = now;
        const tier = scaleLevel(cam.zoom);
        setLevel(prev => prev === tier ? prev : tier);
        const found = geometry.index.query(viewportBounds(cam, rect.current.width, rect.current.height));
        const snap = controller.getSnapshot();
        const filtered = found.filter(key => {
            const item = liveItems.current[key];
            if (!item) return false;
            const isGhost = key in snap.session.ghosts;
            if (isGhost && tier !== 'local') return false;
            if ('kind' in item) {
                const selected = useUI.getState().selection.includes(key);
                if (item.life === 'memory' && !snap.session.recalls.includes(key) && !selected) return false;
                // Atlas keeps Crystals primary while selected/kept Thoughts survive as orientation anchors.
                if (tier === 'atlas' && item.kind !== 'crystal' && !(item.kind === 'thought' && (selected || item.kept)))
                    return false;
                if (tier !== 'local' && (item.kind === 'source' || snap.session.recalls.includes(key)))
                    return false;
            }
            return true;
        });
        // Cap representational density; spatial identity remains in canonical state.
        const priority = new Set([...useUI.getState().selection, ...(useUI.getState().editing ? [useUI.getState().editing!] : [])]);
        const disclosed = tier === 'local' ? filtered : readableLabels(filtered.map(key => {
            const item = liveItems.current[key];
            const kind = 'kind' in item ? item.kind : 'thought';
            const landmark = kind === 'crystal';
            const unresolved = 'generationAction' in item && item.generationAction === 'question' || /[?？]/.test(item.text);
            return { ...item, priority: priority.has(key) ? 4 : landmark ? 3 : unresolved ? 2 : 1, ...disclosureBox(item.text, cam.zoom, kind) };
        }), cam, rect.current, 64);
        const ids = [...disclosed.filter(k => priority.has(k)), ...disclosed.filter(k => !priority.has(k))].slice(0, tier === 'local' ? 240 : 64).sort();
        setVisible(old => old.length === ids.length && old.every((x, i) => x === ids[i]) ? old : ids);
    }, [geometry, controller]);
    useEffect(() => {
        const newKeys = new Set(Object.keys(items));
        for (const key of known.current)
            if (!newKeys.has(key))
                geometry.remove(key);
        for (const item of Object.values(items))
            geometry.setPosition(item.id, item.x, item.y);
        correctedGhosts.current = new Set([...correctedGhosts.current].filter(key => newKeys.has(key)));
        known.current = newKeys;
        refreshVisible(camera.current?.get() ?? project.camera, true);
    }, [items, session.recalls, project.camera, geometry, refreshVisible]);
    useEffect(() => {
        if (!world.current || !viewport.current)
            return;
        const measure = () => { const b = viewport.current!.getBoundingClientRect(); rect.current = { left: b.left, top: b.top, width: b.width, height: b.height }; const activeCamera = camera.current?.get();
            if (activeCamera) refreshVisible(activeCamera, true); };
        measure();
        const c = new CameraController(world.current, controller.getSnapshot().project.camera, cam => { setStableCamera(cam); controller.dispatch({ type: 'camera.commit', camera: cam }, 'system'); refreshVisible(cam, true); viewport.current?.removeAttribute('data-camera-moving'); }, cam => refreshVisible(cam));
        camera.current = c;
        const ro = new ResizeObserver(measure);
        ro.observe(viewport.current);
        window.addEventListener('resize', measure);
        const wheel = (e: WheelEvent) => {
            if ((e.target as HTMLElement).closest('textarea,input,[data-surface]'))
                return;
            e.preventDefault();
            if (gesture.current)
                return;
            viewport.current?.setAttribute('data-camera-moving', 'true');
            const resolved = resolveWheelZoom(wheelZoom.current, { point: { x: e.clientX - rect.current.left, y: e.clientY - rect.current.top }, deltaY: e.deltaY, deltaMode: e.deltaMode, viewportHeight: rect.current.height, ctrlKey: e.ctrlKey, timeStamp: e.timeStamp });
            wheelZoom.current = resolved.gesture;
            c.zoom(resolved.gesture.anchor, resolved.delta);
        };
        viewport.current.addEventListener('wheel', wheel, { passive: false });
        const element = viewport.current;
        const down = (e: KeyboardEvent) => { if (!(e.target instanceof HTMLElement) || !element.contains(e.target) || ownsKeyboard(e.target))
            return; if (e.code === 'Space') {
            e.preventDefault();
            space.current = true;
            syncPanningCursor();
        } };
        const up = (e: KeyboardEvent) => { if (e.code === 'Space') {
            space.current = false;
            syncPanningCursor();
        } };
        const blur = () => { space.current = false; syncPanningCursor(); };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', blur);
        return () => { c.destroy(); ro.disconnect(); element.removeEventListener('wheel', wheel); window.removeEventListener('resize', measure); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); if (frame.current !== null)
            cancelAnimationFrame(frame.current); if (probeTimer.current)
            clearTimeout(probeTimer.current); };
    }, [controller, refreshVisible, syncPanningCursor]);
    const frameIds = useCallback((ids: string[], padding = 72, maxZoom = 1.15) => {
        const boxes = ids.map(key => geometry.get(key)).filter((bounds): bounds is Bounds => !!bounds);
        const bounds = unionBounds(boxes);
        const c = camera.current;
        if (!bounds || !c) return;
        c.set(fitCameraToBounds(bounds, rect.current.width, rect.current.height, padding, maxZoom), true);
    }, [geometry]);
    const fitMeaningfulField = useCallback(() => {
        const snapshot = controller.getSnapshot();
        const ids = [
            ...Object.values(snapshot.project.thoughts).filter(thought => thought.life !== 'memory' || snapshot.session.recalls.includes(thought.id)).map(thought => thought.id),
            ...Object.keys(snapshot.session.ghosts),
        ];
        frameIds(ids, 64, 1);
    }, [controller, frameIds]);
    useImperativeHandle(forwardedRef, () => ({
        visibleIds: () => [...visible],
        focus: () => viewport.current?.focus({ preventScroll: true }),
        camera: () => camera.current?.get() ?? project.camera,
        screenPoint: (point) => { const p = worldToScreen(point, camera.current?.get() ?? project.camera); return { x: p.x + rect.current.left, y: p.y + rect.current.top }; },
        viewBounds: () => viewportBounds(camera.current?.get() ?? project.camera, rect.current.width, rect.current.height, 0),
        restore: (c) => { camera.current?.set(c, true); },
        centerPoint: () => camera.current?.worldPoint({ x: rect.current.width / 2 - 125, y: rect.current.height / 2 - 50 }) ?? { x: 300, y: 250 },
        centerOn: (ids) => { const boxes = ids.map(k => geometry.get(k)).filter((b): b is Bounds => !!b); if (!boxes.length)
            return; const b = boxes[0]; const c = camera.current; if (!c)
            return; c.set({ x: rect.current.width / 2 - (b.x + b.width / 2), y: rect.current.height / 2 - (b.y + b.height / 2), zoom: 1 }, true); },
        reveal: (ids) => { const boxes = ids.map(k => geometry.get(k)).filter((b): b is Bounds => !!b); const c = camera.current; if (!boxes.length || !c)
            return; const b = boxes[0]; const zoom = c.get().zoom; c.set({ x: rect.current.width / 2 - (b.x + b.width / 2), y: rect.current.height / 2 - (b.y + b.height / 2), zoom }, true); },
        zoomOut: () => { const c = camera.current; if (c)
            c.zoom({ x: rect.current.width / 2, y: rect.current.height / 2 }, 750); },
    }), [project.camera, geometry, visible]);
    const insideBounds = (b: { x: number; y: number; width: number; height: number }, p: Point) => p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
    const localPoint = (e: {
        clientX: number;
        clientY: number;
    }): Point => ({ x: e.clientX - rect.current.left, y: e.clientY - rect.current.top });
    const resetGesture = () => { gesture.current = null; if (probeTimer.current) {
        clearTimeout(probeTimer.current);
        probeTimer.current = null;
    } if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
    } if (lasso.current)
        lasso.current.style.display = 'none'; if (cue.current)
        cue.current.style.display = 'none'; useUI.getState().patch({ dragging: false }); viewport.current?.removeAttribute('data-dragging'); viewport.current?.removeAttribute('data-drag-kind'); syncPanningCursor(); };
    /** Marquee membership: the rectangle has to *cover* the Thought, not merely touch it
     * (`field/spatial/marquee.ts` holds the decision and its reasoning). */
    const selectMarquee = (g: Gesture, c: CameraController) => {
        const area = rectangle(g.worldStart, c.worldPoint(g.last));
        const covered = (key: string) => { const bounds = geometry.get(key); return !!bounds && marqueeCovers(bounds, area); };
        const ghosts = Object.values(controller.getSnapshot().session.ghosts).filter(ghost => marqueeCovers(geometry.get(ghost.id) ?? { x: ghost.x, y: ghost.y, ...estimateThoughtSize(ghost.text) }, area)).map(ghost => ghost.id);
        const selected = [...new Set([...geometry.index.query(area).filter(key => covered(key) && !!world.current?.querySelector(`[data-thought-id="${CSS.escape(key)}"]`)), ...ghosts])];
        useUI.getState().patch({ selection: g.extend ? [...new Set([...useUI.getState().selection, ...selected])] : selected });
    };
    function pointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        if (e.button !== 0 && e.button !== 1)
            return;
        // One gesture, one pointer-capture owner: a second press during a live gesture used to
        // re-classify it (a middle click turned a drag into a pan), which is another way a gesture
        // could change category halfway through.
        if (gesture.current)
            return;
        if (ownsPointerGesture(e.target))
            return;
        const c = camera.current;
        if (!c)
            return;
        viewport.current?.focus({ preventScroll: true });
        const p = localPoint(e);
        const w = c.worldPoint(p);
        const state = useUI.getState();
        if (state.carry.length && !space.current && e.button === 0) {
            const positions: Record<string, Point> = {};
            const valid = state.carry.map(k => controller.getSnapshot().project.thoughts[k]).filter(Boolean);
            const first = valid[0];
            if (first) {
                for (const t of valid)
                    positions[t.id] = { x: w.x + t.x - first.x, y: w.y + t.y - first.y };
                controller.dispatch({ type: 'thought.move', positions });
                onObserve(valid.map(t => t.id));
            }
            state.patch({ carry: [] });
            return;
        }
        const target = thoughtIdAt(e.target);
        // The Scope Hub is the selection's own handle. Its visible body can be grabbed without
        // turning the press into blank-Field navigation or marquee selection.
        const hub = viewport.current?.querySelector<HTMLElement>(SCOPE_HANDLE_SELECTOR);
        const onScopeHandle = !target && !!hub && insideBounds(hub.getBoundingClientRect(), { x: e.clientX, y: e.clientY });
        const blankField = !target && !onScopeHandle;
        const marquee = blankField && e.button === 0 && e.shiftKey && !space.current;
        const pan = space.current || e.button === 1 || blankField && !marquee;
        let ids: string[] = [];
        if (!pan && !marquee && (target || onScopeHandle)) {
            // The one place a press may change the selection. After this the set belongs to the
            // gesture: the rest of the gesture moves it, and nothing else may touch it.
            if (target) {
                if (e.shiftKey)
                    state.select(target, true);
                else if (!state.selection.includes(target))
                    state.select(target);
            }
            const owning = useUI.getState().selection;
            // A modifier press that has just removed its own target has nothing left of its own to
            // carry, so it drags that one Thought rather than silently moving the rest.
            ids = target && !owning.includes(target) ? [target] : [...owning];
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        gesture.current = { kind: pan ? 'pan' : marquee ? 'marquee' : 'selection', pointerId: e.pointerId, start: p, last: p, worldStart: w, camera: c.get(), target, ids: ids.filter(key => !!liveItems.current[key]), positions: {}, moved: false, extend: marquee, clearSelectionOnClick: blankField && e.button === 0 && !e.shiftKey && !space.current };
        syncPanningCursor();
    }
    function paintGesture() {
        frame.current = null;
        const g = gesture.current;
        const c = camera.current;
        if (!g || !c)
            return;
        const dx = g.last.x - g.start.x, dy = g.last.y - g.start.y;
        if (g.kind === 'pan') {
            c.set({ ...g.camera, x: g.camera.x + dx, y: g.camera.y + dy });
            return;
        }
        if (g.kind === 'marquee') {
            const b = rectangle(g.worldStart, c.worldPoint(g.last));
            if (lasso.current) {
                for (const [k, v] of Object.entries(b))
                    lasso.current.setAttribute(k, String(v));
                lasso.current.style.display = 'block';
            }
            return;
        }
        for (const key of g.ids) {
            const original = g.positions[key];
            if (!original)
                continue;
            const element = world.current?.querySelector<HTMLElement>(`[data-thought-id="${CSS.escape(key)}"]`);
            if (element)
                element.style.transform = `translate(${original.x + dx / c.get().zoom}px, ${original.y + dy / c.get().zoom}px)`;
        }
        // The Thought transform above is only a preview until pointer-up. Keep confirmed topology
        // spatially honest against that preview without touching canonical coordinates.
        paintConfirmedDragRelations(relationLayer.current, activeRelations, geometry, g, c.get().zoom);
        paintCausalDragTraces(causalTraceLayer.current, causalTraces, geometry, g, c.get().zoom);
        const key = g.target;
        if (!key || g.ids.length !== 1 || controller.getSnapshot().session.ghosts[key])
            return;
        const original = geometry.get(key);
        if (!original)
            return;
        const moved = { ...original, x: original.x + dx / c.get().zoom, y: original.y + dy / c.get().zoom };
        const search = { x: moved.x - 80, y: moved.y - 80, width: moved.width + 160, height: moved.height + 160 };
        const candidates = geometry.index.query(search).filter(k => k !== key && !!controller.getSnapshot().project.thoughts[k]);
        let closest: string | undefined;
        let distance = 65;
        for (const k of candidates) {
            const d = distanceBetween(moved, geometry.get(k)!);
            if (d < distance) {
                distance = d;
                closest = k;
            }
        }
        if (!closest) {
            g.probe = undefined;
            if (probeTimer.current) {
                clearTimeout(probeTimer.current);
                probeTimer.current = null;
            }
            if (cue.current)
                cue.current.style.display = 'none';
            return;
        }
        if (g.probe?.id !== closest) {
            g.probe = { id: closest, since: performance.now() };
            if (probeTimer.current)
                clearTimeout(probeTimer.current);
            const target = closest;
            probeTimer.current = setTimeout(() => { if (gesture.current === g && g.probe?.id === target) {
                const text = cue.current?.querySelector('[data-probe-caption]');
                if (text)
                    text.textContent = t('Release to explore');
            } }, PROBE_HOLD);
        }
        const a = center(moved), b = center(geometry.get(closest)!);
        if (cue.current) {
            cue.current.setAttribute('transform', `translate(${(a.x + b.x) / 2},${(a.y + b.y) / 2})`);
            cue.current.style.display = 'block';
            const text = cue.current.querySelector('[data-probe-caption]');
            if (text)
                text.textContent = performance.now() - g.probe.since >= PROBE_HOLD ? t('Release to explore') : t('Hold to explore');
        }
    }
    function pointerMove(e: ReactPointerEvent<HTMLDivElement>) {
        const g = gesture.current;
        if (!g || g.pointerId !== e.pointerId)
            return;
        g.last = localPoint(e);
        if (!g.moved && Math.hypot(g.last.x - g.start.x, g.last.y - g.start.y) > DRAG_THRESHOLD) {
            g.moved = true;
            useUI.getState().patch({ dragging: true });
            viewport.current?.setAttribute('data-dragging', 'true');
            viewport.current?.setAttribute('data-drag-kind', g.kind);
            if (g.kind === 'selection') {
                const snapshot = controller.getSnapshot();
                if (g.target && snapshot.session.recalls.includes(g.target))
                    controller.wake(g.target);
                const current = controller.getSnapshot();
                g.ids = g.ids.filter(k => !!current.project.thoughts[k] || !!current.session.ghosts[k]);
                for (const k of g.ids) {
                    const item = current.project.thoughts[k] ?? current.session.ghosts[k];
                    if (item) g.positions[k] = { x: item.x, y: item.y };
                }
            }
        }
        if (g.moved && frame.current === null)
            frame.current = requestAnimationFrame(paintGesture);
    }
    function pointerUp(e: ReactPointerEvent<HTMLDivElement>) {
        const g = gesture.current;
        const c = camera.current;
        if (!g || !c || g.pointerId !== e.pointerId)
            return;
        g.last = localPoint(e);
        lastClickTarget.current = g.moved ? undefined : g.target;
        if (g.moved)
            paintGesture();
        if (g.kind === 'pan') {
            if (g.moved) c.commit();
            else if (g.clearSelectionOnClick) useUI.getState().patch({ selection: [], relationId: null });
        }
        else if (g.kind === 'marquee') {
            if (g.moved) selectMarquee(g, c);
        }
        else if (g.moved) {
            const positions: Record<string, Point> = {};
            for (const k of g.ids) {
                const p = g.positions[k];
                if (p) positions[k] = { x: p.x + (g.last.x - g.start.x) / c.get().zoom, y: p.y + (g.last.y - g.start.y) / c.get().zoom };
            }
            correctSingleDraggedThought(positions, e.altKey, geometry, Object.keys(liveItems.current), c.get(), rect.current);
            const committed = commitDraggedItems(controller, positions);
            if (committed.canonical.length) onObserve(committed.canonical);
            if (g.target && g.probe && performance.now() - g.probe.since >= PROBE_HOLD)
                onProbeRelation([g.target, g.probe.id]);
        }
        else if (g.target) {
            // Selection never crosses the proposal boundary. Edit / Enter / Keep remain explicit ownership actions.
            const snapshot = controller.getSnapshot();
            if (!snapshot.session.ghosts[g.target]) {
                claimWithSettle(controller, g.target);
                if (snapshot.session.recalls.includes(g.target)) controller.wake(g.target);
                controller.touch([g.target]);
            }
        }
        resetGesture();
        if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
    }
    function pointerCancel() {
        const g = gesture.current;
        if (g) {
            const snapshot = controller.getSnapshot();
            for (const k of g.ids) {
                const item = snapshot.project.thoughts[k] ?? snapshot.session.ghosts[k];
                const el = world.current?.querySelector<HTMLElement>(`[data-thought-id="${CSS.escape(k)}"]`);
                if (item && el)
                    el.style.transform = `translate(${item.x}px, ${item.y}px)`;
            }
            if (g.kind === 'pan')
                camera.current?.set(g.camera);
            if (g.kind === 'selection') {
                paintConfirmedDragRelations(relationLayer.current, activeRelations, geometry, null, camera.current?.get().zoom ?? 1);
                paintCausalDragTraces(causalTraceLayer.current, causalTraces, geometry, null, camera.current?.get().zoom ?? 1);
            }
        }
        resetGesture();
    }
    function doubleClick(e: ReactMouseEvent<HTMLDivElement>) {
        if (ownsDoubleClick(e.target))
            return;
        const key = thoughtIdAt(interactionTarget(e.target)) ?? lastClickTarget.current;
        lastClickTarget.current = undefined;
        if (key) {
            const t = claimWithSettle(controller, key);
            if (t?.kind === 'source' && t.sourceId)
                onSource(t.sourceId);
            else
                useUI.getState().patch({ selection: [key], editing: key });
            return;
        }
        const p = camera.current?.worldPoint(localPoint(e));
        if (!p)
            return;
        onCreateThought(p);
    }
    function contextMenu(e: ReactMouseEvent<HTMLDivElement>) {
        const scope = resolveContextTarget(e.target);
        if (scope === 'ignored')
            return;
        e.preventDefault();
        const c = camera.current;
        if (!c)
            return;
        viewport.current?.focus({ preventScroll: true });
        const point = { x: e.clientX, y: e.clientY };
        const world = c.worldPoint(localPoint(e));
        const state = useUI.getState();
        const key = thoughtIdAt(e.target);
        if (!key) {
            onContextMenu({ scope: 'blank', point, world });
            return;
        }
        if (!state.selection.includes(key))
            state.select(key);
        onContextMenu({ scope: 'thought', point, world });
    }
    const handleThoughtEdit = useCallback((key: string, text: string) => { const snapshot = controller.getSnapshot(); if (snapshot.session.ghosts[key]) presentMaterialSettle([key]); const thought = snapshot.session.ghosts[key] ? controller.claim(key) : snapshot.project.thoughts[key]; if (thought && thought.text !== text) controller.dispatch({ type: 'thought.edit', id: key, text }); useUI.getState().patch({ editing: null }); }, [controller]);
    const handleThoughtCancel = useCallback(() => { const key = useUI.getState().editing; const t = key ? controller.getSnapshot().project.thoughts[key] : null; if (t && !t.text.trim())
        controller.dispatch({ type: 'thought.delete', ids: [t.id] }); useUI.getState().patch({ editing: null, selection: useUI.getState().selection.filter(k => !!controller.getSnapshot().project.thoughts[k] || !!controller.getSnapshot().session.ghosts[k]) }); }, [controller]);
    const handleGhostMeasured = useCallback((key: string) => correctMeasuredGhost(key, correctedGhosts.current, controller, geometry, Object.keys(liveItems.current), camera.current?.get() ?? controller.getSnapshot().project.camera, rect.current), [controller, geometry]);
    const keepCandidate = useCallback((relationId: string) => keepRelationCandidate(controller, relationId), [controller]);
    const ignoreCandidate = useCallback((relationId: string) => ignoreRelationCandidate(controller, relationId), [controller]);
    const renameCandidate = useCallback((relationId: string, label: string) => controller.updatePhenomenon(relationId, { label }), [controller]);
    const selectedBoxes = ui.selection.map(k => geometry.get(k)).filter((b): b is Bounds => !!b);
    const scopeBounds = unionScopeBounds(selectedBoxes.map(bounds => {
        const point = worldToScreen(bounds, stableCamera);
        return { x: point.x + rect.current.left, y: point.y + rect.current.top, width: bounds.width * stableCamera.zoom, height: bounds.height * stableCamera.zoom };
    }));
    const selectedProposalGhosts = ui.selection.map(key => session.ghosts[key]).filter((ghost): ghost is Ghost => !!ghost?.proposal);
    const proposalReview = ui.selection.length > 0 && selectedProposalGhosts.length === ui.selection.length && new Set(selectedProposalGhosts.map(ghost => ghost.origin?.inputId)).size === 1;
    const selectedAIProposalGhosts = ui.selection.map(key => session.ghosts[key]).filter((ghost): ghost is Ghost => !!ghost?.proposalKind);
    const aiProposalKind: AIProposalKind | undefined = ui.selection.length > 0 && selectedAIProposalGhosts.length === ui.selection.length && new Set(selectedAIProposalGhosts.map(ghost => ghost.proposalKind)).size === 1 ? selectedAIProposalGhosts[0].proposalKind : undefined;
    const probing = ui.operation?.phase === 'pending' && ui.operation.kind === 'probe' && ui.operation.scopeIds.length === 2 && ui.operation.scopeIds.every(key => ui.selection.includes(key));
    const hubSize = proposalReview || aiProposalKind ? { width: 390, height: 44 } : ui.selection.length > 1 ? { width: 590, height: 44 } : { width: 520, height: 44 };
    const scopePlacement = scopeBounds ? computeScopeHubPlacement({
        selectionBounds: scopeBounds,
        viewportBounds: { x: rect.current.left, y: rect.current.top, width: rect.current.width, height: rect.current.height },
        occupiedRects: visible.filter(key => !ui.selection.includes(key)).map(key => geometry.get(key)).filter((bounds): bounds is Bounds => !!bounds).map(bounds => {
            const point = worldToScreen(bounds, stableCamera);
            return { x: point.x + rect.current.left, y: point.y + rect.current.top, width: bounds.width * stableCamera.zoom, height: bounds.height * stableCamera.zoom };
        }).concat([{ x: rect.current.left + rect.current.width - 190, y: rect.current.top, width: 190, height: 90 }]),
        hubSize,
    }) : null;
    const showScopeHub = !!scopePlacement && !ui.dragging && !ui.editing && !ui.carry.length && ui.surface === 'none' && !ui.speakFocused;
    const relationObstacles = relationPlacementObstacles(visible, geometry, stableCamera, rect.current, showScopeHub ? scopePlacement : null);
    const visibleSet = new Set(visible); // One frontier read feeds both disclosure and Atlas labels.
    const frontiers = activeFrontiers(project);
    const landmarkCandidates = [
        ...visible.filter(key => project.thoughts[key]?.kind === 'crystal').map(key => ({ ...project.thoughts[key], id: 'crystal:' + key, priority: 3 })),
        ...Object.values(project.regions).map(region => ({ ...region, id: 'region:' + region.id, priority: 2 })),
        ...frontiers.map(key => ({ ...project.thoughts[key], id: 'frontier:' + key, priority: 1 })),
    ];
    const disclosedLandmarks = new Set(level === 'local' ? [] : readableLabels(landmarkCandidates, stableCamera, rect.current));
    const visibleRelation = (p: typeof focus.activeRelations[number]) => visibleSet.has(p.a) && visibleSet.has(p.b) && !!geometry.get(p.a) && !!geometry.get(p.b) && !ui.carry.includes(p.a) && !ui.carry.includes(p.b);
    const activeRelations = level === 'local' ? focus.activeRelations.filter(visibleRelation) : [];
    // Semantic relation existence is independent from transient focus.
    const visibleRelations = level === 'local' ? [...Object.values(project.relations), ...Object.values(session.phenomena)].filter(visibleRelation) : [];
    const activeRelationIds = new Set(activeRelations.map(relation => relation.id));
    const tokenRelations = visibleRelations.filter(relation => !('status' in relation) || activeRelationIds.has(relation.id) || ui.relationId === relation.id);
    const findEmphasis = (key: string): 'current' | 'match' | 'dim' | undefined => {
        if (!find)
            return undefined;
        if (find.current === key)
            return 'current';
        return find.matches.has(key) ? 'match' : 'dim';
    };
    const offscreenMatches = find ? [...find.matches].filter(key => !visibleSet.has(key) && !!project.thoughts[key]).slice(0, 8) : [];
    // Presentation is described once, in world coordinates, and then rendered. The renderer owns
    // its own offsets and classes; the description owns the resolved positions.
    const relationPhenomena = describeRelations(visibleRelations, geometry, false);
    const relationHits = describeRelations(tokenRelations, geometry, false);
    const causalTraces = level === 'atlas' ? [] : describeCausalTraces(project, geometry, ui.selection, hoveredThought, visibleSet);
    return <div ref={viewport} className="field" data-testid="field" data-level={level} data-scope={ui.selection.length > 0 || undefined} tabIndex={0} aria-label={t('Thought Field')} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerCancel} onContextMenu={contextMenu} onLostPointerCapture={() => { if (gesture.current)
        pointerCancel(); }} onDoubleClick={doubleClick} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={e => { e.preventDefault(); const point = camera.current?.worldPoint(localPoint(e)) ?? { x: 200, y: 200 }; if (e.dataTransfer.files.length)
        onDropFiles(Array.from(e.dataTransfer.files), point);
    else
        onDropText(e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain'), point); }} onKeyDown={e => {
            if (ownsKeyboard(e.target))
                return;
            const state = useUI.getState();
            const plainKey = !e.metaKey && !e.ctrlKey && !e.altKey;
            if (plainKey && e.key.toLowerCase() === 'f' && state.selection.length) {
                e.preventDefault();
                frameIds(state.selection, 96, 1.2);
                return;
            }
            if (plainKey && e.key === '0') {
                e.preventDefault();
                fitMeaningfulField();
                return;
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && !state.editing && state.selection.length) {
                e.preventDefault();
                if (deleteFieldSelection(controller, state.selection)) state.patch({ selection: [] });
                return;
            }
            if (e.key === 'Enter') {
                const focused = (e.target as HTMLElement).closest<HTMLElement>('[data-thought-id]')?.dataset.thoughtId;
                const key = focused ?? (state.selection.length === 1 ? state.selection[0] : null);
                if (!key)
                    return;
                e.preventDefault();
                const t = claimWithSettle(controller, key);
                if (t) {
                    state.patch({ selection: [key] });
                    controller.touch([key]);
                }
                if (t?.kind === 'source' && t.sourceId)
                    onSource(t.sourceId);
                else if (t)
                    state.patch({ editing: t.id });
            }
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && state.selection.length) {
                e.preventDefault();
                const delta = e.shiftKey ? 40 : 10;
                const positions: Record<string, Point> = {};
                for (const key of state.selection) {
                    const t = controller.getSnapshot().project.thoughts[key];
                    if (t)
                        positions[key] = { x: t.x + (e.key === 'ArrowLeft' ? -delta : e.key === 'ArrowRight' ? delta : 0), y: t.y + (e.key === 'ArrowUp' ? -delta : e.key === 'ArrowDown' ? delta : 0) };
                }
                if (Object.keys(positions).length) {
                    controller.dispatch({ type: 'thought.move', positions });
                    onObserve(Object.keys(positions));
                }
            }
        }}>
    <FieldBackgroundLayer style={fieldStyle}/>
    <div ref={world} className="world">
     <CausalTraceLayer layerRef={causalTraceLayer} traces={causalTraces}/>
    <RelationLayer layerRef={relationLayer} probe={null} operationId={ui.operation?.id} relations={relationPhenomena} relevantIds={activeRelationIds}/>
    <StructureOverlay proposals={Object.values(session.structures)} geometry={geometry}/>
    <SpatialActivityLayer geometry={geometry} operation={ui.operation} structuring={ui.structuring} transition={ui.spatialTransition}/>
    <svg className="phenomena selection-phenomena" aria-hidden="true"><rect ref={lasso} className="lasso" style={{ display: 'none' }}/><g ref={cue} className="probe-cue" style={{ display: 'none' }}><text>?</text><text data-probe-caption="true" y="24" className="relation-label">{t('Hold to explore')}</text></g></svg>
            {ui.surface !== 'relation' && <RelationLabels relations={relationHits} thoughtBounds={relationObstacles} zoom={stableCamera.zoom} onRelation={onRelation} onKeep={keepCandidate} onIgnore={ignoreCandidate} onRename={renameCandidate}/>}
   {visible.map(key => { if (ui.carry.includes(key))
        return null; const item = items[key]; if (!item)
        return null; return <ThoughtView key={key} item={item} ghost={key in session.ghosts} recalled={session.recalls.includes(key)} selected={ui.selection.includes(key)} settling={ui.spatialTransition?.material === true && ui.spatialTransition.scopeIds.includes(key)} find={findEmphasis(key)} emphasis={!focus.selected.size ? 'normal' : focus.selected.has(key) ? 'selected' : focus.direct.has(key) ? 'direct' : focus.nearby.has(key) ? 'nearby' : focus.peripheral.has(key) ? 'peripheral' : 'receded'} editing={ui.editing === key} level={level} geometry={geometry} onEdit={handleThoughtEdit} onCancel={handleThoughtCancel} onMeasure={handleGhostMeasured} onHover={setHoveredThought} onReject={key => dismissGhostWithDissolve(controller, key, () => { const state = useUI.getState(); state.patch({ selection: state.selection.filter(id => id !== key) }); })}/>; })}
    {offscreenMatches.map((key, index) => { const edge = recallEdge(project.thoughts[key], stableCamera, rect.current.width, rect.current.height, index); const hit = find?.current === key; return <button className="find-edge" data-current={hit || undefined} key={'find-' + key} style={{ left: edge.x, top: edge.y }} onClick={() => onRevealMatch(key)} title={project.thoughts[key].text}><span aria-hidden="true" style={{ display: 'inline-block', transform: `rotate(${edge.angle}deg)` }}>&#8594;</span> {t(hit ? 'Next match' : 'Match elsewhere')}</button>; })}
   {Object.values(project.regions).filter(region => level !== 'local' ? disclosedLandmarks.has('region:' + region.id) : ui.regionId === region.id).map(region => <button className="region-label" data-active={ui.regionId === region.id || undefined} onClick={() => onRegion(region.id, { x: region.x, y: region.y })} key={region.id} style={{ transform: `translate(${region.x}px,${region.y}px) scale(var(--inverse-zoom))` }}><span>{t(region.name)}</span><small>{t('{count} thoughts', { count: region.members.length })}</small></button>)}
   {level === 'atlas' && frontiers.filter(key => disclosedLandmarks.has('frontier:' + key)).map(key => { const t = project.thoughts[key]; return <button className="frontier-label" key={'frontier-' + key} onClick={() => { controller.wake(key); ui.patch({ selection: [key] }); camera.current?.set({ x: rect.current.width / 2 - t.x - 128, y: rect.current.height / 2 - t.y - 30, zoom: 1 }); camera.current?.commit(); }} style={{ transform: `translate(${t.x}px,${t.y}px) scale(var(--inverse-zoom))` }}><span aria-hidden="true">&#9671;</span> {semanticExcerpt(t.text, 'atlas', 'thought')}</button>; })}
  </div>
   {showScopeHub && scopePlacement && <ScopeHub count={ui.selection.length} placement={scopePlacement} actions={scopeActions} probing={probing} proposalReview={proposalReview} aiProposalKind={aiProposalKind} onAction={onScopeAction} onKeepAll={() => onKeepAllProposals([...ui.selection])} onKeepOriginal={() => onKeepOriginalProposal([...ui.selection])} onAIProposalAction={action => onAIProposalAction([...ui.selection], action)} onMore={onMore}/>}
  {ui.carry.length > 0 && <div className="carry-preview">{project.thoughts[ui.carry[0]]?.text.slice(0, 180)}</div>}
  {ui.carry.length > 0 && <div className="carry-banner">{t('Carrying {count} thoughts. Click to place; Escape cancels.', { count: ui.carry.length })}</div>}
    {session.recalls.filter(k => !visibleSet.has(k) && !!project.thoughts[k]).map((k, index) => { const edge = recallEdge(project.thoughts[k], stableCamera, rect.current.width, rect.current.height, index); return <button className="recall-edge" key={k} style={{ left: edge.x, top: edge.y }} onClick={() => { controller.wake(k); ui.patch({ selection: [k], notice: t('Earlier thought awakened. Use Find / Take me there to travel.') }); }} title={project.thoughts[k].text}><span aria-hidden="true" style={{ display: 'inline-block', transform: `rotate(${edge.angle}deg)` }}>&#8594;</span> {t('Earlier thought')}</button>; })}
 </div>;
});
