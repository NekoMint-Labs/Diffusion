import type { Point, ThoughtKind } from '../../core/model.ts';
import type { Bounds } from './geometry.ts';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export type ThoughtSize = 'compact' | 'regular' | 'wide';
export type ThoughtZoomLevel = 'local' | 'neighborhood' | 'atlas';

export const THOUGHT_WIDTHS: Record<ThoughtSize, Record<ThoughtZoomLevel, number>> = {
    compact: { local: 176, neighborhood: 160, atlas: 140 },
    regular: { local: 256, neighborhood: 228, atlas: 205 },
    wide: { local: 328, neighborhood: 292, atlas: 258 },
};
const SEMANTIC_WIDTHS: Record<Exclude<ThoughtKind, 'thought'>, Record<ThoughtZoomLevel, number>> = {
    crystal: { local: 276, neighborhood: 248, atlas: 240 },
    source: { local: 236, neighborhood: 210, atlas: 190 },
};

const visualUnits = (char: string): number => {
    if (/\p{Mark}/u.test(char)) return 0;
    if (/[，。！？；：、“”‘’（）《》【】—…]/u.test(char) || /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}|\p{Extended_Pictographic}/u.test(char)) return 2;
    if (/\s/u.test(char)) return .5;
    if (/[ilI1'`|.,:;!]/u.test(char)) return .55;
    if (/[MW@%&]/u.test(char)) return 1.35;
    if (/\p{Punctuation}/u.test(char)) return .7;
    return 1;
};

const lineUnits = (line: string) => Array.from(line).reduce((sum, char) => sum + visualUnits(char), 0);

/** A deterministic reading-width class; Unicode scripts and punctuation are weighted by visual advance. */
export function thoughtSizeClass(text: string): ThoughtSize {
    const lines = (text || ' ').split('\n').map(lineUnits);
    const longest = Math.max(...lines);
    const total = lines.reduce((sum, width) => sum + width, 0);
    if (longest <= 12 && total <= 18) return 'compact';
    if (longest >= 42 || total >= 88) return 'wide';
    return 'regular';
}

function estimateAtWidth(text: string, width: number): { width: number; height: number } {
    const unitsPerRow = (width - 16) / 9;
    let rowUnits = 0;
    let rows = 1;
    for (const char of Array.from(text || ' ')) {
        if (char === '\n') {
            rows += 1;
            rowUnits = 0;
            continue;
        }
        const units = visualUnits(char);
        rowUnits += units;
        if (rowUnits > unitsPerRow) {
            rows += 1;
            rowUnits = units;
        }
    }
    return { width, height: clamp(18 + rows * 30, 52, 292) };
}

/** Conservative pre-mount dimensions. The Field's ResizeObserver replaces these after mount. */
export function estimateThoughtSize(text: string): { width: number; height: number } {
    return estimateAtWidth(text, THOUGHT_WIDTHS[thoughtSizeClass(text)].local);
}

/** Crystals and Sources retain their semantic widths instead of inheriting ordinary text classes. */
export function estimateItemSize(item: { text: string; kind?: ThoughtKind }): { width: number; height: number } {
    const width = item.kind && item.kind !== 'thought'
        ? SEMANTIC_WIDTHS[item.kind].local
        : THOUGHT_WIDTHS[thoughtSizeClass(item.text)].local;
    return estimateAtWidth(item.text, width);
}

/** The screen box a Thought occupies in the current view: the canonical reading footprint projected
 * through the camera. Semantic disclosure must collide against this, not a fixed 220x62 box — a
 * stale default let a larger excerpt read as an overlap it never made, so a higher-priority
 * neighbour evicted a Thought that was never actually overlapped on screen. */
export function disclosureBox(text: string, zoom: number, kind: ThoughtKind = 'thought'): { width: number; height: number } {
    const size = estimateItemSize({ text, kind });
    const level: ThoughtZoomLevel = zoom > .62 ? 'local' : zoom > .27 ? 'neighborhood' : 'atlas';
    const semanticWidth = kind === 'thought' ? THOUGHT_WIDTHS[thoughtSizeClass(text)][level] : SEMANTIC_WIDTHS[kind][level];
    const width = level === 'local' ? size.width * zoom : semanticWidth;
    return { width, height: size.height * zoom };
}

export function overlapArea(a: Bounds, b: Bounds): number {
    const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    return width * height;
}

export function severeOverlap(a: Bounds, b: Bounds, ratio = .34): boolean {
    const overlap = overlapArea(a, b);
    if (!overlap) return false;
    return overlap / Math.max(1, Math.min(a.width * a.height, b.width * b.height)) >= ratio;
}

function inside(bounds: Bounds, viewport?: Bounds): boolean {
    return !viewport || bounds.x >= viewport.x && bounds.y >= viewport.y && bounds.x + bounds.width <= viewport.x + viewport.width && bounds.y + bounds.height <= viewport.y + viewport.height;
}

function free(bounds: Bounds, occupied: readonly Bounds[]): boolean {
    return occupied.every(other => overlapArea(bounds, other) === 0);
}

/**
 * Local collision correction only. If the requested position is not severely overlapping anything,
 * it is left alone; otherwise only this rectangle searches outward for the nearest clear slot.
 */
export function correctSevereOverlap(desired: Bounds, occupied: readonly Bounds[], viewport?: Bounds): Point {
    if (!occupied.some(other => severeOverlap(desired, other))) return { x: desired.x, y: desired.y };

    const candidates: Bounds[] = [];
    const step = 28;
    for (let ring = 1; ring <= 18; ring++) {
        const radius = ring * step;
        for (let slot = 0; slot < 16; slot++) {
            const angle = slot * Math.PI / 8;
            candidates.push({ ...desired, x: desired.x + Math.cos(angle) * radius, y: desired.y + Math.sin(angle) * radius });
        }
    }
    const chosen = candidates.find(candidate => inside(candidate, viewport) && free(candidate, occupied));
    if (chosen) return { x: chosen.x, y: chosen.y };

    // A bounded deterministic fallback searches farther rather than accepting a severe overlap.
    for (let row = 1; row <= 24; row++) {
        for (const direction of [1, -1]) {
            const candidate = { ...desired, x: desired.x, y: desired.y + direction * row * (desired.height + 24) };
            if (inside(candidate, viewport) && free(candidate, occupied)) return { x: candidate.x, y: candidate.y };
        }
    }
    // A completely full viewport is not permission to stack objects. Expand locally outside it.
    for (let ring = 19; ring <= 48; ring++) {
        const radius = ring * step;
        for (let slot = 0; slot < 16; slot++) {
            const angle = slot * Math.PI / 8;
            const candidate = { ...desired, x: desired.x + Math.cos(angle) * radius, y: desired.y + Math.sin(angle) * radius };
            if (free(candidate, occupied)) return { x: candidate.x, y: candidate.y };
        }
    }
    return { x: desired.x, y: desired.y };
}
