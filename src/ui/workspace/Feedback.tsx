import type { ReactElement, ReactNode } from 'react';
import type { FeedbackTone } from './feedback.ts';

/** One line. It carries no layout of its own beyond the `.notice` class, so it can sit wherever
 * the application already shows a line; mounting and exit belong to the caller. Appearance,
 * settle, disappearance — nothing to dismiss. */
export function FeedbackLine({ text, tone, action, secondary }: {
    text: string;
    tone: FeedbackTone;
    action?: ReactNode;
    /** The established placement for a standing, non-blocking statement (the demo disclosure). */
    secondary?: string;
}): ReactElement {
    return <div className="notice" data-tone={tone} data-secondary={secondary} role="status">{text}{action}</div>;
}
