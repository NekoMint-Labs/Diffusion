import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACCENT_IDS, STYLE_PROFILE_IDS } from '../../src/ui/appearance.ts';
import { deriveAccent } from '../../src/ui/accent.ts';

const hook = readFileSync(new URL('../../src/ui/workspace/useWorkspaceSettings.ts', import.meta.url), 'utf8');
const oklch = (value: string) => {
    const match = value.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)/)!;
    return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
};

describe('accent derivation', () => {
    it('covers every curated Accent in every Theme', () => {
        for (const profile of STYLE_PROFILE_IDS) for (const accent of ACCENT_IDS) {
            const tokens = deriveAccent(profile, accent, '#ff00ff');
            expect(Object.values(tokens).every(value => value.startsWith('oklch('))).toBe(true);
        }
    });

    it('preserves custom hue intent while bounding neon lightness and chroma', () => {
        const warm = oklch(deriveAccent('editorial-warm', 'custom', '#00ff00').attention);
        const night = oklch(deriveAccent('graphite-night', 'custom', '#00ff00').attention);
        expect(warm.h).toBeCloseTo(night.h, 1);
        expect(warm.h).toBeGreaterThan(135);
        expect(warm.h).toBeLessThan(150);
        expect(warm.l).toBeGreaterThanOrEqual(.48);
        expect(warm.l).toBeLessThanOrEqual(.60);
        expect(warm.c).toBeLessThanOrEqual(.13);
        expect(night.l).toBeGreaterThanOrEqual(.68);
        expect(night.l).toBeLessThanOrEqual(.76);
        expect(night.c).toBeLessThanOrEqual(.14);
    });

    it('falls back safely for an invalid custom value', () => {
        expect(deriveAccent('editorial-warm', 'custom', 'neon-ish')).toEqual(deriveAccent('editorial-warm', 'oxide', '#000000'));
    });

    it('applies only attention-family tokens, not protected semantic colors', () => {
        expect(hook).toContain("root.style.setProperty('--selection-accent'");
        expect(hook).toContain("root.style.setProperty('--focus-accent'");
        expect(hook).not.toMatch(/setProperty\('--(?:system-danger|system-warning|trace|ghost-ink|pencil-trace)'/);
    });
});
