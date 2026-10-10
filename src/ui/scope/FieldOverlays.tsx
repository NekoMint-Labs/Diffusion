import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, type RefObject } from 'react';
import type { Camera, Ghost, Thought, ThinkingOperation } from '../../core/model.ts';
import { SuggestionReview } from './SuggestionReview.tsx';
import { RootReview } from './RootReview.tsx';
import { ConnectionKey } from './ConnectionKey.tsx';
import type { GeometryCache } from '../../field/spatial/index.ts';
import { intersects, worldToScreen, type Bounds } from '../../field/spatial/geometry.ts';
import { selectionUIBounds } from '../../field/useThoughtMeasurements.ts';
import { cancelThinkingOperation, canCancelThinkingOperation } from '../../ai/operationControl.ts';
import { t } from '../../shared/i18n.ts';
import { Button } from '../primitives/Button.tsx';
import { pendingCopy, terminalCopy, useOperationPresentation } from '../motion/operationPresentation.ts';
import { ScopeHub, type ScopeHubProps } from './ScopeHub.tsx';
import { clearScopePlacement, unionScopeBounds, type ScopeRect } from './scopePlacement.ts';

export interface FieldOverlaysHandle { layout: (camera?: Camera) => void; }
interface Props {
    viewport: RefObject<HTMLDivElement | null>;
    camera: () => Camera;
    geometry: GeometryCache;
    actionBounds: ReadonlyMap<string, Bounds>;
    visibleIds: string[];
    selection: string[];
    scope: ScopeHubProps | null;
    operation: ThinkingOperation | null;
    enabled: boolean;
    dragging: boolean;
    onScopeBounds: (bounds: ScopeRect | null) => void;
    suggestions: Ghost[];
    thoughts: Record<string, Thought>;
    reviewNeeded: boolean;
    onSuggestionAction: (ids: string[], action: 'keep' | 'ignore') => void;
    roots: Thought[];
    onRevealRoot: (id: string) => void;
    hasHierarchy: boolean;
    hasRelations: boolean;
    localRelations: boolean;
}
const screenRect = (rect: DOMRect): ScopeRect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });

/** Measured screen-space controls. The Field calls layout from its existing camera frame;
 * no camera values travel through React and controls never enter world geometry or history. */
export const FieldOverlays = forwardRef<FieldOverlaysHandle, Props>(function FieldOverlays(props, forwardedRef) {
    const { displayOperation, showCopy } = useOperationPresentation(props.operation);
    const scopeElement = useRef<HTMLDivElement>(null);
    const operationElement = useRef<HTMLDivElement>(null);
    const reviewElement = useRef<HTMLDivElement>(null);
    const rootsElement = useRef<HTMLDivElement>(null);
    const linesElement = useRef<HTMLDivElement>(null);
    const dockElement = useRef<HTMLDivElement>(null);
    const current = useRef({ ...props, displayOperation });
    current.current = { ...props, displayOperation };
    const docked = useRef(new Set<string>());
    const scopeBounds = useRef<ScopeRect | null>(null);
    const scheduled = useRef<number | null>(null);

    const layout = useCallback((frameCamera?: Camera) => {
        const state = current.current;
        const field = state.viewport.current;
        const app = field?.closest<HTMLElement>('.app');
        if (!field || !app) return;
        const camera = frameCamera ?? state.camera();
        const viewport = screenRect(field.getBoundingClientRect());
        const appRect = app.getBoundingClientRect();
        const key = linesElement.current, identity = app.querySelector<HTMLElement>('.identity');
        if (key) {
            const heading = identity?.getBoundingClientRect();
            const right = app.querySelector<HTMLElement>('.global-actions')?.getBoundingClientRect().left ?? appRect.right - 16;
            const beside = heading && right - heading.right > 420;
            const left = beside ? heading.right + 24 : heading?.left ?? viewport.x + 16;
            const top = heading ? beside ? heading.top + 20 : heading.bottom + 8 : viewport.y + 16;
            Object.assign(key.style, { display: state.enabled ? '' : 'none', left: `${left}px`, top: `${top}px`, maxWidth: `${Math.max(0, right - left - 16)}px` });
        }
        const controls = [
            { element: scopeElement.current, ids: state.selection.filter(id => state.visibleIds.includes(id)), key: `scope:${state.selection.join(' ')}`, forceDock: false },
            { element: operationElement.current, ids: state.displayOperation?.scopeIds ?? [], key: `operation:${state.displayOperation?.id}`, forceDock: state.dragging },
            { element: reviewElement.current, ids: [], key: 'suggestions', forceDock: true },
            { element: rootsElement.current, ids: [], key: 'roots', forceDock: true },
        ].filter(item => item.element && state.enabled);
        const localRows = [...field.querySelectorAll<HTMLElement>('.thought:not(.ghost) .thought-local-actions')];
        const liveKeys = new Set([...controls.map(item => item.key), ...localRows.map(row => `local:${row.closest<HTMLElement>('[data-thought-id]')?.dataset.thoughtId}`)]);
        for (const key of docked.current) if (!liveKeys.has(key)) docked.current.delete(key);
        const occupied = state.visibleIds.flatMap(id => {
            return selectionUIBounds([id], state.geometry, state.actionBounds).map(bounds => {
                const point = worldToScreen(bounds, camera);
                return { id, x: viewport.x + point.x, y: viewport.y + point.y, width: bounds.width * camera.zoom, height: bounds.height * camera.zoom };
            });
        });
        // Mounted card bounds include immediate hierarchy growth before GeometryCache catches up.
        const mountedCards = new Map([...field.querySelectorAll<HTMLElement>('.thought:not(.ghost)[data-thought-id]')].map(element => [element.dataset.thoughtId!, element] as const));
        const committedOccupied = state.visibleIds.flatMap(id => {
            const mounted = mountedCards.get(id);
            if (mounted?.getClientRects().length) return [{ id, ...screenRect(mounted.getBoundingClientRect()) }];
            return occupied.filter(rect => rect.id === id);
        });
        const reserved = [...app.querySelectorAll<HTMLElement>('[data-testid="speak"], .notice, .identity, .global-actions, .field-line-key')]
            .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
            .map(element => screenRect(element.getBoundingClientRect()));
        const placed: ScopeRect[] = [];
        const localPlaced: ScopeRect[] = [];
        const waiting: Array<{ element: HTMLElement; width: number; height: number; scope: boolean }> = [];
        scopeBounds.current = null;
        for (const item of controls) {
            const element = item.element!;
            element.style.display = '';
            element.style.maxWidth = `${Math.max(0, viewport.width - 32)}px`;
            const width = Math.ceil(element.offsetWidth), height = Math.ceil(element.offsetHeight);
            const anchor = unionScopeBounds(selectionUIBounds(item.ids, state.geometry, state.actionBounds).map(bounds => {
                const point = worldToScreen(bounds, camera);
                return { x: viewport.x + point.x, y: viewport.y + point.y, width: bounds.width * camera.zoom, height: bounds.height * camera.zoom };
            }));
            const candidate = anchor && !item.forceDock && !docked.current.has(item.key) ? clearScopePlacement({
                selectionBounds: anchor, viewportBounds: viewport, hubSize: { width, height },
                occupiedRects: [...occupied.filter(rect => !item.ids.includes(rect.id)), ...reserved, ...placed],
            }) : null;
            const isScope = element === scopeElement.current;
            if (candidate) {
                element.style.left = `${candidate.x}px`;
                element.style.top = `${candidate.y}px`;
                element.dataset.scopeSide = candidate.side;
                delete element.dataset.docked;
                placed.push(candidate);
                if (isScope) scopeBounds.current = candidate;
            } else {
                // Once reserved, keep the lane for this scope/request. Otherwise the reduced Field
                // viewport could hide an obstacle, undock, and immediately collide again.
                docked.current.add(item.key);
                waiting.push({ element, width, height, scope: isScope });
                element.dataset.docked = 'true';
                delete element.dataset.scopeSide;
            }
            element.dataset.placed = 'true';
        }
        // Local read/respond controls use their measured footprint rather than the card cache.
        for (const row of localRows) {
            if (!state.enabled) { row.hidePopover(); continue; }
            if (!row.matches(':popover-open')) {
                try { row.showPopover(); } catch { /* Older WebViews may not implement manual popovers. */ }
            }
            const card = row.closest<HTMLElement>('[data-thought-id]');
            if (!card) continue;
            const key = `local:${card.dataset.thoughtId}`;
            const anchor = screenRect(card.getBoundingClientRect());
            const width = row.offsetWidth * camera.zoom, height = row.offsetHeight * camera.zoom;
            const obstacles = [...committedOccupied.filter(rect => rect.id !== card.dataset.thoughtId), ...reserved, ...placed, ...localPlaced];
            const preferred = { x: anchor.x, y: anchor.y + anchor.height + 7, width, height };
            const fits = preferred.x >= viewport.x + 16 && preferred.y >= viewport.y + 16 && preferred.x + width <= viewport.x + viewport.width - 16 && preferred.y + height <= viewport.y + viewport.height - 16;
            const candidate = docked.current.has(key) ? null : fits && !obstacles.some(rect => intersects(preferred, rect)) ? preferred : clearScopePlacement({ selectionBounds: anchor, viewportBounds: viewport, hubSize: { width, height }, occupiedRects: obstacles, offset: 7 });
            Object.assign(row.style, { position: 'fixed', transform: `scale(${camera.zoom})`, transformOrigin: 'top left' });
            if (candidate) {
                Object.assign(row.style, { left: `${candidate.x}px`, top: `${candidate.y}px` });
                delete row.dataset.docked;
                localPlaced.push(candidate);
            } else {
                docked.current.add(key);
                row.dataset.docked = 'true';
                waiting.push({ element: row, width, height, scope: false });
            }
        }
        if (!state.enabled) {
            if (scopeElement.current) scopeElement.current.style.display = 'none';
            if (operationElement.current) operationElement.current.style.display = 'none';
            if (reviewElement.current) reviewElement.current.style.display = 'none';
            if (rootsElement.current) rootsElement.current.style.display = 'none';
            if (linesElement.current) linesElement.current.style.display = 'none';
        }
        // One-time coaching shares the reserved feedback lane instead of covering the Field.
        const coach = app.querySelector<HTMLElement>('.progressive-tutorial-coach');
        if (coach) {
            coach.style.bottom = 'auto';
            coach.style.right = 'auto';
            waiting.push({ element: coach, width: Math.ceil(coach.offsetWidth), height: Math.ceil(coach.offsetHeight), scope: false });
        }
        const noticeHeight = parseFloat(getComputedStyle(app).getPropertyValue('--bottom-notice-height')) || 0;
        const laneBottom = noticeHeight ? noticeHeight + 22 : 12;
        const scopeRow = waiting.find(item => item.scope);
        const companion = scopeRow && waiting.find(item => localRows.includes(item.element) && item.width + scopeRow.width + 16 <= viewport.width - 32);
        const lanes = waiting.filter(item => item !== companion).map(item => item === scopeRow && companion ? [companion, item] : [item]);
        const laneHeight = lanes.reduce((total, lane) => total + Math.max(...lane.map(item => item.height)) + 8, 0);
        const reservesField = waiting.some(item => !localRows.includes(item.element));
        const reservedHeight = reservesField ? laneBottom + laneHeight + 12 : 0;
        app.style.setProperty('--field-dock-height', `${reservedHeight}px`);
        let top = appRect.bottom - laneBottom - laneHeight;
        for (const lane of lanes) {
            const height = Math.max(...lane.map(item => item.height));
            const width = lane.reduce((total, item) => total + item.width, 0) + (lane.length - 1) * 16;
            let left = viewport.x + Math.max(16, (viewport.width - width) / 2);
            for (const item of lane) {
                const y = top + (height - item.height) / 2;
                item.element.style.left = `${left}px`;
                item.element.style.top = `${y}px`;
                if (item.scope) scopeBounds.current = { x: left, y, width: item.width, height: item.height };
                left += item.width + 16;
            }
            top += height + 8;
        }
        if (dockElement.current) {
            Object.assign(dockElement.current.style, { display: waiting.length ? 'block' : 'none', left: `${viewport.x}px`, top: `${appRect.bottom - reservedHeight}px`, width: `${viewport.width}px`, height: `${reservedHeight}px` });
        }
    }, []);
    useImperativeHandle(forwardedRef, () => ({ layout }), [layout]);
    useLayoutEffect(() => {
        layout();
        props.onScopeBounds(scopeBounds.current);
    });
    // Parent DOM refs are attached after child layout effects on the first mount.
    // Start observation after that commit so sibling-only changes also relayout the lane.
    useEffect(() => {
        const field = props.viewport.current;
        const app = field?.closest<HTMLElement>('.app');
        if (!field || !app) return;
        const update = () => {
            if (scheduled.current !== null) return;
            scheduled.current = requestAnimationFrame(() => {
                scheduled.current = null;
                observe();
                layout();
                current.current.onScopeBounds(scopeBounds.current);
            });
        };
        const resize = new ResizeObserver(update);
        const observed = new Set<Element>();
        const observe = () => {
            const elements = new Set<Element>([field, ...app.querySelectorAll('.thought, .thought-local-actions, .scope-hub, .spatial-operation-feedback, .suggestion-review, .field-line-key, [data-testid="speak"], .notice, .progressive-tutorial-coach')]);
            for (const element of observed) if (!elements.has(element)) { resize.unobserve(element); observed.delete(element); }
            for (const element of elements) if (!observed.has(element)) { resize.observe(element); observed.add(element); }
        };
        const mutation = new MutationObserver(update);
        // Only DOM content changes matter. Pointer-frame transform/style writes are not observed.
        mutation.observe(app, { childList: true, subtree: true, characterData: true });
        observe();
        update();
        return () => {
            resize.disconnect(); mutation.disconnect();
            if (scheduled.current !== null) cancelAnimationFrame(scheduled.current);
            scheduled.current = null;
            app.style.removeProperty('--field-dock-height');
        };
    }, [layout, props.viewport]);
    const cancelable = Boolean(displayOperation && displayOperation.phase === 'pending' && canCancelThinkingOperation(displayOperation.id));
    return <>
        <div ref={dockElement} className="field-overlay-dock" aria-hidden="true" />
        <RootReview elementRef={rootsElement} roots={props.roots} thoughts={props.thoughts} onReveal={props.onRevealRoot} />
        <ConnectionKey elementRef={linesElement} hasHierarchy={props.hasHierarchy} hasRelations={props.hasRelations} local={props.localRelations} />
        {props.reviewNeeded && props.suggestions.length > 0 && <SuggestionReview elementRef={reviewElement} suggestions={props.suggestions} thoughts={props.thoughts} onAction={props.onSuggestionAction} />}
        {props.scope && <ScopeHub {...props.scope} elementRef={scopeElement} />}
        {displayOperation && <div ref={operationElement} className="spatial-operation-feedback" data-testid="operation-feedback" data-phase={displayOperation.phase} data-operation-id={displayOperation.id} data-origin-scope={displayOperation.scopeIds.join(' ')} data-copy-visible={showCopy || undefined} role="status" aria-live="polite" aria-atomic="true" onPointerDown={event => event.stopPropagation()}>
            <span className="operation-feedback-mark" aria-hidden="true" />
            {showCopy && <span className="operation-feedback-copy">{displayOperation.phase === 'pending' ? t(pendingCopy(displayOperation.kind)) : terminalCopy(displayOperation)}</span>}
            {cancelable && showCopy && <Button variant="ghost" size="sm" className="operation-stop" onClick={() => cancelThinkingOperation(displayOperation.id)}>{t('Stop')}</Button>}
        </div>}
    </>;
});
