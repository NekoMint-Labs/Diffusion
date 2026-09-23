import { inspectionMessage } from '../presentation.ts';
import { t as msg } from '../../shared/i18n.ts';
import { useState, useSyncExternalStore } from 'react';
import type { DiffuseSession } from '../../ai/diffuse.ts';
import type { EvidenceCandidate, ProjectState } from '../../core/model.ts';
import type { ThinkingDirectionCount } from '../commands/thinking.ts';
import { THINKING_DIRECTION_COUNTS, THINKING_DEFAULTS } from '../commands/thinking.ts';
import { Select } from '../primitives/Select.tsx';
import { Button } from '../primitives/Button.tsx';
import { useUI } from '../store.ts';
import { Checkbox } from '../primitives/Checkbox.tsx';
import { SettingRow } from '../primitives/SettingRow.tsx';
import { Surface } from './Surface.tsx';

/** The secondary Run settings surface changes one run only. Ordinary thinking starts immediately
 * from the fixed product defaults; this surface exists only when the person deliberately asks for it. */
export function DiffuseSurface({ session, project, scopeIds, canWeb, onBring, onClose }: {
    session: DiffuseSession;
    project: ProjectState;
    scopeIds: string[];
    canWeb: boolean;
    onBring: (candidate: EvidenceCandidate) => Promise<string | undefined>;
    onClose: () => void;
}) {
    const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
    const activeConfig = state.config;
    const [angles, setAngles] = useState<ThinkingDirectionCount>(() => {
        const value = activeConfig?.steps;
        return THINKING_DIRECTION_COUNTS.includes(value as ThinkingDirectionCount) ? value as ThinkingDirectionCount : THINKING_DEFAULTS.directions;
    });
    const [sources, setSources] = useState(activeConfig?.projectSources ?? THINKING_DEFAULTS.fieldSources);
    const [web, setWeb] = useState((activeConfig?.web ?? THINKING_DEFAULTS.web) && canWeb);
    const [error, setError] = useState('');
    const [added, setAdded] = useState<string[]>([]);
    const operation = useUI(ui => ui.operation);
    const ids = (state.phase === 'running' || state.phase === 'paused' ? state.config?.scopeIds : scopeIds)?.filter(k => !!project.thoughts[k]).slice(0, 24) ?? [];
    const active = state.phase === 'running' || state.phase === 'paused';
    const start = () => {
        try {
            session.start({
                scopeIds: ids,
                prompt: msg('Explore a few different ways to understand this, without settling it for me.'),
                steps: angles,
                seconds: 60,
                projectSources: sources,
                web: web && canWeb,
            });
            onClose();
        }
        catch (e) { setError(msg(e instanceof Error ? e.message : String(e))); }
    };
    const angleLabel = (count: number) => count === 1 ? msg('1 angle') : msg('{count} angles', { count });
    const foundLabel = (count: number) => count === 1 ? msg('Found 1 angle') : msg('Found {count} angles', { count });
    const progress = msg('{used} / {count}', { used: state.used, count: state.config?.steps ?? angles });
    const status = state.phase === 'running'
        ? `${msg('Trying another angle')} · ${progress}`
        : state.phase === 'paused'
            ? `${msg('Paused')} · ${progress}`
            : state.phase === 'complete'
                ? foundLabel(state.used)
                : state.phase === 'stopped'
                    ? msg('Stopped')
                    : '';

    return <Surface title={msg('Run settings')} subtitle={msg('For this run only.')} onClose={onClose}>
      <p>{ids.length === 1 ? msg('1 thought is the starting scope. Changing the selection now does not change this run.') : msg('{count} thoughts are the starting scope. Changing the selection now does not change this run.', { count: ids.length })}</p>
      <div className="thread-scope">{ids.slice(0, 5).map(k => <span key={k}>{project.thoughts[k].text.slice(0, 110)}</span>)}</div>
      {active ? <>
        <p>{status}</p>
        <div className="surface-choice">{state.phase === 'paused' && <Button variant="outline" onClick={() => session.resume()}>{msg('Resume')}</Button>}<Button variant="outline" tone="danger" onClick={() => session.stop()}>{msg('Stop')}</Button></div>
      </> : <form className="settings-form" onSubmit={event => { event.preventDefault(); start(); }}>
        {status && <p>{status}</p>}
        <SettingRow label={msg('Directions')} description={msg('Try one, three, or five different angles.')} setting="diffuse-angles"><Select testId="diffuse-angles" ariaLabel={msg('Directions')} value={String(angles)} onChange={value => setAngles(Number(value) as ThinkingDirectionCount)} options={THINKING_DIRECTION_COUNTS.map(count => ({ value: String(count), label: angleLabel(count) }))}/></SettingRow>
        <Checkbox checked={sources} onChange={setSources} label={msg('Use Field sources')}/>
        <Checkbox checked={web} onChange={setWeb} disabled={!canWeb} label={msg('Use web search')}/>
        <Button variant="solid" tone="attention" type="submit" disabled={!ids.length}>{msg('Run')}</Button>
      </form>}
      {error && <p role="alert">{error}</p>}
      {state.reason && state.phase !== 'complete' && <p className="muted">{msg(state.reason)}</p>}
      {state.evidence.length > 0 && <><h3>{msg('Candidate evidence from this run')}</h3><p className="tiny muted">{msg('Search candidates were not submitted as evidence. Bring a reference back and read it before making a judgment.')}</p>{state.evidence.map(candidate => <article className="evidence-result" key={candidate.id}><h3>{candidate.title}</h3><p>{candidate.excerpt}</p><p className="muted">{inspectionMessage(candidate.inspected)}</p><Button variant="outline" size="sm" disabled={added.includes(candidate.id) || operation?.kind === 'bring' && operation.phase === 'pending'} onClick={() => { void onBring(candidate).then(sourceId => { if (sourceId) setAdded(value => [...value, candidate.id]); }); }}>{msg(operation?.kind === 'bring' && operation.phase === 'pending' && operation.scopeIds.includes(candidate.id) ? 'Bringing...' : added.includes(candidate.id) ? 'Brought to Field' : 'Bring reference to Field')}</Button></article>)}</>}
    </Surface>;
}

export function DiffuseIndicator({ session, onReview }: {
    session: DiffuseSession;
    onReview: () => void;
}) {
    const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
    if (state.phase === 'idle') return null;
    const active = state.phase === 'running' || state.phase === 'paused';
    const count = state.config?.steps ?? 0;
    const foundLabel = (value: number) => value === 1 ? msg('Found 1 angle') : msg('Found {count} angles', { count: value });
    const status = state.phase === 'running'
        ? msg('Trying another angle · {used} / {count}', { used: state.used, count })
        : state.phase === 'paused'
            ? msg('Paused · {used} / {count}', { used: state.used, count })
            : state.phase === 'complete'
                ? foundLabel(state.used)
                : msg('Stopped');
    return <div className="diffuse-indicator" data-surface="true" role="group" aria-label={msg('Thinking activity')}><span>{status}</span><Button variant="ghost" size="sm" onClick={onReview}>{msg('Details')}</Button>{active ? <>{state.phase === 'paused' && <Button variant="ghost" size="sm" onClick={() => session.resume()}>{msg('Resume')}</Button>}<Button variant="ghost" tone="danger" size="sm" onClick={() => session.stop()}>{msg('Stop')}</Button></> : <Button variant="ghost" size="sm" onClick={() => session.clear()}>{msg('Dismiss')}</Button>}</div>;
}
