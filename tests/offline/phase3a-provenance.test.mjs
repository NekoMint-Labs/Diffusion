import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSourceQuotes } from '../../src/ai/provenance.ts';

test('Phase 3A provenance round-trips Chinese and surrogate pairs with UTF-16 offsets', () => {
  const text = '我喜欢 HCI🙂，但也担心就业。';
  const ranges = resolveSourceQuotes('input-cn', text, ['HCI🙂', '担心就业']);
  assert.deepEqual(ranges.map(range => text.slice(range.start, range.end)), ['HCI🙂', '担心就业']);
  assert.ok(ranges.every(range => range.inputId === 'input-cn'));
});

test('Phase 3A provenance rejects fabricated and ambiguous evidence', () => {
  assert.throws(() => resolveSourceQuotes('input', '原始文字', ['改写后的文字']), /exact substring/);
  assert.throws(() => resolveSourceQuotes('input', 'same and same', ['same']), /ambiguous/);
});
