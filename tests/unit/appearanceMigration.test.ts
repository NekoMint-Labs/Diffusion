import { describe, expect, it } from 'vitest';
import {
    DEFAULT_APPEARANCE, FIELD_STYLE_IDS, STYLE_PROFILE_IDS, getAppearancePreset, imageAtmospherePresentation,
    normalizeAppearanceSettings, type ImageAtmosphereSettings,
} from '../../src/ui/appearance.ts';

const SOURCE = 'data:image/png;base64,AAAA';

function image(presence: number): ImageAtmosphereSettings {
    return { source: SOURCE, presence, saturation: 70, brightness: 95, softness: 30, themeBlend: 40, dirty: false, stats: null };
}

describe('appearance migration', () => {
    it('falls unknown and legacy styles back to Paper Texture without losing other preferences', () => {
        for (const fieldStyle of ['quiet', 'terrain', 'flow', 'dust', 'relief', 'unknown']) {
            const normalized = normalizeAppearanceSettings({
                profile: 'quiet-forest', fieldStyle, fieldPresence: 73, ambientMotion: 18, accent: 'moss',
                image: { source: SOURCE, presence: 62 },
            });
            expect(normalized).toMatchObject({ profile: 'quiet-forest', fieldStyle: 'paper-texture', fieldPresence: 73, ambientMotion: 18, accent: 'moss' });
            expect(normalized.image).toMatchObject({ source: SOURCE, presence: 62 });
        }
    });

    it('migrates the oldest 0..45 image intensity and retired controls', () => {
        const migrated = normalizeAppearanceSettings({ image: { source: SOURCE, intensity: 22, desaturation: 35, overlay: -10 } }).image;
        expect(migrated.presence).toBeCloseTo(48.89, 1);
        expect(migrated.saturation).toBe(65);
        expect(migrated.brightness).toBe(90);
        expect(migrated).not.toHaveProperty('strength');
        expect(migrated).not.toHaveProperty('desaturation');
        expect(migrated).not.toHaveProperty('overlay');
    });

    it('clamps every user-controlled amount and defaults Ambient Motion to 50', () => {
        expect(normalizeAppearanceSettings({}).ambientMotion).toBe(50);
        const normalized = normalizeAppearanceSettings({ fieldPresence: 999, ambientMotion: -8, image: { source: SOURCE, presence: -4, saturation: 400, brightness: 120, softness: -8, themeBlend: 101 } });
        expect(normalized.fieldPresence).toBe(100);
        expect(normalized.ambientMotion).toBe(0);
        expect(normalizeAppearanceSettings({ ambientMotion: 180 }).ambientMotion).toBe(100);
        expect(normalized.image).toMatchObject({ presence: 0, saturation: 100, brightness: 100, softness: 0, themeBlend: 100 });
    });

    it('accepts only the final production background ids', () => {
        for (const style of ['paper-texture', 'topography', 'threads', 'waves', 'silk'] as const)
            expect(normalizeAppearanceSettings({ fieldStyle: style }).fieldStyle).toBe(style);
        expect(normalizeAppearanceSettings({ fieldStyle: 'unknown' }).fieldStyle).toBe(DEFAULT_APPEARANCE.fieldStyle);
    });
});

describe('Theme × Field Style presets', () => {
    it('covers every combination with bounded, fresh values', () => {
        for (const profile of STYLE_PROFILE_IDS) for (const style of FIELD_STYLE_IDS) {
            const preset = getAppearancePreset(profile, style);
            expect(Object.values({ fieldPresence: preset.fieldPresence, ...preset.image }).every(value => value >= 0 && value <= 100)).toBe(true);
            expect(getAppearancePreset(profile, style)).not.toBe(preset);
        }
    });

    it('uses style-owned Field Presence with a small profile adjustment', () => {
        expect(STYLE_PROFILE_IDS.map(profile => FIELD_STYLE_IDS.map(style => getAppearancePreset(profile, style).fieldPresence))).toEqual([
            [48, 24, 34, 40, 36],
            [47, 23, 33, 39, 35],
            [46, 22, 32, 38, 34],
            [50, 26, 36, 42, 38],
        ]);
    });
});

describe('image presentation', () => {
    it('maps explicit controls independently and never exceeds their bounds', () => {
        const direct = imageAtmospherePresentation({ ...image(100), saturation: 100, brightness: 100, softness: 0, themeBlend: 0 });
        expect(direct).toMatchObject({ opacity: 1, filter: 'saturate(1) brightness(1) blur(0.00px)', scale: 1, toneOpacity: 0 });
        const integrated = imageAtmospherePresentation({ ...image(50), themeBlend: 100 });
        expect(integrated.opacity).toBe(.5);
        expect(integrated.toneOpacity).toBeLessThan(1);
    });
});
