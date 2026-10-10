import { useEffect, useRef, useState, type Ref } from 'react';
import type { Thought } from '../../core/model.ts';
import { t } from '../../shared/i18n.ts';
import { isComposing } from '../commands/shortcuts.ts';
import { Button } from '../primitives/Button.tsx';

/** Opening the dock changes culling bounds. Keep that review's IDs until close, so its own
 * layout cannot remove its candidates. Read live canonical wording and discard deleted IDs. */
export function RootReview({ elementRef, roots, thoughts, onReveal }: { elementRef: Ref<HTMLDivElement>; roots: Thought[]; thoughts: Record<string, Thought>; onReveal: (id: string) => void }) {
    const [reviewIds, setReviewIds] = useState<string[] | null>(null), [query, setQuery] = useState('');
    const input = useRef<HTMLInputElement>(null), toggle = useRef<HTMLButtonElement>(null);
    const open = reviewIds !== null;
    useEffect(() => { if (open) input.current?.focus({ preventScroll: true }); }, [open]);
    const reviewRoots = reviewIds ? reviewIds.map(id => thoughts[id]).filter(Boolean) : roots;
    const matches = reviewRoots.filter(item => item.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    if (!roots.length && !open) return null;
    return <div ref={elementRef} className="suggestion-review root-review" data-surface="true" onPointerDown={event => event.stopPropagation()} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape' && !isComposing(event.nativeEvent)) { event.preventDefault(); const owner = roots.length ? toggle.current : toggle.current?.closest<HTMLElement>('.field'); setReviewIds(null); owner?.focus({ preventScroll: true }); } }}>
        <Button ref={toggle} variant="ghost" size="sm" className="review-toggle" data-testid="root-review-toggle" aria-expanded={open} onClick={() => { setQuery(''); setReviewIds(open ? null : roots.map(item => item.id)); }}>{t('Locate {count} overview thoughts…', { count: reviewRoots.length })}</Button>
        {open && <><p className="root-review-hint">{t('Choose a thought to reveal its location. Zoom stays the same.')}</p><input ref={input} aria-label={t('Find anchored thoughts')} placeholder={t('Find anchored thoughts')} value={query} onChange={event => setQuery(event.target.value)} /><div className="suggestion-review-list">
            {matches.slice(0, 30).map(item => <section key={item.id}><Button variant="ghost" onClick={() => { setReviewIds(null); onReveal(item.id); }}>{item.text || t('New thought')}</Button></section>)}
            {!matches.length && <p role="status">{t('No overview thoughts match. Try a shorter phrase.')}</p>}
            {matches.length > 30 && <p>{t('Type to narrow these thoughts.')}</p>}
        </div></>}
    </div>;
}
