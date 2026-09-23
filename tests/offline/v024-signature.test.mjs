import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function block(css, selector) {
    const start = css.indexOf(`${selector} {`);
    assert.notEqual(start, -1, `Missing selector: ${selector}`);
    const open = css.indexOf('{', start);
    const close = css.indexOf('}', open);
    return css.slice(open + 1, close);
}

test('v0.2.4 Speak expands from a compact object and caps multiline height locally', () => {
    const css = read('src/ui/field.css');
    const speak = read('src/ui/workspace/Speak.tsx');
    assert.match(block(css, '.speak'), /width:\s*min\(250px/);
    assert.doesNotMatch(block(css, '.speak'), /transition:\s*width/);
    assert.match(speak, /<motion\.form layout/);
    assert.match(speak, /layoutTransition\(!!reduced\)/);
    assert.match(block(css, '.speak[data-composing="true"]'), /width:\s*min\(480px/);
    assert.match(block(css, '.speak textarea'), /max-height:\s*108px/);
    assert.match(block(css, '.speak textarea'), /scrollbar-width:\s*none/);
    assert.match(css, /\.speak textarea::\-webkit\-scrollbar\s*\{[^}]*width:\s*0/s);
    assert.match(speak, /const SPEAK_MAX_HEIGHT = 108/);
    assert.match(speak, /const nextOverflow = input\.scrollHeight > SPEAK_MAX_HEIGHT/);
    assert.match(speak, /data-overflowing=\{overflowing\}/);
    assert.doesNotMatch(block(css, '.speak-shell'), /border-radius|box-shadow/);
});

test('v0.2.4 Focus is expressed through existing legibility state only', () => {
    const css = read('src/ui/field.css');
    const field = read('src/field/Field.tsx');
    for (const selector of ['.thought[data-selected="true"]', '.thought[data-emphasis="direct"]', '.thought[data-emphasis="nearby"]', '.thought[data-emphasis="receded"]', '.thought[data-emphasis="peripheral"]']) {
        const rule = block(css, selector);
        assert.doesNotMatch(rule, /background|box-shadow|text-shadow|filter|scale\(|font-size|padding|width/);
    }
    assert.match(block(css, '.thought'), /opacity:\s*1/);
    assert.match(block(css, '.thought-preview'), /opacity:\s*var\(--thought-ink-presence\)/);
    assert.match(block(css, '.thought[data-emphasis="direct"]'), /--thought-ink-presence:\s*\.96/);
    assert.match(block(css, '.thought[data-emphasis="nearby"]'), /--thought-ink-presence:\s*\.84/);
    assert.match(block(css, '.thought[data-emphasis="receded"]'), /color:\s*var\(--ink-secondary\)/);
    assert.match(block(css, '.thought[data-emphasis="peripheral"]'), /--thought-ink-presence:\s*\.46/);
    assert.doesNotMatch(css, /filter:\s*blur/i);
    assert.match(field, /focus\.selected\.has\(key\).*focus\.direct\.has\(key\).*focus\.nearby\.has\(key\).*focus\.peripheral\.has\(key\)/s);
    assert.doesNotMatch(field, /confidence|engagement|recommendation/i);
});

test('v0.2.4 Ghost and Recall use restrained text-level presence rather than per-word effects', () => {
    const css = read('src/ui/field.css');
    const view = read('src/ui/thought/ThoughtView.tsx');
    const presence = read('src/ui/motion/TransientTextPresence.tsx');
    assert.doesNotMatch(css, /@keyframes\s+(ink-arrive|recall-arrive)/);
    assert.doesNotMatch(css, /filter:\s*blur/i);
    assert.match(view, /TransientTextPresence/);
    const implementation = presence.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(implementation, /split\(|motion\.span|IntersectionObserver|filter:/);
    assert.match(presence, /<motion\.p/);
});

test('v0.2.4 More to Settings carries the activated command origin without changing transient ownership', () => {
    const menu = read('src/ui/focus/CommandMenu.tsx');
    const workspace = read('src/ui/Workspace.tsx');
    const transient = read('src/ui/transient.ts');
    const compose = read('src/ui/commands/compose.ts');
    assert.match(compose, /run: \(origin\?: Point\) => void/);
    assert.match(menu, /event\.currentTarget\.getBoundingClientRect\(\)/);
    assert.match(menu, /onClose\(\);\s*row\.run\(\{ x: bounds/);
    assert.match(read('src/ui/commands/app.ts'), /id: 'settings'[\s\S]*openSurface\('settings', origin\)/);
    assert.match(transient, /if \(patch\.menu\) next\.surface = 'none'/);
    assert.match(transient, /else if \(patch\.surface !== undefined\) next\.menu = null/);
});

test('v0.2.4 Settings only micro-tunes its own shell and service emphasis', () => {
    // The surface shell moved out of field.css into surfaces.css; Settings still only re-skins the
    // shared Surface rather than owning a second panel system of its own.
    const css = read('src/ui/surfaces/surfaces.css');
    const settings = read('src/ui/surfaces/SettingsSurface.tsx');
    const surface = read('src/ui/surfaces/Surface.tsx');
    assert.match(settings, /className="settings-surface"/);
    assert.match(surface, /className\?: string/);
    assert.match(block(css, '.surface.settings-surface'), /border-color:\s*var\(--boundary\)/);
    assert.match(block(css, '.surface.settings-surface'), /box-shadow:\s*var\(--shadow-panel\)/);
    assert.match(block(css, '.surface.settings-surface .surface-shared-shell'), /var\(--shadow-panel\)/);
    assert.doesNotMatch(settings, /divider|card/i);
});

test('v0.2.4 keeps signature presentation out of the Field hot path and below size limits', () => {
    const field = read('src/field/Field.tsx');
    const workspace = read('src/ui/Workspace.tsx');
    const speak = read('src/ui/workspace/Speak.tsx');
    assert.ok(field.split('\n').length - 1 <= 650);
    assert.ok(workspace.split('\n').length - 1 <= 500);
    assert.doesNotMatch(field, /SPEAK_MAX_HEIGHT|settings-surface|scrollbar-width|settings-content-arrive/);
    assert.match(speak, /SPEAK_MAX_HEIGHT/);
});
