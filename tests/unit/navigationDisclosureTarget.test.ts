import { describe, expect, it } from 'vitest';
import { navigationDisclosureTarget } from '../../src/field/spatial/navigationDisclosureTarget.ts';

describe('navigation respects the current explicit folds', () => {
    const parents = new Map<string, string | null>([['a', null], ['b', 'a'], ['c', 'b']]);
    it('returns an existing target, or nothing for a deleted target', () => {
        expect(navigationDisclosureTarget('c', parents)).toBe('c');
        expect(navigationDisclosureTarget('deleted', parents)).toBeNull();
    });
    it('uses the outermost collapsed ancestor without changing disclosure', () => {
        const branches = { a: false, b: false };
        expect(navigationDisclosureTarget('c', parents, branches)).toBe('a');
        expect(navigationDisclosureTarget('c', parents, { a: true, b: false })).toBe('b');
        expect(branches).toEqual({ a: false, b: false });
    });
});
