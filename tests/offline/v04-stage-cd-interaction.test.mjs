import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { fitCameraToBounds, screenToWorld, unionBounds, zoomCameraAt } from '../../src/field/spatial/geometry.ts';
import { resolveWheelZoom } from '../../src/field/spatial/gesture.ts';

const read = path => fs.readFileSync(path, 'utf8');

function controllerWithAnchor() {
  const project = createProject('stage-cd', 'Stage C/D', 1);
  project.thoughts.anchor = makeThought('Anchor', { x: 100, y: 120 }, 1, 'anchor');
  return new ProjectController(project, async () => {});
}

test('Stage C keeps generated Ghost geometry independent when its source Thought moves', () => {
  const controller = controllerWithAnchor();
  controller.addGhost({ id: 'g', text: 'proposal', x: 360, y: 180, createdAt: 2, scopeIds: ['anchor'] });
  controller.dispatch({ type: 'thought.move', positions: { anchor: { x: 160, y: 200 } } });
  let snapshot = controller.getSnapshot();
  assert.deepEqual({ x: snapshot.session.ghosts.g.x, y: snapshot.session.ghosts.g.y }, { x: 360, y: 180 });
  assert.equal(snapshot.project.thoughts.g, undefined, 'independent movement never claims a proposal');

  controller.undo();
  snapshot = controller.getSnapshot();
  assert.deepEqual({ x: snapshot.session.ghosts.g.x, y: snapshot.session.ghosts.g.y }, { x: 360, y: 180 });
  assert.equal(snapshot.project.thoughts.g, undefined);
});

test('Stage C manual Ghost movement stays transient and marks explicit repositioning', () => {
  const controller = controllerWithAnchor();
  controller.addGhost({ id: 'g', text: 'proposal', x: 360, y: 180, createdAt: 2, scopeIds: ['anchor'] });
  controller.moveGhost('g', { x: 480, y: 260 }, { detach: true });
  controller.dispatch({ type: 'thought.move', positions: { anchor: { x: 240, y: 220 } } });
  const snapshot = controller.getSnapshot();
  assert.deepEqual({ x: snapshot.session.ghosts.g.x, y: snapshot.session.ghosts.g.y }, { x: 480, y: 260 });
  assert.equal(snapshot.session.ghosts.g.spatialDetached, true);
  assert.equal(snapshot.project.thoughts.g, undefined, 'geometry is not ownership');
});

test('Stage C multi-scope proposals do not acquire drag ownership from their generating scope', () => {
  const project = createProject('stage-cd-multi', 'Stage C/D', 1);
  project.thoughts.a = makeThought('A', { x: 0, y: 0 }, 1, 'a');
  project.thoughts.b = makeThought('B', { x: 200, y: 0 }, 1, 'b');
  const controller = new ProjectController(project, async () => {});
  controller.addGhost({ id: 'g', text: 'proposal', x: 100, y: -120, createdAt: 2, scopeIds: ['a', 'b'] });

  controller.dispatch({ type: 'thought.move', positions: { a: { x: 70, y: 50 }, b: { x: 230, y: 30 } } });
  assert.deepEqual({ x: controller.getSnapshot().session.ghosts.g.x, y: controller.getSnapshot().session.ghosts.g.y }, { x: 100, y: -120 });
});

test('Stage C navigation math preserves the attended point and frames meaningful bounds', () => {
  const pointer = { x: 640, y: 360 };
  const before = { x: 80, y: -40, zoom: .8 };
  const world = screenToWorld(pointer, before);
  const after = zoomCameraAt(before, pointer, 1.4);
  const attended = screenToWorld(pointer, after);
  assert.ok(Math.abs(attended.x - world.x) < 1e-9 && Math.abs(attended.y - world.y) < 1e-9, 'pointer-centred zoom preserves the world point under attention');

  const bounds = unionBounds([{ x: 0, y: 0, width: 120, height: 80 }, { x: 600, y: 320, width: 200, height: 120 }]);
  assert.deepEqual(bounds, { x: 0, y: 0, width: 800, height: 440 });
  const camera = fitCameraToBounds(bounds, 1200, 800, 80, 1.15);
  assert.ok(camera.zoom <= 1.15 && camera.zoom > 0);
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  assert.ok(Math.abs(center.x * camera.zoom + camera.x - 600) < 1e-9);
  assert.ok(Math.abs(center.y * camera.zoom + camera.y - 400) < 1e-9);
});

test('Stage C wheel bursts keep one attended point and tune pinch packets independently', () => {
  const first = resolveWheelZoom(null, { point: { x: 640, y: 360 }, deltaY: -2, deltaMode: 0, viewportHeight: 800, ctrlKey: true, timeStamp: 100 });
  const jittered = resolveWheelZoom(first.gesture, { point: { x: 651, y: 354 }, deltaY: -2, deltaMode: 0, viewportHeight: 800, ctrlKey: true, timeStamp: 140 });
  assert.deepEqual(jittered.gesture.anchor, { x: 640, y: 360 }, 'one physical pinch keeps one stable anchor');
  assert.equal(jittered.delta, -8, 'small browser pinch deltas receive dedicated sensitivity');

  const next = resolveWheelZoom(jittered.gesture, { point: { x: 720, y: 400 }, deltaY: 3, deltaMode: 1, viewportHeight: 800, ctrlKey: false, timeStamp: 400 });
  assert.deepEqual(next.gesture.anchor, { x: 720, y: 400 }, 'a later wheel gesture may attend a new point');
  assert.equal(next.delta, 48);
});

test('Stage C Field source locks the new direct-manipulation grammar', () => {
  const field = read('src/field/Field.tsx');
  const controller = read('src/core/controller.ts');
  const gesture = read('src/field/spatial/gesture.ts');
  const hygiene = read('src/field/interactionHygiene.ts');

  assert.match(gesture, /GestureKind = 'pan' \| 'selection' \| 'marquee'/);
  assert.match(field, /const marquee = blankField && e\.button === 0 && e\.shiftKey && !space\.current/);
  assert.match(field, /const pan = space\.current \|\| e\.button === 1 \|\| blankField && !marquee/);
  assert.match(field, /plainKey && e\.key\.toLowerCase\(\) === 'f'/);
  assert.match(field, /plainKey && e\.key === '0'/);
  assert.match(field, /commitDraggedItems\(controller, positions\)/);
  assert.doesNotMatch(field, /followers|current\.session\.ghosts\)\s*\.filter\(ghost/);
  assert.doesNotMatch(controller, /followAttachedGhosts/);
  assert.match(field, /for \(const key of g\.ids\)/);
  assert.doesNotMatch(field, /controller\.claim\(g\.target/);
  assert.match(hygiene, /controller\.moveGhost\(key, point, \{ detach: true \}\)/);
});

test('Stage D makes AI question generation obvious while retaining a separate human-authored question path', () => {
  const model = read('src/ui/commands/contextualActionModel.ts');
  const hub = read('src/ui/scope/ScopeHub.tsx');
  const menu = read('src/ui/focus/CommandMenu.tsx');
  const zh = read('src/locales/zh.ts');

  assert.match(model, /descriptor\('questions', 'Generate a question', 'Generate a question that could move the thinking\.'/);
  assert.match(model, /descriptor\('ask', 'Ask your own question', 'Write your own question about this scope\.'/);
  assert.match(model, /'Look for a meaningful connection without assuming one exists\.'/);
  assert.match(hub, /aria-describedby=\{descriptionId\}/);
  assert.match(hub, /role="tooltip" className="scope-action-description"/);
  assert.match(menu, /row\.description && <small>\{row\.description\}<\/small>/);
  assert.match(zh, /"Generate a question": "生成一个问题"/);
});
