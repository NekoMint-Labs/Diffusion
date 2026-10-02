import { expect, it } from 'vitest';
import { resolveWheelZoom } from '../../src/field/spatial/gesture.ts';
import { screenToWorld, zoomCameraAt } from '../../src/field/spatial/geometry.ts';
import { makeThought, createProject, type Ghost } from '../../src/core/model.ts';
import { thoughtHierarchy } from '../../src/core/hierarchy.ts';
import { discloseHierarchy, hierarchyWheelZoom, zoomDepth } from '../../src/field/spatial/hierarchyDisclosure.ts';
import { causalEdges, describeCausalTraces } from '../../src/field/phenomena/causalTrace.ts';
import { routeCausalTrace } from '../../src/field/phenomena/causalRouting.ts';
import { normalizeAppearanceSettings } from '../../src/ui/appearance.ts';

it('has stable reversible depth boundaries with a real hysteresis interval', () => {
    expect(zoomDepth(.08)).toBe(0);
    expect(zoomDepth(.3)).toBe(1);
    expect(zoomDepth(.55)).toBe(2);
    expect(zoomDepth(1)).toBe(3);
    let depth = zoomDepth(.55);
    for (const zoom of [.50, .495, .51, .48]) expect(depth = zoomDepth(zoom, depth)).toBe(2);
    depth = zoomDepth(.47, depth); expect(depth).toBe(1);
    expect(zoomDepth(.51, depth)).toBe(1);
    expect(zoomDepth(.53, depth)).toBe(2);
    expect(zoomDepth(.80, 3)).toBe(3);
    expect(zoomDepth(.77, 3)).toBe(2);
});
it('discloses by depth while selected, edited, pending and authored roots remain eligible', () => {
    const p = createProject();
    for (const [index, id] of ['a', 'b', 'c', 'd'].entries()) p.thoughts[id] = { ...makeThought(id, { x: index * 1800, y: 100 }, 1, id), ...(index ? { derivedFrom: [String.fromCharCode(96 + index)], generationAction: 'continue' as const } : {}) };
    const ghost: Ghost = { id: 'g', text: 'Pending', x: 0, y: 2300, createdAt: 1, scopeIds: ['d'] };
    const items = { ...p.thoughts, g: ghost }, hierarchy = thoughtHierarchy(items);
    const base = { items, hierarchy, found: Object.keys(items), camera: { x: 40, y: 50, zoom: .08 }, viewport: { width: 1440, height: 960 }, depth: 0, selection: [], editing: null, recalls: [], expanded: new Set<string>(), measured: () => undefined };
    expect(discloseHierarchy(base).visible).toEqual(['a', 'g']);
    const editing = discloseHierarchy({ ...base, selection: ['c'], editing: 'd' });
    expect(editing.visible).toContain('d');
    expect([...editing.visible, ...editing.roots].sort()).toEqual(['a', 'b', 'c', 'd', 'g']);
    expect(discloseHierarchy({ ...base, expanded: new Set(['a']), camera: { x: 40, y: 50, zoom: .10 } }).visible).toEqual(['a', 'b', 'g']);
    p.thoughts.a.organizingParentId = 'd';
    expect(thoughtHierarchy(p.thoughts).originalRoots.has('a')).toBe(true);
});
it('keeps dense roots as exact anchors with a bounded number of full reading boxes', () => {
    const items = Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`n${i}`, makeThought('Root', { x: i % 50 * 10, y: Math.floor(i / 50) * 10 }, 1, `n${i}`)]));
    const result = discloseHierarchy({ items, hierarchy: thoughtHierarchy(items), found: Object.keys(items), camera: { x: 0, y: 0, zoom: .08 }, viewport: { width: 1280, height: 720 }, depth: 0, selection: [], editing: null, recalls: [], expanded: new Set(), measured: () => undefined });
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

it('keeps every imported depth reachable and reveals protected ancestry without changing coordinates', () => {
    const items = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`n${i}`, { ...makeThought(`Level ${i}`, { x: 20, y: i * 100 }, 1, `n${i}`), organizingParentId: i ? `n${i - 1}` : null }]));
    const before = JSON.stringify(items);
    const base = { items, hierarchy: thoughtHierarchy(items), found: Object.keys(items), camera: { x: 0, y: 0, zoom: 1 }, viewport: { width: 1440, height: 1600 }, depth: zoomDepth(2.5, undefined, 11), selection: [], editing: null, recalls: [], expanded: new Set<string>(), measured: () => undefined };
    expect(discloseHierarchy(base).visible).toHaveLength(12);
    expect(discloseHierarchy({ ...base, depth: 0, selection: ['n3'] }).visible).toEqual(['n0', 'n1', 'n2', 'n3']);
    expect(discloseHierarchy({ ...base, depth: 0, matches: new Set(['n4']) }).visible).toEqual(['n0', 'n1', 'n2', 'n3', 'n4']);
    expect(JSON.stringify(items)).toBe(before);
});
it('collapses an adopted original root by its current depth while retaining its discoverable anchor', () => {
    const items = { a: makeThought('Root', { x: 20, y: 20 }, 1, 'a'), x: { ...makeThought('Originally independent', { x: 600, y: 20 }, 1, 'x'), organizingParentId: 'a' } };
    const result = discloseHierarchy({ items, hierarchy: thoughtHierarchy(items), found: ['a', 'x'], camera: { x: 0, y: 0, zoom: .2 }, viewport: { width: 1440, height: 960 }, depth: 0, selection: [], editing: null, recalls: [], expanded: new Set(), measured: () => undefined });
    expect(result.visible).toEqual(['a']);
    expect(result.roots).toEqual(['x']);
});


it('opens and closes one actual level per wheel notch while preserving the attended point', () => {
    const pointer = { x: 640, y: 360 };
    let camera = { x: 80, y: -40, zoom: .38 }, depth = zoomDepth(camera.zoom);
    const worldPoint = screenToWorld(pointer, camera);
    for (const [delta, expected] of [[-120, 2], [120, 1], [120, 0], [-120, 1], [-120, 2], [-120, 3]]) {
        const previous = camera.zoom;
        camera = zoomCameraAt(camera, pointer, hierarchyWheelZoom(camera.zoom, depth, 3, delta, -Math.sign(delta)));
        depth = zoomDepth(camera.zoom, depth);
        expect(depth).toBe(expected);
        expect(delta < 0 ? camera.zoom > previous : camera.zoom < previous).toBe(true);
        expect(screenToWorld(pointer, camera).x).toBeCloseTo(worldPoint.x, 9);
        expect(screenToWorld(pointer, camera).y).toBeCloseTo(worldPoint.y, 9);
        expect(zoomDepth(camera.zoom)).toBe(expected); // The saved camera restores the same level.
    }
});
it('never jumps over an imported level and reaches both ends of a deep hierarchy', () => {
    for (const maxDepth of [1, 3, 12, 10000]) {
        let zoom = .16, depth = 0;
        for (let expected = 1; expected <= maxDepth; expected++) {
            const before = zoom;
            zoom = hierarchyWheelZoom(zoom, depth, maxDepth, -120, 1);
            depth = zoomDepth(zoom, depth, maxDepth);
            expect(depth).toBe(expected);
            expect(zoom).toBeGreaterThan(before);
            expect(zoom).toBeLessThanOrEqual(1); // More imported levels cannot inflate the reading view.
            expect(zoomDepth(zoom, undefined, maxDepth)).toBe(depth);
        }
        for (let expected = maxDepth - 1; expected >= 0; expected--) {
            const before = zoom;
            zoom = hierarchyWheelZoom(zoom, depth, maxDepth, 120, -1);
            depth = zoomDepth(zoom, depth, maxDepth);
            expect(depth).toBe(expected);
            expect(zoom).toBeLessThan(before);
        }
        expect(hierarchyWheelZoom(.08, 0, maxDepth, 120, -1)).toBe(.08);
    }
});
it('counts rapid mouse notches individually and groups small scroll packets without pinch steps', () => {
    const input = { point: { x: 640, y: 360 }, deltaY: -120, deltaMode: 0, viewportHeight: 800, ctrlKey: false, timeStamp: 100 };
    let resolved = resolveWheelZoom(null, input);
    expect(resolved.step).toBe(1);
    resolved = resolveWheelZoom(resolved.gesture, { ...input, timeStamp: 120 });
    expect(resolved.step).toBe(1);
    let gesture = null as typeof resolved.gesture | null;
    const steps: number[] = [];
    for (let i = 0; i < 8; i++) {
        resolved = resolveWheelZoom(gesture, { ...input, deltaY: -4, timeStamp: 200 + i * 10 });
        gesture = resolved.gesture; steps.push(resolved.step);
    }
    expect(steps).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(resolveWheelZoom(gesture, { ...input, deltaY: 4, timeStamp: 300 }).step).toBe(0);
    const pinch = resolveWheelZoom(gesture, { ...input, ctrlKey: true, deltaY: -2, timeStamp: 320 });
    expect(pinch).toMatchObject({ delta: -8, step: 0, pinch: true });
    expect(resolveWheelZoom(null, { ...input, deltaY: 3, deltaMode: 1 }).step).toBe(-1);
    expect(resolveWheelZoom(null, { ...input, deltaY: 0 }).step).toBe(0);
});


it('strict wheel disclosure hides selected deeper nodes and retains close ancestors', () => {
    const items = {
        'z-root': makeThought('Root thought', { x: 400, y: 200 }, 1, 'z-root'),
        b: { ...makeThought('Second level', { x: 500, y: 200 }, 1, 'b'), derivedFrom: ['z-root'] },
        'c-third': { ...makeThought('Third level', { x: 600, y: 200 }, 1, 'c-third'), derivedFrom: ['b'] },
    };
    const before = JSON.stringify(items);
    const base = { items, hierarchy: thoughtHierarchy(items), found: Object.keys(items), viewport: { width: 1440, height: 960 }, selection: ['z-root', 'c-third'], selectionReveals: false, editing: null, recalls: [], expanded: new Set<string>(), measured: () => undefined };
    expect(discloseHierarchy({ ...base, camera: { x: 0, y: 0, zoom: .65 }, depth: 2 }).visible).toEqual(['b', 'c-third', 'z-root']);
    const collapsed = discloseHierarchy({ ...base, camera: { x: 0, y: 0, zoom: .38 }, depth: 1 });
    expect(collapsed.visible).toEqual(['b', 'z-root']);
    expect(collapsed.roots).toEqual([]);
    expect(discloseHierarchy({ ...base, camera: { x: 0, y: 0, zoom: .16 }, depth: 0 }).visible).toEqual(['z-root']);
    expect(JSON.stringify(items)).toBe(before);
    expect(base.selection).toEqual(['z-root', 'c-third']);
    expect(discloseHierarchy({ ...base, camera: { x: 0, y: 0, zoom: .38 }, depth: 1, editing: 'c-third' }).visible).toContain('c-third');
    expect(discloseHierarchy({ ...base, camera: { x: 0, y: 0, zoom: .38 }, depth: 1, matches: new Set(['c-third']) }).visible).toContain('c-third');
});

it('caps ordinary hierarchy reading while retaining the flat Field manual wheel range', () => {
    for (const maxDepth of [1, 3, 12, 10000]) {
        let zoom = hierarchyWheelZoom(1, maxDepth, maxDepth, -120, 1);
        for (let i = 0; i < 20; i++) zoom = hierarchyWheelZoom(zoom, maxDepth, maxDepth, -120, 1);
        expect(zoom).toBe(1);
        expect(zoomDepth(zoom, undefined, maxDepth)).toBe(maxDepth);
        const collapsed = hierarchyWheelZoom(zoom, maxDepth, maxDepth, 120, -1);
        expect(zoomDepth(collapsed, undefined, maxDepth)).toBe(maxDepth - 1);
        // A prior high zoom still returns to the normal reading limit on ordinary wheel.
        expect(hierarchyWheelZoom(2.5, maxDepth, maxDepth, -120, 1)).toBe(1);
    }
    expect(hierarchyWheelZoom(1, 0, 0, -120, 1)).toBeGreaterThan(1);
    expect(hierarchyWheelZoom(2.5, 0, 0, -120, 1)).toBe(2.5);
});
