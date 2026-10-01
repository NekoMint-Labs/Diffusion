import { expect, it } from 'vitest';
import { makeThought, createProject, type Ghost } from '../../src/core/model.ts';
import { thoughtHierarchy } from '../../src/core/hierarchy.ts';
import { discloseHierarchy, zoomDepth } from '../../src/field/spatial/hierarchyDisclosure.ts';
import { causalEdges, describeCausalTraces } from '../../src/field/phenomena/causalTrace.ts';
import { routeCausalTrace } from '../../src/field/phenomena/causalRouting.ts';
import { normalizeAppearanceSettings } from '../../src/ui/appearance.ts';

it('has stable reversible depth boundaries with a real hysteresis interval', () => {
    expect(zoomDepth(.08)).toBe(0);
    expect(zoomDepth(.3)).toBe(1);
    expect(zoomDepth(.55)).toBe(2);
    expect(zoomDepth(1)).toBe(3);
    let depth = zoomDepth(.5);
    for (const zoom of [.43, .425, .44, .42]) expect(depth = zoomDepth(zoom, depth)).toBe(2);
    depth = zoomDepth(.39, depth); expect(depth).toBe(1);
    expect(zoomDepth(.44, depth)).toBe(1);
    expect(zoomDepth(.46, depth)).toBe(2);
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
    expect([...editing.visible, ...editing.roots].sort()).toEqual(['a', 'c', 'd', 'g']);
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
it('renders frozen Ghost sources, separates organized parents and hides missing endpoints', () => {
    const p = createProject();
    p.thoughts.a = makeThought('a', { x: 0, y: 0 }, 1, 'a');
    p.thoughts.b = makeThought('b', { x: 0, y: 220 }, 1, 'b');
    p.thoughts.c = { ...makeThought('c', { x: 400, y: 0 }, 1, 'c'), derivedFrom: ['a'], generationAction: 'continue', organizingParentId: 'b' };
    const ghosts = { g: { id: 'g', text: 'pending', x: 800, y: 0, createdAt: 1, scopeIds: ['c'] } };
    const before = JSON.stringify(p);
    expect(causalEdges(p, ghosts)).toEqual(expect.arrayContaining([expect.objectContaining({ parentId: 'a', childId: 'c', relationship: 'source' }), expect.objectContaining({ parentId: 'b', childId: 'c', relationship: 'organization' }), expect.objectContaining({ parentId: 'c', childId: 'g', pending: true })]));
    const boxes = Object.fromEntries(Object.values({ ...p.thoughts, ...ghosts }).map(item => [item.id, { ...item, width: 176, height: 60 }]));
    for (const style of ['curve', 'elbow'] as const) {
        const traces = describeCausalTraces(p, { get: id => boxes[id] }, [], null, new Set(['a', 'c', 'g']), ghosts, style);
        expect(traces).toHaveLength(2);
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
