import { useState, type Ref } from 'react';
import type { Thought } from '../../core/model.ts';
import { t } from '../../shared/i18n.ts';
import { Button } from '../primitives/Button.tsx';

/** Dense viewports retain root anchors; this bounded list makes every suppressed root readable. */
export function RootReview({ elementRef, roots, onReveal }: { elementRef: Ref<HTMLDivElement>; roots: Thought[]; onReveal: (id: string) => void }) {
    const [open, setOpen] = useState(false), [query, setQuery] = useState('');
    const matches = roots.filter(item => item.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    return <div ref={elementRef} className="suggestion-review root-review" data-surface="true" onPointerDown={event => event.stopPropagation()} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') setOpen(false); }}>
        <Button variant="ghost" size="sm" data-testid="root-review-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>{t('{count} thoughts shown as anchors', { count: roots.length })}</Button>
        {open && <><input aria-label={t('Find anchored thoughts')} placeholder={t('Find anchored thoughts')} value={query} onChange={event => setQuery(event.target.value)} /><div className="suggestion-review-list">
            {matches.slice(0, 30).map(item => <section key={item.id}><Button variant="ghost" onClick={() => { onReveal(item.id); setOpen(false); }}>{item.text || t('New thought')}</Button></section>)}
            {matches.length > 30 && <p>{t('Type to narrow these thoughts.')}</p>}
        </div></>}
    </div>;
}
