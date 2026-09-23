import { beforeAll, describe, expect, it } from 'vitest';
import { interactionTarget, isTyping, ownsDoubleClick, ownsKeyboard, ownsPointerGesture, resolveContextTarget, thoughtIdAt } from '../../src/field/spatial/pointerTarget.ts';

/** A dependency-free DOM stand-in. The module classifies a target with `instanceof HTMLElement`
 * plus `Element.closest(selector)`, so a fake that declares which selectors it matches — and
 * splits a selector list the way the DOM does — exercises every branch without a DOM. */
class FakeElement {
    dataset: Record<string, string>;
    private owners: string[];
    constructor(owners: string[] = [], thoughtId?: string) {
        this.owners = owners;
        this.dataset = thoughtId ? { thoughtId } : {};
    }
    closest(selector: string): FakeElement | null {
        const wanted = selector.split(',').map(part => part.trim());
        return wanted.some(want => this.owners.includes(want)) ? this : null;
    }
}
const el = (owners: string[] = [], thoughtId?: string): EventTarget => new FakeElement(owners, thoughtId) as unknown as EventTarget;

beforeAll(() => {
    (globalThis as unknown as { HTMLElement: unknown }).HTMLElement = FakeElement;
});

describe('pointer target classification', () => {
    it('never resolves passive decoration into an interaction target', () => {
        expect(interactionTarget(el(['[data-decoration]']))).toBeNull();
        expect(interactionTarget(el(['[data-decoration]', 'button']))).toBeNull();
        expect(interactionTarget(el(['[data-decoration]', 'textarea']))).toBeNull();
        expect(ownsPointerGesture(el(['[data-decoration]', 'button']))).toBe(false);
        expect(ownsDoubleClick(el(['[data-decoration]', 'textarea']))).toBe(false);
    });

    it('resolves ordinary elements and rejects non-element targets', () => {
        expect(interactionTarget(el())).not.toBeNull();
        expect(interactionTarget(null)).toBeNull();
        expect(interactionTarget({} as EventTarget)).toBeNull();
        expect(isTyping(null)).toBe(false);
        expect(thoughtIdAt(null)).toBeUndefined();
    });

    it('keeps a text editor for itself and lets a control own its own press', () => {
        const editor = el(['textarea']);
        expect(isTyping(editor)).toBe(true);
        expect(isTyping(el(['input']))).toBe(true);
        expect(isTyping(el(['button']))).toBe(false);
        expect(ownsKeyboard(editor)).toBe(true);
        expect(ownsKeyboard(el(['a']))).toBe(true);
        expect(ownsKeyboard(el(['button']))).toBe(true);
        expect(ownsKeyboard(el())).toBe(false);
        for (const owner of ['button', '.relation-label-overlay', '.context-actions', '[data-surface]'])
            expect(ownsPointerGesture(el([owner])), owner).toBe(true);
        expect(ownsPointerGesture(el())).toBe(false);
        expect(ownsDoubleClick(el(['.context-actions']))).toBe(false);
        expect(ownsDoubleClick(el(['.relation-label-overlay']))).toBe(true);
    });

    it('classifies a right-click as a Thought, the blank Field, or not ours', () => {
        expect(resolveContextTarget(el(['button']))).toBe('ignored');
        expect(resolveContextTarget(el(['textarea']))).toBe('ignored');
        expect(resolveContextTarget(el(['[data-thought-id]'], 'thought_1'))).toBe('thought');
        expect(resolveContextTarget(el())).toBe('blank');
        expect(thoughtIdAt(el(['[data-thought-id]'], 'thought_1'))).toBe('thought_1');
        expect(thoughtIdAt(el())).toBeUndefined();
    });
});
