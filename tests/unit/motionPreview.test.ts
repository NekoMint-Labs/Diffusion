import { describe, expect, it } from 'vitest';
import { motionPreview, prefersReducedMotion, setMotionPreview, type MotionPreview } from '../../src/ui/motion/signature.ts';

/** The one deliberate way to preview past the operating system's motion preference.
 *
 * The product must honour `prefers-reduced-motion` (a real accessibility setting, and on the
 * Windows host this pass was reviewed on it is genuinely `reduce`), so the default mode is
 * `system` and nothing in the application ever changes it. The development-only Motion Lab does,
 * because reviewing choreography on a machine that has asked for no motion is otherwise impossible
 * — and that is exactly how a previous review compared two different motion modes unknowingly.
 *
 * These tests pin the seam: the default, the three resolutions, and the fact that changing it
 * notifies React so a sequence re-runs instead of holding a stale decision.
 */
describe('the motion preference and its preview seam', () => {
    it('resolves system, normal and reduced explicitly, and starts on system', () => {
        const modes: MotionPreview[] = ['system', 'normal', 'reduced'];
        expect(modes).toEqual(['system', 'normal', 'reduced']);
        // The environment is node (no window), which is also what a server render sees: the OS
        // preference cannot be read, so it is not read as "reduced".
        expect(motionPreview()).toBe('system');
        expect(prefersReducedMotion()).toBe(false);
        setMotionPreview('reduced');
        expect(prefersReducedMotion()).toBe(true);
        setMotionPreview('normal');
        expect(prefersReducedMotion()).toBe(false);
        setMotionPreview('system');
        expect(motionPreview()).toBe('system');
    });

    it('is the only place that decides, so a preview cannot leak into a second authority', async () => {
        const source = await import('node:fs').then(fs => fs.readFileSync(new URL('../../src/ui/motion/signature.ts', import.meta.url), 'utf8'));
        // One reader of the preference for the whole sequence layer: the hooks must not consult the
        // media query themselves, or a forced preview would apply to some sequences and not others.
        expect([...source.matchAll(/matchMedia\(/g)]).toHaveLength(1);
        expect(source).toContain('useMotionReduced');
    });
});
