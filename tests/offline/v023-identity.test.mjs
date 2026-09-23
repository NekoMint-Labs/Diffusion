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

test('v0.2.3 identity uses legibility rather than card or glow selection', () => {
    const css = read('src/ui/field.css');
    const thoughtRules = css.match(/\.thought[^{]*\{[^}]*\}/g)?.join('\n') ?? '';
    assert.doesNotMatch(thoughtRules, /gradient\(/i);
    assert.doesNotMatch(css, /transition\s*:\s*all/i);
    const selected = block(css, '.thought[data-selected="true"]');
    assert.match(block(css, '.thought'), /opacity:\s*1/);
    assert.match(block(css, '.thought-preview'), /opacity:\s*var\(--thought-ink-presence\)/);
    assert.match(selected, /--thought-ink-presence:\s*1/);
    assert.doesNotMatch(selected, /background|box-shadow|text-shadow|transform|font-size|padding/);
    assert.doesNotMatch(block(css, '.thought'), /box-shadow|text-shadow/);
    assert.match(block(css, '.thought[data-emphasis="nearby"]'), /--thought-ink-presence:\s*\.84/);
    assert.match(block(css, '.thought[data-emphasis="receded"]'), /--thought-ink-presence:\s*\.6/);
    assert.match(block(css, '.thought[data-emphasis="peripheral"]'), /--thought-ink-presence:\s*\.46/);
});

test('Speak makes temporary writing room without becoming a chat-composer box', () => {
    const css = read('src/ui/field.css');
    const component = read('src/ui/workspace/Speak.tsx');
    const speak = block(css, '.speak');
    const shell = block(css, '.speak-shell');
    assert.match(speak, /min\(250px/);
    assert.match(block(css, '.speak[data-composing="true"]'), /min\(480px/);
    assert.match(shell, /background:\s*transparent/);
    assert.doesNotMatch(shell, /border-radius|box-shadow/);
    assert.match(component, /<motion\.form layout/);
    assert.doesNotMatch(component, /borderRadius|boxShadow/);
    assert.match(css, /\.speak-shell::after\s*\{[^}]*width:\s*20px[^}]*margin-left:\s*-10px/s);
    assert.match(css, /\.speak-shell::after\s*\{[^}]*opacity:\s*0\.16/s);
    // Focused, the tick retracts entirely: the material underneath does the framing, so a full-width
    // underline never comes back.
    assert.match(css, /\.speak\[data-composing="true"\] \.speak-shell::after\s*\{[^}]*visibility:\s*hidden/s);
    // And focused, the shell is a thin material rather than a chat box: a bounded radius, a quiet
    // fill, real depth and one illumination layer. The idle shell (asserted above) has none of it.
    const composingShell = block(css, '.speak[data-composing="true"] .speak-shell');
    assert.match(composingShell, /border-radius:\s*var\(--radius-surface\)/);
    assert.match(composingShell, /box-shadow:/);
    assert.match(composingShell, /color-mix\(in srgb, var\(--surface-1\) 97%/);
    assert.match(block(css, '.speak-light'), /opacity:\s*0/);
    assert.match(block(css, '.speak[data-composing="true"] .speak-light'), /opacity:\s*\.7/);
});

test('More menu removes conventional active bar and relies on restrained hover hierarchy', () => {
    // The command menu is an application surface now; its shell lives in surfaces.css.
    const css = read('src/ui/surfaces/surfaces.css');
    const menu = block(css, '.command-menu');
    // v0.4: the item is Base UI's, so the highlighted state is an attribute, not :focus.
    const item = block(css, '.command-menu-item');
    const highlighted = block(css, '.command-menu-item[data-highlighted]');
    assert.match(menu, /border:\s*0/);
    assert.doesNotMatch(item, /border-left/);
    assert.doesNotMatch(item, /border:\s*1px/);
    assert.match(highlighted, /background:\s*var\(--surface-2\)/);
    assert.match(css, /\.command-menu-item\[data-separator="true"\]::before/);
});

test('Settings groups meaning rather than repeating table rows and dividers', () => {
    const css = read('src/ui/surfaces/surfaces.css');
    const component = read('src/ui/surfaces/SettingsSurface.tsx');
    const appearance = read('src/ui/surfaces/AppearanceSettings.tsx');
    const primitiveCss = read('src/ui/primitives/primitives.css');
    assert.match(component, /<SurfaceGroup/);
    assert.match(component, /<SettingRow/);
    // The frame and both capability sections use the same canonical group/row anatomy.
    // AI and Search remain independent questions without keeping a second panel system alive.
    const ai = read('src/ui/surfaces/AISettings.tsx');
    const search = read('src/ui/surfaces/SearchSettings.tsx');
    assert.match(ai, /<SurfaceGroup/);
    assert.match(ai, /<SettingRow/);
    assert.match(search, /<SurfaceGroup/);
    assert.match(search, /<SettingRow/);
    for (const name of ['language', 'typography']) {
        assert.ok(component.includes(`setting="${name}"`));
    }
    // Phase 3 gives Appearance its own curated component instead of growing SettingsSurface.
    for (const name of ['style-profile', 'field-style', 'field-presence']) {
        assert.ok(appearance.includes(`setting="${name}"`));
    }
    // "Who helps Diffusion think?" and "where may it look?" are two questions, so the provider
    // control and the discovery controls are asserted where each one now lives.
    assert.match(ai, /setting="thinking-service"/);
    assert.match(search, /setting="external-exploration"/);
    assert.doesNotMatch(block(css, '.settings-form .setting-row'), /border/);
    assert.match(block(primitiveCss, '.ui-setting-row'), /display:\s*grid/);
    // v0.4: the control's appearance has exactly one owner — the shared Select primitive — so a
    // preference cannot be styled differently in one section than in another.
    assert.match(primitiveCss, /\.ui-select-trigger \{[^}]*border-radius:\s*var\(--radius-control\)/);
    assert.match(ai, /<Select testId="provider-select"/);
    // v0.4 friction pass: the model field is the one deliberate exception to "every preference is a
    // Select", because a model id may always be typed and a Select cannot be typed into. It stays
    // inside the control system: Base UI's Combobox with the Select's own popup classes, and the
    // protocol override came *back* to the Select from a native `<select>`.
    assert.match(ai, /<Combobox\.Root/);
    assert.match(ai, /<Select testId="protocol-select"/);
    assert.doesNotMatch(ai, /<select/);
    // Settings answers four questions now (General, Appearance, AI, Search & Evidence). Retired
    // sections (Thinking, Shortcuts, About) must not come back as panels.
    for (const section of ['general', 'appearance', 'ai', 'search'])
        assert.match(component, new RegExp(`<Tabs\\.Panel value="${section}"`));
    assert.doesNotMatch(component, /<Tabs\.Panel value="(?:thinking|shortcuts|about|gateway)"/);
});

test('identity pass does not grow Field or Workspace with presentation ownership', () => {
    const field = read('src/field/Field.tsx');
    const workspace = read('src/ui/Workspace.tsx');
    const speak = read('src/ui/workspace/Speak.tsx');
    const menu = read('src/ui/focus/CommandMenu.tsx');
    // v0.4 keeps a slightly wider Field ceiling: Stage C adds pointer-owned pan/marquee, transient
    // Ghost drag and focus/fit navigation to the same hot path. Presentation still
    // lives in its own modules, so those are bounded instead.
    assert.ok(field.split('\n').length - 1 <= 650);
    assert.ok(workspace.split('\n').length - 1 <= 500);
    assert.doesNotMatch(field, /settings-cluster|speak-shell|command-menu/);
    for (const module of ['src/ui/commands/CommandPalette.tsx', 'src/ui/commands/compose.ts', 'src/ui/focus/CommandMenu.tsx', 'src/ui/surfaces/FindSurface.tsx', 'src/ui/surfaces/ShortcutsSurface.tsx']) assert.ok(read(module).split('\n').length - 1 <= 300);
    assert.match(speak, /className="speak"/);
    assert.match(menu, /className="command-menu-positioner"/);
});
