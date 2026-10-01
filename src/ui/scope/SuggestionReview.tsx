import { useState, type Ref } from 'react';
import type { Ghost, Thought } from '../../core/model.ts';
import { t } from '../../shared/i18n.ts';
import { Button } from '../primitives/Button.tsx';

/** A bounded screen-space reading entry for pending results, including culled/offscreen ones.
 * Its sources come from each frozen request scope, never from the current selection. */
export function SuggestionReview({ elementRef, suggestions, thoughts, onAction }: {
    elementRef: Ref<HTMLDivElement>;
    suggestions: Ghost[];
    thoughts: Record<string, Thought>;
    onAction: (ids: string[], action: 'keep' | 'ignore') => void;
}) {
    const [open, setOpen] = useState(false);
    return <div ref={elementRef} className="suggestion-review" data-testid="suggestion-review" data-surface="true" onPointerDown={event => event.stopPropagation()} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); setOpen(false); } }}>
        <Button variant="ghost" size="sm" data-testid="suggestion-review-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>{t('Review {count} suggestions', { count: suggestions.length })}</Button>
        {open && <div className="suggestion-review-list">
            {suggestions.map(ghost => <section key={ghost.id} data-origin-scope={ghost.scopeIds.join(' ')}>
                <small>{t('AI suggestion · not kept')}</small>
                <p>{ghost.text}</p>
                {ghost.scopeIds.length > 0 && <small>{t('From')}: {ghost.scopeIds.map(id => thoughts[id]?.text ?? t('Missing thought')).join(' / ')}</small>}
                <div><Button variant="ghost" size="sm" data-testid="suggestion-keep" onClick={() => onAction([ghost.id], 'keep')}>{t('Keep this')}</Button><Button variant="ghost" size="sm" data-testid="suggestion-ignore" onClick={() => onAction([ghost.id], 'ignore')}>{t('Ignore')}</Button></div>
            </section>)}
        </div>}
    </div>;
}
