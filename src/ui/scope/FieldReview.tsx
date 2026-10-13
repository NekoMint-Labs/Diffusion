import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react';
import type { Ghost, Thought } from '../../core/model.ts';
import { useUI } from '../store.ts';
import { RootReview } from './RootReview.tsx';
import { SuggestionReview } from './SuggestionReview.tsx';

export interface FieldReviewHandle { refresh(ids: string[]): void; }

/** Only these two reading entries share an open state. Navigation retains its existing owner. */
export const FieldReview = forwardRef<FieldReviewHandle, {
    elementRef: RefObject<HTMLDivElement | null>; enabled: boolean; pending: Ghost[];
    thoughts: Record<string, Thought>; roots: Thought[];
    onAction: (ids: string[], action: 'keep' | 'ignore') => void; onReveal: (id: string) => void;
}>(function FieldReview({ elementRef, enabled, pending, thoughts, roots, onAction, onReveal }, ref) {
    const [needed, setNeeded] = useState<string[]>([]);
    const [active, setActive] = useState<'roots' | 'suggestions' | null>(null);
    const editing = useUI(state => state.editing);
    const lastRefresh = useRef('');
    useImperativeHandle(ref, () => ({ refresh(ids) {
        const key = ids.join(' ');
        if (key !== lastRefresh.current) { lastRefresh.current = key; setNeeded(ids); }
    } }), []);
    useEffect(() => { if (!enabled || editing) setActive(null); }, [enabled, editing]);
    useEffect(() => {
        const app = elementRef.current?.closest('.app');
        const writing = (event: Event) => {
            if ((event.target as HTMLElement)?.closest('[data-testid="speak"], .thought.editing, .read-window')) setActive(null);
        };
        app?.addEventListener('pointerdown', writing, true);
        app?.addEventListener('focusin', writing, true);
        return () => { app?.removeEventListener('pointerdown', writing, true); app?.removeEventListener('focusin', writing, true); };
    }, [elementRef]);
    const fallbackFocus = () => {
        const field = elementRef.current?.closest<HTMLElement>('.field');
        (field?.querySelector<HTMLElement>('[data-testid="root-review-toggle"]') ?? field)?.focus({ preventScroll: true });
    };
    return <div ref={elementRef} className="field-review-entries" data-testid="field-review-entries" data-surface="true" hidden={!enabled || !!editing}>
        <RootReview roots={roots} thoughts={thoughts} onReveal={onReveal} open={active === 'roots'} onOpenChange={open => setActive(open ? 'roots' : null)} />
        <SuggestionReview suggestions={pending.filter(ghost => needed.includes(ghost.id))} pending={pending} thoughts={thoughts} onAction={onAction} open={active === 'suggestions'} onOpenChange={open => setActive(open ? 'suggestions' : null)} onFallbackFocus={fallbackFocus} />
    </div>;
});
