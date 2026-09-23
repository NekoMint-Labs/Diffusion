import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

test('Stage B gives Ghost, Question and Source distinct editorial identities without ontology colour', () => {
  const semantic = read('src/ui/resultSemantics.css');
  const theme = read('src/ui/theme.css');

  assert.match(semantic, /\.thought\.ghost:not\(\.editing\)::before[\s\S]*pencil-trace/);
  assert.match(semantic, /data-proposal-action="angle"[\s\S]*border-left: 1px dashed/);
  assert.match(semantic, /\.question-mark[\s\S]*left: -23px/);
  assert.match(semantic, /\.thought\.source:not\(\.editing\)::before[\s\S]*source-rule/);
  assert.match(theme, /--pencil-trace:/);
  assert.match(theme, /--source-rule:/);
  assert.doesNotMatch(semantic + theme, /AI[-_ ]purple|neon|shimmer/i);
});

test('Stage B raises Field identity and settles Crystal while relations sleep at rest', () => {
  const field = read('src/ui/field.css');
  const material = read('src/ui/materials.css');

    assert.match(field, /\.identity h1[^{]*\{[^}]*var\(--thought-font\)/s);
    // Field-local identity lives in field.css now (materials.css owns only Thought material + relations).
    assert.match(field, /html\[lang\^="zh"\] \.identity-eyebrow/);
    assert.match(field, /\.thought\.crystal::before[^{]*\{[^}]*\\25c6/s);
    assert.match(material, /\.relation\.confirmed path[^{]*\{[^}]*opacity: \.24/s);
    assert.match(material, /\.relation\.relevant\.confirmed path[^{]*\{[^}]*opacity: \.6/s);
    assert.match(read('src/field/phenomena/describe.ts'), /path: `M\$\{a\.x\},\$\{a\.y\} C/);
});
