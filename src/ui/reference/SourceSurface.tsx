import { inspectionMessage } from '../presentation.ts';
import { t as msg } from '../../shared/i18n.ts';
import { classifyFailure, failureText } from '../../ai/errors.ts';
import { deviceFailureDetail } from '../workspace/notice.ts';
import { useEffect, useRef, useState } from 'react';
import type { SourceRecord, Point } from '../../core/model.ts';
import type { ProjectRepository } from '../../storage/repository.ts';
import type { PlatformAdapter } from '../../platform/contracts.ts';
import { Surface } from '../surfaces/Surface.tsx';
import { Button } from '../primitives/Button.tsx';
export function SourceSurface({ source, repository, platform, anchor, onRead, onClose }: {
    source: SourceRecord;
    repository: ProjectRepository;
    platform: PlatformAdapter;
    anchor?: Point;
    onRead?: (signal: AbortSignal) => Promise<void>;
    onClose: () => void;
}) {
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const request = useRef<AbortController | null>(null);
    useEffect(() => { setError(''); setBusy(false); return () => request.current?.abort(); }, [source.id]);
    async function read() {
        if (!onRead) return;
        request.current?.abort(); const abort = new AbortController(); request.current = abort;
        const timer = setTimeout(() => abort.abort('timeout'), 55000);
        setBusy(true); setError('');
        try { await onRead(abort.signal); } catch (cause) { if (!abort.signal.aborted) setError(failureText(classifyFailure(cause), msg('External search'))); else if (abort.signal.reason === 'timeout') setError(msg('Reading timed out. Nothing was marked as read.')); }
        finally { clearTimeout(timer); if (request.current === abort) setBusy(false); }
    }
    const open = async () => {
        setBusy(true);
        setError('');
        try {
            await platform.openOriginal(source, source.originalKey ? await repository.getOriginal(source.originalKey) : undefined);
        }
        catch (e) {
            setError(deviceFailureDetail('original', e));
        }
        finally {
            setBusy(false);
        }
    };
    return <Surface title={source.title} subtitle={`${msg('Source')} / ${msg(source.status)}`} level="anchored" anchor={anchor} onClose={onClose}><h3>{msg("What is available")}</h3><p>{inspectionMessage(source.inspected)}</p>{source.excerpt && <blockquote className="source-excerpt">{source.excerpt.slice(0, 900)}{source.excerpt.length > 900 ? '...' : ''}</blockquote>}<p className="muted">{msg("This is a reference, not a document reader. The model receives only the bounded excerpt explicitly compiled into its scope.")}</p>{source.discoverySnippet && !source.evidence && <details><summary>{msg('Discovery snippet, not read evidence')}</summary><p>{source.discoverySnippet}</p></details>}{source.url && !source.evidence && <p><Button variant="outline" disabled={busy || !onRead} onClick={() => void read()}>{msg('Read source')}</Button>{!onRead && <span className="tiny muted"> {msg('Looking outside this Field is off. Turn it on in Settings to read this source.')}</span>}</p>}{source.evidence?.passages.map(passage => <p className="tiny muted" key={passage.id}>{passage.locator} / {new Date(passage.retrievedAt).toLocaleString()} / {passage.provider}</p>)}<h3>{msg("Provenance")}</h3><p>{source.provenance.url || msg('User-supplied local file')}{source.provenance.locator && ` / ${source.provenance.locator}`}</p>{source.provenance.note && <p>{source.provenance.note}</p>}
 {source.lastSubmitted ? <p className="muted">{msg("Last submitted:") + " "}{source.lastSubmitted.characters}{" " + msg("characters to") + " "}{source.lastSubmitted.provider}, {new Date(source.lastSubmitted.at).toLocaleString()}{msg(". Submission does not prove full-document comprehension.")}</p> : <p className="muted">{msg("No recorded model submission of this source in this project.")}</p>}
  {source.error && <p role="alert">{msg('The content of this source could not be read. The reference itself is unchanged; the inspection note above says what was kept.')}</p>}<Button variant="solid" disabled={busy || (!source.url && !source.originalKey)} onClick={() => void open()}>{msg(source.url ? 'Open original' : platform.platformCapabilities().native ? 'Save original copy' : 'Download original')}</Button>{error && <p role="alert">{error}</p>}
 </Surface>;
}
