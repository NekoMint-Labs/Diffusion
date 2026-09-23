import type { InputRange } from '../core/model.ts';

export class IngestionValidationError extends Error {
    constructor(message: string) { super(message); this.name = 'IngestionValidationError'; }
}

/** JavaScript string offsets (UTF-16 code units) are the single application-wide convention.
 * `slice(start,end)` is therefore the validator as well as the consumer, including Chinese and
 * surrogate pairs. Model output supplies exact quotes, never numeric offsets. Quotes must be
 * unique so the deterministic resolver cannot silently choose the wrong repeated occurrence. */
export function resolveSourceQuotes(inputId: string, originalText: string, quotes: string[]): InputRange[] {
    const ranges: InputRange[] = [];
    for (const sourceQuote of quotes) {
        const start = originalText.indexOf(sourceQuote);
        if (start < 0) throw new IngestionValidationError(`Source quote is not an exact substring: ${sourceQuote.slice(0, 120)}`);
        if (originalText.indexOf(sourceQuote, start + 1) >= 0)
            throw new IngestionValidationError(`Source quote is ambiguous; use a longer unique substring: ${sourceQuote.slice(0, 120)}`);
        const end = start + sourceQuote.length;
        if (originalText.slice(start, end) !== sourceQuote) throw new IngestionValidationError('Source quote range did not round-trip.');
        ranges.push({ inputId, start, end });
    }
    return ranges;
}
