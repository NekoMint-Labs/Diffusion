import type { Point, ProjectState, SessionState, ThoughtKind } from '../../core/model.ts';
import { GridIndex } from './index.ts';
import { center, distanceBetween, intersects, type Bounds } from './geometry.ts';
import { estimateItemSize } from './collision.ts';
import { estimateRelationLabelSize } from '../phenomena/relationLabelPlacement.ts';

/** Stage G density: generated material should feel locally inhabited, not sprayed across a board. */
export const RESULT_PREFERRED_DISTANCE = { min: 88, target: 136, max: 216 } as const;
const CONTINUATION_DISTANCE = { min: 36, target: 52, max: 128 };

/** Field previews show at most four lines; full wording must not reserve invisible space.
 * Mounted reading geometry supersedes this conservative pre-mount footprint. */
function previewSize(item: { text: string; kind?: ThoughtKind }) {
    const size = estimateItemSize(item);
    return { ...size, height: Math.min(size.height, 18 + 4 * 30) };
}
const RESULT_LOCAL_DENSITY_MARGIN = 96;
const RESULT_CLEARANCE = 18;
export type ResultPlacementMode = 'default' | 'continue' | 'branch' | 'question' | 'evidence' | 'landmark';

const inflate = (bounds: Bounds, amount: number): Bounds => ({ x: bounds.x - amount, y: bounds.y - amount, width: bounds.width + amount * 2, height: bounds.height + amount * 2 });

function normalized(vector: Point): Point | null {
    const length = Math.hypot(vector.x, vector.y);
    return length > 1e-6 ? { x: vector.x / length, y: vector.y / length } : null;
}

function rotate(vector: Point, radians: number): Point {
    const cos = Math.cos(radians), sin = Math.sin(radians);
    return { x: vector.x * cos - vector.y * sin, y: vector.x * sin + vector.y * cos };
}

/** The current trajectory is semantic context, not geometry authored by the model. A single
 * generated Thought can continue along the direction from its nearest durable parent; everything
 * else falls back to the scope's own spatial posture. */
export function lineageDirection(project: ProjectState, bounds: Record<string, Bounds>, scopeIds: string[]): Point | null {
    if (scopeIds.length !== 1) return null;
    const current = project.thoughts[scopeIds[0]];
    const currentBounds = current && bounds[current.id];
    if (!current || !currentBounds) return null;
    const parentId = current.derivedFrom?.find(id => !!project.thoughts[id] && !!bounds[id]);
    if (!parentId) return null;
    const from = center(bounds[parentId]);
    const to = center(currentBounds);
    return normalized({ x: to.x - from.x, y: to.y - from.y });
}

function along(scopeBounds: Bounds, resultSize: { width: number; height: number }, direction: Point, gap: number, lateral = 0): Point {
    const scopeCenter = center(scopeBounds);
    const normal = { x: -direction.y, y: direction.x };
    const scopeRadius = Math.abs(direction.x) * scopeBounds.width / 2 + Math.abs(direction.y) * scopeBounds.height / 2;
    const resultRadius = Math.abs(direction.x) * resultSize.width / 2 + Math.abs(direction.y) * resultSize.height / 2;
    const distance = scopeRadius + resultRadius + gap;
    const resultCenter = { x: scopeCenter.x + direction.x * distance + normal.x * lateral, y: scopeCenter.y + direction.y * distance + normal.y * lateral };
    return { x: resultCenter.x - resultSize.width / 2, y: resultCenter.y - resultSize.height / 2 };
}

function estimatedBounds(project: ProjectState, session: SessionState, measured: Readonly<Record<string, Bounds>>): Record<string, Bounds> {
    return Object.fromEntries([...Object.values(project.thoughts), ...Object.values(session.ghosts)].map(item => {
        const size = measured[item.id] ?? previewSize(item);
        return [item.id, { x: item.x, y: item.y, width: size.width, height: size.height }];
    }));
}

/** Pre-mount placement first chooses a semantic posture, then resolves collisions.
 * Geometry is presentation only: existing canonical coordinates are never rearranged here.
 * Real DOM geometry is still measured after mount and may receive repeated local correction when reading boxes change. */
export function placePossibility(project: ProjectState, session: SessionState, anchor: Point, ordinal = 0, scopeIds: string[] = [], visibleBounds?: Bounds, text = '', mode: ResultPlacementMode = 'default', visibleIds?: ReadonlySet<string>, measured: Readonly<Record<string, Bounds>> = {}): Point {
    const resultSize = previewSize({ text, kind: 'thought' });
    // Keep the separate read control reachable without adding it to Thought geometry.
    const bottomClearance = mode === 'continue' ? 64 / project.camera.zoom : 0;
    const preferredDistance = mode === 'continue' ? CONTINUATION_DISTANCE : RESULT_PREFERRED_DISTANCE;
    const index = new GridIndex();
    const tightIndex = new GridIndex();
    const reserve = (id: string, bounds: Bounds, clearance = 0) => {
        index.set(id, inflate(bounds, clearance));
        tightIndex.set(id, bounds);
    };
    const itemBounds = estimatedBounds(project, session, measured);
    for (const [id, bounds] of Object.entries(itemBounds)) if (!visibleIds || visibleIds.has(id)) reserve(id, bounds, RESULT_CLEARANCE);

    for (const relation of [...Object.values(project.relations), ...Object.values(session.phenomena)]) {
        const a = itemBounds[relation.a], b = itemBounds[relation.b];
        if (!a || !b || visibleIds && (!visibleIds.has(relation.a) || !visibleIds.has(relation.b))) continue;
        const size = estimateRelationLabelSize(relation.label, !('status' in relation));
        const ax = a.x + a.width / 2, ay = a.y + a.height / 2;
        const bx = b.x + b.width / 2, by = b.y + b.height / 2;
        reserve(`relation:${relation.id}`, { x: (ax + bx) / 2 - size.width / 2, y: (ay + by) / 2 - size.height / 2, ...size }, 8);
    }
    if (visibleBounds && !visibleIds) {
        // Reserve the persistent top-right UI chrome. Generated material should prefer content space.
        reserve('__chrome', { x: visibleBounds.x + visibleBounds.width - 210, y: visibleBounds.y, width: 210, height: 100 });
        // The Field identity is screen-space chrome, never part of the card geometry cache.
        reserve('__identity', { x: visibleBounds.x, y: visibleBounds.y, width: visibleBounds.width * .66, height: visibleBounds.height * .14 });
    }

    const fits = (point: Point) => !visibleBounds || point.x >= visibleBounds.x && point.y >= visibleBounds.y && point.x + resultSize.width <= visibleBounds.x + visibleBounds.width && point.y + resultSize.height + bottomClearance <= visibleBounds.y + visibleBounds.height;
    const intoView = (point: Point): Point => !visibleBounds ? point : ({ x: Math.max(visibleBounds.x, Math.min(visibleBounds.x + visibleBounds.width - resultSize.width, point.x)), y: Math.max(visibleBounds.y, Math.min(visibleBounds.y + visibleBounds.height - resultSize.height - bottomClearance, point.y)) });
    const collides = (point: Point) => index.query(inflate({ ...point, ...resultSize }, RESULT_CLEARANCE)).length > 0;
    let origin = anchor;
    const scope = scopeIds.map(key => itemBounds[key]).filter((bounds): bounds is Bounds => !!bounds);
    if (scope.length) {
        const left = Math.min(...scope.map(bounds => bounds.x));
        const top = Math.min(...scope.map(bounds => bounds.y));
        const right = Math.max(...scope.map(bounds => bounds.x + bounds.width));
        const bottom = Math.max(...scope.map(bounds => bounds.y + bounds.height));
        const scopeBounds = { x: left, y: top, width: right - left, height: bottom - top };
        const trajectory = lineageDirection(project, itemBounds, scopeIds);
        const horizontal = scopeBounds.width >= scopeBounds.height;
        const centerX = left + scopeBounds.width / 2;
        const centerY = top + scopeBounds.height / 2;
        origin = { x: centerX - resultSize.width / 2, y: centerY - resultSize.height / 2 };
        const candidates: Point[] = [];
        const trajectoryCandidates: Point[] = [];
        const gaps = [preferredDistance.target, preferredDistance.min, preferredDistance.max, 52, 292, 420, 560];

        for (const gap of gaps) {
            if (mode === 'continue') {
                // Continue first extends the actual incoming trajectory when durable lineage exists.
                // Without one, the local reading axis remains the deterministic fallback.
                if (trajectory) {
                    const lateral = Math.min(54, Math.max(24, scopeBounds.height * .18));
                    trajectoryCandidates.push(along(scopeBounds, resultSize, trajectory, gap), along(scopeBounds, resultSize, trajectory, gap, lateral), along(scopeBounds, resultSize, trajectory, gap, -lateral));
                }
                if (horizontal) {
                    candidates.push(
                        { x: right + gap, y: centerY - resultSize.height / 2 },
                        { x: centerX - resultSize.width / 2, y: bottom + gap },
                        { x: centerX - resultSize.width / 2, y: top - resultSize.height - gap },
                        { x: left - resultSize.width - gap, y: centerY - resultSize.height / 2 },
                    );
                }
                else {
                    candidates.push(
                        { x: centerX - resultSize.width / 2, y: bottom + gap },
                        { x: right + gap, y: centerY - resultSize.height / 2 },
                        { x: left - resultSize.width - gap, y: centerY - resultSize.height / 2 },
                        { x: centerX - resultSize.width / 2, y: top - resultSize.height - gap },
                    );
                }
            }
            else if (mode === 'branch') {
                // Another Angle departs from the current trajectory when it is known. Rotation encodes
                // the semantic branch; collision resolution may move it farther, never back onto the line.
                if (trajectory) {
                    const signs = ordinal % 2 === 0 ? [-1, 1] : [1, -1];
                    for (const sign of signs) {
                        const direction = rotate(trajectory, sign * Math.PI * .32);
                        candidates.push(along(scopeBounds, resultSize, direction, gap));
                    }
                }
                else {
                    const branchOffset = Math.max(72, Math.min(140, (scopeBounds.height + resultSize.height) * .6));
                    const signs = ordinal % 2 === 0 ? [-1, 1] : [1, -1];
                    candidates.push(
                        ...signs.map(sign => ({ x: right + gap, y: centerY - resultSize.height / 2 + sign * branchOffset })),
                        ...signs.map(sign => ({ x: left - resultSize.width - gap, y: centerY - resultSize.height / 2 + sign * branchOffset })),
                    );
                }
            }
            else if (mode === 'question') {
                // Questions live above attention first; diagonals are fallbacks when the top is occupied.
                const offset = Math.min(86, Math.max(36, scopeBounds.width * .22));
                candidates.push(
                    { x: centerX - resultSize.width / 2, y: top - resultSize.height - gap },
                    { x: centerX + offset - resultSize.width / 2, y: top - resultSize.height - gap },
                    { x: centerX - offset - resultSize.width / 2, y: top - resultSize.height - gap },
                    { x: right + gap, y: top - resultSize.height - gap * .35 },
                    { x: left - resultSize.width - gap, y: top - resultSize.height - gap * .35 },
                );
            }
            else if (mode === 'evidence') {
                // Evidence reads like a footnote: subordinate, below the claim, aligned to its local margin.
                const inset = Math.min(42, scopeBounds.width * .12);
                candidates.push(
                    { x: left + inset, y: bottom + gap },
                    { x: centerX - resultSize.width / 2, y: bottom + gap },
                    { x: right - resultSize.width - inset, y: bottom + gap },
                    { x: right + gap, y: bottom + gap * .2 },
                );
            }
            else if (mode === 'landmark') {
                // A new Crystal gets breathing room and becomes a local landmark; no existing item moves.
                candidates.push(
                    { x: centerX - resultSize.width / 2, y: bottom + gap },
                    { x: right + gap, y: centerY - resultSize.height / 2 },
                    { x: left - resultSize.width - gap, y: centerY - resultSize.height / 2 },
                    { x: centerX - resultSize.width / 2, y: top - resultSize.height - gap },
                );
            }
            else {
                const directions = horizontal
                    ? [
                        { x: centerX - resultSize.width / 2, y: bottom + gap },
                        { x: centerX - resultSize.width / 2, y: top - resultSize.height - gap },
                        { x: right + gap, y: centerY - resultSize.height / 2 },
                        { x: left - resultSize.width - gap, y: centerY - resultSize.height / 2 },
                    ]
                    : [
                        { x: right + gap, y: centerY - resultSize.height / 2 },
                        { x: left - resultSize.width - gap, y: centerY - resultSize.height / 2 },
                        { x: centerX - resultSize.width / 2, y: bottom + gap },
                        { x: centerX - resultSize.width / 2, y: top - resultSize.height - gap },
                    ];
                candidates.push(...directions);
            }
        }

        const score = (pool: Point[], tight = false) => pool.map((point, priority) => {
            const bounds = { ...point, ...resultSize };
            const occupied = tight ? tightIndex.query(bounds).length > 0 : collides(point);
            if (!fits(point) || occupied || intersects(bounds, scopeBounds)) return null;
            const distance = distanceBetween(bounds, scopeBounds);
            const bandPenalty = distance < preferredDistance.min ? preferredDistance.min - distance : distance > preferredDistance.max ? distance - preferredDistance.max : 0;
            const nearby = index.query({ x: point.x - RESULT_LOCAL_DENSITY_MARGIN, y: point.y - RESULT_LOCAL_DENSITY_MARGIN, width: resultSize.width + RESULT_LOCAL_DENSITY_MARGIN * 2, height: resultSize.height + RESULT_LOCAL_DENSITY_MARGIN * 2 }).length;
            return { point, score: bandPenalty * 100 + nearby * 18 + Math.abs(distance - preferredDistance.target) * .12 + priority / 1000 };
        }).filter((candidate): candidate is { point: Point; score: number } => !!candidate).sort((a, b) => a.score - b.score);
        // Continue can bend around an obstacle, but search the nearby forward half-plane
        // before settling beside or behind its source. Other modes keep their own posture.
        const nearby = (pool: ReturnType<typeof score>) => pool.find(({ point }) => {
            const advance = trajectory ? (point.x + resultSize.width / 2 - centerX) * trajectory.x + (point.y + resultSize.height / 2 - centerY) * trajectory.y : 0;
            return distanceBetween({ ...point, ...resultSize }, scopeBounds) <= preferredDistance.max && (mode !== 'continue' || !trajectory || advance > 1e-6);
        })?.point;
        // Semantic posture wins while a valid local slot exists. Only then do we escape into a ring.
        const forward = nearby(score(trajectoryCandidates));
        if (forward) return forward;
        const semantic = nearby(score(candidates));
        if (semantic) return semantic;
        // Fixed semantic gaps can miss an edge slot by a few pixels on small windows.
        // Try the same postures inside the safe area before sending arrivals offscreen.
        const bounded = nearby(score(candidates.map(intoView)));
        if (bounded) return bounded;

        const escape: Point[] = [];
        for (let step = 0; step < 64; step++) {
            const n = step + ordinal;
            const ring = 1 + Math.floor(n / 12);
            const angle = (n % 12) * Math.PI / 6;
            escape.push({ x: origin.x + Math.cos(angle) * ring * 280, y: origin.y + Math.sin(angle) * ring * 196 });
        }
        const escaped = nearby(score(escape));
        if (escaped) return escaped;

        // Centered directions and sparse rings can miss nearby corner slots. Search the
        // available view (or the source neighborhood without a view) before accepting a
        // distant direction. Keep existing local semantic slots and collision clearance.
        const searchBounds = visibleBounds ?? {
            x: left - resultSize.width - preferredDistance.max,
            y: top - resultSize.height - preferredDistance.max,
            width: scopeBounds.width + resultSize.width * 2 + preferredDistance.max * 2,
            height: scopeBounds.height + resultSize.height * 2 + preferredDistance.max * 2 + bottomClearance,
        };
        const slots: Point[] = [];
        const maxX = searchBounds.x + searchBounds.width - resultSize.width;
        const maxY = searchBounds.y + searchBounds.height - resultSize.height - bottomClearance;
        const dx = Math.max(24, (maxX - searchBounds.x) / 32);
        const dy = Math.max(24, (maxY - searchBounds.y) / 32);
        for (let x = searchBounds.x; x <= maxX; x += dx)
            for (let y = searchBounds.y; y <= maxY; y += dy) slots.push({ x, y });
        const local = score([...trajectoryCandidates, ...candidates, ...candidates.map(intoView), ...escape, ...slots]);
        const localForward = nearby(local);
        if (localForward) return localForward;
        if (local.length) return local[0].point;
        if (visibleBounds) {
            // Preferred breathing room can exhaust a crowded view even when a non-overlapping
            // slot exists. Use the real footprints before placing a proposal beyond culling,
            // where it cannot mount or receive the measured visibility correction.
            const tight = score(slots, true);
            if (tight.length) return tight[0].point;
        }
    }

    for (let step = 0; step < 72; step++) {
        const n = step + ordinal;
        const ring = 1 + Math.floor(n / 12);
        const angle = (n % 12) * Math.PI / 6;
        const point = { x: origin.x + Math.cos(angle) * ring * 300, y: origin.y + Math.sin(angle) * ring * 210 };
        if (fits(point) && !collides(point)) return point;
    }
    if (visibleBounds) for (let step = 0; step < 24; step++) {
        const angle = step * Math.PI / 12;
        const point = intoView({ x: origin.x + Math.cos(angle) * visibleBounds.width, y: origin.y + Math.sin(angle) * visibleBounds.height });
        if (fits(point) && !collides(point)) return point;
    }
    for (let step = 72; step < 180; step++) {
        const n = step + ordinal;
        const ring = 1 + Math.floor(n / 12);
        const angle = (n % 12) * Math.PI / 6;
        const point = { x: origin.x + Math.cos(angle) * ring * 300, y: origin.y + Math.sin(angle) * ring * 210 };
        if (!collides(point)) return point;
    }
    // The search above is intentionally broad; this is only a deterministic last resort.
    return { x: origin.x + (ordinal + 1) * 360, y: origin.y + 1400 + ordinal * 120 };
}
