import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../../', import.meta.url);
const theme = readFileSync(new URL('src/ui/theme.css', root), 'utf8');
const field = readFileSync(new URL('src/ui/field.css', root), 'utf8');
const background = readFileSync(new URL('src/ui/fieldBackgrounds/fieldBackgrounds.css', root), 'utf8');
// Application surfaces moved out of field.css into surfaces.css; the layer contract spans both.
const surfaces = readFileSync(new URL('src/ui/surfaces/surfaces.css', root), 'utf8');
const markup = readFileSync(new URL('src/field/Field.tsx', root), 'utf8') + readFileSync(new URL('src/field/phenomena/RelationLayer.tsx', root), 'utf8');

const layer = (name: string) => Number(theme.match(new RegExp(`--layer-${name}:\\s*(\\d+)`))?.[1]);
const block = (css: string, selector: string) => css.slice(css.indexOf(`${selector} {`), css.indexOf('}', css.indexOf(`${selector} {`)) + 1);

describe('interaction layer contract', () => {
    it('orders semantic roles instead of literal component patches', () => {
        const layers = ['field', 'relation', 'thought', 'selection', 'scope', 'speak', 'surface'].map(layer);
        expect(layers.every(Number.isFinite)).toBe(true);
        expect(layers).toEqual([...layers].sort((a, b) => a - b));
        expect(new Set(layers).size).toBe(layers.length);

        expect(block(field, '.relation-phenomena')).toContain('var(--layer-relation)');
        expect(block(field, '.relation-label-overlay')).toContain('var(--layer-selection)');
        expect(block(field, '.thought')).toContain('var(--layer-thought)');
        expect(block(field, '.thought[data-selected="true"]')).toContain('var(--layer-selection)');
        expect(block(field, '.scope-hub')).toContain('var(--layer-scope)');
        expect(block(field, '.speak-positioner')).toContain('var(--layer-speak)');
        expect(block(surfaces, '.surface')).toContain('var(--layer-surface)');
        expect(block(surfaces, '.command-menu-positioner')).toContain('var(--layer-surface)');
        const localOnly = new Set(['-1', '0', '1']);
        expect([...field.matchAll(/z-index:\s*([^;]+)/g)].map(match => match[1].trim()).filter(value => !value.includes('var(--layer-') && !localOnly.has(value))).toEqual([]);
    });

    it('keeps the Field background inert beneath relations and Thoughts', () => {
        expect(layer('background')).toBeLessThanOrEqual(layer('relation'));
        expect(layer('background')).toBeLessThan(layer('thought'));
        expect(block(background, '.field-background-layer')).toContain('pointer-events: none');
        expect(markup).toMatch(/<FieldBackgroundLayer style=\{fieldStyle\}\/>\s*<div ref=\{world\} className="world">/s);
    });

    it('keeps local masks theme-aware and pointer ownership narrow', () => {
        expect(theme).toMatch(/--interaction-mask:\s*var\(--field-bg\)/);
        expect(block(field, '.scope-hub')).toContain('pointer-events: none');
        expect(block(field, '.scope-actions button')).toContain('pointer-events: auto');
        expect(block(field, '.scope-hub::before')).toMatch(/var\(--interaction-mask\)[\s\S]*pointer-events: none/);
        expect(block(field, '.speak-positioner')).toContain('pointer-events: none');
        expect(block(field, '.speak')).toContain('pointer-events: auto');
        // A composing Speak is a real writing surface; it must not put an intervening mask layer over it.
        expect(block(field, '.speak[data-composing="true"] .speak-shell::before')).toContain('display: none');
        expect(markup).toContain('phenomena relation-phenomena');
        expect(markup).toContain('phenomena selection-phenomena');
    });
});
