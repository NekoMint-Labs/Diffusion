import type { Gesture } from '../spatial/gesture.ts';
import type { GeometryLookup } from './describe.ts';
import { causalDragGeometry, describeCausalEdge, type CausalTrace } from './causalTrace.ts';
import { intersects } from '../spatial/geometry.ts';

/** Keep causal traces glued to the same transient drag preview as Thoughts. This is paint-only: the
 * project still receives a single thought.move at pointer-up, and lineage stores no coordinates. */
export function paintCausalDragTraces(layer: SVGGElement | null, traces: readonly CausalTrace[], geometry: GeometryLookup, gesture: Gesture | null, zoom: number): void {
    if (!layer) return;
    const delta = gesture ? { x: (gesture.last.x - gesture.start.x) / zoom, y: (gesture.last.y - gesture.start.y) / zoom } : { x: 0, y: 0 };
    const lookup = causalDragGeometry(geometry, gesture?.positions ?? {}, delta);
    const moved = gesture ? new Set(Object.keys(gesture.positions)) : null;
    for (const edge of traces) {
        const group = layer.querySelector<SVGGElement>(`[data-causal-id="${CSS.escape(edge.id)}"]`);
        if (!group) continue;
        // A third card can obstruct a stationary edge. Re-route only incident or touched mounted
        // paths, remembering touched ones until pointer-up so they also recover as the card leaves.
        if (moved && !moved.has(edge.parentId) && !moved.has(edge.childId) && !group.hasAttribute('data-drag-rerouted') && ![...moved].some(id => { const box = lookup.get(id); return box && edge.routeBounds && intersects(box, edge.routeBounds); })) continue;
        if (gesture) group.setAttribute('data-drag-rerouted', 'true');
        else group.removeAttribute('data-drag-rerouted');
        const trace = describeCausalEdge(edge, lookup);
        group.style.visibility = trace ? '' : 'hidden';
        if (!trace) continue;
        for (const path of group.querySelectorAll<SVGPathElement>('path')) path.setAttribute('d', trace.path);
        const terminal = group.querySelector<SVGCircleElement>('.causal-trace-terminal');
        if (terminal) {
            terminal.setAttribute('cx', String(trace.b.x));
            terminal.setAttribute('cy', String(trace.b.y));
        }
        const question = group.querySelector<SVGTextElement>('.causal-trace-question');
        if (question) {
            question.setAttribute('x', String(trace.b.x + 8));
            question.setAttribute('y', String(trace.b.y - 7));
        }
    }
}
