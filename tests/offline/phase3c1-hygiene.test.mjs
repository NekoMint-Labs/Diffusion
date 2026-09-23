import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';
import { correctSevereOverlap, estimateThoughtSize, overlapArea } from '../../src/field/spatial/collision.ts';
import { placePossibility } from '../../src/field/spatial/placement.ts';
import { estimateRelationLabelSize, placeRelationLabels } from '../../src/field/phenomena/relationLabelPlacement.ts';

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Phase 3C.1 local collision hygiene moves only severe overlap and respects text-aware size', () => {
  assert.ok(estimateThoughtSize('x '.repeat(120)).height > estimateThoughtSize('short').height);
  const desired = { x: 0, y: 0, width: 100, height: 100 };
  const small = [{ x: 92, y: 0, width: 100, height: 100 }];
  assert.deepEqual(correctSevereOverlap(desired, small), { x: 0, y: 0 });
  const occupied = [{ x: 20, y: 10, width: 100, height: 100 }];
  const moved = correctSevereOverlap(desired, occupied, { x: -500, y: -500, width: 1000, height: 1000 });
  assert.notDeepEqual(moved, { x: 0, y: 0 });
  assert.equal(overlapArea({ ...desired, ...moved }, occupied[0]), 0);
});

test('Phase 3C.1 generated placement avoids existing Thoughts without moving them', () => {
  const project = createProject('p', 'P', 1);
  project.thoughts.a = makeThought('existing thought '.repeat(8), { x: 0, y: 0 }, 1, 'a');
  const controller = new ProjectController(project, async () => {});
  const before = { x: project.thoughts.a.x, y: project.thoughts.a.y };
  const snapshot = controller.getSnapshot();
  const point = placePossibility(snapshot.project, snapshot.session, { x: 0, y: 0 }, 0, ['a'], { x: -600, y: -500, width: 1600, height: 1200 }, 'new generated direction '.repeat(10));
  const size = estimateThoughtSize('new generated direction '.repeat(10));
  const oldSize = estimateThoughtSize(project.thoughts.a.text);
  assert.equal(overlapArea({ ...point, ...size }, { x: 0, y: 0, ...oldSize }), 0);
  assert.deepEqual({ x: project.thoughts.a.x, y: project.thoughts.a.y }, before);
});

test('Phase 3C.1 Relation Tokens stay compact, deterministic and collision-free', () => {
  const relation = { id: 'r', a: { x: 0, y: 0 }, b: { x: 200, y: 0 }, mid: { x: 100, y: 0 }, kind: 'echo', label: 'candidate relation', confirmed: false };
  const size = estimateRelationLabelSize(relation.label, true);
  assert.ok(size.height >= 24 && size.height <= 36);
  const obstacle = { x: 30, y: -20, width: 140, height: 40 };
  const placed = placeRelationLabels([relation], [obstacle], 1);
  const again = placeRelationLabels([relation], [obstacle], 1);
  assert.deepEqual(placed, again);
  assert.equal(overlapArea({ x: placed.r.x, y: placed.r.y, width: placed.r.width, height: placed.r.height }, obstacle), 0);
});

test('Phase 3C.1 relation existence is semantic state, not selection retirement', () => {
  const field = read('src/field/Field.tsx');
  assert.match(field, /Object\.values\(project\.relations\).*Object\.values\(session\.phenomena\)/s);
  assert.match(field, /tokenRelations/);
  assert.doesNotMatch(field, /retiringRelations|lastRelations/);
  const token = read('src/field/phenomena/RelationToken.tsx');
  for (const action of ['Keep', 'Modify', 'Ignore']) assert.match(token, new RegExp(`t\\('${action}'\\)`));
});

test('Phase 3D keeps direct Delete, centralized bounded actions, and static per-run thinking defaults in source', () => {
  const field = read('src/field/Field.tsx');
  assert.match(field, /e\.key === 'Delete'.*e\.key === 'Backspace'/s);
  const model = read('src/ui/commands/contextualActionModel.ts');
  assert.match(model, /slice\(0, 3\)/);
  assert.match(model, /slice\(0, 6\)/);
  assert.match(model, /primaryIds/);
  const workspace = read('src/ui/Workspace.tsx');
  // Thinking runs use fixed product defaults plus their own per-run controls; no persisted setting
  // feeds the action path any more.
  assert.match(workspace, /steps: THINKING_DEFAULTS\.directions/);
  assert.match(workspace, /projectSources: THINKING_DEFAULTS\.fieldSources/);
  assert.match(workspace, /web: THINKING_DEFAULTS\.web && !!evidence/);
  assert.doesNotMatch(workspace, /settingsRef\.current\.thinkingDefaults/);
  const thinking = read('src/ui/commands/thinking.ts');
  assert.match(thinking, /THINKING_DIRECTION_COUNTS = \[1, 3, 5\]/);
  const diffuse = read('src/ui/surfaces/DiffuseSurface.tsx');
  assert.match(diffuse, /THINKING_DIRECTION_COUNTS/);
  assert.match(diffuse, /For this run only/);
  assert.doesNotMatch(diffuse, /wall-clock budget|scheduler|model-call count|pause counting|agent runtime/i);
});
