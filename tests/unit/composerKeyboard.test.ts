import { describe, expect, it } from 'vitest';
import { composerKeyAction } from '../../src/ui/workspace/composer.ts';

const keyboardEvent = (key: string, overrides: Partial<Pick<KeyboardEvent, 'shiftKey' | 'isComposing' | 'keyCode'>> = {}) => ({
    key, shiftKey: false, isComposing: false, keyCode: key === 'Escape' ? 27 : key === 'Enter' ? 13 : 0, ...overrides,
});

describe('composer keyboard ownership', () => {
    it.each(['Escape', 'Enter'])('leaves %s to an active input method', key => {
        expect(composerKeyAction(keyboardEvent(key, { isComposing: true }))).toBeNull();
    });

    it.each(['Escape', 'Enter'])('honors the legacy composition marker for %s even when isComposing is false', key => {
        expect(composerKeyAction(keyboardEvent(key, { keyCode: 229 }))).toBeNull();
    });

    it('restores normal cancellation and submission after composition ends', () => {
        expect(composerKeyAction(keyboardEvent('Escape'))).toBe('exit');
        expect(composerKeyAction(keyboardEvent('Enter'))).toBe('submit');
    });

    it('leaves Shift+Enter and ordinary typing to the textarea', () => {
        expect(composerKeyAction(keyboardEvent('Enter', { shiftKey: true }))).toBeNull();
        expect(composerKeyAction(keyboardEvent('a'))).toBeNull();
    });
});
