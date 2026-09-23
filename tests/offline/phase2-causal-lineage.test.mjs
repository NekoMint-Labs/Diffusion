import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ProjectController } from '../../src/core/controller.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { causalEdges, causalTraceStates, describeCausalTraces } from '../../src/field/phenomena/causalTrace.ts';
import { lineageDirection, placePossibility } from '../../src/field/spatial/placement.ts';
import { validateProject } from '../../src/core/validation.ts';

const source = file => fs.readFileSync(new URL(`../../src/${file}`, import.meta.url), 'utf8');

function lineageProject() {
  const project = createProject('phase2', 'Phase 2', 1);
  project.thoughts.a = makeThought('A', { x: 0, y: 0 }, 1, 'a');
  project.thoughts.b = { ...makeThought('B', { x: 340, y: 0 }, 2, 'b'), derivedFrom: ['a'], generationAction: 'continue' };
  project.thoughts.c = { ...makeThought('C', { x: 680, y: 0 }, 3, 'c'), derivedFrom: ['b'], generationAction: 'continue' };
  project.thoughts.d = { ...makeThought('D', { x: 620, y: 260 }, 4, 'd'), derivedFrom: ['b'], generationAction: 'angle' };
  return project;
}

test('Phase 2 Keep persists only semantic lineage from an explicit AI action', () => {
  const project = createProject('p', 'P', 1);
  project.thoughts.a = makeThought('A', { x: 0, y: 0 }, 1, 'a');
  const controller = new ProjectController(project, async () => {});
  controller.addGhost({ id: 'b', text: 'B', x: 300, y: 0, createdAt: 2, scopeIds: ['a'], proposalKind: 'thought', proposalAction: 'continue' });
  controller.moveGhost('b', { x: 360, y: 40 }, { detach: true });
  assert.equal(controller.getSnapshot().project.thoughts.b, undefined, 'dragging is not Keep');
  const thought = controller.claim('b');
  assert.deepEqual(thought.derivedFrom, ['a']);
  assert.equal(thought.generationAction, 'continue');
  assert.equal('scopeIds' in thought, false, 'transient Ghost scope shape does not leak into canonical state');
  assert.equal(controller.getSnapshot().session.ghosts.b, undefined);
  validateProject(controller.getSnapshot().project);
});

test('Phase 2 lineage survives undo/redo and deletion prunes dangling ancestry', () => {
  const project = createProject('p', 'P', 1);
  project.thoughts.a = makeThought('A', { x: 0, y: 0 }, 1, 'a');
  const controller = new ProjectController(project, async () => {});
  controller.addGhost({ id: 'b', text: 'B', x: 300, y: 0, createdAt: 2, scopeIds: ['a'], proposalKind: 'question', proposalAction: 'question' });
  controller.claim('b');
  controller.undo();
  assert.equal(controller.getSnapshot().project.thoughts.b, undefined);
  assert.equal(controller.getSnapshot().session.ghosts.b.proposalAction, 'question');
  controller.redo();
  assert.deepEqual(controller.getSnapshot().project.thoughts.b.derivedFrom, ['a']);
  assert.equal(controller.getSnapshot().project.thoughts.b.generationAction, 'question');
  controller.dispatch({ type: 'thought.delete', ids: ['a'] });
  assert.equal(controller.getSnapshot().project.thoughts.b.derivedFrom, undefined);
  assert.equal(controller.getSnapshot().project.thoughts.b.generationAction, undefined);
  validateProject(controller.getSnapshot().project);
});


test('Phase 2 persistence rejects half-formed lineage metadata', () => {
  const missingAction = lineageProject();
  delete missingAction.thoughts.b.generationAction;
  assert.throws(() => validateProject(missingAction), /causal lineage lacks generation action/);

  const missingParents = lineageProject();
  delete missingParents.thoughts.b.derivedFrom;
  assert.throws(() => validateProject(missingParents), /generation action lacks causal lineage/);
});

test('Phase 2 wake grammar reveals ancestry and one local branch while hover reveals one parent', () => {
  const project = lineageProject();
  const selected = causalTraceStates(project, ['c']);
  assert.equal(selected.get('causal:a:b'), 'wake');
  assert.equal(selected.get('causal:b:c'), 'wake');
  assert.equal(selected.get('causal:b:d'), 'wake');
  const hovered = causalTraceStates(project, [], 'c');
  assert.equal(hovered.get('causal:b:c'), 'parent');
  assert.equal(hovered.get('causal:a:b'), 'sleep');
});

test('Phase 2 geometry is curved, boundary-attached, and action-specific', () => {
  const project = lineageProject();
  const boxes = Object.fromEntries(Object.values(project.thoughts).map(item => [item.id, { x: item.x, y: item.y, width: 250, height: 100 }]));
  const traces = describeCausalTraces(project, { get: id => boxes[id] }, ['c']);
  assert.equal(traces.length, 3);
  for (const trace of traces) assert.match(trace.path, /^M.+ C/);
  assert.equal(traces.find(trace => trace.childId === 'd').action, 'angle');
  const continueTrace = traces.find(trace => trace.childId === 'c');
  assert.ok(continueTrace.a.x > boxes.b.x && continueTrace.a.x <= boxes.b.x + boxes.b.width);
  assert.ok(continueTrace.b.x >= boxes.c.x && continueTrace.b.x < boxes.c.x + boxes.c.width);
});

test('Phase 2 Continue follows incoming trajectory and Another Angle branches away', () => {
  const project = lineageProject();
  const bounds = Object.fromEntries(Object.values(project.thoughts).map(item => [item.id, { x: item.x, y: item.y, width: 256, height: 90 }]));
  const direction = lineageDirection(project, bounds, ['b']);
  assert.ok(direction.x > .99 && Math.abs(direction.y) < .01);
  const session = { ghosts: {}, phenomena: {}, structures: {}, recalls: [] };
  const continuation = placePossibility(project, session, { x: 0, y: 0 }, 0, ['b'], undefined, 'next', 'continue');
  const branch = placePossibility(project, session, { x: 0, y: 0 }, 0, ['b'], undefined, 'branch', 'branch');
  assert.ok(continuation.x > project.thoughts.b.x, 'Continue should extend forward from B');
  assert.ok(Math.abs(branch.y - project.thoughts.b.y) > 80, 'Another Angle should depart from the current line');
});

test('Phase 2 keeps CausalTraceLayer separate from RelationLayer and visual/hit geometry separate', () => {
  const field = source('field/Field.tsx');
  const layer = source('field/phenomena/CausalTraceLayer.tsx');
  const css = source('ui/resultSemantics.css');
  assert.match(field, /<CausalTraceLayer\b/);
  assert.match(field, /<RelationLayer\b/);
  assert.match(layer, /causal-trace-hit/);
  assert.match(layer, /causal-trace-visual/);
  assert.match(css, /\.causal-trace-hit[^}]*stroke-width:\s*12/s);
  assert.match(css, /\.causal-trace-visual[^}]*stroke-width:\s*1\.1/s);
  assert.match(css, /data-causal-action="question"/);
  assert.doesNotMatch(layer, /from ['"]\.\/RelationLayer|relation\.confirm|dispatch\(/);
});

test('Phase 2 drag preview updates lineage paint without mutating project geometry', () => {
  const preview = source('field/phenomena/causalDragPreview.ts');
  assert.match(preview, /causalDragGeometry/);
  assert.match(preview, /setAttribute\('d', trace\.path\)/);
  assert.doesNotMatch(preview.replace(/\/\*[\s\S]*?\*\//g, ''), /dispatch\(|thought\.move|\.x\s*=/);
});

test('Phase 2 canonical model never stores causal connector geometry', () => {
  const model = source('core/model.ts');
  assert.match(model, /derivedFrom\?: string\[\]/);
  assert.match(model, /generationAction\?: AIProposalAction/);
  const thoughtBlock = model.match(/export interface Thought[\s\S]*?\n}/)?.[0] ?? '';
  const declarations = thoughtBlock.split('\n').filter(line => !line.trim().startsWith('/**') && !line.trim().startsWith('*')).join('\n');
  assert.doesNotMatch(declarations, /\b(path|controlPoint|anchor|curve|geometry)\b/);
  assert.equal(causalEdges(lineageProject()).length, 3);
});
