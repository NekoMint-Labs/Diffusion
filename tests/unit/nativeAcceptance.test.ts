import { expect, it, vi } from 'vitest';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { thoughtHierarchy } from '../../src/core/hierarchy.ts';
import { discloseHierarchy } from '../../src/field/spatial/hierarchyDisclosure.ts';
import { safeArea, fitInSafeArea } from '../../src/field/spatial/safeArea.ts';
import { placePossibility } from '../../src/field/spatial/placement.ts';
import { estimateItemSize } from '../../src/field/spatial/collision.ts';
import { worldToScreen } from '../../src/field/spatial/geometry.ts';
import { revealCamera } from '../../src/field/spatial/representation.ts';
import { checkSearchConnection } from '../../src/discovery/connection.ts';
import { DEFAULT_DISCOVERY } from '../../src/discovery/contracts.ts';
import { DIRECT_PROVIDERS } from '../../src/ai/providers.ts';
import { getLocale, setLocale, t } from '../../src/shared/i18n.ts';

function scene() {
    const project = createProject();
    for (const [i, id] of ['a', 'b', 'c'].entries()) project.thoughts[id] = { ...makeThought(id, { x: i * 400, y: 100 }, 1, id), organizingParentId: i ? ['a', 'b'][i - 1] : null };
    const ghost = { id: 'g', text: 'Pending', x: 900, y: 200, createdAt: 1, scopeIds: ['c'] };
    return { project, items: { ...project.thoughts, g: ghost } };
}
it('decreases detail by tier and represents each pending suggestion exactly once', () => {
    const { items } = scene();
    const base = { items, hierarchy: thoughtHierarchy(items), found: Object.keys(items), viewport: { width: 1440, height: 960 }, depth: 3, selection: [], editing: null, recalls: [], expanded: new Set<string>(), measured: () => undefined };
    const local = discloseHierarchy({ ...base, camera: { x: 0, y: 0, zoom: 1 } });
    const distant = discloseHierarchy({ ...base, camera: { x: 0, y: 0, zoom: .16 } });
    expect(local.visible).toContain('g'); expect(local.suggestions).toEqual([]);
    expect(distant.visible).toEqual(['a']); expect(distant.suggestions).toEqual(['g']);
    expect(distant.eligible).not.toContain('c'); expect(distant.hidden).toContain('g');
    const folded = discloseHierarchy({ ...base, branches: { b: false }, camera: { x: 0, y: 0, zoom: 1 } });
    expect(folded.visible).toEqual(['a', 'b']); expect(folded.suggestions).toEqual(['g']);
    const matched = discloseHierarchy({ ...base, branches: { a: false }, matches: new Set(['c']), camera: { x: 0, y: 0, zoom: 1 } });
    expect(matched.visible).toEqual(['a']);
});
it('undoes explicit folds in order with edits, preserving nested state without saving folds', async () => {
    const { project } = scene(); const save = vi.fn(async () => {}), controller = new ProjectController(project, save);
    controller.setBranchExpanded('b', false); controller.setBranchExpanded('a', false); controller.setBranchExpanded('a', true);
    expect(controller.getSnapshot().session.branchDisclosure).toEqual({ a: true, b: false });
    expect(controller.getSnapshot().project).toBe(project); expect(save).not.toHaveBeenCalled();
    controller.dispatch({ type: 'thought.edit', id: 'a', text: 'Changed' });
    controller.undo(); expect(controller.getSnapshot().project.thoughts.a.text).toBe('a');
    controller.undo(); expect(controller.getSnapshot().session.branchDisclosure).toEqual({ a: false, b: false });
    controller.redo(); expect(controller.getSnapshot().session.branchDisclosure).toEqual({ a: true, b: false });
    expect(new ProjectController(controller.getSnapshot().project, save).getSnapshot().session.branchDisclosure).toBeUndefined();
    await controller.flush();
});
it('fits and reveals inside asymmetric occupied areas without changing world coordinates', () => {
    const viewport = { x: 30, y: 20, width: 1280, height: 720 };
    const area = safeArea(viewport, [{ x: 46, y: 36, width: 230, height: 60 }, { x: 1030, y: 20, width: 280, height: 720 }, { x: 300, y: 600, width: 600, height: 140 }]);
    expect(area.x).toBe(16); expect(area.y).toBe(92); expect(area.width).toBe(968); expect(area.height).toBe(472);
    const bounds = { x: 800, y: 400, width: 400, height: 100 }, before = { ...bounds };
    const camera = fitInSafeArea(bounds, area); const screen = worldToScreen(bounds, camera);
    expect(screen.x).toBeGreaterThanOrEqual(area.x); expect(screen.y).toBeGreaterThanOrEqual(area.y);
    expect(screen.x + bounds.width * camera.zoom).toBeLessThanOrEqual(area.x + area.width);
    const reveal = revealCamera(bounds, undefined, .38, area); expect(reveal.zoom).toBe(.38);
    expect(worldToScreen(bounds, reveal).x + bounds.width * .38 / 2).toBeCloseTo(area.x + area.width / 2);
    expect(bounds).toEqual(before);
});
it('rejects unavailable or aborted search probes without configuration mutation', async () => {
    const config = { ...DEFAULT_DISCOVERY, sources: { ...DEFAULT_DISCOVERY.sources } }, before = JSON.stringify(config);
    await expect(checkSearchConnection(config, 'exa', new AbortController().signal)).rejects.toThrow('unavailable');
    const controller = new AbortController(); controller.abort(); const run = vi.fn();
    await expect(checkSearchConnection(config, 'exa', controller.signal, run)).rejects.toThrow();
    expect(run).not.toHaveBeenCalled(); expect(JSON.stringify(config)).toBe(before);
});
it('provider metadata contains URLs, while semantic UI keys resolve in both languages', () => {
    const previous = getLocale();
    for (const provider of Object.values(DIRECT_PROVIDERS)) { expect(provider).not.toHaveProperty('keyHint'); if (provider.keyUrl) expect(new URL(provider.keyUrl).protocol).toBe('https:'); }
    for (const locale of ['en', 'zh'] as const) { setLocale(locale); expect(t('settings.ai.getApiKey')).not.toContain('settings.'); expect(t('settings.ai.direct', { provider: 'OpenAI' })).toContain('OpenAI'); }
    setLocale(previous);
});

it('uses a free safe-area edge slot before falling back to offscreen placement', () => {
    const project = createProject(), session: import('../../src/core/model.ts').SessionState = { ghosts: {}, phenomena: {}, structures: {}, recalls: [] };
    project.thoughts.scope = makeThought('scope '.repeat(30), { x: 560, y: 200 }, 1, 'scope');
    project.thoughts.left = makeThought('occupied '.repeat(60), { x: 180, y: 100 }, 1, 'left');
    const before = JSON.stringify(project), text = 'result '.repeat(30), area = { x: 16, y: 100, width: 1248, height: 360 };
    const point = placePossibility(project, session, { x: 560, y: 200 }, 0, ['scope'], area, text, 'continue', new Set(['scope', 'left']));
    const size = estimateItemSize({ text });
    expect(point.x).toBeGreaterThanOrEqual(924);
    expect(point.x + size.width).toBeLessThanOrEqual(area.x + area.width);
    expect(point.y).toBeGreaterThanOrEqual(area.y);
    expect(point.y + size.height).toBeLessThanOrEqual(area.y + area.height);
    expect(JSON.stringify(project)).toBe(before);
});
