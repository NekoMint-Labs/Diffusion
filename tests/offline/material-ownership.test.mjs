import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The ownership contract behind the Thought material system.
 *
 * These assertions are about *who owns what*, not about magic numbers: `materials.css` owns every
 * `.thought` material state, `theme.css` owns the two palette numbers a profile tunes, and no
 * JavaScript is allowed to move any of them. The point is that a future change cannot quietly
 * reintroduce a second owner (the deleted `polish.css` was exactly that) without this test failing.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rel = absolute => path.relative(ROOT, absolute).split(path.sep).join('/');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const strip = css => css.replace(/\/\*[\s\S]*?\*\//g, '');

function walk(dir, filter) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full, filter));
        else if (!filter || filter(entry.name)) out.push(full);
    }
    return out;
}
const uiStylesheets = () => walk(path.join(ROOT, 'src/ui'), name => name.endsWith('.css'));
const srcFiles = filter => walk(path.join(ROOT, 'src'), filter);

/** Every innermost `selector { body }` rule, including rules nested inside `@media`. */
function rules(css) {
    const out = [];
    const pattern = /([^{}]+)\{([^{}]*)\}/g;
    let match;
    while ((match = pattern.exec(css))) out.push({ selector: match[1].trim(), body: match[2] });
    return out;
}
/** Remove `@`-prefixed blocks (`@media`, `@keyframes`, `@import …;`) so only depth-0 rules remain;
 * a responsive override inside `@media` is a variant, not a second owner. */
function withoutAtBlocks(css) {
    let out = '';
    for (let i = 0; i < css.length; i++) {
        if (css[i] !== '@') { out += css[i]; continue; }
        const brace = css.indexOf('{', i);
        const semi = css.indexOf(';', i);
        if (brace === -1 || (semi !== -1 && semi < brace)) { i = (semi === -1 ? css.length : semi + 1) - 1; continue; }
        let depth = 1, j = brace + 1;
        while (j < css.length && depth > 0) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
        i = j - 1;
    }
    return out;
}
const channel = value => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a, b) => { const [hi, lo] = luminance(a) >= luminance(b) ? [luminance(a), luminance(b)] : [luminance(b), luminance(a)]; return (hi + 0.05) / (lo + 0.05); };
const hex = value => [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)];
const block = (css, selector) => {
    const start = css.indexOf(`${selector} {`);
    assert.notEqual(start, -1, `Missing selector: ${selector}`);
    const open = css.indexOf('{', start);
    return css.slice(open + 1, css.indexOf('}', open));
};
const value = (body, name) => (body.match(new RegExp(`${name}\\s*:\\s*([^;]+)`)) ?? [])[1]?.trim();

test('the generic override layer is gone and not re-imported', () => {
    assert.equal(fs.existsSync(path.join(ROOT, 'src/ui/polish.css')), false, 'src/ui/polish.css must not exist');
    assert.doesNotMatch(read('src/ui/theme.css'), /polish\.css/, 'theme.css must not import a generic override layer');
});

test('materials.css is the only owner of every Thought material state', () => {
    const material = read('src/ui/materials.css');
    assert.match(material, /--thought-material\s*:/);
    assert.match(material, /--thought-edge\s*:/);
    for (const file of uiStylesheets().filter(f => path.basename(f) !== 'materials.css')) {
        const css = strip(read(rel(file)));
        assert.doesNotMatch(css, /--thought-(?:material|edge)\s*:/, `${rel(file)} sets the Thought rung tokens`);
        for (const rule of rules(css)) {
            if (!/\.thought\[data-selected="true"\]/.test(rule.selector) && !/\.thought\[data-emphasis=/.test(rule.selector)) continue;
            assert.doesNotMatch(rule.body, /(?:^|[;{\s])(background|background-color|box-shadow)\s*:/, `${rel(file)} restates a Thought material state: ${rule.selector}`);
        }
    }
});

test('theme.css states the resting palette for light, dark and graphite-night', () => {
    const theme = strip(read('src/ui/theme.css'));
    const light = block(theme, ':root');
    const dark = block(theme, ':root[data-theme="dark"]');
    const graphite = block(theme, ':root[data-style-profile="graphite-night"]');
    for (const [name, body] of [['light', light], ['dark', dark], ['graphite-night', graphite]]) {
        assert.match(body, /--thought-rest-material\s*:/, `${name} states --thought-rest-material`);
        assert.match(body, /--thought-rest-boundary\s*:/, `${name} states --thought-rest-boundary`);
    }
    // Graphite Night is its own pair, not an alias of either polarity.
    assert.notEqual(value(graphite, '--thought-rest-material'), value(light, '--thought-rest-material'));
    assert.notEqual(value(graphite, '--thought-rest-material'), value(dark, '--thought-rest-material'));
    assert.notEqual(value(graphite, '--thought-rest-boundary'), value(light, '--thought-rest-boundary'));
    assert.notEqual(value(graphite, '--thought-rest-boundary'), value(dark, '--thought-rest-boundary'));
});

test('no JavaScript moves a material token, and the image token is static', () => {
    const token = /--thought-rest-material|--thought-rest-boundary|--thought-near-material|--thought-image-material|--causal-sleep-presence|--presence-region-field/;
    for (const file of srcFiles(name => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(name)))
        assert.doesNotMatch(read(rel(file)), token, `${rel(file)} sets a material token from JavaScript`);
    // The old per-device Field-Presence slider token is gone from the whole source tree, not just JS.
    for (const file of srcFiles())
        assert.doesNotMatch(read(rel(file)), /--presence-region-field/, `${rel(file)} still references --presence-region-field`);
    const theme = strip(read('src/ui/theme.css'));
    assert.match(theme, /--thought-image-material:\s*\d+(?:\.\d+)?%/, '--thought-image-material must be a literal token');
    assert.doesNotMatch(theme, /--thought-image-material:\s*(?:calc|var|color-mix)/, '--thought-image-material must not be computed');
});

test('field.css no longer declares any application-surface family', () => {
    const field = strip(read('src/ui/field.css'));
    for (const token of ['\\.surface\\b', '\\.settings-', '\\.command-menu', '\\.command-palette', '\\.history-', '\\.thread-', '\\.deep-', '\\.notice', '\\.field-list'])
        assert.doesNotMatch(field, new RegExp(token), `field.css must not declare application surfaces (${token})`);
    // Layout that names the active surface is Field geography, not an application surface.
    assert.match(field, /\.app\[data-active-surface=/);
});

test('surfaces.css owns each application-surface class exactly once', () => {
    const surfaces = strip(read('src/ui/surfaces/surfaces.css'));
    const family = /^\.(?:thread-[a-z0-9-]+|deep-[a-z0-9-]+|passage-footer|structured-manuscript)$/;
    const owners = new Map();
    for (const rule of rules(withoutAtBlocks(surfaces)))
        for (const part of rule.selector.split(',').map(s => s.trim()))
            if (family.test(part)) owners.set(part, (owners.get(part) ?? 0) + 1);
    assert.ok(owners.size >= 8, 'the application surface classes are declared in surfaces.css');
    for (const [name, count] of owners)
        assert.ok(count <= 1, `${name} is declared ${count} times as its own rule`);
    for (const file of uiStylesheets().filter(f => !f.endsWith('surfaces.css')))
        for (const name of owners.keys())
            assert.doesNotMatch(strip(read(rel(file))), new RegExp(`\\${name}\\b`), `${rel(file)} also declares ${name}`);
});

test('Graphite Night keeps a real Field / Surface separation', () => {
    const graphite = block(strip(read('src/ui/theme.css')), ':root[data-style-profile="graphite-night"]');
    const ratio = contrast(hex(graphite.match(/--field-bg:\s*(#[0-9a-fA-F]{6})/)[1]), hex(graphite.match(/--surface-1:\s*(#[0-9a-fA-F]{6})/)[1]));
    // Floor 1.08: below this the Field and a resting Surface stop reading as two planes in the same
    // dark material (their relative luminances converge). Measured: ~1.13.
    assert.ok(ratio > 1.08, `Graphite Night Field/Surface contrast ${ratio.toFixed(3)} must stay above 1.08`);
});

test('Thought material is material, not effects', () => {
    const material = strip(read('src/ui/materials.css'));
    assert.doesNotMatch(material, /gradient\(/, 'no gradient in Thought material');
    assert.doesNotMatch(material, /backdrop-filter|blur\(/, 'no blur/backdrop-filter in Thought material');
});


test('Keep material transition has one stylesheet owner', () => {
    const material = strip(read('src/ui/materials.css'));
    assert.match(material, /\.thought\[data-material-settling="true"\]::before/);
    for (const file of uiStylesheets().filter(file => path.basename(file) !== 'materials.css'))
        assert.doesNotMatch(strip(read(rel(file))), /\.thought\[data-material-settling="true"\]/, `${rel(file)} restates Keep material settling`);
});
