import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { semanticExcerpt } from '../../src/field/spatial/representation.ts';

const src = path => fs.readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');

test('Phase 4 semantic zoom discloses meaning instead of arbitrary 42-character slices', () => {
    const text = 'The first sentence carries the idea. The second sentence adds detail that should wait until Local.';
    assert.equal(semanticExcerpt(text, 'local', 'thought'), text);
    assert.equal(semanticExcerpt(text, 'neighborhood', 'thought'), 'The first sentence carries the idea.');
    assert.equal(semanticExcerpt('第一句表达核心。第二句补充细节。', 'neighborhood', 'thought'), '第一句表达核心。');
    assert.ok(semanticExcerpt('A '.repeat(100), 'atlas', 'thought').endsWith('…'));
});

test('Phase 4 Region semantics remain labels and disclosure without ambient container geometry', () => {
    const field = src('field/Field.tsx');
    assert.match(field, /Object\.values\(project\.regions\)/);
    assert.match(field, /className="region-label"/);
    assert.doesNotMatch(field, /RegionFieldLayer|describeRegionFields/);
    assert.doesNotMatch(src('ui/resultSemantics.css'), /\.region-field\b|--structure/);
});

test('Phase 4 Atlas preserves explicit orientation anchors without turning back into a card field', () => {
    const field = src('field/Field.tsx');
    assert.match(field, /item\.kind === 'thought' && \(selected \|\| item\.kept\)/);
    assert.match(field, /item\.kind !== 'crystal'/);
    assert.match(field, /semanticExcerpt\(t\.text, 'atlas', 'thought'\)/);
    assert.match(field, /priority\.has\(key\) \? 4 : landmark \? 3 : unresolved \? 2 : 1/);
});

test('Phase 4 completion receipts carry only transient result counts', () => {
    const model = src('core/model.ts');
    const runtime = src('ai/runtime.ts');
    const layer = src('ui/motion/SpatialActivityLayer.tsx');
    assert.match(model, /resultCount\?: number/);
    assert.match(runtime, /settle\(started, 'completed', emitted\)/);
    assert.match(layer, /\{count\} results · \{action\}/);
    assert.doesNotMatch(layer, /case 'probe': return t\('Relation'\)/);
});

test('Phase 4 motion remains state-clarifying and reduced-motion aware', () => {
    const semantics = src('ui/resultSemantics.css');
    const material = src('ui/materials.css');
    assert.match(semantics, /causal-trace-wake/);
    assert.match(material, /ghost-text-settle/);
    assert.match(material, /box-shadow var\(--motion-control\)/);
    assert.match(`${semantics}\n${material}`, /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(material, /particle/i);
});
