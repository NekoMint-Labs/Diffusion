import { useEffect, useRef, useState } from 'react';
import type { Ghost, Thought } from '../../core/model.ts';
import { t } from '../../shared/i18n.ts';
import { Button } from '../primitives/Button.tsx';
import { isComposing } from '../commands/shortcuts.ts';

/** A bounded screen-space reading entry for pending results, including culled/offscreen ones.
 * Its sources come from each frozen request scope, never from the current selection. */
export function SuggestionReview({ suggestions, pending, thoughts, onAction, open, onOpenChange, onFallbackFocus }: {
    suggestions: Ghost[]; pending: Ghost[]; open: boolean;
    onOpenChange: (open: boolean) => void; onFallbackFocus: () => void;
    thoughts: Record<string, Thought>;
    onAction: (ids: string[], action: 'keep' | 'ignore') => void;
}) {
    const [session, setSession] = useState<Ghost[]>([]);
    const toggle = useRef<HTMLButtonElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    useEffect(() => { if (open) closeButton.current?.focus({ preventScroll: true }); else setSession([]); }, [open]);
    const live = new Map(pending.map(ghost => [ghost.id, ghost]));
    const entries = [...new Map([...session, ...suggestions].map(ghost => [ghost.id, live.get(ghost.id) ?? ghost])).values()].filter(ghost => live.has(ghost.id) || !!thoughts[ghost.id]);
    const count = (open ? entries : suggestions).filter(ghost => live.has(ghost.id)).length;
    const close = () => { onOpenChange(false); if (suggestions.length) toggle.current?.focus({ preventScroll: true }); else onFallbackFocus(); };
    if (!suggestions.length && !open) return null;
    return <div className="suggestion-review" data-testid="suggestion-review" data-surface="true" onPointerDown={event => event.stopPropagation()} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape' && !isComposing(event.nativeEvent)) { event.preventDefault(); close(); } }}>
        <Button ref={toggle} variant="ghost" size="sm" className="review-toggle" data-testid="suggestion-review-toggle" aria-expanded={open} aria-label={t('Review {count} suggestions', { count })} onClick={() => { if (open) close(); else { setSession(suggestions); onOpenChange(true); } }}>{t('Suggestions {count}', { count })}</Button>
        <span className="field-review-announcement" role="status" aria-live="polite" aria-atomic="true">{t('{count} suggestions awaiting review', { count })}</span>
        {open && <div className="field-review-panel" data-testid="suggestion-review-panel" role="region" aria-label={t('Suggestions')}>
            <header><strong>{t('Suggestions')}</strong><Button ref={closeButton} variant="ghost" size="sm" data-testid="suggestion-review-close" onClick={close}>{t('Close')}</Button></header>
            <div className="suggestion-review-list">
            {entries.map(ghost => <section key={ghost.id} data-suggestion-id={ghost.id} data-origin-scope={ghost.scopeIds.join(' ')} data-kept={!live.has(ghost.id) || undefined}>
                <small>{live.has(ghost.id) ? t('AI suggestion · not kept') : t('Kept')}</small>
                <p>{thoughts[ghost.id]?.text ?? ghost.text}</p>
                {ghost.scopeIds.length > 0 && <small>{t('From')}{': '}{ghost.scopeIds.map(id => thoughts[id]?.text ?? t('Missing thought')).join(' / ')}</small>}
                {live.has(ghost.id) && <div><Button variant="ghost" size="sm" data-testid="suggestion-keep" onClick={() => { setSession(entries); closeButton.current?.focus({ preventScroll: true }); onAction([ghost.id], 'keep'); }}>{t('Keep this')}</Button><Button variant="ghost" size="sm" data-testid="suggestion-ignore" onClick={() => { closeButton.current?.focus({ preventScroll: true }); onAction([ghost.id], 'ignore'); }}>{t('Ignore')}</Button></div>}
            </section>)}
            {!entries.length && <p>{t('No pending suggestions.')}</p>}
            </div>
        </div>}
    </div>;
}
