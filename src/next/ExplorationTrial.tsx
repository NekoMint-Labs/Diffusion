import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { t, setLocale } from '../shared/i18n.ts';
import { useLocale } from '../ui/useLocale.ts';
import { activeBranch, buildTrialContext, restoreNotebook, TRIAL_STORAGE_KEY, type Notebook } from './state.ts';
import { ExplorationSession } from './session.ts';
import { Connection, connectionDecider, defaultConnection } from './Connection.tsx';
import { NotebookView } from './NotebookView.tsx';
import { Sources } from './Sources.tsx';
import './trial.css';

function download(name: string, content: string) {
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function load() {
    let raw = '';
    try { raw = localStorage.getItem(TRIAL_STORAGE_KEY) ?? ''; return { state: restoreNotebook(raw), raw }; }
    catch { return { state: null, raw }; }
}
export default function ExplorationTrial() {
    useLocale();
    const [initial] = useState(load);
    useEffect(() => {
        const locale = new URLSearchParams(location.search).get('locale');
        if (locale === 'zh' || locale === 'en') setLocale(locale);
    }, []);
    if (!initial.state) return <main className="next-trial next-recovery">
        <h1>{t('The trial notebook could not be restored.')}</h1>
        <p>{t('The saved text has not been overwritten. Download it before starting a new trial.')}</p>
        <button type="button" onClick={() => download('diffusion-next-recovery.json', initial.raw)}>{t('Download recovery copy')}</button>
        <a href="/">{t('Return to the Field')}</a>
    </main>;
    return <Trial initial={initial.state} />;
}
const checkpointLabels: Record<string, string> = {
    interrupted: 'Previous work was interrupted. Continue only when you are ready.', changed: 'Your changes are saved. The next step will use the updated brief.',
    paused: 'Paused. Nothing else will be sent.', budget: 'The step limit was reached. You decide whether to continue.',
    repeated: 'The proposed step repeated earlier work. This round has stopped.', requested: 'Choosing the next useful step…',
    explore: 'A tentative idea is ready.', 'assess-source': 'A quotation and provisional assessment are ready.',
    recall: 'Earlier detail is ready for the next step.', 'ask-user': 'Your answer is needed before continuing.', finish: 'This round is complete. Remaining questions are preserved.',
};
function Trial({ initial }: { initial: Notebook }) {
    const session = useMemo(() => new ExplorationSession(initial, state => localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(state))), [initial]);
    const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
    const [connection, setConnection] = useState(defaultConnection);
    const [error, setError] = useState('');
    const running = state.phase === 'running';
    const branch = activeBranch(state);
    const context = buildTrialContext(state);
    useEffect(() => {
        const unload = () => { if (session.getSnapshot().phase === 'running') { try { session.pause(); } catch { /* The pre-request checkpoint is already saved. */ } } };
        window.addEventListener('beforeunload', unload);
        return () => { unload(); session.dispose(); window.removeEventListener('beforeunload', unload); };
    }, [session]);
    const safeEdit = (change: (draft: Notebook) => void) => {
        try { session.edit(change); setError(''); return true; }
        catch { setError(t('This change could not be saved. Export your notebook before leaving.')); return false; }
    };
    const run = (limit: 1 | 3) => { setError(''); void session.run(connectionDecider(connection), limit); };
    return <main className="next-trial" data-testid="next-trial">
        <header className="next-header">
            <div><span className="next-eyebrow">{'DIFFUSION / NEXT'}</span><h1>{t('Keep the question in view.')}</h1><p>{t('Exploration trial · isolated from your Fields')}</p></div>
            <div className="next-header-actions"><button type="button" onClick={() => setLocale(document.documentElement.lang === 'zh-CN' ? 'en' : 'zh')}>{t('Switch language')}</button>
                <button type="button" onClick={() => download('diffusion-next-notebook.json', JSON.stringify({ ...state, phase: running ? 'paused' : state.phase }, null, 2))}>{t('Export notebook')}</button>
                <button type="button" data-testid="next-reset" onClick={() => { session.dispose(); localStorage.removeItem(TRIAL_STORAGE_KEY); location.reload(); }}>{t('Start a new blank trial')}</button>
                <a href="/">{t('Return to the Field')}</a></div>
        </header>
        <div className="next-mode" data-testid="next-mode">{t(connection.selection.provider === 'demo'
            ? 'Demo mode: fixed examples, no model or web requests. Useful for trying the workflow only.'
            : 'Live model mode: only explicit Run actions send requests. Web search is unavailable in this trial.')}</div>
        <div className="next-layout">
            <aside className="next-overview">
                <h2>{t('The shared brief')}</h2>
                <p>{t('These two fields stay in every step. Branch details stay separate until you share a kept discovery.')}</p>
                <label>{t('Overall question')}<textarea data-testid="next-goal" maxLength={4000} value={state.goal} onChange={e => { const text = e.target.value; safeEdit(draft => { draft.goal = text; }); }} /></label>
                <label>{t('What matters most?')}<textarea data-testid="next-priorities" maxLength={2000} value={state.priorities} onChange={e => { const text = e.target.value; safeEdit(draft => { draft.priorities = text; }); }} /></label>
                {!state.goal && <button type="button" onClick={() => safeEdit(draft => {
                    const chinese = document.documentElement.lang === 'zh-CN';
                    draft.goal = chinese ? '我想做一个校园二手交易工具，怎样找到值得做的差异化？' : 'How can a campus second-hand trading tool offer a useful difference?';
                    draft.priorities = chinese ? '优先考虑真实需求和开发成本；把猜想和事实分开。' : 'Prioritize real needs and development cost. Keep hypotheses separate from facts.';
                    const current = activeBranch(draft); current.title = chinese ? '交易信任' : 'Trust'; current.question = chinese ? '交易信任有哪些值得验证的假设？' : 'Which assumptions about transaction trust are worth testing?';
                })}>{t('Try an example')}</button>}
                <section><h2>{t('Shared discoveries')}</h2>
                    {context.overview.shared.length ? context.overview.shared.map(note => <p className="next-shared" key={note.id}><small>{note.branchTitle}{' · '}{t(note.origin === 'demo' ? 'Simulation, not a model finding' : 'Kept for consideration')}</small>{note.text}</p>) : <p>{t('Keep a discovery, then explicitly share it here. Kept does not mean proven.')}</p>}
                </section>
                <Sources state={state} safeEdit={safeEdit} />
                <Connection value={connection} onChange={value => { if (running) { try { session.pause(); } catch { setError(t('This change could not be saved. Export your notebook before leaving.')); } } setConnection(value); }} />
            </aside>
            <div className="next-work">
                <NotebookView state={state} onPause={() => { try { session.pause(); } catch { setError(t('This change could not be saved. Export your notebook before leaving.')); } }} safeEdit={safeEdit} />
                <section className="next-run-bar">
                    <div aria-live="polite" role="status" data-testid="next-status">
                        <strong>{t(running ? 'Working' : state.phase === 'waiting' ? 'Waiting for you' : state.phase === 'failed' ? 'Stopped with an error' : state.phase === 'complete' ? 'Round complete' : 'Ready when you are')}</strong>
                        <p>{state.checkpoint ? t(checkpointLabels[state.checkpoint] ?? '') : t('Fill in the overall question and the current branch question to begin.')}</p>
                    </div>
                    <div className="next-run-actions"><button type="button" data-testid="next-step" disabled={running || !state.goal.trim() || !branch.question.trim() || branch.notes.length >= 80} onClick={() => run(1)}>{t('Take one step')}</button>
                        <button type="button" data-testid="next-run" disabled={running || !state.goal.trim() || !branch.question.trim() || branch.notes.length >= 80} onClick={() => run(3)}>{t('Explore up to 3 steps')}</button></div>
                    <small>{t('Attempts: {count}', { count: state.requests })}</small>
                </section>
                {(error || session.error) && <p role="alert" className="next-error">{error || t(session.error === 'citation' ? 'The quoted passage did not match the selected source. The result was rejected.' : 'The step failed or timed out. Earlier checkpoints are preserved; check your connection and try again.')}</p>}
                {import.meta.env.DEV && <details className="next-context"><summary>{t('Inspect what the next step can see')}</summary><p>{t('The shared brief, this branch, explicitly shared discoveries and selected source texts. Credentials are never included.')}</p><pre data-testid="next-context">{JSON.stringify(context, null, 2)}</pre></details>}
            </div>
        </div>
        <footer>{t('Trial only. Notes stay in this browser under a separate key. Your normal Fields and their database are unchanged. No PR has been submitted.')}</footer>
    </main>;
}
