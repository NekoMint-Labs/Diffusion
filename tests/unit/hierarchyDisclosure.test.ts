import { expect, it } from 'vitest';
import { resolveWheelZoom } from '../../src/field/spatial/gesture.ts';
import { screenToWorld, zoomCameraAt } from '../../src/field/spatial/geometry.ts';
import { makeThought, createProject, type Ghost } from '../../src/core/model.ts';
import { thoughtHierarchy } from '../../src/core/hierarchy.ts';
import { discloseHierarchy } from '../../src/field/spatial/hierarchyDisclosure.ts';
import { causalEdges, describeCausalTraces } from '../../src/field/phenomena/causalTrace.ts';
import { routeCausalTrace } from '../../src/field/phenomena/causalRouting.ts';
import { normalizeAppearanceSettings } from '../../src/ui/appearance.ts';

it('keeps dense roots as exact anchors with a bounded number of full reading boxes', () => {
    const items = Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`n${i}`, makeThought('Root', { x: i % 50 * 10, y: Math.floor(i / 50) * 10 }, 1, `n${i}`)]));
    const result = discloseHierarchy({ items, hierarchy: thoughtHierarchy(items), found: Object.keys(items), camera: { x: 0, y: 0, zoom: .08 }, viewport: { width: 1280, height: 720 }, selection: [], editing: null, recalls: [], measured: () => undefined });
    expect(result.visible.length).toBeLessThanOrEqual(64);
    expect(result.visible.length + result.roots.length).toBe(5000);
    expect(items.n4999).toMatchObject({ x: 490, y: 990 });
});
it('renders only current parents, preserves Ghost provenance and hides missing endpoints', () => {
    const p = createProject();
    p.thoughts.a = makeThought('a', { x: 0, y: 0 }, 1, 'a');
    p.thoughts.b = makeThought('b', { x: 0, y: 220 }, 1, 'b');
    p.thoughts.c = { ...makeThought('c', { x: 400, y: 0 }, 1, 'c'), derivedFrom: ['a'], generationAction: 'continue', organizingParentId: 'b' };
    const ghosts = { g: { id: 'g', text: 'pending', x: 800, y: 0, createdAt: 1, scopeIds: ['c'] } };
    const before = JSON.stringify(p);
    expect(causalEdges(p, ghosts)).toEqual([expect.objectContaining({ parentId: 'b', childId: 'c', relationship: 'organization' }), expect.objectContaining({ parentId: 'c', childId: 'g', pending: true })]);
    const boxes = Object.fromEntries(Object.values({ ...p.thoughts, ...ghosts }).map(item => [item.id, { ...item, width: 176, height: 60 }]));
    for (const style of ['curve', 'elbow'] as const) {
        const traces = describeCausalTraces(p, { get: id => boxes[id] }, [], null, new Set(['a', 'c', 'g']), ghosts, style);
        expect(traces).toHaveLength(1);
        expect(traces.every(trace => trace.style === style)).toBe(true);
        expect(traces[0].path).toContain(style === 'curve' ? 'C' : 'L');
    }
    expect(JSON.stringify(p)).toBe(before);
    expect(normalizeAppearanceSettings({ connectionStyle: 'elbow' }).connectionStyle).toBe('elbow');
    expect(normalizeAppearanceSettings({ connectionStyle: 'unknown' }).connectionStyle).toBe('curve');
});
it('routes around intermediate wording instead of through its rectangle', () => {
    const parent = { x: 0, y: 100, width: 100, height: 60 }, child = { x: 600, y: 100, width: 100, height: 60 };
    const obstacle = { x: 250, y: 50, width: 200, height: 160 };
    const route = routeCausalTrace(parent, child, 'elbow', [obstacle])!;
    expect(route.a.y).toBe(100); expect(route.b.y).toBe(100);
    expect(route.path).toContain(',22');
    expect(routeCausalTrace(parent, parent, 'curve', [])).toBeNull();
});

it('collapses an adopted original root only in overview detail while retaining its discoverable anchor', () => {
    const items = { a: makeThought('Root', { x: 20, y: 20 }, 1, 'a'), x: { ...makeThought('Originally independent', { x: 600, y: 20 }, 1, 'x'), organizingParentId: 'a' } };
    const result = discloseHierarchy({ items, hierarchy: thoughtHierarchy(items), found: ['a', 'x'], camera: { x: 0, y: 0, zoom: .2 }, viewport: { width: 1440, height: 960 }, selection: [], editing: null, recalls: [], measured: () => undefined });
    expect(result.visible).toEqual(['a']);
    expect(result.roots).toEqual(['x']);
});


it('keeps uncollapsed descendants eligible at every camera scale without editing authored state', () => {
    const items = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`n${i}`, { ...makeThought(`Level ${i}`, { x: i * 200, y: 100 }, 1, `n${i}`), organizingParentId: i ? `n${i - 1}` : null }]));
    const before = JSON.stringify(items), selection = ['n4'];
    const base = { items, hierarchy: thoughtHierarchy(items), found: Object.keys(items), viewport: { width: 1440, height: 960 }, selection, editing: null, recalls: [], measured: () => undefined };
    for (const zoom of [.08, .16, .38, .65, 1, 2.5]) {
        const result = discloseHierarchy({ ...base, camera: { x: 0, y: 0, zoom } });
        expect(result.eligible).toEqual(Object.keys(items));
        expect(result.hidden).toEqual([]);
        if (zoom >= .38) expect(result.visible).toHaveLength(12);
        else expect(new Set([...result.visible, ...result.roots])).toEqual(new Set(Object.keys(items)));
    }
    expect(selection).toEqual(['n4']); expect(JSON.stringify(items)).toBe(before);
});

it('keeps explicit nested folds authoritative during zoom and transient Find reveals', () => {
    const items = {
        a: makeThought('Root', { x: 0, y: 0 }, 1, 'a'),
        b: { ...makeThought('Child', { x: 200, y: 0 }, 1, 'b'), organizingParentId: 'a' },
        c: { ...makeThought('Leaf', { x: 400, y: 0 }, 1, 'c'), organizingParentId: 'b' },
    };
    const branches = { b: false }, before = JSON.stringify(branches);
    const base = { items, branches, hierarchy: thoughtHierarchy(items), found: Object.keys(items), viewport: { width: 1440, height: 960 }, selection: ['c'], editing: null, recalls: [], measured: () => undefined };
    for (const zoom of [.08, .38, .65, 1, 2.5]) {
        const view = { ...base, camera: { x: 0, y: 0, zoom } };
        expect(discloseHierarchy(view).eligible).toEqual(['a', 'b']);
        expect(discloseHierarchy(view).hidden).toEqual(['c']);
        expect(discloseHierarchy({ ...view, currentMatch: 'c' }).visible).toContain('c');
        expect(discloseHierarchy(view).hidden).toEqual(['c']);
    }
    expect(JSON.stringify(branches)).toBe(before);
});

it('retains non-source Atlas anchors and fit bounds without changing provenance', () => {
    const items = {
        source: { ...makeThought('Source', { x: 100, y: 100 }, 1, 'source'), kind: 'source' as const },
        nested: { ...makeThought('Nested', { x: 150, y: 100 }, 1, 'nested'), kind: 'source' as const, derivedFrom: ['source'] },
        a: { ...makeThought('Anchor', { x: 400, y: 200 }, 1, 'a'), derivedFrom: ['nested'], sourceId: 'document' },
        b: { ...makeThought('Deep', { x: 9000, y: 9000 }, 1, 'b'), derivedFrom: ['a'] },
        sibling: { ...makeThought('Other', { x: 800, y: 200 }, 1, 'sibling'), derivedFrom: ['source'] },
        g: { id: 'g', text: 'Pending', x: 1000, y: 300, createdAt: 1, scopeIds: ['a'] },
    };
    const before = JSON.stringify(items);
    const base = { items, hierarchy: thoughtHierarchy(items), found: Object.keys(items), viewport: { width: 1440, height: 960 }, selection: [], editing: null, recalls: [], measured: () => undefined };
    for (const zoom of [.08, .16, .25]) {
        const view = { ...base, camera: { x: 0, y: 0, zoom } };
        const result = discloseHierarchy(view);
        expect(result.visible).toEqual(['a', 'sibling']);
        expect(result.eligible).toEqual(['a', 'b', 'sibling']);
        expect(result.roots).toContain('b'); expect(result.suggestions).toEqual(['g']);
        expect(discloseHierarchy({ ...view, branches: { a: false } }).eligible).toEqual(['a', 'sibling']);
        expect(discloseHierarchy({ ...view, branches: { source: false } }).eligible).toEqual([]);
    }
    expect(JSON.stringify(items)).toBe(before);
});

it('normalizes wheel modes and uses the new pointer after deliberate movement', () => {
    const input = { point: { x: 100, y: 100 }, deltaY: 100, deltaMode: 0, viewportHeight: 720, ctrlKey: false, timeStamp: 100 };
    const first = resolveWheelZoom(null, input);
    expect(first.delta).toBe(100);
    expect(resolveWheelZoom(first.gesture, { ...input, point: { x: 102, y: 101 }, timeStamp: 110 }).gesture.anchor).toEqual(input.point);
    expect(resolveWheelZoom(first.gesture, { ...input, point: { x: 500, y: 300 }, timeStamp: 110 }).gesture.anchor).toEqual({ x: 500, y: 300 });
    expect(resolveWheelZoom(first.gesture, { ...input, point: { x: 104, y: 100 }, timeStamp: 400 }).gesture.anchor).toEqual({ x: 104, y: 100 });
    expect(resolveWheelZoom(null, { ...input, deltaY: 2, deltaMode: 1 }).delta).toBe(32);
    expect(resolveWheelZoom(null, { ...input, deltaY: 2, deltaMode: 2 }).delta).toBe(240);
    expect(resolveWheelZoom(null, { ...input, deltaY: -2, ctrlKey: true })).toMatchObject({ delta: -8, pinch: true });
});
