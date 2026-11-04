export const ANSWER_PREVIEW_LIMIT = 120;

/** A display excerpt, never a replacement for the stored answer or provider context. */
export function answerPreview(text: string): string {
    const characters = Array.from(text);
    if (characters.length <= ANSWER_PREVIEW_LIMIT) return text;
    const opening = text.trimStart().split(/\r?\n\s*\r?\n/, 1)[0].trimEnd();
    if (opening && Array.from(opening).length < ANSWER_PREVIEW_LIMIT) return opening + '\u2026';
    return characters.slice(0, ANSWER_PREVIEW_LIMIT - 1).join('').trimEnd() + '\u2026';
}
