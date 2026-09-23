import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cancelThinkingOperation, canCancelThinkingOperation, registerOperationCancellation } from '../../src/ai/operationControl.ts';

const read = path => fs.readFileSync(path, 'utf8');

test('Stage E cancellation is request-scoped and does not store callbacks in UI state', () => {
  let stopped = 0;
  const unregister = registerOperationCancellation('request-1', () => { stopped += 1; });
  assert.equal(canCancelThinkingOperation('request-1'), true);
  assert.equal(cancelThinkingOperation('request-1'), true);
  assert.equal(stopped, 1);
  unregister();
  assert.equal(canCancelThinkingOperation('request-1'), false);
  assert.equal(cancelThinkingOperation('request-1'), false);
});

test('Stage E keeps immediate spatial acknowledgement, delayed copy and truthful action-specific wording', () => {
  const layer = read('src/ui/motion/SpatialActivityLayer.tsx');
  const runtime = read('src/ai/runtime.ts');
  const evidence = read('src/ui/reference/EvidenceSurface.tsx');
  assert.match(layer, /setTimeout\(\(\) => setShowCopy\(true\), 190\)/);
  assert.match(layer, /Continuing this line\.\.\./);
  assert.match(layer, /Looking from another direction\.\.\./);
  assert.match(layer, /Looking for a useful question\.\.\./);
  assert.match(layer, /Looking for supporting or challenging evidence\.\.\./);
  assert.match(layer, /canCancelThinkingOperation\(displayOperation\.id\)/);
  assert.match(runtime, /registerOperationCancellation\(requestId, \(\) => abort\.abort\(\)\)/);
  assert.match(evidence, /registerOperationCancellation\(spatialOperation\.id, \(\) => abort\.abort\(\)\)/);
  assert.doesNotMatch(layer, /percentage|tokens|chain[- ]of[- ]thought/i);
});

test('Stage F tutorial is device UI state, uses a deterministic transient Ghost and never claims practice output', () => {
  const tutorial = read('src/ui/tutorial/FirstFieldTutorial.tsx');
  const workspace = read('src/ui/Workspace.tsx');
  const intents = read('src/ui/workspace/useThinkingIntents.ts');
  assert.match(tutorial, /diffusion-first-field-tutorial-v1/);
  assert.match(tutorial, /First Field Tutorial \/ deterministic demonstration/);
  assert.match(tutorial, /controller\.addGhost\(/);
  assert.match(tutorial, /Tutorial demonstration \/ no live model was used\./);
  // Its own line does not inherit the action a previous notice left on screen.
  assert.match(tutorial, /noticeAction: null/);
  assert.match(tutorial, /controller\.dismissGhost\(ghostId\)/);
  assert.doesNotMatch(tutorial, /controller\.claim\(|claimAll\(/);
  assert.match(workspace, /tutorial\.interceptScopeAction\(id\)/);
  assert.match(workspace, /tutorial\.interceptProposalAction\(ids, action\)/);
  assert.match(workspace, /intents\.submit\(\{ localOnly: tutorial\.active \}\)/);
  // The tutorial's local-only write may not swallow the one sentence — and the one control — that
  // explain why nothing was called while the provider is off.
  assert.match(intents, /const providerOff = settingsRef\.current\.provider === 'off'/);
  assert.match(intents, /if \(options\.localOnly \|\| providerOff\)/);
  assert.match(intents, /if \(providerOff \|\| !options\.localOnly\) aiOffNotice\(\)/);
  assert.match(workspace, /Restart First Field Tutorial/);
});

test('Stage F teaches the core sequence and retains later one-time contextual coaching', () => {
  const tutorial = read('src/ui/tutorial/FirstFieldTutorial.tsx');
  for (const phase of ["'write'", "'move'", "'pan'", "'select'", "'generate'", "'ghost'", "'keep'", "'done'"]) assert.match(tutorial, new RegExp(phase));
  assert.match(tutorial, /Moving it does not accept it/);
  assert.match(tutorial, /Keep changes ownership/);
  assert.match(tutorial, /diffusion-first-field-coaching-v1/);
  assert.match(tutorial, /'relation' \| 'verify' \| 'crystal' \| 'multi' \| 'focus'/);
  assert.match(tutorial, /Find material that supports or challenges this Thought\./);
  assert.match(tutorial, /F frames the current selection/);
  // The 'select' step begins with nothing owning attention, because the previous step's press has
  // already selected the Thought it asks the person to select.
  assert.match(tutorial, /useUI\.getState\(\)\.patch\(\{ selection: \[\] \}\)/);
});
