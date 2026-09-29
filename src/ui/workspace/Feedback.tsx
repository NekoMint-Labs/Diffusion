import { useLayoutEffect, useRef, type ReactElement, type ReactNode } from 'react';
import type { FeedbackTone } from './feedback.ts';

/** The workspace reserves the measured bottom line so a wrapped notice cannot cover writing. */
export function FeedbackLine({ text, tone, action, secondary, onBottomHeight }: {
    text: string;
    tone: FeedbackTone;
    action?: ReactNode;
    /** The established placement for a standing, non-blocking statement (the demo disclosure). */
    secondary?: string;
    onBottomHeight?: (height: number) => void;
}): ReactElement {
    const line = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const element = line.current;
        if (!element || !onBottomHeight) return;
        // Demo disclosure lives at the top; it must not leave an empty bottom lane.
        if (secondary === 'demo') { onBottomHeight(0); return; }
        const measure = () => onBottomHeight(Math.ceil(element.getBoundingClientRect().height));
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => { observer.disconnect(); onBottomHeight(0); };
    }, [secondary, onBottomHeight]);
    return <div ref={line} className="notice" data-tone={tone} data-secondary={secondary} role="status">{text}{action}</div>;
}
