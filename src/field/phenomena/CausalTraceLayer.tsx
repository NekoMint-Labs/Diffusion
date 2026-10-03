import type { RefObject } from 'react';
import type { CausalTrace } from './causalTrace.ts';
import { hierarchyStyle } from '../spatial/hierarchyDisclosure.ts';

/** Current organization is separate from semantic Relations and frozen provenance. The child
 * depth owns the line's identity; hover/selection only strengthen its presence. */
export function CausalTraceLayer({ layerRef, traces, zoom = 1 }: {
    layerRef: RefObject<SVGGElement | null>;
    traces: readonly CausalTrace[];
    zoom?: number;
}) {
    return <svg className="phenomena causal-trace-layer" aria-hidden="true">
        <defs>{[1, 2, 3, 4].map(level => <marker key={level} id={`hierarchy-direction-${level}`} viewBox="0 0 8 8" markerWidth={8 / zoom} markerHeight={8 / zoom} refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 Z" fill={`var(--hierarchy-level-${level})`} /></marker>)}</defs>
        <g ref={layerRef} className="causal-traces">
            {traces.map(trace => <g key={trace.id} data-causal-id={trace.id} data-causal-action={trace.action} data-causal-state={trace.state} data-relationship={trace.relationship} data-pending={trace.pending || undefined} data-depth={trace.depth} data-depth-style={hierarchyStyle(trace.depth ?? 1)} data-line-style={trace.style} className="causal-trace">
                <path className="causal-trace-hit" d={trace.path}/>
                <path className="causal-trace-visual" d={trace.path} markerEnd={`url(#hierarchy-direction-${hierarchyStyle(trace.depth ?? 1)})`}/>
                <circle className="causal-trace-terminal" cx={trace.b.x} cy={trace.b.y} r="1.6"/>
                {trace.action === 'question' && trace.state !== 'sleep' && <text className="causal-trace-question" x={trace.b.x + 8} y={trace.b.y - 7}>?</text>}
            </g>)}
        </g>
    </svg>;
}
