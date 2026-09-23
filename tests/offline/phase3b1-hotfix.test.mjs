import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = file => fs.readFileSync(new URL(`../../src/${file}`, import.meta.url), 'utf8');
const between = (text, from, to) => text.slice(text.indexOf(from), text.indexOf(to));
const count = (text, pattern) => (text.match(pattern) || []).length;

// One popup, one portal: the nested submenu portal is what lost the whole menu in a real session.
test('Phase 3D command menu has one coordinated secondary column and no second portal', () => {
  const menu = src('ui/focus/CommandMenu.tsx');
  assert.equal(count(menu, /<Menu\.Portal/g), 1);
  assert.doesNotMatch(menu, /Menu\.SubmenuRoot/);
  assert.doesNotMatch(menu, /Menu\.SubmenuTrigger/);
  assert.doesNotMatch(menu, /command-submenu/);
  assert.match(menu, /secondaryOpen/);
  assert.match(menu, /MORE_HOVER_DELAY = 160/);
  assert.match(menu, /data-command="more" closeOnClick=\{false\}/);
  assert.match(menu, /data-secondary-panel/);
  assert.doesNotMatch(menu, /data-command="back"/);
});

// A second Positioner or Popup would be a second surface, so both columns must share one popup.
test('Phase 3B.1 command menu renders exactly one positioner and one popup', () => {
  const menu = src('ui/focus/CommandMenu.tsx');
  assert.equal(count(menu, /<Menu\.Positioner\b/g), 1);
  assert.equal(count(menu, /<Menu\.Popup\b/g), 1);
});

// Ingestion has one narrow model task and no automatic relation pass.
test('Phase 3C ingestion keeps writing and relation discovery separate', () => {
  const ingestion = src('ai/ingestion.ts');
  assert.match(ingestion, /export async function extractThoughts/);
  assert.match(ingestion, /thought-extraction-recheck/);
  assert.doesNotMatch(ingestion, /export async function inferRelations/);
  assert.doesNotMatch(ingestion, /saliency/);
  assert.doesNotMatch(ingestion, /tempId/);
  const runtime = src('ai/runtime.ts');
  const ingest = between(runtime, 'async ingest(', 'async run(');
  assert.match(ingest, /extractThoughts/);
  assert.doesNotMatch(ingest, /inferRelations/);
  assert.doesNotMatch(ingest, /addPhenomenon/);
});

// Prompt responsibility is intentionally small: grounded, independently manipulable thoughts only.
test('Phase 3C extraction instruction is small and preserves authored voice', () => {
  const extraction = between(src('ai/ingestion.ts'), 'THOUGHT_EXTRACTION_INSTRUCTIONS', 'RECHECK_INSTRUCTIONS');
  for (const phrase of ['independently manipulable', 'plain language', 'first-person', 'sourceQuotes'])
    assert.ok(extraction.includes(phrase), `extraction instruction lost: ${phrase}`);
  assert.doesNotMatch(extraction, /saliency|tempId|role:/);
});

// A bounded structured task caps at `standard`; auto/light/standard pass through on every structured path.
test('Phase 3B.1 structuredDepth caps only deep and is used by both structured paths', () => {
  const providers = src('ai/providers.ts');
  assert.match(providers, /export function structuredDepth/);
  assert.match(providers, /depth === 'deep' \? 'standard' : depth/);
  const directStructured = between(src('ai/direct.ts'), 'async structured(', 'async respond(');
  assert.match(directStructured, /structuredDepth\(this\.config\.depth\)/);
  assert.match(directStructured, /outputBudget\(depth/);
  assert.match(directStructured, /reasoningEffort\(depth/);
  assert.doesNotMatch(directStructured, /outputBudget\(this\.config\.depth/);
  const gatewayStructured = between(src('ai/gateway.ts'), 'async structured(', 'async respond(');
  assert.match(gatewayStructured, /structuredDepth\(this\.config\.depth/);
});

// The person's exact words are acknowledged as a Field Seed before model work starts.
test('Phase 3C input Seed is local and off the ingest critical path', () => {
  assert.match(src('ui/store.ts'), /structuring: \{ inputId: string; text: string; point: Point/);
  assert.match(src('ui/motion/SpatialActivityLayer.tsx'), /data-testid="input-seed"/);
  assert.doesNotMatch(src('ui/workspace/Speak.tsx'), /data-testid="speak-structuring"/);
  const intents = src('ui/workspace/useThinkingIntents.ts');
  assert.ok(intents.indexOf('structuring: { inputId') < intents.indexOf('runtime.ingest('));
  assert.match(intents, /void runtime\.ingest\(/);
  assert.doesNotMatch(intents, /await\s+runtime\.ingest\(/);
});
