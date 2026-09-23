import { beforeEach, describe, expect, it } from 'vitest';
import { INTERFACE_SIZES, THOUGHT_SIZE, loadSettings, normalizeSettings, saveSettings, thinkingServiceChanged, typeScaleChanged } from '../../src/ui/settings.ts';

/** A minimal device store: enough for the persistence contract, and nothing more. */
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, String(value)),
        removeItem: (key: string) => void store.delete(key),
    },
});

beforeEach(() => store.clear());

describe('the two size axes are bounded preferences', () => {
    it('defaults preserve the current visual size', () => {
        const settings = normalizeSettings({});
        expect(settings.interfaceSize).toBe(100);
        expect(settings.thoughtSize).toBe(THOUGHT_SIZE.default);
        expect(THOUGHT_SIZE.default).toBe(18);
        expect([...INTERFACE_SIZES]).toEqual([90, 100, 110, 120]);
    });

    it('refuses arbitrary values instead of accepting whatever it is given', () => {
        expect(normalizeSettings({ interfaceSize: 37 }).interfaceSize).toBe(100);
        expect(normalizeSettings({ interfaceSize: 110 }).interfaceSize).toBe(110);
        expect(normalizeSettings({ thoughtSize: 9 }).thoughtSize).toBe(18);
        expect(normalizeSettings({ thoughtSize: 400 }).thoughtSize).toBe(18);
        expect(normalizeSettings({ thoughtSize: 22.5 }).thoughtSize).toBe(18);
        expect(normalizeSettings({ thoughtSize: THOUGHT_SIZE.max }).thoughtSize).toBe(THOUGHT_SIZE.max);
        expect(normalizeSettings({ thoughtSize: THOUGHT_SIZE.min }).thoughtSize).toBe(THOUGHT_SIZE.min);
    });

    it('persists both axes and restores them, with no second edit/display size', () => {
        const settings = { ...normalizeSettings({}), interfaceSize: 120, thoughtSize: 24 };
        expect(saveSettings(settings)).toBe(true);
        const restored = loadSettings();
        expect(restored.interfaceSize).toBe(120);
        expect(restored.thoughtSize).toBe(24);
        expect(restored).not.toHaveProperty('thoughtEditSize');
        expect(restored).not.toHaveProperty('thoughtDisplaySize');
    });

    it('reports a type-scale change separately from a thinking-service change', () => {
        const base = normalizeSettings({});
        expect(typeScaleChanged(base, { ...base, thoughtSize: 20 })).toBe(true);
        expect(typeScaleChanged(base, { ...base, interfaceSize: 90 })).toBe(true);
        expect(typeScaleChanged(base, { ...base, theme: 'dark' })).toBe(false);
        // Changing how big the interface is must never cancel a running thinking request.
        expect(thinkingServiceChanged(base, { ...base, interfaceSize: 120, thoughtSize: 24 })).toBe(false);
    });
});

describe('retired persisted preferences are normalized away rather than resurrected', () => {
    it('migrates the old background shape and drops retired per-device color keys', () => {
        const settings = normalizeSettings({
            shortcutOverrides: { 'app.settings': ['mod+,'] },
            thinkingDefaults: { directions: 5, fieldSources: true, web: true },
            appearance: { profile: 'quiet-forest', background: 'studio', fieldPresence: 80, attentionColor: '#AABBCC', structureColor: '#ABCDEF' },
        });
        expect(settings).not.toHaveProperty('shortcutOverrides');
        expect(settings).not.toHaveProperty('thinkingDefaults');
        expect(settings.appearance.profile).toBe('quiet-forest');
        expect(settings.appearance.fieldStyle).toBe('paper-texture');
        expect(settings.appearance.fieldPresence).toBe(80);
        expect(settings.appearance).not.toHaveProperty('background');
        expect(settings.appearance).not.toHaveProperty('attentionColor');
        expect(settings.appearance).not.toHaveProperty('structureColor');
    });

    it('never persists the session token', () => {
        const settings = { ...normalizeSettings({}), token: 'secret-value' };
        saveSettings(settings);
        expect(store.get('diffusion-settings')).not.toContain('secret-value');
        expect(loadSettings().token).toBe('');
    });
});

describe('appearance profiles are persisted presentation preferences', () => {
    it('defaults to Editorial Warm + Paper Texture and rejects arbitrary ids', () => {
        const defaults = normalizeSettings({}).appearance;
        expect(defaults.profile).toBe('editorial-warm');
        expect(defaults.fieldStyle).toBe('paper-texture');
        expect(defaults.ambientMotion).toBe(50);
        expect(defaults.image.source).toBe('');
        expect(defaults.image.dirty).toBe(false);

        const custom = normalizeSettings({ appearance: { profile: 'quiet-forest', fieldStyle: 'waves' } }).appearance;
        expect(custom.profile).toBe('quiet-forest');
        expect(custom.fieldStyle).toBe('waves');

        const rejected = normalizeSettings({ appearance: { profile: 'rainbow', fieldStyle: 'grid' } }).appearance;
        expect(rejected.profile).toBe('editorial-warm');
        expect(rejected.fieldStyle).toBe('paper-texture');
    });

    it('round-trips through the device store without becoming a thinking-service change', () => {
        const base = normalizeSettings({});
        const next = { ...base, appearance: { ...base.appearance, profile: 'studio-slate' as const, fieldStyle: 'threads' as const, ambientMotion: 75, image: { ...base.appearance.image, presence: 70 } } };
        expect(saveSettings(next)).toBe(true);
        expect(loadSettings().appearance.profile).toBe('studio-slate');
        expect(loadSettings().appearance.fieldStyle).toBe('threads');
        expect(loadSettings().appearance.ambientMotion).toBe(75);
        expect(loadSettings().appearance.image.presence).toBe(70);
        expect(thinkingServiceChanged(base, next)).toBe(false);
    });
});
