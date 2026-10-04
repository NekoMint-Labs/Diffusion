import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, type RefObject } from 'react';
import type { Camera, Ghost, Thought, ThinkingOperation } from '../../core/model.ts';
import { SuggestionReview } from './SuggestionReview.tsx';
import { RootReview } from './RootReview.tsx';
import type { GeometryCache } from '../../field/spatial/index.ts';
import { worldToScreen, type Bounds } from '../../field/spatial/geometry.ts';
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
        const controls = [
            { element: scopeElement.current, ids: state.selection.filter(id => state.visibleIds.includes(id)), key: `scope:${state.selection.join(' ')}`, forceDock: false },
            { element: operationElement.current, ids: state.displayOperation?.scopeIds ?? [], key: `operation:${state.displayOperation?.id}`, forceDock: state.dragging },
            { element: reviewElement.current, ids: [], key: 'suggestions', forceDock: true },
            { element: rootsElement.current, ids: [], key: 'roots', forceDock: true },
        ].filter(item => item.element && state.enabled);
        const liveKeys = new Set(controls.map(item => item.key));
        for (const key of docked.current) if (!liveKeys.has(key)) docked.current.delete(key);
        const occupied = state.visibleIds.flatMap(id => {
            return selectionUIBounds([id], state.geometry, state.actionBounds).map(bounds => {
                const point = worldToScreen(bounds, camera);
                return { id, x: viewport.x + point.x, y: viewport.y + point.y, width: bounds.width * camera.zoom, height: bounds.height * camera.zoom };
            });
        });
        const reserved = [...app.querySelectorAll<HTMLElement>('[data-testid="speak"], .notice, .identity, .global-actions')]
            .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
            .map(element => screenRect(element.getBoundingClientRect()));
        const placed: ScopeRect[] = [];
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
        if (!state.enabled) {
            if (scopeElement.current) scopeElement.current.style.display = 'none';
            if (operationElement.current) operationElement.current.style.display = 'none';
            if (reviewElement.current) reviewElement.current.style.display = 'none';
            if (rootsElement.current) rootsElement.current.style.display = 'none';
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
        const laneHeight = waiting.reduce((total, item) => total + item.height + 8, 0);
        const reservedHeight = waiting.length ? laneBottom + laneHeight + 12 : 0;
        app.style.setProperty('--field-dock-height', `${reservedHeight}px`);
        let top = appRect.bottom - laneBottom - laneHeight;
        for (const item of waiting) {
            const left = viewport.x + Math.max(16, (viewport.width - item.width) / 2);
            item.element.style.left = `${left}px`;
            item.element.style.top = `${top}px`;
            if (item.scope) scopeBounds.current = { x: left, y: top, width: item.width, height: item.height };
            top += item.height + 8;
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
            const elements = new Set<Element>([field, ...app.querySelectorAll('.scope-hub, .spatial-operation-feedback, .suggestion-review, [data-testid="speak"], .notice, .progressive-tutorial-coach')]);
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
        {props.roots.length > 0 && <RootReview elementRef={rootsElement} roots={props.roots} onReveal={props.onRevealRoot} />}
        {props.reviewNeeded && props.suggestions.length > 0 && <SuggestionReview elementRef={reviewElement} suggestions={props.suggestions} thoughts={props.thoughts} onAction={props.onSuggestionAction} />}
        {props.scope && <ScopeHub {...props.scope} elementRef={scopeElement} />}
        {displayOperation && <div ref={operationElement} className="spatial-operation-feedback" data-testid="operation-feedback" data-phase={displayOperation.phase} data-operation-id={displayOperation.id} data-origin-scope={displayOperation.scopeIds.join(' ')} data-copy-visible={showCopy || undefined} role="status" aria-live="polite" aria-atomic="true" onPointerDown={event => event.stopPropagation()}>
            <span className="operation-feedback-mark" aria-hidden="true" />
            {showCopy && <span className="operation-feedback-copy">{displayOperation.phase === 'pending' ? t(pendingCopy(displayOperation.kind)) : terminalCopy(displayOperation)}</span>}
            {cancelable && showCopy && <Button variant="ghost" size="sm" className="operation-stop" onClick={() => cancelThinkingOperation(displayOperation.id)}>{t('Stop')}</Button>}
        </div>}
    </>;
});
