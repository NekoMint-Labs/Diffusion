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

test('v0.2.5 delegates accessibility motion preference to Motion and CSS', () => {
    const app = read('src/ui/App.tsx');
    const theme = read('src/ui/theme.css');
    assert.match(app, /<MotionConfig reducedMotion="user">/);
    assert.doesNotMatch(app, /reducedMotion="never"/);
    assert.match(theme, /@media \(prefers-reduced-motion: reduce\)/);
});

test('v0.2.5 Speak uses Motion layout for perceptible geometry inside a stable positioning wrapper', () => {
    const css = read('src/ui/field.css');
    const speak = read('src/ui/workspace/Speak.tsx');
    assert.match(block(css, '.speak-positioner'), /left:\s*0;[\s\S]*right:\s*0;[\s\S]*display:\s*flex;[\s\S]*justify-content:\s*center/);
    assert.doesNotMatch(block(css, '.speak-positioner'), /transform/);
    assert.doesNotMatch(block(css, '.speak'), /transform|transition:\s*width/);
    assert.match(block(css, '.speak'), /width:\s*min\(250px/);
    assert.match(block(css, '.speak[data-composing="true"]'), /width:\s*min\(480px/);
    assert.match(speak, /<motion\.form layout/);
    assert.match(speak, /<motion\.div layout className="speak-shell"/);
    assert.match(speak, /useReducedMotion\(\)/);
    assert.match(speak, /SPEAK_MAX_HEIGHT = 108/);
    assert.match(speak, /data-overflowing=\{overflowing\}/);
});

test('v0.2.5 More to Settings shares only a non-interactive Motion shell', () => {
    const menu = read('src/ui/focus/CommandMenu.tsx');
    const workspace = read('src/ui/Workspace.tsx');
    const settings = read('src/ui/surfaces/SettingsSurface.tsx');
    const surface = read('src/ui/surfaces/Surface.tsx');
    // The shared shells are application surfaces now; their pointer ownership lives in surfaces.css.
    const css = read('src/ui/surfaces/surfaces.css');
    assert.match(workspace, /<LayoutGroup id="global-transient-surfaces">/);
    assert.match(menu, /layoutId=\{sharedShell\}/);
    assert.match(settings, /sharedLayoutId=\{GLOBAL_TRANSIENT_SHELL_LAYOUT_ID\}/);
    assert.match(surface, /layoutId=\{sharedLayoutId\}/);
    assert.match(block(css, '.command-menu-shared-shell'), /pointer-events:\s*none/);
    assert.match(block(css, '.surface-shared-shell'), /pointer-events:\s*none/);
    assert.match(menu, /onClose\(\);\s*row\.run\(\{ x: bounds/);
});

test('v0.2.5 uses a local transient-presence primitive without React Bits source', () => {
    const view = read('src/ui/thought/ThoughtView.tsx');
    const presence = read('src/ui/motion/TransientTextPresence.tsx');
    const css = read('src/ui/field.css');
    assert.match(presence, /<motion\.p/);
    assert.doesNotMatch(presence, /react-bits|BlurText|buildKeyframes|Commons Clause|DavidHDev/i);
    assert.doesNotMatch(presence, /IntersectionObserver|split\(|filter:|blur\(|motion\.span/);
    assert.ok(!fs.existsSync(new URL('../../src/ui/vendor/react-bits/TransientTextPresence.tsx', import.meta.url)));
    assert.ok(!fs.existsSync(new URL('../../docs/third_party/REACT_BITS_LICENSE.md', import.meta.url)));
    assert.match(view, /ghost \|\| recalled[\s\S]*TransientTextPresence/);
    assert.match(view, /\.\.\/motion\/TransientTextPresence\.tsx/);
    assert.doesNotMatch(css, /@keyframes\s+(ink-arrive|recall-arrive)/);
});

test('v0.2.5 keeps Focus cheap and keeps reusable motion out of Field hot paths', () => {
    const field = read('src/field/Field.tsx');
    const css = read('src/ui/field.css');
    assert.ok(field.split('\n').length - 1 <= 650);
    assert.doesNotMatch(field, /motion\/react|TransientTextPresence|GLOBAL_TRANSIENT_SHELL_LAYOUT_ID|layoutId/);
    for (const selector of ['.thought[data-selected="true"]', '.thought[data-emphasis="direct"]', '.thought[data-emphasis="nearby"]', '.thought[data-emphasis="receded"]', '.thought[data-emphasis="peripheral"]']) {
        assert.doesNotMatch(block(css, selector), /filter|transform|scale\(|width|padding|font-size/);
    }
});

test('v0.4 adds GSAP as an authored-sequence layer only, never as a second general animator', () => {
    const pkg = JSON.parse(read('package.json'));
    assert.ok(pkg.dependencies.motion);
    assert.ok(pkg.dependencies.gsap);
    assert.ok(pkg.dependencies['@gsap/react']);
    assert.ok(pkg.dependencies['@base-ui/react']);
    assert.equal(pkg.dependencies['react-bits'], undefined);
    assert.equal(pkg.dependencies['@react-bits/core'], undefined);
    // GSAP is confined to the signature module: it is imported by the authored sequences and by
    // nothing else, and never by the Field hot path, which keeps its imperative world transform.
    const root = new URL('../../src/', import.meta.url);
    const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const entryURL = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
        return entry.isDirectory() ? walk(entryURL) : entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [entryURL] : [];
    });
    const importers = walk(root).filter(url => /from 'gsap|from '@gsap\/react'|import\('gsap/.test(fs.readFileSync(url, 'utf8')))
        .map(url => url.pathname.slice(url.pathname.indexOf('/src/') + 1)).sort();
    assert.deepEqual(importers, ['src/ui/motion/signature.ts']);
    assert.doesNotMatch(read('src/field/Field.tsx'), /gsap/);
});

test('v0.2.5 lifecycle ownership stays immediate while motion is decorative', () => {
    const keyboard = read('src/ui/workspace/useWorkspaceKeyboard.ts');
    const transient = read('src/ui/transient.ts');
    const surface = read('src/ui/surfaces/Surface.tsx');
    assert.match(keyboard, /event\.key === 'Escape'[\s\S]*state\.speakFocused[\s\S]*speak\.current\?\.blur\(\)/);
    assert.match(transient, /if \(patch\.menu\) next\.surface = 'none'/);
    assert.match(transient, /else if \(patch\.surface !== undefined\) next\.menu = null/);
    assert.match(surface, /<FloatingFocusManager[\s\S]*initialFocus=\{initialFocus\}/);
    assert.match(surface, /className="surface-shared-shell"/);
});

test('v0.4 direct manipulation preserves Recall Wake while Ghost geometry no longer implies Claim', () => {
    const field = read('src/field/Field.tsx');
    assert.doesNotMatch(field, /controller\.claim\(g\.target\)/);
    assert.match(field, /if \(g\.target && snapshot\.session\.recalls\.includes\(g\.target\)\)\s*controller\.wake\(g\.target\)/);
    assert.match(field, /claimWithSettle\(controller, key\)/);
    assert.match(field, /controller\.wake\(k\); ui\.patch\(\{ selection: \[k\]/);
});

test('v0.2.6 the Motion Lab runs the production choreography instead of re-describing it', () => {
    const lab = read('src/dev/MotionLab.tsx');
    const signature = read('src/ui/motion/signature.ts');
    // The Lab consumes the frozen production API, and never touches GSAP directly.
    assert.match(lab, /from '\.\.\/ui\/motion\/signature\.ts'/);
    assert.doesNotMatch(lab, /from 'gsap|from '@gsap\/react'|import\('gsap/);
    // Every authored sequence the Lab drives is the production one: its name is declared in
    // signature.ts, so there is no lab-local fork of a sequence.
    const sequences = ['invitationIdleSequence', 'invitationContractSequence', 'firstThoughtComposerSequence', 'firstThoughtEmergence', 'fieldDepartureSequence', 'fieldSwitchSequence', 'settingsEnterSequence', 'settingsRecedeSequence', 'historyRevealSequence'];
    for (const name of sequences) {
        assert.match(lab, new RegExp(`\\b${name}\\b`), `the Lab should drive ${name}`);
        assert.match(signature, new RegExp(`export function ${name}`), `${name} should be a production sequence`);
    }
});
