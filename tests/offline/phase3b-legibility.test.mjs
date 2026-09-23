import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { placeRelationLabels } from '../../src/field/phenomena/relationLabelPlacement.ts';

const relation = (id, label = 'Same opening') => ({
  id,
  a: { x: 0, y: 0 },
  b: { x: 200, y: 0 },
  mid: { x: 100, y: 0 },
  kind: 'echo',
  label,
  confirmed: false,
});

test('Phase 3B candidate wording can be edited without mutating canonical relations', () => {
  const project = createProject('phase3b', 'Phase 3B', 1);
  project.thoughts.a = makeThought('A', { x: 0, y: 0 }, 1, 'a');
  project.thoughts.b = makeThought('B', { x: 300, y: 0 }, 1, 'b');
  const controller = new ProjectController(project, async () => {});
  controller.addPhenomenon({ id: 'r1', a: 'a', b: 'b', kind: 'echo', label: 'Long candidate', explanation: 'Both thoughts begin the same kind of conversation.' });
  controller.updatePhenomenon('r1', { label: 'Same opening' });
  assert.equal(controller.getSnapshot().session.phenomena.r1?.label, 'Same opening');
  assert.equal(controller.getSnapshot().project.relations.r1, undefined);
  controller.dismissPhenomenon('r1');
  assert.equal(controller.getSnapshot().session.phenomena.r1, undefined);
  assert.equal(controller.getSnapshot().project.relations.r1, undefined);
});

test('Phase 3B relation labels use deterministic perpendicular collision offsets', () => {
  const clear = placeRelationLabels([relation('r')], [], 1);
  assert.deepEqual(clear.r.anchor, { x: 100, y: 0 });
  const blocked = placeRelationLabels([relation('r')], [{ x: 35, y: -2, width: 130, height: 4 }], 1);
  assert.ok(blocked.r.y + blocked.r.height <= -2 || blocked.r.y >= 2);
  const again = placeRelationLabels([relation('r')], [{ x: 35, y: -2, width: 130, height: 4 }], 1);
  assert.deepEqual(blocked, again);
});

test('Phase 3B nearby relation labels do not claim the same placement', () => {
  const placed = placeRelationLabels([relation('a'), relation('b')], [], 1);
  assert.notDeepEqual(placed.a.anchor, placed.b.anchor);
});

test('Phase 3B keeps SVG geometry separate from DOM relation UI and progressively discloses commands', () => {
  const layer = fs.readFileSync(new URL('../../src/field/phenomena/RelationLayer.tsx', import.meta.url), 'utf8');
  const labels = fs.readFileSync(new URL('../../src/field/phenomena/RelationLabels.tsx', import.meta.url), 'utf8');
  const token = fs.readFileSync(new URL('../../src/field/phenomena/RelationToken.tsx', import.meta.url), 'utf8');
  const menu = fs.readFileSync(new URL('../../src/ui/focus/CommandMenu.tsx', import.meta.url), 'utf8');
  const compose = fs.readFileSync(new URL('../../src/ui/commands/compose.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(layer, /<text\b/);
  assert.match(labels, /RelationToken/);
  assert.match(token, /relation-label-overlay/);
  assert.match(token, /Candidate relation/);
  // One popup, one portal: a nested submenu portal is what lost the menu in a real session.
  assert.equal((menu.match(/<Menu\.Portal/g) || []).length, 1);
  assert.doesNotMatch(menu, /Menu\.SubmenuRoot/);
  assert.doesNotMatch(menu, /Menu\.SubmenuTrigger/);
  // Advanced rows are a coordinated second column inside the same popup, never a second portal.
  assert.match(menu, /secondaryOpen/);
  assert.match(menu, /MORE_HOVER_DELAY = 160/);
  assert.match(menu, /data-command="more" closeOnClick=\{false\}/);
  assert.match(menu, /data-secondary-panel/);
  assert.doesNotMatch(menu, /data-command="back"/);
  assert.match(compose, /contextualRows/);
});
