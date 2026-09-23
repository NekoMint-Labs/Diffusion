import { t as msg } from '../../shared/i18n.ts';
import { useEffect, useRef, useState } from 'react';
import type { PlatformAdapter } from '../../platform/contracts.ts';
import type { ProjectRepository } from '../../storage/repository.ts';
import type { ProjectState } from '../../core/model.ts';
import { readRecovery } from '../../storage/recovery.ts';
import { deviceFailureDetail } from '../workspace/notice.ts';
import { Surface } from './Surface.tsx';
import { Button } from '../primitives/Button.tsx';
export function RestoreSurface({ platform, repository, onSwitch, onClose }: {
    platform: PlatformAdapter;
    repository: ProjectRepository;
    onSwitch: (id: string) => Promise<void>;
    onClose: () => void;
}) {
    const [candidate, setCandidate] = useState<ProjectState | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const work = useRef<AbortController | null>(null);
    useEffect(() => () => work.current?.abort(), []);
    const pick = async () => {
        work.current?.abort();
        const request = new AbortController();
        work.current = request;
        setError('');
        setCandidate(null);
        setBusy(true);
        try {
            const files = await platform.pickFiles();
            if (request.signal.aborted)
                return;
            const file = files[0];
            if (!file)
                return;
            if (!file.blob)
                throw new Error(msg('Choose an available Diffusion JSON export.'));
            const parsed = await readRecovery(file.blob, request.signal);
            if (!request.signal.aborted)
                setCandidate(parsed);
        }
        catch (e) {
            if (!request.signal.aborted) {
                // The read path holds its own line, so it may not borrow the workspace notice. The one
                // distinction that changes what a person does next is kept: an export from a version
                // this build cannot read is named as such, and everything else is one honest sentence.
                setError(/schema|version/i.test(e instanceof Error ? e.message : '')
                    ? msg('That export was written by a different version of Diffusion and cannot be read here. No existing Field was changed.')
                    : deviceFailureDetail('restore', e));
            }
        }
        finally {
            if (!request.signal.aborted)
                setBusy(false);
        }
    };
    const restore = async () => {
        if (!candidate)
            return;
        setBusy(true);
        try {
            await repository.saveProject(candidate);
            await onSwitch(candidate.id);
        }
        catch {
            setError(msg('The export could not be completed on this device. No existing Field was changed.'));
        }
        finally {
            setBusy(false);
        }
    };
    return <Surface title={msg("Restore a project export")} subtitle={msg("Create a new project / never overwrite this Field")} onClose={onClose}><p>{msg("Choose a JSON file exported by Diffusion. Sources retain their excerpts and provenance, but original local file bytes and native paths are not restored.")}</p><Button variant="outline" disabled={busy} onClick={() => void pick()}>{msg(busy ? 'Checking the export...' : 'Choose project export')}</Button>{candidate && <section><h3>{candidate.title}</h3><p>{Object.keys(candidate.thoughts).length}{" " + msg("thoughts /") + " "}{Object.keys(candidate.sources).length}{" " + msg("Sources /") + " "}{Object.keys(candidate.threads).length}{" " + msg("Threads")}</p><p className="muted">{msg("The file passed structural checks. It has not been written to your project database yet.")}</p><Button variant="solid" disabled={busy} onClick={() => void restore()}>{msg("Create restored project and enter it")}</Button></section>}{error && <p role="alert">{error}</p>}</Surface>;
}
