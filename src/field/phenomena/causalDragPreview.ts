import type { Gesture } from '../spatial/gesture.ts';
import type { GeometryLookup } from './describe.ts';
import { causalDragGeometry, describeCausalEdge, type CausalTrace } from './causalTrace.ts';

/** Keep causal traces glued to the same transient drag preview as Thoughts. This is paint-only: the
 * project still receives a single thought.move at pointer-up, and lineage stores no coordinates. */
export function paintCausalDragTraces(layer: SVGGElement | null, traces: readonly CausalTrace[], geometry: GeometryLookup, gesture: Gesture | null, zoom: number): void {
    if (!layer) return;
    const delta = gesture ? { x: (gesture.last.x - gesture.start.x) / zoom, y: (gesture.last.y - gesture.start.y) / zoom } : { x: 0, y: 0 };
    const lookup = causalDragGeometry(geometry, gesture?.positions ?? {}, delta);
    const moved = gesture ? new Set(Object.keys(gesture.positions)) : null;
    for (const edge of traces) {
        // Pointer-move work stays local to the dragged selection. A reset may repaint all visible
        // traces once, but steady-state dragging does not scan or recalculate the whole Field.
        if (moved && !moved.has(edge.parentId) && !moved.has(edge.childId)) continue;
        const trace = describeCausalEdge(edge, lookup);
        if (!trace) continue;
        const group = layer.querySelector<SVGGElement>(`[data-causal-id="${CSS.escape(edge.id)}"]`);
        if (!group) continue;
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
