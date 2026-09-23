/** One connection/status vocabulary for the whole product.
 *
 * A status is a glyph plus a word: the glyph is decoration for the eye (and is hidden from assistive
 * technology), the label carries the meaning. Callers derive the `tone` from what is actually known
 * — never optimistically — and the appearance for each tone lives in `field.css` through
 * `data-tone`, so a status can never be styled differently in one place than in another.
 */
import type { ReactElement } from 'react';
import { Button } from './Button.tsx';

export type StatusTone = 'connected' | 'checking' | 'unconfigured' | 'unavailable' | 'limited' | 'error';

/** Decorative glyph for a tone. Exhaustive over `StatusTone`: a new tone cannot be forgotten. */
export function statusGlyph(tone: StatusTone): string {
    switch (tone) {
        case 'connected': return '\u25cf';      // ● filled
        case 'checking': return '\u25cc';       // ◌ dotted
        case 'unconfigured': return '\u25cb';   // ○ hollow
        case 'unavailable': return '\u2014';    // — an em dash: nothing to report
        case 'limited': return '\u25d0';        // ◐ half
        case 'error': return '!';
    }
}

/** The one status line. Styling is owned by `field.css`; callers own the words, the tone and any
 * single recovery action. `testId` follows the same convention as `Select`. */
export function StatusLine({ tone, label, detail, action, testId }: {
    tone: StatusTone;
    label: string;
    detail?: string;
    action?: { label: string; run: () => void };
    testId?: string;
}): ReactElement {
    return <p className="status-line" data-tone={tone} data-testid={testId}>
        <span className="status-glyph" aria-hidden="true">{statusGlyph(tone)}</span>
        <span className="status-label">{label}</span>
        {detail && <span className="status-detail">{detail}</span>}
        {action && <Button variant="outline" size="sm" className="status-action" onClick={action.run}>{action.label}</Button>}
    </p>;
}
