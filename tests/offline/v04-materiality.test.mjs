import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const block = (css, selector) => {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `Missing selector: ${selector}`);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
};

test('current visual system layers quiet Material states without changing Field geometry', () => {
  const css = read('src/ui/materials.css');
  const thoughtView = read('src/ui/thought/ThoughtView.tsx');
  // One state = one pair of rung tokens; the fill and the edge are derived from them, never restated.
  assert.match(css, /\.thought \{[^}]*--thought-material:\s*var\(--thought-rest-material\)/s);
  assert.match(block(css, '.thought:hover:not(.editing)'), /--thought-material:\s*calc\(var\(--thought-rest-material\)/);
  assert.match(block(css, '.thought[data-selected="true"]:not(.editing)'), /--thought-material:\s*calc\(var\(--thought-rest-material\)/);
  assert.match(block(css, '.field[data-drag-kind="selection"] .thought[data-selected="true"]:not(.editing)'), /cursor: grabbing/);
  assert.match(css, /\.thought-selected-dot\s*\{[^}]*background:\s*var\(--selection-accent\)/s);
  assert.match(thoughtView, /selected && <span className="thought-selected-dot"/);
  assert.match(css, /\.ghost-boundary\s*\{[^}]*border:\s*1px dashed/s);
  assert.match(css, /\.thought\.source:not\(\.editing\)\s*\{[^}]*background:\s*color-mix/s);
  // A material state changes the two rung tokens, never layout: hover, selection and drag never reflow.
  for (const selector of [
    '.thought:hover:not(.editing)',
    '.thought[data-selected="true"]:not(.editing)',
    '.field[data-drag-kind="selection"] .thought[data-selected="true"]:not(.editing)',
    '.thought[data-emphasis="nearby"]:not([data-selected="true"]):not(.editing)',
    '.thought[data-emphasis="direct"]:not([data-selected="true"]):not(.editing)',
  ]) assert.doesNotMatch(block(css, selector), /\b(?:width|height|padding|margin|left|top|right|bottom)\s*:/);
});

test('confirmed topology survives a selection drag through presentation-only geometry', () => {
  const field = read('src/field/Field.tsx');
  const relationLayer = read('src/field/phenomena/RelationLayer.tsx');
  const drag = read('src/field/phenomena/dragPreview.ts');
  assert.match(field, /paintConfirmedDragRelations/);
  assert.match(relationLayer, /data-relation-id=\{relation\.id\}/);
  assert.match(field, /data-drag-kind/);
  assert.match(drag, /describeRelations/);
  assert.match(drag, /!relation\.confirmed/);
  assert.doesNotMatch(drag, /dispatch\(|thought\.move|relation\.confirm\(/);
});

test('ordinary Settings controls use the shared primitive anatomy', () => {
  const settings = read('src/ui/surfaces/SettingsSurface.tsx');
  const ai = read('src/ui/surfaces/AISettings.tsx');
  const search = read('src/ui/surfaces/SearchSettings.tsx');
  for (const source of [settings, ai, search]) {
    assert.match(source, /SurfaceGroup|SettingRow/);
    assert.doesNotMatch(source, /className="settings-(panel|probe|switch)"/);
    assert.doesNotMatch(source, /className="setting-row/);
  }
  assert.match(search, /<Switch/);
  assert.match(ai, /<Button/);
});

test('new UI layers avoid decorative gradients and keep one behavior system', () => {
  const material = read('src/ui/materials.css');
  const primitives = read('src/ui/primitives/primitives.css');
  const surfaces = read('src/ui/surfaces/surfaces.css');
  assert.doesNotMatch(material + primitives + surfaces, /gradient\(/i);
  assert.match(read('src/ui/primitives/Button.tsx'), /@base-ui\/react\/button/);
  assert.match(read('src/ui/primitives/Switch.tsx'), /@base-ui\/react\/switch/);
  assert.match(read('src/ui/primitives/Checkbox.tsx'), /@base-ui\/react\/checkbox/);
});
