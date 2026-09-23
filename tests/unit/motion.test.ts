import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import gsap from 'gsap';
import { MOTION_DURATION, MOTION_EASE, cubicPoints, motionDuration, roleTransition, type DurationRole, type EaseRole } from '../../src/ui/motion/tokens.ts';

const ROLES = Object.keys(MOTION_DURATION) as DurationRole[];
const EASES = Object.keys(MOTION_EASE) as EaseRole[];
const css = readFileSync(new URL('../../src/ui/theme.css', import.meta.url), 'utf8');
const cssVar = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
const numbers = (value: string) => value.replace(/^cubic-bezier\(|\)$/g, '').split(',').map(part => Number(part.trim()));

/** The point of a role is that it means one thing everywhere. These tests hold the two
 * technologies to the same numbers: a role is not a naming convention, it is a contract. */
describe('motion roles', () => {
    it('covers the semantic vocabulary with a duration for every role', () => {
        expect(ROLES).toEqual(['instant', 'micro', 'control', 'surface', 'spatial', 'settle', 'signature']);
    });

    it('pins the vocabulary deliberately: changing a role means changing this test', () => {
        // A golden value is the point of a token system: the numbers are a product decision, and
        // a decision that can be changed without anyone noticing is not one.
        expect(MOTION_DURATION).toEqual({ instant: 0.09, micro: 0.14, control: 0.2, surface: 0.22, spatial: 0.34, settle: 0.4, signature: 0.62 });
        expect(MOTION_EASE).toEqual({
            enter: [0.22, 1, 0.36, 1], exit: [0.4, 0, 1, 1], move: [0.32, 0.72, 0, 1],
            settle: [0.16, 1, 0.3, 1], attention: [0.3, 0.9, 0.24, 1], signature: [0.16, 0.84, 0.24, 1],
        });
    });

    it('orders the roles by what they mean, not by accident', () => {
        const times = ROLES.map(role => MOTION_DURATION[role]);
        expect([...times].sort((a, b) => a - b)).toEqual(times);
        expect(MOTION_DURATION.instant).toBeLessThan(MOTION_DURATION.micro);
        // An authored sequence is meant to be watched, so it is the longest thing here.
        expect(MOTION_DURATION.signature).toBeGreaterThan(MOTION_DURATION.settle);
    });

    it('keeps every easing role a valid cubic curve', () => {
        for (const role of EASES) {
            const points = cubicPoints(role);
            expect(points).toHaveLength(4);
            for (const value of points) expect(Number.isFinite(value)).toBe(true);
            // A cubic-bezier must have both progress coordinates in [0, 1] to be an easing curve.
            expect(points[0]).toBeGreaterThanOrEqual(0);
            expect(points[0]).toBeLessThanOrEqual(1);
            expect(points[2]).toBeGreaterThanOrEqual(0);
            expect(points[2]).toBeLessThanOrEqual(1);
        }
    });

    it('collapses every role to zero duration under reduced motion without changing the endpoint', () => {
        for (const role of ROLES) {
            const reduced = roleTransition(role, true);
            expect(reduced.duration).toBe(0);
            expect(reduced.ease).toEqual(cubicPoints('enter'));
            expect(roleTransition(role, false).duration).toBe(MOTION_DURATION[role]);
        }
    });

    it('carries one vocabulary into CSS: the same roles, the same numbers, the same curves', () => {
        for (const role of ROLES) {
            const declared = cssVar(`motion-${role}`);
            expect(declared, `--motion-${role} is missing from theme.css`).toBeTruthy();
            expect(Number(declared!.replace('ms', ''))).toBe(Math.round(MOTION_DURATION[role] * 1000));
        }
        for (const role of EASES) {
            const declared = cssVar(`ease-${role}`);
            expect(declared, `--ease-${role} is missing from theme.css`).toBeTruthy();
            expect(numbers(declared!)).toEqual([...cubicPoints(role)]);
        }
    });

    it('keeps the pre-role duration names resolving to a role, so call sites cannot drift', () => {
        for (const value of Object.values(motionDuration)) expect(ROLES).toContain(Object.keys(MOTION_DURATION).find(role => MOTION_DURATION[role as DurationRole] === value));
        expect(motionDuration.instant).toBe(MOTION_DURATION.instant);
        expect(motionDuration.transform).toBe(MOTION_DURATION.spatial);
    });

    /** The API shape that made a whole class of motion invisible, pinned so it cannot come back.
     *
     * `@gsap/react`'s `contextSafe(fn)` is `context.add(null, fn)`, and against GSAP 3.15 `add`
     * resolves a falsy name to "return the wrapper without running it". Every one-shot sequence
     * built that way was therefore a silent no-op in the real product — the invitation's
     * contraction, the composer yielding on commit, and the first Thought's flight were never
     * built at all — while the Motion Lab, which replayed those same moments through Motion
     * replicas, looked animated. That is exactly the gap this test keeps closed: the one-shot
     * runner in `signature.ts` uses `context.add(fn)`, and these two lines are why. */
    it('runs a one-shot callback only through the single-argument GSAP context form', () => {
        const context = gsap.context(() => {});
        let throughFalsyName = 0;
        let throughFunction = 0;
        // GSAP's own types do not even admit the shape `contextSafe` uses (`name: null`, untyped in
        // @gsap/react's JavaScript) — part of why the no-op went unnoticed for so long.
        (context.add as (name: string | null, func: () => void) => unknown)(null, () => { throughFalsyName += 1; });
        context.add(() => { throughFunction += 1; });
        expect(throughFalsyName, 'context.add(null, fn) — what contextSafe does — must be recognised as a no-op').toBe(0);
        expect(throughFunction, 'the one-shot runner form must actually run').toBe(1);
    });
});
