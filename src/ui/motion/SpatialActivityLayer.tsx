import { useReducedMotion } from 'motion/react';
import type { InputRange, Point, ThinkingOperation } from '../../core/model.ts';
import type { GeometryCache } from '../../field/spatial/index.ts';
import { center, type Bounds } from '../../field/spatial/geometry.ts';
import { useOperationPresentation } from './operationPresentation.ts';
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
/** One presentation-only overlay for AI activity and authored spatial transitions.
 * It never writes ProjectState or enters GeometryCache and never accepts pointer input.
 * FieldOverlays owns the measured status text and the request-scoped Stop control. */
export function SpatialActivityLayer({ geometry, operation, structuring, transition }: {
    geometry: GeometryCache;
    operation: ThinkingOperation | null;
    structuring: StructuringPresentation;
    transition: SpatialTransition;
}) {
    const reduced = !!useReducedMotion();
    const { displayOperation } = useOperationPresentation(operation);
    const active = displayOperation?.phase === 'pending';
    const activityHub = displayOperation ? hub(displayOperation.scopeIds, geometry) : null;
    const proposalTarget = structuring?.proposalIds?.length ? hub([structuring.proposalIds[structuring.proposalIds.length - 1]], geometry) : null;
    const transitionHub = transition ? hub(transition.scopeIds, geometry) : null;
    const transitionBounds = transition ? boundsFor(transition.scopeIds, geometry) : [];
    const bridgeBounds = active && displayOperation?.activity === 'bridge' ? boundsFor(displayOperation.scopeIds, geometry) : [];
    const a = bridgeBounds[0] ? center(bridgeBounds[0]) : null;
    const b = bridgeBounds[1] ? center(bridgeBounds[1]) : null;
    const parts = structuring ? inputHighlightText(structuring.text, structuring.highlight) : [];
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

    </div>;
}
