import { describe, expect, it } from 'vitest';
import { normalizeAppearanceSettings, getAppearancePreset } from '../../src/ui/appearance.ts';
import { analyzeImagePixels, applyRecommendedImageSettings, changeAppearanceContext, getRecommendedImageSettings } from '../../src/ui/imageRecommendations.ts';

const SOURCE = 'data:image/png;base64,AAAA';
const pixels = (...rgba: number[]) => new Uint8ClampedArray(rgba);

describe('local image statistics', () => {
    it('measures luminance, contrast, saturation and detail from downsampled pixels', () => {
        const white = analyzeImagePixels(pixels(255, 255, 255, 255, 255, 255, 255, 255), 2, 1);
        expect(white).toEqual({ luminance: 1, contrast: 0, saturation: 0, detailDensity: 0 });
        const redBlack = analyzeImagePixels(pixels(255, 0, 0, 255, 0, 0, 0, 255), 2, 1);
        expect(redBlack.saturation).toBe(.5);
        expect(redBlack.contrast).toBeGreaterThan(0);
        expect(redBlack.detailDensity).toBeGreaterThan(0);
    });
});

describe('bounded image recommendations', () => {
    it('nudges a bright, colorful, detailed image toward quieter settings', () => {
        const base = getAppearancePreset('graphite-night', 'threads').image;
        const next = getRecommendedImageSettings('graphite-night', 'threads', { luminance: .95, contrast: .8, saturation: .95, detailDensity: .9 });
        expect(next.presence).toBeLessThan(base.presence);
        expect(next.saturation).toBeLessThan(base.saturation);
        expect(next.brightness).toBeLessThan(base.brightness);
        expect(next.softness).toBeGreaterThan(base.softness);
        expect(next.themeBlend).toBeGreaterThan(base.themeBlend);
    });

    it('keeps every adjustment inside modest preset-relative bounds', () => {
        for (const stats of [
            { luminance: 0, contrast: 0, saturation: 0, detailDensity: 0 },
            { luminance: 1, contrast: 1, saturation: 1, detailDensity: 1 },
        ]) {
            const base = getAppearancePreset('editorial-warm', 'topography').image;
            const next = getRecommendedImageSettings('editorial-warm', 'topography', stats);
            expect(Math.abs(next.presence - base.presence)).toBeLessThanOrEqual(14);
            expect(Math.abs(next.saturation - base.saturation)).toBeLessThanOrEqual(16);
            expect(Math.abs(next.brightness - base.brightness)).toBeLessThanOrEqual(10);
            expect(Math.abs(next.softness - base.softness)).toBeLessThanOrEqual(12);
            expect(Math.abs(next.themeBlend - base.themeBlend)).toBeLessThanOrEqual(13);
        }
    });
});

describe('manual image ownership', () => {
    it('preserves the user Field Presence adjustment across Theme and Field Style changes', () => {
        const current = normalizeAppearanceSettings({ fieldPresence: 61 });
        const next = changeAppearanceContext(current, 'graphite-night', 'threads');
        expect(next.appearance.fieldPresence).toBe(49);
    });

    it('updates untouched recommendations when Theme or Field Style changes', () => {
        const current = normalizeAppearanceSettings({ image: { source: SOURCE, dirty: false, stats: { luminance: .9, contrast: .7, saturation: .8, detailDensity: .8 } } });
        const next = changeAppearanceContext(current, 'graphite-night', 'threads');
        expect(next.recommendedAvailable).toBe(false);
        expect(next.appearance.image).not.toEqual(current.image);
        expect(next.appearance.image.dirty).toBe(false);
    });

    it('never overwrites manually owned controls and offers an explicit recommendation', () => {
        const current = normalizeAppearanceSettings({ image: { source: SOURCE, presence: 91, saturation: 88, brightness: 77, softness: 66, themeBlend: 55, dirty: true } });
        const next = changeAppearanceContext(current, 'graphite-night', 'waves');
        expect(next.recommendedAvailable).toBe(true);
        expect(next.appearance.image).toBe(current.image);
        expect(next.appearance.image.presence).toBe(91);
    });

    it('Reset to Recommended releases dirty ownership against the current context', () => {
        const current = normalizeAppearanceSettings({ image: { source: SOURCE, presence: 99, dirty: true, stats: { luminance: .9, contrast: .7, saturation: .8, detailDensity: .8 } } });
        const reset = applyRecommendedImageSettings(current.image, 'quiet-forest', 'silk');
        expect(reset.dirty).toBe(false);
        expect(reset.presence).toBe(getRecommendedImageSettings('quiet-forest', 'silk', current.image.stats).presence);
        expect(reset.source).toBe(SOURCE);
    });
});
