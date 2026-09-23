import { inspectionMessage } from '../presentation.ts';
import { useEffect, useRef, useState } from 'react';
import { id, type EvidenceCandidate } from '../../core/model.ts';
import type { WebEvidenceProvider } from '../../evidence/contracts.ts';
import { discoveryCandidate, hasReadPassages, readCandidate, reasonCandidate } from '../../evidence/pipeline.ts';
import { t } from '../../shared/i18n.ts';
import { classifyFailure, failureRemedy, failureText, type FailureRemedy } from '../../ai/errors.ts';
import { Surface } from '../surfaces/Surface.tsx';
import { Button } from '../primitives/Button.tsx';
import { useUI } from '../store.ts';
import { registerOperationCancellation } from '../../ai/operationControl.ts';
/** A failure inside this surface, in the product's own vocabulary, with the control that resolves
 * it when one exists.
 *
 * The raw thrown value is never rendered. `ThinkingError.message` is the failure *code*
 * (`discovery-unavailable`, `reader-unavailable`) and no dictionary key exists for it, so the
 * surface used to print the internal token verbatim — implementation vocabulary at the exact
 * moment a person needed the next action instead. */
function failure(subject: string, cause: unknown): { text: string; remedy: FailureRemedy } {
    const kind = classifyFailure(cause);
    return { text: failureText(kind, subject), remedy: failureRemedy(kind) };
}
export function EvidenceSurface({ provider, initial, scopeIds, onBring, onOpen, onConfigure, onClose }: {
    provider: WebEvidenceProvider | null; initial: string; scopeIds: string[]; onBring: (candidate: EvidenceCandidate, existingSourceId?: string) => Promise<string | undefined>; onOpen: (url: string) => void;
    /** Where the person goes when nothing here can answer yet. */
    onConfigure: () => void;
    onClose: () => void;
}) {
    const [query, setQuery] = useState(initial);
    const [claim, setClaim] = useState('');
    const [results, setResults] = useState<EvidenceCandidate[]>([]);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<{ text: string; remedy: FailureRemedy } | null>(null);
    const [added, setAdded] = useState<Record<string, { sourceId: string; stage: string }>>({});
    const operation = useUI(state => state.operation);
    const pending = useRef<AbortController | null>(null);
    useEffect(() => () => pending.current?.abort(), []);
    async function perform(stage: 'search' | 'read' | 'reason', candidate?: EvidenceCandidate) {
        if (!provider || !query.trim()) return;
        pending.current?.abort();
        const abort = new AbortController(); pending.current = abort;
        const timeout = setTimeout(() => abort.abort('timeout'), 65000);
        const spatialOperation = { id: id('request'), kind: 'verify' as const, phase: 'pending' as const, scopeIds: [...scopeIds], activity: 'anchor' as const };
        const unregisterCancel = registerOperationCancellation(spatialOperation.id, () => abort.abort());
        useUI.getState().patch({ operation: spatialOperation, busy: true });
        let terminal: 'completed' | 'failed' | 'cancelled' = 'completed';
        setBusy(stage === 'search' ? 'search' : candidate!.id); setError(null);
        try {
            if (stage === 'search') {
                const values = await provider.search(query.slice(0, 3000), { limit: 5, signal: abort.signal });
                if (abort.signal.aborted) { terminal = 'cancelled'; return; }
                setClaim(query.trim()); setResults(values.map(discoveryCandidate)); setAdded({});
            } else {
                const updated = stage === 'read' ? await readCandidate(provider, candidate!, claim, abort.signal) : await reasonCandidate(provider, candidate!, claim, abort.signal);
                if (abort.signal.aborted) { terminal = 'cancelled'; return; }
                setResults(values => values.map(value => value.id === updated.id ? updated : value));
            }
        } catch (cause) { terminal = abort.signal.aborted ? 'cancelled' : 'failed'; if (!abort.signal.aborted) setError(failure(t('External search'), cause)); else if (abort.signal.reason === 'timeout') setError({ text: t('The evidence request timed out. No judgment was made.'), remedy: 'none' });  }
        finally {
            clearTimeout(timeout);
            unregisterCancel();
            if (pending.current === abort) { pending.current = null; setBusy(null); }
            if (useUI.getState().operation?.id === spatialOperation.id) useUI.getState().patch({ operation: { ...spatialOperation, phase: terminal }, busy: false });
        }
    }
    return <Surface title={t('Look for evidence')} subtitle={t('An explicit outside check / not a verdict')} onClose={onClose}>
        <p>{t('Search finds candidates. Read a source before assessing it against the current claim.')}</p>
        {!provider && <p className="warning">{t('Looking outside this Field is off. Turn it on in Settings to search.')} <Button variant="outline" size="sm" data-testid="configure-search" onClick={onConfigure}>{t('Configure search')}</Button></p>}
        <form onSubmit={event => { event.preventDefault(); void perform('search'); }}><label htmlFor="evidence-query">{t('What should be checked?')}</label><input id="evidence-query" value={query} maxLength={3000} onChange={event => setQuery(event.target.value)}/><Button variant="solid" tone="attention" type="submit" disabled={!provider || !!busy || !query.trim()}>{t('Search the web')}</Button>{busy && <Button variant="ghost" type="button" onClick={() => pending.current?.abort()}>{t('Stop')}</Button>}</form>
        {error && <p role="alert">{error.text}{error.remedy === 'search-settings' && <Button variant="outline" size="sm" data-testid="configure-search" onClick={onConfigure}>{t('Configure search')}</Button>}</p>}{claim && <p className="tiny muted">{t('Checking:')} {claim}</p>}
        {!busy && !results.length && <p className="muted">{t('No evidence candidates to show.')}</p>}
        {results.map(candidate => <article key={candidate.id} className="evidence-result" data-evidence-stage={candidate.stage ?? 'candidate'}>
            <h3>{candidate.title}</h3><p className="tiny muted">{candidate.url}</p>
            {!hasReadPassages(candidate) && <><p className="tiny">{t('Discovery snippet, not read evidence')}</p><p>{candidate.excerpt}</p></>}
            {candidate.passages?.map(passage => <section key={passage.id}><blockquote className="source-excerpt">{passage.text}</blockquote><p className="tiny muted">{passage.locator} / {new Date(passage.retrievedAt).toLocaleString()} / {passage.provider}</p></section>)}
            <p className="tiny muted">{inspectionMessage(candidate.inspected)}</p>
            {candidate.judgment && <section className="evidence-judgment"><h3>{t(candidate.judgment.outcome)}</h3><p className="tiny muted">{candidate.judgment.claim}</p><p>{candidate.judgment.rationale}</p></section>}
            <div className="surface-choice">
                {!hasReadPassages(candidate) ? <Button variant="outline" size="sm" disabled={!!busy} onClick={() => void perform('read', candidate)}>{t('Read source')}</Button> : !candidate.judgment && <Button variant="outline" size="sm" disabled={!!busy || !provider?.reason} onClick={() => void perform('reason', candidate)}>{t('Assess against claim')}</Button>}
                <Button variant="solid" size="sm" disabled={added[candidate.id]?.stage === (candidate.stage || 'candidate') || !!busy || operation?.kind === 'bring' && operation.phase === 'pending'} onClick={() => { void onBring(candidate, added[candidate.id]?.sourceId).then(sourceId => { if (sourceId) setAdded(values => ({ ...values, [candidate.id]: { sourceId, stage: candidate.stage || 'candidate' } })); }); }}>{t(operation?.kind === 'bring' && operation.phase === 'pending' && operation.scopeIds.includes(candidate.id) ? 'Bringing...' : added[candidate.id]?.stage === (candidate.stage || 'candidate') ? 'Brought to Field' : added[candidate.id] ? 'Update Field reference' : hasReadPassages(candidate) ? 'Bring read passages' : 'Keep candidate only')}</Button>
                <Button variant="ghost" size="sm" onClick={() => onOpen(candidate.url)}>{t('Open original')}</Button>
            </div>
        </article>)}
    </Surface>;
}
