import { describe, expect, it } from 'vitest';
import { COMPOSER_SHORTCUT, composerState } from '../../src/ui/workspace/composer.ts';

describe('the Quiet Composer state machine', () => {
    it('is idle wherever it is not the active writing surface', () => {
        expect(composerState({ composing: false, scoped: false, words: '', busy: false })).toBe('idle');
        // A draft that is still on screen is not composing: leaving must return the composer to rest.
        expect(composerState({ composing: false, scoped: true, words: 'draft', busy: true })).toBe('idle');
    });

    it('distinguishes focused, scoped and writing, and reports submission while busy', () => {
        expect(composerState({ composing: true, scoped: false, words: '', busy: false })).toBe('focused');
        expect(composerState({ composing: true, scoped: true, words: '', busy: false })).toBe('scoped');
        expect(composerState({ composing: true, scoped: true, words: 'What connects these?', busy: false })).toBe('writing');
        expect(composerState({ composing: true, scoped: false, words: '  ', busy: false })).toBe('focused');
        expect(composerState({ composing: true, scoped: true, words: 'sent', busy: true })).toBe('submitting');
    });

    it('keeps only Shift+Enter as tertiary composer assistance', () => {
        expect(COMPOSER_SHORTCUT).toEqual({ keys: ['Shift', 'Enter'], label: 'New line' });
    });
});
