import type { Point } from '../../core/model.ts';
import { distanceBetween, type Bounds } from './geometry.ts';

/** A visible proposal stays within the source's reading neighborhood when space permits. */
export const RESULT_PREFERRED_DISTANCE = { min: 88, target: 136, max: 216 } as const;
export const CONTINUATION_DISTANCE = { min: 36, target: 52, max: 128 } as const;

/** Fallback for measured arrivals. Search is bounded and runs
 * only for arrival/layout correction, never on pointer frames. Collision and chrome exclusions
 * remain owned by the caller, so a crowded view cannot relax those safety constraints. */
export function nearbyVisiblePlacement(desired: Bounds, scope: Bounds, view: Bounds, clear: (bounds: Bounds) => boolean, preferred: readonly Point[] = [], distancePolicy: { min: number; target: number; max: number } = RESULT_PREFERRED_DISTANCE): Point | null {
    const maxX = view.x + view.width - desired.width, maxY = view.y + view.height - desired.height;
    if (maxX < view.x || maxY < view.y) return null;
    const clamp = (point: Point): Point => ({ x: Math.max(view.x, Math.min(maxX, point.x)), y: Math.max(view.y, Math.min(maxY, point.y)) });
    const centerX = scope.x + scope.width / 2 - desired.width / 2;
    const centerY = scope.y + scope.height / 2 - desired.height / 2;
    const candidates: Point[] = [...preferred, ...preferred.map(clamp), clamp(desired)];
    for (const gap of [distancePolicy.target, distancePolicy.min, distancePolicy.max, 6]) {
        candidates.push(
            { x: scope.x + scope.width + gap, y: centerY },
            { x: scope.x - desired.width - gap, y: centerY },
            { x: centerX, y: scope.y + scope.height + gap },
            { x: centerX, y: scope.y - desired.height - gap },
        );
    }
    candidates.push(...candidates.map(clamp));
    // Include both far edges: a narrow clear strip must not vanish through grid rounding.
    for (let x = 0; x <= 32; x++) for (let y = 0; y <= 32; y++)
        candidates.push({ x: view.x + (maxX - view.x) * x / 32, y: view.y + (maxY - view.y) * y / 32 });
    let best: { point: Point; score: number } | null = null;
    for (const point of candidates) {
        const bounds = { ...desired, ...point };
        if (point.x < view.x || point.y < view.y || point.x > maxX || point.y > maxY || !clear(bounds)) continue;
        const distance = distanceBetween(bounds, scope);
        const bandPenalty = distance < distancePolicy.min ? distancePolicy.min - distance : distance > distancePolicy.max ? distance - distancePolicy.max : 0;
        // Source proximity precedes a tiny displacement tie-break. A quiet but distant corner
        // must not beat a safe nearby slot just because fewer cards surround it.
        const score = bandPenalty * 100 + Math.abs(distance - distancePolicy.target) + Math.hypot(point.x - desired.x, point.y - desired.y) / 10000;
        if (!best || score < best.score) best = { point, score };
    }
    return best?.point ?? null;
}

/** A small batch may need to share the free area instead of letting the first rectangle block
 * every later arrival. Only automatic proposals participate; callers reserve canonical and
 * deliberately detached geometry. The bounded search either places the entire batch or does nothing. */
export function packVisibleProposals(desired: readonly Bounds[], scope: Bounds, view: Bounds, clear: (bounds: Bounds) => boolean, distancePolicy = CONTINUATION_DISTANCE, gap = 6): Point[] | null {
    if (desired.length < 2 || desired.length > 5) return null;
    const choices = desired.map(box => {
        const candidates: Bounds[] = [];
        const maxX = view.x + view.width - box.width, maxY = view.y + view.height - box.height;
        for (let x = 0; x <= 32; x++) for (let y = 0; y <= 32; y++) {
            const candidate = { ...box, x: view.x + (maxX - view.x) * x / 32, y: view.y + (maxY - view.y) * y / 32 };
            if (maxX >= view.x && maxY >= view.y && clear(candidate)) candidates.push(candidate);
        }
        if (box.x >= view.x && box.y >= view.y && box.x <= maxX && box.y <= maxY && clear(box)) candidates.push(box);
        return candidates.sort((a, b) => {
            const score = (candidate: Bounds) => Math.abs(distanceBetween(candidate, scope) - distancePolicy.target) + Math.hypot(candidate.x - box.x, candidate.y - box.y) / 10000;
            return score(a) - score(b);
        }).slice(0, 160);
    });
    const placed: Bounds[] = [];
    let budget = 12000;
    const overlaps = (a: Bounds, b: Bounds) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    const search = (index: number): boolean => {
        if (index === choices.length) return true;
        for (const candidate of choices[index]) {
            if (placed.some(other => overlaps(candidate, { x: other.x - gap, y: other.y - gap, width: other.width + gap * 2, height: other.height + gap * 2 }))) continue;
            if (--budget < 0) return false;
            placed.push(candidate);
            if (search(index + 1)) return true;
            placed.pop();
        }
        return false;
    };
    return search(0) ? placed.map(({ x, y }) => ({ x, y })) : null;
}
