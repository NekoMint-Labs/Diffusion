import { t } from '../shared/i18n.ts';
import { activeBranch, newId, type Notebook, type TrialNote } from './state.ts';

const actionLabels: Record<TrialNote['action'], string> = {
    user: 'Your input', explore: 'Explore an idea', 'assess-source': 'Assess supplied text',
    recall: 'Revisit earlier detail', 'ask-user': 'A question for you', finish: 'Finish this round',
};
const outcomeLabels = { support: 'Supports', challenge: 'Challenges', partial: 'Partly supports', inconclusive: 'Inconclusive' };
export function NotebookView({ state, onPause, safeEdit }: { state: Notebook; onPause: () => void; safeEdit: (change: (draft: Notebook) => void) => boolean }) {
    const branch = activeBranch(state);
    const updateNote = (note: TrialNote, status: TrialNote['status']) => safeEdit(draft => {
        activeBranch(draft).notes.find(n => n.id === note.id)!.status = status;
        if (status !== 'kept') draft.sharedIds = draft.sharedIds.filter(id => id !== note.id);
        if (status === 'dismissed') activeBranch(draft).recalledIds = activeBranch(draft).recalledIds.filter(id => id !== note.id);
    });
    return <>
        <nav className="next-branches" aria-label={t('Exploration branches')}>
            {state.branches.map(item => <button type="button" key={item.id} aria-pressed={item.id === branch.id} data-testid="next-branch" onClick={() => {
                if (item.id !== branch.id) safeEdit(draft => { draft.activeId = item.id; });
            }}>{item.title}</button>)}
            <button type="button" disabled={state.branches.length >= 12} onClick={() => safeEdit(draft => {
                const id = newId(); draft.branches.push({ id, title: String(draft.branches.length + 1), question: '', questionRevision: 0, notes: [], sourceIds: [], recalledIds: [] }); draft.activeId = id;
            })}>{t('Add branch')}</button>
        </nav>
        <div className="next-branch-heading">
            <label>{t('Branch name')}<input maxLength={120} data-testid="next-branch-name" value={branch.title} onChange={e => { const title = e.target.value; safeEdit(draft => { activeBranch(draft).title = title || ' '; }); }} /></label>
            <label>{t('What should this branch explore?')}<textarea maxLength={2000} data-testid="next-question" value={branch.question} onChange={e => { const question = e.target.value; safeEdit(draft => { activeBranch(draft).question = question; }); }} /></label>
        </div>
        <section className="next-notes" aria-label={t('Branch discoveries')}>
            {!branch.notes.length && <div className="next-empty"><p>{t('Start with a question. Each step will explain why it was chosen.')}</p></div>}
            {branch.notes.map(note => <article key={note.id} className="next-note" data-testid="next-note" data-status={note.status}>
                <div className="next-note-meta"><strong>{t(actionLabels[note.action])}</strong><span>{t(note.origin === 'demo' ? 'Simulation, not a model finding' : note.origin === 'user' ? 'Written by you' : 'AI proposal, review required')}</span></div>
                {(note.briefRevision !== state.briefRevision || note.questionRevision !== branch.questionRevision) && <p className="next-reason">{t('Earlier question or priorities: review before reusing this note.')}</p>}
                {note.reason && <p className="next-reason">{t('Why this step')}{': '}{note.reason}</p>}
                <p>{note.text}</p>
                {note.citation && <div className="next-quotation">
                    <strong>{state.sources.find(s => s.id === note.citation!.sourceId)?.title}</strong>
                    <blockquote>{note.citation.quote}</blockquote>
                    <p>{t(outcomeLabels[note.citation.outcome])}{' · '}{t('Quotation matched; the assessment still needs review.')}</p>
                </div>}
                {note.status === 'dismissed' ? <span>{t('Dismissed')}</span> : <div className="next-note-actions">
                    {note.status === 'proposed' && <button type="button" onClick={() => updateNote(note, 'kept')}>{t('Keep this discovery')}</button>}
                    {note.status === 'kept' && <>
                        <span>{t('Kept for consideration')}</span>
                        <button type="button" disabled={!state.sharedIds.includes(note.id) && state.sharedIds.length >= 8} onClick={() => safeEdit(draft => {
                            draft.sharedIds = draft.sharedIds.includes(note.id) ? draft.sharedIds.filter(id => id !== note.id) : [...draft.sharedIds, note.id];
                        })}>{t(state.sharedIds.includes(note.id) ? 'Remove from overview' : 'Share with other branches')}</button>
                    </>}
                    <button type="button" onClick={() => updateNote(note, 'dismissed')}>{t('Ignore this discovery')}</button>
                </div>}
            </article>)}
        </section>
        <form className="next-response" onSubmit={e => {
            e.preventDefault();
            const form = e.currentTarget;
            const text = String(new FormData(form).get('response') ?? '').trim();
            if (!text || branch.notes.length >= 80) return;
            if (safeEdit(draft => { const current = activeBranch(draft); current.notes.push({ id: newId(), action: 'user', reason: '', text, status: 'kept', origin: 'user', at: Date.now(), briefRevision: draft.briefRevision, questionRevision: current.questionRevision }); })) form.reset();
        }}>
            <label>{t('Add a correction or answer')}<textarea name="response" maxLength={1600} required data-testid="next-response" /></label>
            <button type="submit" disabled={branch.notes.length >= 80}>{t('Add to this branch')}</button>
        </form>
        <button type="button" className="next-stop" disabled={state.phase !== 'running'} onClick={onPause}>{t('Pause now')}</button>
    </>;
}
