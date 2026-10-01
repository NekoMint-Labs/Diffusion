import type { RefObject } from 'react';
import type { CausalTrace } from './causalTrace.ts';

/** Dedicated causal presentation. RelationLayer remains semantic topology; this layer answers only
 * "how did this Thought arise?" Visual and hit geometry are separate from the start, even though
 * the hit path is intentionally inert until a future explicit lineage edit/provenance affordance. */
export function CausalTraceLayer({ layerRef, traces }: {
    layerRef: RefObject<SVGGElement | null>;
    traces: readonly CausalTrace[];
}) {
    return <svg className="phenomena causal-trace-layer" aria-hidden="true">
        <defs><marker id="source-direction" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L5,2.5 L0,5" fill="none" stroke="var(--trace)" strokeWidth="1" /></marker></defs>
        <g ref={layerRef} className="causal-traces">
            {traces.map(trace => <g key={trace.id} data-causal-id={trace.id} data-causal-action={trace.action} data-causal-state={trace.state} data-relationship={trace.relationship ?? 'source'} data-pending={trace.pending || undefined} data-depth={trace.depth} data-line-style={trace.style} className="causal-trace">
                <path className="causal-trace-hit" d={trace.path}/>
                <path className="causal-trace-visual" d={trace.path} markerEnd={trace.relationship === 'organization' ? undefined : 'url(#source-direction)'}/>
                <circle className="causal-trace-terminal" cx={trace.b.x} cy={trace.b.y} r="1.6"/>
                {trace.action === 'question' && trace.state !== 'sleep' && <text className="causal-trace-question" x={trace.b.x + 8} y={trace.b.y - 7}>?</text>}
            </g>)}
        </g>
    </svg>;
}
