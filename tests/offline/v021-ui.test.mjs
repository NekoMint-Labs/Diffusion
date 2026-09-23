import test from 'node:test';
import assert from 'node:assert/strict';
import { transientPatch, mayRestoreFocus, isGlobalModal } from '../../src/ui/transient.ts';
import { normalizeSettings, loadSettings, saveSettings, thinkingServiceChanged } from '../../src/ui/settings.ts';
import { demoProject } from '../../src/core/demo.ts';
import { setLocale, t } from '../../src/shared/i18n.ts';

const initial = () => ({ surface: 'none', menu: null, transientEpoch: 0 });
const menu = () => ({ scope: 'global', anchor: {} });
const apply = (state, patch) => ({ ...state, ...transientPatch(state, patch) });

for (const surface of ['settings', 'import', 'restore', 'help']) {
    test(`More -> ${surface} has exactly one active owner`, () => {
        let state = apply(initial(), { menu: menu() });
        assert.equal(state.surface, 'none');
        assert.ok(state.menu);
        state = apply(state, { surface });
        assert.equal(state.menu, null);
        assert.equal(state.surface, surface);
        assert.equal(isGlobalModal(surface), true);
    });
}
test('Find in Field stays an exclusive owner without locking the Field', () => {
    let state = apply(initial(), { menu: menu() });
    assert.equal(state.surface, 'none');
    state = apply(state, { surface: 'find' });
    assert.equal(state.menu, null);
    assert.equal(state.surface, 'find');
    // v0.3: search reveals content in place, so it must not become a blocking modal.
    assert.equal(isGlobalModal('find'), false);
    state = apply(state, { surface: 'none' });
    assert.equal(state.surface, 'none');
});
test('the palette, shortcut help and stored-Fields list keep modal ownership', () => {
    for (const name of ['palette', 'shortcuts', 'fields']) assert.equal(isGlobalModal(name), true);
});
test('owner transitions protect successor focus from queued predecessor restoration', () => {
    let state = apply(initial(), { menu: menu() });
    state = apply(state, { menu: null });
    const epoch = state.transientEpoch;
    assert.equal(mayRestoreFocus(state, epoch), true);
    state = apply(state, { surface: 'settings' });
    assert.equal(mayRestoreFocus(state, epoch), false);
    state = apply(state, { surface: 'none' });
    assert.equal(mayRestoreFocus(state, epoch), false);
    assert.equal(mayRestoreFocus(state, state.transientEpoch), true);
});
test('menu reopens cleanly and only explicit transitions advance ownership', () => {
    let state = apply(initial(), { surface: 'settings' });
    const target = menu();
    state = apply(state, { menu: target });
    assert.equal(state.surface, 'none');
    assert.equal(state.menu, target);
    const epoch = state.transientEpoch;
    state = apply(state, { notice: 'Unrelated presentation update' });
    assert.equal(state.transientEpoch, epoch);
    state = apply(state, { surface: 'help', menu: null });
    assert.equal(state.menu, null);
    assert.equal(state.surface, 'help');
});
test('Thread and contextual surfaces remain non-modal; the focused Thread stays a global modal', () => {
    for (const name of ['thread', 'source', 'relation', 'region', 'crystal', 'evidence', 'diffuse', 'find']) assert.equal(isGlobalModal(name), false);
    assert.equal(isGlobalModal('thread-focus'), true);
});
test('legacy and malformed preferences keep Serif and never restore tokens', () => {
    for (const value of [null, [], 3, 'text', { thoughtTypography: 'arbitrary-font' }]) assert.equal(normalizeSettings(value).thoughtTypography, 'serif');
    const settings = normalizeSettings({ theme: 'dark', locale: 'zh', provider: 'gateway', token: 'secret' }, 'https://gateway.example');
    assert.equal(settings.token, '');
    assert.equal(settings.theme, 'dark'); assert.equal(settings.locale, 'zh');
    assert.equal(settings.gateway, 'https://gateway.example');
});
test('Serif/Sans preferences persist with locale/theme without touching canonical state', () => {
    const values = new Map();
    const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) } });
    try {
        const project = demoProject(); const before = JSON.stringify(project);
        for (const font of ['serif', 'sans']) for (const theme of ['light', 'dark']) for (const locale of ['zh', 'en']) {
            const settings = { ...normalizeSettings({}), thoughtTypography: font, theme, locale, token: 'private-session-token' };
            assert.equal(saveSettings(settings), true);
            const reloaded = loadSettings();
            assert.equal(reloaded.thoughtTypography, font); assert.equal(reloaded.theme, theme); assert.equal(reloaded.locale, locale);
            assert.equal(reloaded.token, ''); assert.ok(!values.get('diffusion-settings').includes('private-session-token'));
        }
        assert.equal(JSON.stringify(project), before);
        values.set('diffusion-settings', '{broken'); assert.equal(loadSettings().thoughtTypography, 'serif');
        globalThis.localStorage.setItem = () => { throw new Error('Quota'); };
        assert.equal(saveSettings(normalizeSettings({})), false);
    } finally {
        if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else delete globalThis.localStorage;
    }
});
test('visual preferences never request thinking-service cancellation', () => {
    const previous = normalizeSettings({ provider: 'gateway' });
    for (const patch of [{ theme: 'dark' }, { locale: 'zh' }, { thoughtTypography: 'sans' }]) assert.equal(thinkingServiceChanged(previous, { ...previous, ...patch }), false);
    for (const patch of [{ gateway: 'https://custom.example' }, { token: 'new-token' }, { provider: 'off' }]) assert.equal(thinkingServiceChanged(previous, { ...previous, ...patch }), true);
});
test('the two typography choices have Chinese and English product labels', () => {
    setLocale('zh');
    for (const key of ['Thought typography', 'Editorial Serif', 'Quiet Sans', 'Upstream returned malformed JSON.']) assert.notEqual(t(key), key);
    setLocale('en'); assert.equal(t('Editorial Serif'), 'Editorial Serif');
});
