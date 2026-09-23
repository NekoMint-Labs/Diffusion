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
        <g ref={layerRef} className="causal-traces">
            {traces.map(trace => <g key={trace.id} data-causal-id={trace.id} data-causal-action={trace.action} data-causal-state={trace.state} className="causal-trace">
                <path className="causal-trace-hit" d={trace.path}/>
                <path className="causal-trace-visual" d={trace.path}/>
                <circle className="causal-trace-terminal" cx={trace.b.x} cy={trace.b.y} r="1.6"/>
                {trace.action === 'question' && trace.state !== 'sleep' && <text className="causal-trace-question" x={trace.b.x + 8} y={trace.b.y - 7}>?</text>}
            </g>)}
        </g>
    </svg>;
}
