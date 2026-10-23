import { t } from '../shared/i18n.ts';
import { activeBranch, newId, type Notebook } from './state.ts';

export function Sources({ state, safeEdit }: { state: Notebook; safeEdit: (change: (draft: Notebook) => void) => boolean }) {
    const branch = activeBranch(state);
    return <section className="next-sources">
        <h2>{t('Source texts')}</h2>
        <p>{t('Paste text you want this branch to inspect. No web search or page fetch occurs in this version. Select up to three texts per branch.')}</p>
        {state.sources.map(source => <label className="next-source-choice" key={source.id}>
            <input type="checkbox" checked={branch.sourceIds.includes(source.id)} disabled={!branch.sourceIds.includes(source.id) && branch.sourceIds.length >= 3}
                onChange={e => { const selected = e.target.checked; safeEdit(draft => {
                    const current = activeBranch(draft); current.sourceIds = selected ? [...current.sourceIds, source.id] : current.sourceIds.filter(id => id !== source.id);
                }); }} />
            <span>{source.title}<small>{t('User-supplied text, not independently verified')}</small></span>
        </label>)}
        <details>
            <summary>{t('Add source text')}</summary>
            <form onSubmit={e => {
                e.preventDefault(); const form = e.currentTarget; const data = new FormData(form);
                const title = String(data.get('title') ?? '').trim(), body = String(data.get('body') ?? '').trim();
                if (!title || body.length < 12 || state.sources.length >= 12) return;
                if (safeEdit(draft => { const id = newId(); draft.sources.push({ id, title, body }); const current = activeBranch(draft); if (current.sourceIds.length < 3) current.sourceIds.push(id); })) form.reset();
            }}>
                <label>{t('Source name')}<input name="title" maxLength={200} required /></label>
                <label>{t('Original passage, 12–6000 characters')}<textarea name="body" minLength={12} maxLength={6000} required /></label>
                <button type="submit" disabled={state.sources.length >= 12}>{t('Add source')}</button>
            </form>
        </details>
    </section>;
}
