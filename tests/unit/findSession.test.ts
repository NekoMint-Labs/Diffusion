import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeFindSessionEnd } from '../../src/ui/find/useFindInField.ts';
import { useUI } from '../../src/ui/store.ts';

describe('Find session lifetime', () => {
    const subscriptions: Array<() => void> = [];
    const observe = () => {
        const reset = vi.fn();
        subscriptions.push(subscribeFindSessionEnd(reset));
        return reset;
    };

    beforeEach(() => useUI.setState(useUI.getInitialState(), true));
    afterEach(() => {
        subscriptions.splice(0).forEach(unsubscribe => unsubscribe());
        useUI.setState(useUI.getInitialState(), true);
    });

    it.each(['palette', 'settings', 'none'] as const)('ends when Find changes to %s', surface => {
        const reset = observe();
        useUI.getState().patch({ surface: 'find' });
        expect(reset).not.toHaveBeenCalled();
        useUI.getState().patch({ surface });
        expect(reset).toHaveBeenCalledTimes(1);
        useUI.getState().patch({ surface: 'help' });
        expect(reset).toHaveBeenCalledTimes(1);
    });

    it('ends when a menu replaces Find through transientPatch', () => {
        const reset = observe();
        useUI.getState().patch({ surface: 'find' });
        useUI.getState().patch({ menu: { anchor: null, scope: 'global' } });
        expect(useUI.getState().surface).toBe('none');
        expect(reset).toHaveBeenCalledTimes(1);
    });

    it('keeps the session when Find is reopened or other UI state changes', () => {
        const reset = observe();
        useUI.getState().patch({ surface: 'find' });
        useUI.getState().patch({ surface: 'find' });
        useUI.getState().patch({ selection: ['matching-thought'], theme: 'dark' });
        expect(reset).not.toHaveBeenCalled();
    });

    it('leaves navigation return state and selection untouched', () => {
        const reset = observe();
        const returnPoint = { camera: { x: 10, y: 20, zoom: 1 }, selection: ['original'] };
        useUI.getState().patch({ surface: 'find', returnPoint, selection: ['match'] });
        useUI.getState().patch({ surface: 'palette' });
        expect(reset).toHaveBeenCalledTimes(1);
        expect(useUI.getState().returnPoint).toBe(returnPoint);
        expect(useUI.getState().selection).toEqual(['match']);
    });

    it('stops resetting after unsubscribe', () => {
        const reset = vi.fn();
        const unsubscribe = subscribeFindSessionEnd(reset);
        subscriptions.push(unsubscribe);
        useUI.getState().patch({ surface: 'find' });
        unsubscribe();
        useUI.getState().patch({ surface: 'settings' });
        expect(reset).not.toHaveBeenCalled();
    });
});
