import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, FIELD_STYLE_IDS } from '../../src/ui/appearance.ts';

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const host = source('src/ui/fieldBackgrounds/FieldBackgroundLayer.tsx');
const css = source('src/ui/fieldBackgrounds/fieldBackgrounds.css');
const field = source('src/field/Field.tsx');

const backgrounds = ['paper-texture', 'topography', 'threads', 'waves', 'silk'];

describe('production Field backgrounds', () => {
    it('exposes only the final five backgrounds and defaults to Paper Texture', () => {
        expect(FIELD_STYLE_IDS).toEqual(backgrounds);
        expect(DEFAULT_APPEARANCE.fieldStyle).toBe('paper-texture');
        for (const renderer of ['PaperTextureBackground', 'TopographyBackground', 'ThreadsBackground', 'WavesBackground', 'SilkBackground'])
            expect(host).toContain(renderer);
        expect(host.match(/lazy\(/g)).toHaveLength(5);
    });

    it('uses one inert viewport host without legacy dispatch or camera presentation', () => {
        expect(css).toMatch(/\.field-background-layer\s*\{[\s\S]*pointer-events:\s*none/);
        expect(host).toMatch(/aria-hidden="true"/);
        expect(host).toContain('data-camera-attachment="screen"');
        expect(host).not.toMatch(/FieldStyleLayer|isProductionBackground|paintFieldZoomPresentation|MATERIAL_TILE_OFFSETS|300%/);
        expect(field).not.toMatch(/paintFieldZoomPresentation|clearFieldCameraPresentation|--field-(?:terrain|flow|dust|relief)/);
    });

    it('contains no legacy renderer directories', () => {
        expect(existsSync(new URL('../../src/ui/fieldStyles', import.meta.url))).toBe(false);
        expect(existsSync(new URL('../../src/ui/terrain', import.meta.url))).toBe(false);
    });
});
