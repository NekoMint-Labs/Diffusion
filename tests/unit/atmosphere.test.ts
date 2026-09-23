import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { atmosphereRole, type AtmosphereRole } from '../../src/ui/atmosphere.ts';

const css = readFileSync(new URL('../../src/ui/atmosphere.css', import.meta.url), 'utf8');
const component = readFileSync(new URL('../../src/ui/atmosphere.tsx', import.meta.url), 'utf8');
/** Structural claims are about the code, not the prose: a comment that *names* a forbidden
 * property must not be mistaken for the property being used. */
const code = css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('atmosphere is presentation state', () => {
    it('maps transient activity to a role, and never leaves the vocabulary', () => {
        expect(atmosphereRole({ busy: false, diffuse: false, scoped: false })).toBe('rest');
        expect(atmosphereRole({ busy: true, diffuse: false, scoped: false })).toBe('attention');
        expect(atmosphereRole({ busy: false, diffuse: true, scoped: false })).toBe('attention');
        // A Field holding a temporary scope is a transient attention too, so it lights the material.
        expect(atmosphereRole({ busy: false, diffuse: false, scoped: true })).toBe('attention');
        expect(atmosphereRole({ busy: true, diffuse: true, scoped: true })).toBe('attention');
        // The role set is a contract the later renderer will be fed by, so it is pinned here.
        const roles: AtmosphereRole[] = ['rest', 'attention', 'emergence', 'transition'];
        expect(roles).toEqual(['rest', 'attention', 'emergence', 'transition']);
    });

    it('owns no pointer input and no semantic state', () => {
        expect(component).not.toMatch(/useUI|store\.ts|controller|dispatch/);
        expect(component).toMatch(/aria-hidden="true"/);
        expect(code).toMatch(/\.atmosphere\s*\{[^}]*pointer-events:\s*none/);
        // Only REST and ATTENTION are implemented; nothing here draws semantics.
        expect(code).toMatch(/data-atmosphere="attention"/);
        expect(component).toMatch(/data-atmosphere=\{role\}/);
    });

    it('is cheap: no blur, no backdrop-filter, and only transform is animated', () => {
        expect(code).not.toMatch(/filter\s*:\s*blur/i);
        expect(code).not.toMatch(/backdrop-filter/);
        const animated = [...code.matchAll(/@keyframes\s+atmosphere-drift\s*\{([\s\S]*?)\n\}/g)].map(match => match[1]).join('\n');
        expect(animated).toMatch(/translate3d/);
        expect(animated).not.toMatch(/opacity|filter|width|height|top|left/);
        expect(code).toMatch(/--atmos-drift-x:\s*calc\(var\(--ambient-motion, \.5\) \* 30px\)/);
        expect(code).toMatch(/--atmos-drift-y:\s*calc\(var\(--ambient-motion, \.5\) \* -34\.5px\)/);
        expect(code).toMatch(/:root\[data-field-motion="off"\] \.atmosphere::before\s*\{\s*animation:\s*none/);
        expect([...code.matchAll(/animation\s*:\s*atmosphere-drift/g)]).toHaveLength(1);
    });

    it('has a material recipe per theme and stops moving under reduced motion', () => {
        expect(code).toMatch(/:root\s*\{[\s\S]*--atmos-lift/);
        expect(code).toMatch(/:root\[data-theme="dark"\]\s*\{/);
        expect(code).toMatch(/--atmos-grain-opacity/);
        expect(code).toMatch(/feTurbulence/);
        expect(code).toMatch(/radial-gradient/);
        // The illumination geometry is custom data, so ATTENTION can move where the light falls.
        expect(code).toMatch(/--atmos-lift-x/);
        expect(code).toMatch(/--atmos-lift-y/);
        expect(code).toMatch(/--atmos-warm-x/);
        expect(code).toMatch(/--atmos-warm-y/);
        expect(code).toMatch(/radial-gradient\([^)]*at var\(--atmos-lift-x\) var\(--atmos-lift-y\)/);
        // Reduced motion is guardable by the dev-only Motion Lab preview attribute; production
        // never sets it, so the drift still stops for a real reduced-motion preference.
        expect(code).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*:root:not\(\[data-motion-preview="normal"\]\)\s*\.atmosphere::before\s*\{\s*animation:\s*none/);
    });
});
