import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readSSEData } from '../../src/ai/stream.ts';

const src = file => fs.readFileSync(new URL(`../../src/${file}`, import.meta.url), 'utf8');

// The ten verbs are one named grammar rather than ten ad-hoc animations.
test('Phase 3C declares the complete spatial thinking grammar', () => {
  const grammar = src('ui/motion/spatialGrammar.ts');
  for (const [action, motion] of Object.entries({
    create: 'emerge', decompose: 'unfold', explore: 'radiate', relate: 'bridge', verify: 'anchor',
    recall: 'surface', bring: 'arrive', crystallize: 'converge', reject: 'dissolve', commit: 'settle',
  })) assert.match(grammar, new RegExp(`${action}: '${motion}'`));
});

// The Field owns one transient overlay. It can observe geometry but cannot mutate canonical project state.
test('Phase 3C activity stays in one presentation-only Field layer', () => {
  const field = src('field/Field.tsx');
  const layer = src('ui/motion/SpatialActivityLayer.tsx');
  assert.equal((field.match(/<SpatialActivityLayer\b/g) || []).length, 1);
  assert.match(layer, /pointer input/);
  assert.match(layer, /spatial-nonsemantic-activity" aria-hidden="true"/);
  assert.doesNotMatch(layer, /dispatch\(|addGhost\(|addPhenomenon\(|thought\.move/);
  assert.match(src('ui/motion/spatialActivity.css'), /\.spatial-activity-layer[^}]*pointer-events:\s*none/);
});

// Waiting cues are activity only; each real flow supplies the operation-specific presentation word.
test('Phase 3C wires radiate bridge anchor and arrive to real intents', () => {
  const intents = src('ui/workspace/useThinkingIntents.ts');
  assert.match(intents, /activity: 'bridge'/);
  assert.match(intents, /activity: 'radiate'/);
  assert.match(intents, /activity: 'arrive'/);
  assert.match(src('ui/reference/EvidenceSurface.tsx'), /activity: 'anchor'/);
  const runtime = src('ai/runtime.ts');
  assert.match(runtime, /this\.begin\('ingest',[\s\S]*?'unfold'\)/);
  assert.match(runtime, /kind === 'diffuse' \|\| kind === 'angle' \|\| kind === 'question' \? 'radiate'/);
  assert.match(runtime, /kind === 'continue' \? 'unfold'/);
});

// Authored creation uses the Thought's own arrival; the retired circular Field halo is absent.
test('Phase 3C reuses Thought emergence and recall presence ownership', () => {
  const actions = src('ui/workspace/useFieldActions.ts');
  assert.match(actions, /useFirstThoughtEmergence/);
  assert.doesNotMatch(actions, /revealCreation|field-emergence/);
  assert.match(src('ui/thought/ThoughtView.tsx'), /phase=\{ghost \? 'ghost' : 'recall'\}/);
});

// Higher-order transitions never move canonical x/y: they are local presentation state only.
test('Phase 3C converge dissolve and settle are transient presentation', () => {
  const grammar = src('ui/motion/spatialGrammar.ts');
  const intents = src('ui/workspace/useThinkingIntents.ts');
  assert.match(intents, /presentSpatialTransition\('converge'/);
  assert.match(grammar, /presentSpatialTransition\('dissolve'/);
  assert.match(grammar, /presentMaterialSettle/);
  assert.doesNotMatch(grammar, /thought\.move|positions:|\.x\s*=|\.y\s*=/);
});

// Exact source ranges are visual provenance, not a Relation or Phenomenon.
test('Phase 3C provenance highlights only real source ranges', () => {
  const runtime = src('ai/runtime.ts');
  const layer = src('ui/motion/SpatialActivityLayer.tsx');
  assert.match(runtime, /ranges:\s*unit\.sourceRanges/);
  assert.match(runtime, /onEvent\?\.\(\{ type: 'unit'/);
  assert.match(layer, /data-provenance-highlight/);
  assert.match(layer, /provenance-activity/);
  assert.doesNotMatch(layer, /Relation|Phenomenon/);
});

// Editing exposes canonical text; only the resting Thought remains bounded.
test('Phase 3C full text editing grows to content and scrolls only at a viewport cap', () => {
  const view = src('ui/thought/ThoughtView.tsx');
  assert.match(view, /scrollHeight/);
  assert.match(view, /0\.7/);
  assert.match(view, /overflowY = 'auto'/);
  assert.doesNotMatch(view, /Math\.min\(12/);
  const css = src('ui/field.css');
  const textarea = css.match(/\.thought textarea\s*\{[^}]*\}/s)?.[0] ?? '';
  assert.match(textarea, /overflow-y:\s*auto/);
  assert.doesNotMatch(textarea, /overflow:\s*hidden|overflow-y:\s*hidden/);
});

// Streaming transport can buffer SSE safely, while providers without it keep the atomic path.
test('Phase 3C streaming seam never treats partial JSON as semantic output', () => {
  const stream = src('ai/stream.ts');
  assert.match(stream, /response\.body\.getReader\(\)/);
  assert.match(stream, /new TextDecoder\(\)/);
  assert.match(stream, /\\r\?\\n\\r\?\\n/);
  assert.match(stream, /reader\.releaseLock\(\)/);
  assert.match(stream, /provider\.streamStructured/);
  assert.match(stream, /response: await provider\.structured/);
  assert.match(stream, /Half a JSON string is never meaning/);
});

// Reduced motion preserves state and removes travel/activity animation rather than removing semantics.
test('Phase 3C has a reduced-motion equivalent for the shared activity layer', () => {
  const layer = src('ui/motion/SpatialActivityLayer.tsx');
  const css = src('ui/motion/spatialActivity.css');
  assert.match(layer, /useReducedMotion/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation:\s*none !important/);
  assert.match(css, /\.input-seed \{ transition:\s*none/);
});


test('Phase 3C SSE reader preserves split CRLF events and multiline data', async () => {
  const chunks = [
    'data: {"unit":',
    '1}\r',
    '\n',
    'data: "grounded"\r\n\r',
    '\n',
    'data: second\ndata: line\n\n',
  ];
  const encoder = new TextEncoder();
  const response = new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }));
  const events = [];
  for await (const data of readSSEData(response)) events.push(data);
  assert.deepEqual(events, ['{"unit":1}\n"grounded"', 'second\nline']);
});

test('Phase 3C SSE reader is abort-owned even while a read is pending', async () => {
  const abort = new AbortController();
  const response = new Response(new ReadableStream({ start() {} }));
  const read = (async () => { for await (const _ of readSSEData(response, abort.signal)) void _; })();
  abort.abort();
  await assert.rejects(read, error => error instanceof DOMException && error.name === 'AbortError');
});

test('Phase 3C SSE reader does not promote an incomplete tail', async () => {
  const response = new Response('data: incomplete-without-event-boundary');
  const events = [];
  for await (const data of readSSEData(response)) events.push(data);
  assert.deepEqual(events, []);
});
