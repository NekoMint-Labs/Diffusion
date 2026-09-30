import { afterEach, describe, expect, it, vi } from 'vitest';
import { presentSpatialTransition } from '../../src/ui/motion/spatialGrammar.ts';
import { useUI } from '../../src/ui/store.ts';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); useUI.getState().patch({ spatialTransition: null }); });
describe('presentation transition ownership', () => {
    it('an older completion cannot clear a newer transition', () => {
        vi.useFakeTimers();
        presentSpatialTransition('arrive', ['old'], 100);
        const latest = presentSpatialTransition('settle', ['kept'], 300);
        vi.advanceTimersByTime(100);
        expect(useUI.getState().spatialTransition?.id).toBe(latest);
        vi.advanceTimersByTime(200);
        expect(useUI.getState().spatialTransition).toBeNull();
    });
    it('reduced motion leaves no delayed presentation owner', () => {
        vi.useFakeTimers();
        vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
        presentSpatialTransition('settle', ['kept']);
        expect(useUI.getState().spatialTransition).toBeNull();
        expect(vi.getTimerCount()).toBe(0);
    });
});
