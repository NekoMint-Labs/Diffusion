/** The Quiet Composer's states, named once and decided outside the component.
 *
 * A product vocabulary, not styling hooks: `idle` is a line in the Field waiting for a thought,
 * `focused` is a real writing surface, `scoped` is writing *about* something already selected,
 * `writing` has words in it, and `submitting` has handed the words over. `Speak.tsx` renders the
 * result as a data attribute; the stylesheet only expresses it. */
export type ComposerState = 'idle' | 'focused' | 'scoped' | 'writing' | 'submitting';

export function composerState({ composing, scoped, words, busy }: { composing: boolean; scoped: boolean; words: string; busy: boolean }): ComposerState {
    if (!composing)
        return 'idle';
    if (busy)
        return 'submitting';
    if (words.trim())
        return 'writing';
    return scoped ? 'scoped' : 'focused';
}

/** Input-method confirmation and cancellation belong to the input method, not the composer. */
export function composerKeyAction(event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'isComposing' | 'keyCode'>): 'exit' | 'submit' | null {
    if (event.isComposing || event.keyCode === 229)
        return null;
    if (event.key === 'Escape')
        return 'exit';
    return event.key === 'Enter' && !event.shiftKey ? 'submit' : null;
}

/** The one tertiary shortcut worth showing beside a focused textarea. Escape still leaves the
 * composer, but remains discoverable through the keyboard reference rather than competing here. */
export const COMPOSER_SHORTCUT = { keys: ['Shift', 'Enter'], label: 'New line' };
