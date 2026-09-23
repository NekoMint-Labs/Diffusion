import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createProject, makeThought } from '../../src/core/model.ts';
import { placePossibility, RESULT_PREFERRED_DISTANCE } from '../../src/field/spatial/placement.ts';

const read = path => fs.readFileSync(path, 'utf8');
const session = () => ({ ghosts: {}, phenomena: {}, structures: {}, recalls: [], detachedGhosts: [] });

function fixture() {
  const project = createProject('stage-g', 'Stage G', 1);
  project.thoughts.a = makeThought('An unfinished thought', { x: 300, y: 240 }, 1, 'a');
  return project;
}

test('Stage G semantic placement chooses posture before collision escape', () => {
  const project = fixture();
  const bounds = { x: -200, y: -400, width: 1800, height: 1400 };
  const scope = project.thoughts.a;
  const right = scope.x + 256;
  const continuation = placePossibility(project, session(), { x: 400, y: 300 }, 0, ['a'], bounds, 'Continue result', 'continue');
  const branch = placePossibility(project, session(), { x: 400, y: 300 }, 0, ['a'], bounds, 'Another angle', 'branch');
  const question = placePossibility(project, session(), { x: 400, y: 300 }, 0, ['a'], bounds, 'What would change this?', 'question');
  const evidence = placePossibility(project, session(), { x: 400, y: 300 }, 0, ['a'], bounds, 'Evidence note', 'evidence');
  const landmark = placePossibility(project, session(), { x: 400, y: 300 }, 0, ['a'], bounds, 'Settled wording', 'landmark');

  assert.ok(continuation.x >= right + RESULT_PREFERRED_DISTANCE.min, 'Continue extends the line of thought');
  assert.ok(branch.x >= right + RESULT_PREFERRED_DISTANCE.min && branch.y !== continuation.y, 'Another Angle branches diagonally');
  assert.ok(question.y < scope.y, 'Question starts above attention');
  assert.ok(evidence.y > scope.y, 'Evidence reads below the claim like a footnote');
  assert.ok(landmark.y > scope.y, 'A new Crystal landmark gets local breathing room');
});

test('Stage G routes evidence and Crystal creation through the semantic placement grammar', () => {
  const runtime = read('src/ai/runtime.ts');
  const workspace = read('src/ui/Workspace.tsx');
  const intents = read('src/ui/workspace/useThinkingIntents.ts');
  const actions = read('src/ui/workspace/useFieldActions.ts');

  assert.match(runtime, /candidate\.type === 'surface_evidence' \? 'evidence'/);
  assert.match(workspace, /actions\.freePoint\(surfaces\.draft\.scopeIds, surfaces\.draft\.text, 'landmark'\)/);
  assert.match(intents, /freePoint\(\[key\], '', 'continue'\)/);
  assert.match(intents, /candidate\.title, 'evidence'/);
  assert.match(actions, /mode: ResultPlacementMode = 'default'/);
});
