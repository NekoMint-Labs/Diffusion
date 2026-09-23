import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { imageAtmospherePresentation, normalizeAppearanceSettings } from '../../src/ui/appearance.ts';

const SOURCE = 'data:image/png;base64,AAAA';
const atmosphere = readFileSync(new URL('../../src/ui/atmosphere.tsx', import.meta.url), 'utf8');
const workspaceSettings = readFileSync(new URL('../../src/ui/workspace/useWorkspaceSettings.ts', import.meta.url), 'utf8');
const appearanceUI = readFileSync(new URL('../../src/ui/surfaces/AppearanceSettings.tsx', import.meta.url), 'utf8');

const base = normalizeAppearanceSettings({ image: { source: SOURCE } }).image;

describe('independent Image Atmosphere controls', () => {
    it('renders whenever an image exists, without replacing Field Style', () => {
        expect(atmosphere).toMatch(/const activeImage = image\?\.source/);
        expect(atmosphere).not.toMatch(/background === 'image'/);
        expect(workspaceSettings).toContain('root.dataset.fieldStyle = appearance.fieldStyle');
        expect(workspaceSettings).toContain("root.dataset.imageAtmosphere = appearance.image.source ? 'true' : 'false'");
    });

    it('maps Presence, Saturation, Brightness, Softness and Theme Blend independently', () => {
        const neutral = imageAtmospherePresentation({ ...base, presence: 50, saturation: 100, brightness: 100, softness: 0, themeBlend: 0 });
        expect(neutral).toEqual({ opacity: .5, filter: 'saturate(1) brightness(1) blur(0.00px)', scale: 1, toneOpacity: 0 });
        const adjusted = imageAtmospherePresentation({ ...base, presence: 80, saturation: 20, brightness: 70, softness: 60, themeBlend: 100 });
        expect(adjusted.opacity).toBe(.8);
        expect(adjusted.filter).toContain('saturate(0.2)');
        expect(adjusted.filter).toContain('brightness(0.7)');
        expect(adjusted.filter).toContain('blur(5.00px)');
        expect(adjusted.scale).toBeGreaterThan(1);
        expect(adjusted.toneOpacity).toBe(.68);
    });

    it('exposes product language rather than implementation controls', () => {
        for (const label of ['Presence', 'Saturation', 'Brightness', 'Softness', 'Theme Blend', 'Field Presence']) expect(appearanceUI).toContain(label);
        expect(appearanceUI).not.toMatch(/blur px|filter frequency|filament count/i);
    });
});
