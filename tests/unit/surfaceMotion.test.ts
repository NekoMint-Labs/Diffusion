import { describe, expect, it } from 'vitest';
import { MOTION_PANEL_SPRING } from '../../src/ui/motion.ts';
import { surfaceMotionRoles } from '../../src/ui/surfaces/surfaceMotion.ts';

const roles = (over: Partial<Parameters<typeof surfaceMotionRoles>[0]> = {}) => surfaceMotionRoles({ level: 'focus', placement: 'right-start', anchored: false, reduced: false, sharedLayout: false, ...over });

describe('surface motion roles', () => {
    it('separates a place that owns input from a projection anchored to a Thought', () => {
        expect(roles({ level: 'window' }).transition).toEqual(MOTION_PANEL_SPRING);
        expect(roles({ level: 'window' }).transformOrigin).toBe('center center');
        expect(roles({ level: 'split' }).transformOrigin).toBe('right center');
        expect(roles({ level: 'split' }).initial).toEqual({ opacity: 0, scale: 1, x: 6, y: 0 });
        expect(roles({ level: 'anchored', anchored: true, placement: 'right-start' }).initial).toEqual({ opacity: 0, scale: .992, x: -4, y: 0 });
        expect(roles({ level: 'anchored', anchored: true, placement: 'right-start' }).transformOrigin).toBe('left top');
        // An anchored level without a point has no origin to arrive from, so it settles in place.
        expect(roles({ level: 'anchored', anchored: false }).initial).toEqual({ opacity: 0, scale: 1, x: 0, y: 3 });
        expect(roles({ level: 'anchored', anchored: false }).transformOrigin).toBe('center top');
        expect(roles({ level: 'bar' }).initial).toEqual({ opacity: 0, scale: 1, x: 0, y: 3 });
    });

    it('closes a split place sideways and everything else in place', () => {
        expect(roles({ level: 'split' }).exit).toMatchObject({ x: 8, y: 0 });
        expect(roles({ level: 'anchored', anchored: true }).exit).toMatchObject({ x: 0, scale: .98, y: 3 });
        for (const level of ['window', 'split', 'focus', 'bar', 'anchored'] as const)
            expect(roles({ level }).exit).toMatchObject({ opacity: 0, pointerEvents: 'none' });
    });

    it('resolves every role to zero duration and no offset under reduced motion', () => {
        for (const level of ['window', 'split', 'focus', 'bar', 'anchored'] as const) {
            const reduced = roles({ level, anchored: true, reduced: true });
            expect(reduced.initial).toEqual({ opacity: 1, scale: 1, x: 0, y: 0 });
            expect((reduced.transition as { duration?: number }).duration).toBe(0);
            expect((reduced.exit as { transition: { duration: number } }).transition.duration).toBe(0);
        }
    });

    it('lets a shared shell keep its identity instead of replaying an arrival — except a window, which always arrives', () => {
        expect(roles({ level: 'split', sharedLayout: true }).initial).toEqual({ opacity: 1, scale: 1, x: 0, y: 0 });
        expect(roles({ level: 'window', sharedLayout: true }).initial).toEqual({ opacity: 0, scale: .965, x: 0, y: 10 });
    });
});
