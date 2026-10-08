import { expect, it, vi } from 'vitest';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { subtreeIds } from '../../src/field/spatial/subtree.ts';
import { commitDraggedItems } from '../../src/field/interactionHygiene.ts';

function scene() {
    const p = createProject();
    for (const [i, id] of ['a', 'b', 'c', 'other'].entries()) p.thoughts[id] = { ...makeThought(id, { x: i * 5000, y: i * 100 }, 1, id), organizingParentId: i > 0 && i < 3 ? ['a', 'b'][i - 1] : null };
    return p;
}
it('deduplicates selected parent/child subtrees independent of folds and viewport', () => {
    const p = scene();
    expect(subtreeIds(['a', 'b', 'a', 'missing'], p.thoughts)).toEqual(['a', 'b', 'c']);
    expect(subtreeIds(['b'], p.thoughts)).toEqual(['b', 'c']);
    expect(subtreeIds(['c'], p.thoughts)).toEqual(['c']);
    p.thoughts.c.derivedFrom = ['a']; p.thoughts.c.organizingParentId = 'other';
    expect(subtreeIds(['a'], p.thoughts)).toEqual(['a', 'b']);
    expect(subtreeIds(['other'], p.thoughts)).toEqual(['other', 'c']);
});
it('moves folded/offscreen descendants as one durable undoable operation', async () => {
    const p = scene(), save = vi.fn(async () => {}), c = new ProjectController(p, save);
    c.setBranchExpanded('a', false);
    const positions = Object.fromEntries(subtreeIds(['a', 'b'], p.thoughts).map(id => [id, { x: p.thoughts[id].x + 80, y: p.thoughts[id].y - 20 }]));
    commitDraggedItems(c, positions);
    expect(c.getSnapshot().project.thoughts.c).toMatchObject({ x: 10080, y: 180 });
    expect(c.getSnapshot().session.branchDisclosure).toEqual({ a: false });
    expect(c.getSnapshot().project.thoughts.other).toEqual(p.thoughts.other);
    c.undo(); expect(c.getSnapshot().project.thoughts).toEqual(p.thoughts);
    expect(c.getSnapshot().session.branchDisclosure).toEqual({ a: false });
    c.redo(); await c.flush();
    const reopened = new ProjectController(c.getSnapshot().project, save);
    expect(reopened.getSnapshot().project.thoughts.c).toMatchObject({ x: 10080, y: 180 });
});
it('does not turn proposals or every provenance edge into a committed subtree', () => {
    const p = scene(), c = new ProjectController(p, async () => {});
    c.addGhost({ id: 'g', text: 'Pending', x: 42, y: 60, createdAt: 1, scopeIds: ['a'], spatialDetached: true });
    const before = c.getSnapshot().session.ghosts.g;
    commitDraggedItems(c, { a: { x: 80, y: 20 }, b: { x: 5080, y: 120 }, c: { x: 10080, y: 220 } });
    expect(c.getSnapshot().session.ghosts.g).toEqual(before);
    expect(c.getSnapshot().project.thoughts.g).toBeUndefined();
});
