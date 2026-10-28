import type { Point, ProjectState, Thought } from '../../core/model.ts';
import { validProposition } from '../../core/proposition.ts';
import { disclosureBox, estimateItemSize } from './collision.ts';
import { GridIndex } from './index.ts';

const CLEARANCE = 24;

/** Main is not mounted while comparing a Fork. Reserve conservative kind-aware reading
 * footprints rather than using the Fork's stale measurements or transient proposal sizes.
 * Only a newly brought card moves; existing authored coordinates remain untouched. */
export function placeBroughtThought(project: ProjectState, thought: Thought, thoughtSize = 18): Point {
    const zoom = project.camera.zoom;
    const footprint = (item: Thought) => {
        const size = estimateItemSize(item);
        const reading = disclosureBox(item.text, zoom, item.kind);
        const text = validProposition(item.proposition, item.text) ? item.proposition.text : item.text;
        const font = thoughtSize * (item.kind === 'crystal' ? 20 / 18 : item.kind === 'source' ? 14 / 18 : 1);
        const columns = Math.max(1, Math.floor((size.width - 24) / font));
        const rows = text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(Array.from(line).length / columns)), 0);
        // Short originals and valid propositions can show all lines in the reading trial.
        // Count explicit newlines too; the ordinary estimator caps height at 292px.
        const lines = Array.from(text).length <= 120 ? rows : Math.min(4, rows);
        const height = Math.max(size.height, lines * font * 1.7 + 64);
        // Distant cards counter-scale their reading text; raw world widths would overlap.
        const hierarchyScale = Math.max(1, .56 / zoom);
        return { width: Math.max(size.width * hierarchyScale, reading.width / zoom), height: Math.max(height * hierarchyScale, (reading.height * Math.max(1, thoughtSize / 18) + 64) / zoom) };
    };
    const size = footprint(thought);
    const index = new GridIndex();
    let right = thought.x;
    for (const item of Object.values(project.thoughts)) {
        const occupied = footprint(item);
        index.set(item.id, {
            x: item.x - CLEARANCE, y: item.y - CLEARANCE,
            width: occupied.width + CLEARANCE * 2, height: occupied.height + CLEARANCE * 2,
        });
        right = Math.max(right, item.x + occupied.width + CLEARANCE);
    }
    const clear = (point: Point) => index.query({ ...point, ...size }).length === 0;
    const preferred = { x: thought.x, y: thought.y };
    if (clear(preferred)) return preferred;

    // Search near the requested point first, resolving even partial overlaps.
    for (let ring = 1; ring <= 32; ring++) {
        const radius = ring * 32;
        for (let slot = 0; slot < 16; slot++) {
            const angle = slot * Math.PI / 8;
            const point = { x: preferred.x + Math.cos(angle) * radius, y: preferred.y + Math.sin(angle) * radius };
            if (clear(point)) return point;
        }
    }
    // A dense neighborhood must not turn a bounded search into permission to overlap.
    return { x: right + 1, y: preferred.y };
}
