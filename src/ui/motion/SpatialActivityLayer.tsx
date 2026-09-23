import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { InputRange, Point, ThinkingOperation } from '../../core/model.ts';
import type { GeometryCache } from '../../field/spatial/index.ts';
import { center, type Bounds } from '../../field/spatial/geometry.ts';
import { cancelThinkingOperation, canCancelThinkingOperation } from '../../ai/operationControl.ts';
import { t } from '../../shared/i18n.ts';
import { Button } from '../primitives/Button.tsx';
import { inputHighlightText } from './spatialGrammar.ts';

type StructuringPresentation = { inputId: string; text: string; point: Point; requestId?: string; phase: 'active' | 'partial' | 'settling'; highlight?: InputRange[]; proposalIds?: string[] } | null;
type SpatialTransition = { id: string; kind: 'converge' | 'dissolve' | 'settle' | 'arrive'; scopeIds: string[]; material?: true } | null;

function boundsFor(ids: string[], geometry: GeometryCache): Bounds[] {
    return ids.map(id => geometry.get(id)).filter((value): value is Bounds => !!value);
}
function hub(ids: string[], geometry: GeometryCache): { x: number; y: number } | null {
    const bounds = boundsFor(ids, geometry);
    if (!bounds.length) return null;
    const points = bounds.map(center);
    return { x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length };
}
function pendingCopy(kind: ThinkingOperation['kind']): string {
    switch (kind) {
        case 'continue': return 'Continuing this line...';
        case 'angle': case 'diffuse': return 'Looking from another direction...';
        case 'question': return 'Looking for a useful question...';
        case 'probe': return 'Looking for a relation...';
        case 'verify': return 'Looking for supporting or challenging evidence...';
        case 'organize': return 'Looking for structure already here...';
        case 'bring': return 'Bringing this reference...';
        case 'ingest': return 'Finding structure in your words...';
        default: return 'Thinking with this scope...';
    }
}
function operationLabel(kind: ThinkingOperation['kind']): string {
    switch (kind) {
        case 'continue': return t('Continue');
        case 'angle': case 'diffuse': return t('Another Angle');
        case 'question': return t('Ask');
        case 'probe': return t('Explore');
        case 'verify': return t('Verify');
        case 'organize': return t('Organize');
        case 'bring': return t('Reference');
        case 'ingest': return t('Structure');
        default: return t('Think');
    }
}
function terminalCopy(operation: ThinkingOperation): string {
    if (operation.phase === 'failed') return t('This action did not finish.');
    if (operation.phase === 'cancelled') return t('Stopped.');
    if (operation.resultCount !== undefined)
        return t(operation.resultCount === 1 ? '{count} result · {action}' : '{count} results · {action}', { count: operation.resultCount, action: operationLabel(operation.kind) });
    return t('Settled.');
}

/** One presentation-only overlay for AI activity and authored spatial transitions.
 * It never writes ProjectState, never enters GeometryCache, and only its explicit Stop control
 * accepts pointer input. Fast operations acknowledge spatially but avoid flashing status copy. */
export function SpatialActivityLayer({ geometry, operation, structuring, transition }: {
    geometry: GeometryCache;
    operation: ThinkingOperation | null;
    structuring: StructuringPresentation;
    transition: SpatialTransition;
}) {
    const reduced = !!useReducedMotion();
    const [displayOperation, setDisplayOperation] = useState<ThinkingOperation | null>(operation);
    const [showCopy, setShowCopy] = useState(false);
    const beganAt = useRef<{ id: string; at: number } | null>(null);
    useEffect(() => {
        if (!operation) { setDisplayOperation(null); setShowCopy(false); return; }
        setDisplayOperation(operation);
        if (operation.phase === 'pending') {
            beganAt.current = beganAt.current?.id === operation.id ? beganAt.current : { id: operation.id, at: performance.now() };
            setShowCopy(false);
            const timer = setTimeout(() => setShowCopy(true), 190);
            return () => clearTimeout(timer);
        }
        const elapsed = beganAt.current?.id === operation.id ? performance.now() - beganAt.current.at : 1000;
        const wasLongEnough = elapsed >= 180;
        setShowCopy(wasLongEnough);
        const timer = setTimeout(() => { setDisplayOperation(null); setShowCopy(false); }, wasLongEnough ? (operation.phase === 'completed' ? 520 : 1000) : 180);
        return () => clearTimeout(timer);
    }, [operation?.id, operation?.phase]);

    const active = displayOperation?.phase === 'pending';
    const activityHub = displayOperation ? hub(displayOperation.scopeIds, geometry) : null;
    const proposalTarget = structuring?.proposalIds?.length ? hub([structuring.proposalIds[structuring.proposalIds.length - 1]], geometry) : null;
    const transitionHub = transition ? hub(transition.scopeIds, geometry) : null;
    const transitionBounds = transition ? boundsFor(transition.scopeIds, geometry) : [];
    const bridgeBounds = active && displayOperation?.activity === 'bridge' ? boundsFor(displayOperation.scopeIds, geometry) : [];
    const a = bridgeBounds[0] ? center(bridgeBounds[0]) : null;
    const b = bridgeBounds[1] ? center(bridgeBounds[1]) : null;
    const parts = structuring ? inputHighlightText(structuring.text, structuring.highlight) : [];
    const cancelable = Boolean(displayOperation && displayOperation.phase === 'pending' && canCancelThinkingOperation(displayOperation.id));
    return <div className="spatial-activity-layer" data-testid="spatial-activity-layer" data-reduced-motion={reduced || undefined}>
        {structuring && <div className="input-seed" data-testid="input-seed" data-phase={structuring.phase} style={{ transform: `translate(${structuring.point.x}px, ${structuring.point.y}px)` }}>
            <p>{parts.map((part, index) => <span key={index} data-provenance-highlight={part.highlighted || undefined}>{part.text}</span>)}</p>
            {structuring.phase === 'active' && !reduced && <span className="seed-breath" aria-hidden="true"/>}
        </div>}
        <div className="spatial-nonsemantic-activity" aria-hidden="true">
            {!reduced && structuring && structuring.phase !== 'settling' && proposalTarget && <svg className="activity-svg provenance-activity"><line x1={structuring.point.x + 120} y1={structuring.point.y + 32} x2={proposalTarget.x} y2={proposalTarget.y}/></svg>}
            {!reduced && active && displayOperation?.activity === 'radiate' && activityHub && <div className="radiate-activity" data-testid="radiate-activity" style={{ transform: `translate(${activityHub.x}px, ${activityHub.y}px)` }}><i/><i/><i/></div>}
            {!reduced && active && displayOperation?.activity === 'bridge' && a && b && <svg className="activity-svg bridge-activity" data-testid="bridge-activity"><line x1={a.x} y1={a.y} x2={b.x} y2={b.y}/></svg>}
            {active && displayOperation?.activity === 'anchor' && activityHub && <div className="anchor-activity" data-testid="anchor-activity" style={{ transform: `translate(${activityHub.x + 24}px, ${activityHub.y}px)` }}><span/></div>}
            {transition?.kind === 'converge' && transitionHub && transitionBounds.length > 1 && <svg className="activity-svg converge-traces" data-testid="converge-traces">{transitionBounds.map((bounds, index) => { const point = center(bounds); return <line key={index} x1={point.x} y1={point.y} x2={transitionHub.x} y2={transitionHub.y}/>; })}</svg>}
            {transition && (transition.kind !== 'settle' || !transition.material) && transitionHub && <div className={`spatial-transition ${transition.kind}`} data-testid={`${transition.kind}-activity`} style={{ left: transitionHub.x, top: transitionHub.y }}/>}
        </div>
        {displayOperation && activityHub && <div className="spatial-operation-feedback" data-testid="operation-feedback" data-phase={displayOperation.phase} data-copy-visible={showCopy || undefined} style={{ left: activityHub.x, top: activityHub.y }} role="status" aria-live="polite">
            <span className="operation-feedback-mark" aria-hidden="true"/>
            {showCopy && <span className="operation-feedback-copy">{displayOperation.phase === 'pending' ? t(pendingCopy(displayOperation.kind)) : terminalCopy(displayOperation)}</span>}
            {cancelable && showCopy && <Button variant="ghost" size="sm" className="operation-stop" onClick={() => cancelThinkingOperation(displayOperation.id)}>{t('Stop')}</Button>}
        </div>}
    </div>;
}
