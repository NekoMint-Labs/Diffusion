import { useEffect, useRef, useState } from 'react';
import type { Thought } from '../../core/model.ts';
import { t } from '../../shared/i18n.ts';
import { isComposing } from '../commands/shortcuts.ts';
import { Button } from '../primitives/Button.tsx';

/** Keep the explicit reading session's IDs across camera/culling changes.
 * Read live canonical wording and discard deleted IDs. */
export function RootReview({ roots, thoughts, onReveal, open, onOpenChange }: { roots: Thought[]; thoughts: Record<string, Thought>; onReveal: (id: string) => void; open: boolean; onOpenChange: (open: boolean) => void }) {
    const [reviewIds, setReviewIds] = useState<string[] | null>(null), [query, setQuery] = useState('');
    const input = useRef<HTMLInputElement>(null), toggle = useRef<HTMLButtonElement>(null);
    useEffect(() => { if (open) input.current?.focus({ preventScroll: true }); else { setReviewIds(null); setQuery(''); } }, [open]);
    const reviewRoots = reviewIds ? reviewIds.map(id => thoughts[id]).filter(Boolean) : roots;
    const matches = reviewRoots.filter(item => item.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    if (!roots.length && !open) return null;
    const close = () => { onOpenChange(false); (roots.length ? toggle.current : toggle.current?.closest<HTMLElement>('.field'))?.focus({ preventScroll: true }); };
    return <div className="suggestion-review root-review" data-surface="true" onPointerDown={event => event.stopPropagation()} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape' && !isComposing(event.nativeEvent)) { event.preventDefault(); close(); } }}>
        <Button ref={toggle} variant="ghost" size="sm" className="review-toggle" data-testid="root-review-toggle" aria-expanded={open} aria-label={t('Locate {count} overview thoughts…', { count: reviewRoots.length })} onClick={() => { if (open) close(); else { setQuery(''); setReviewIds(roots.map(item => item.id)); onOpenChange(true); } }}>{t('Overview')}</Button>
        {open && <div className="field-review-panel" data-testid="root-review-panel" role="region" aria-label={t('Overview')}><header><strong>{t('Overview')}</strong><Button variant="ghost" size="sm" onClick={close}>{t('Close')}</Button></header><p className="root-review-hint">{t('Choose a thought to reveal its location. Zoom stays the same.')}</p><input ref={input} aria-label={t('Find anchored thoughts')} placeholder={t('Find anchored thoughts')} value={query} onKeyDown={event => { if (event.key === 'Enter' && !isComposing(event.nativeEvent) && matches.length) { event.preventDefault(); onOpenChange(false); onReveal(matches[0].id); } }} onChange={event => setQuery(event.target.value)} /><div className="suggestion-review-list">
            {matches.slice(0, 30).map(item => <section key={item.id}><Button variant="ghost" onClick={() => { onOpenChange(false); onReveal(item.id); }}>{item.text || t('New thought')}</Button></section>)}
            {!matches.length && <p role="status">{t('No overview thoughts match. Try a shorter phrase.')}</p>}
            {matches.length > 30 && <p>{t('Type to narrow these thoughts.')}</p>}
        </div></div>}
    </div>;
}
