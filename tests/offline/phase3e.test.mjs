import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createProject, emptySession, makeThought } from '../../src/core/model.ts';
import { placePossibility } from '../../src/field/spatial/placement.ts';
import { intentAllowedForAction } from '../../src/ai/runtime.ts';
import { THINKING_DIRECTION_COUNTS } from '../../src/ui/commands/thinking.ts';

const src = file => fs.readFileSync(new URL(`../../src/${file}`, import.meta.url), 'utf8');

test('Phase 3E action boundaries reject semantic overlap', () => {
  assert.equal(intentAllowedForAction('continue', 'surface_possibility'), true);
  assert.equal(intentAllowedForAction('continue', 'surface_question'), false);
  assert.equal(intentAllowedForAction('angle', 'surface_possibility'), true);
  assert.equal(intentAllowedForAction('question', 'surface_question'), true);
  assert.equal(intentAllowedForAction('question', 'surface_possibility'), false);
  assert.equal(intentAllowedForAction('probe', 'surface_relation'), true);
  assert.equal(intentAllowedForAction('organize', 'surface_structure'), true);
  assert.equal(intentAllowedForAction('organize', 'surface_relation'), false);
});

test('Phase 3E 1 / 3 / 5 preview wiring reaches action-specific execution without changing Settings defaults', () => {
  assert.deepEqual([...THINKING_DIRECTION_COUNTS], [1, 3, 5]);
  const preview = src('ui/surfaces/ActionPreviewSurface.tsx');
  const workspace = src('ui/Workspace.tsx');
  assert.match(preview, /useState<ThinkingDirectionCount>\(THINKING_DEFAULTS\.directions\)/);
  assert.doesNotMatch(preview, /onChange=.*thinkingDefaults|updateSettings\(/);
  assert.match(workspace, /runtime\.run\(action,[\s\S]*maxCandidates: options\.count/);
  assert.match(workspace, /diffuse\.start\(\{[\s\S]*steps: options\.count,[\s\S]*mode: 'angle'/);
  assert.match(workspace, /ask: intents\.ask/);
  assert.match(workspace, /questions: ids => openActionPreview\('ask', ids\)/);
});

test('Phase 3E proposal surfaces expose only contextual next actions', () => {
  const hub = src('ui/scope/ScopeHub.tsx');
  for (const id of ['ai-proposal-keep', 'ai-proposal-continue', 'ai-proposal-angle', 'ai-question-answer', 'ai-proposal-ignore']) assert.match(hub, new RegExp(id));
  assert.match(hub, /!aiProposalKind && <Button[\s\S]*thought-more/);
  assert.match(src('ui/surfaces/OrganizeSurface.tsx'), /Apply/);
  assert.match(src('ui/surfaces/OrganizeSurface.tsx'), /Try another/);
  assert.match(src('ui/surfaces/OrganizeSurface.tsx'), /Cancel/);
});

test('Phase 3E result identity remains visible with reduced motion', () => {
  const thought = src('ui/thought/ThoughtView.tsx');
  const css = src('ui/resultSemantics.css');
  assert.match(thought, /data-proposal-kind=\{proposalKind\}/);
  assert.match(thought, /data-proposal-action=\{proposalAction\}/);
  assert.match(thought, /proposalKind === 'question'/);
  assert.match(css, /data-proposal-action="continue"/);
  assert.match(css, /data-proposal-action="angle"/);
  assert.match(css, /data-proposal-kind="question"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('Phase 3E placement modes have static spatial identity without moving the source', () => {
  const p = createProject('placement-3e');
  p.thoughts.a = makeThought('A', { x: 400, y: 300 }, 1, 'a');
  const before = { x: p.thoughts.a.x, y: p.thoughts.a.y };
  const session = emptySession();
  const bounds = { x: 0, y: 0, width: 1800, height: 1200 };
  const continuation = placePossibility(p, session, { x: 400, y: 300 }, 0, ['a'], bounds, 'Result', 'continue');
  const branch = placePossibility(p, session, { x: 400, y: 300 }, 0, ['a'], bounds, 'Result', 'branch');
  const question = placePossibility(p, session, { x: 400, y: 300 }, 0, ['a'], bounds, 'Result', 'question');
  assert.notDeepEqual(branch, continuation);
  assert.notDeepEqual(question, continuation);
  assert.deepEqual({ x: p.thoughts.a.x, y: p.thoughts.a.y }, before);
});
