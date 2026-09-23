import { t as msg } from '../../shared/i18n.ts';
import { useEffect, useMemo, useState } from 'react';
import type { ProjectState, Point } from '../../core/model.ts';
import type { ProjectRepository } from '../../storage/repository.ts';
import { forkProject, compareWorlds, bringToMain, type ComparisonKind } from '../../core/world.ts';
import { Surface } from './Surface.tsx';
import { Button } from '../primitives/Button.tsx';
import { Checkbox } from '../primitives/Checkbox.tsx';
import { Switch } from '../primitives/Switch.tsx';
import { deviceFailureDetail } from '../workspace/notice.ts';

/** How a disagreement between the two worlds is named. The comparison kind is an internal token
 * (`only-fork`, `main-changed`), and hyphenating it produced English tokens in a Chinese interface.
 * One phrase per kind, only for the kinds this comparison can produce. */
const COMPARISON_LABEL: Record<ComparisonKind, string> = {
    shared: 'Same wording in both',
    'only-main': 'Only in Main',
    'only-fork': 'Only in this Fork',
    'main-changed': 'Changed in Main',
    'fork-changed': 'Changed in this Fork',
    conflict: 'Changed in both, differently',
};

export function ForkSurface({ project, repository, flush, onSwitch, point, onClose }: {
    project: ProjectState;
    repository: ProjectRepository;
    flush: () => Promise<void>;
    onSwitch: (projectId: string) => Promise<void>;
    point: Point;
    onClose: () => void;
}) {
    const [title, setTitle] = useState(msg('Another way to think'));
    const [main, setMain] = useState<ProjectState | null>(null);
    const [worlds, setWorlds] = useState<Awaited<ReturnType<ProjectRepository['listProjects']>>>([]);
    const [chosen, setChosen] = useState<string[]>([]);
    const [shared, setShared] = useState(false);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        let active = true;
        void repository.listProjects().then(w => {
            if (active)
                setWorlds(w);
        }).catch(e => setMessage(deviceFailureDetail('read', e)));
        if (project.fork)
            void repository.loadProject(project.fork.parentId).then(p => {
                if (active)
                    setMain(p);
            }).catch(e => setMessage(deviceFailureDetail('read', e)));
        return () => { active = false; };
    }, [project.id, repository]);
    const comparison = useMemo(() => main && project.fork ? compareWorlds(main, project) : [], [main, project]);
    const create = async () => {
        setBusy(true);
        try {
            try {
                await flush();
            }
            catch {
                // The Field could not be saved, so no fork was copied: keep the save's own sentence
                // rather than reporting the fork as the thing that failed.
                setMessage(msg('Save failed. Export the Field before changing worlds.'));
                return;
            }
            const fork = forkProject(project, title);
            await repository.saveProject(fork);
            await onSwitch(fork.id);
        }
        catch (e) {
            setMessage(deviceFailureDetail('create', e));
        }
        finally {
            setBusy(false);
        }
    };
    const bring = async () => {
        if (!project.fork)
            return;
        setBusy(true);
        try {
            await flush();
            const latest = await repository.loadProject(project.fork.parentId);
            if (!latest) {
                // An already-good specific sentence: Main could not be loaded, so nothing was copied.
                setMessage(msg('Main could not be loaded. Nothing was copied.'));
                return;
            }
            const result = bringToMain(latest, project, chosen, point);
            await repository.saveProject(result.project);
            setMain(result.project);
            setChosen([]);
            setMessage(msg('Brought {count} chosen thoughts to Main as separate wording. Nothing existing was overwritten.', { count: result.count }));
        }
        catch (e) {
            setMessage(deviceFailureDetail('save', e));
        }
        finally {
            setBusy(false);
        }
    };
    const forks = worlds.filter(w => w.parentId === project.id);
    return <Surface title={msg(project.fork ? 'Compare with Main' : 'Try another thought world')} subtitle={msg("An explicit fork / no black-box merge")} level={project.fork ? 'focus' : 'split'} onClose={onClose}>
 {!project.fork ? <><p>{msg("Main stays exactly where it is. A fork copies this moment so you can try a different interpretation.")}</p><form onSubmit={e => { e.preventDefault(); void create(); }}><label>{msg("Fork name")}<input value={title} onChange={e => setTitle(e.target.value)} maxLength={120}/></label><Button variant="solid" tone="attention" type="submit" disabled={busy || !title.trim()}>{msg("Create and enter Fork")}</Button></form><h3>{msg("Your existing forks")}</h3>{!forks.length && <p className="muted">{msg('No forks yet. Create one with the form above.')}</p>}{forks.map(w => <Button variant="ghost" className="find-hit" key={w.id} onClick={() => void onSwitch(w.id).catch(e => setMessage(deviceFailureDetail('read', e)))}>{w.title}</Button>)}</> :
            <><p>{msg("Choose wording to bring back as a separate thought. Main is never automatically overwritten; relations are not merged. Shared means the same wording and kind, not the same position.")}</p><div className="surface-choice"><Button variant="outline" onClick={() => void onSwitch(project.fork!.parentId).catch(e => setMessage(deviceFailureDetail('read', e)))}>{msg("Return to Main")}</Button><Button variant="solid" disabled={busy || !chosen.length || !main} onClick={() => void bring()}>{msg("Bring selected to Main")}</Button><Switch ariaLabel={msg("Show shared (") + comparison.filter(c => c.kind === 'shared').length + ")"} checked={shared} onChange={setShared} label={msg("Show shared (") + comparison.filter(c => c.kind === 'shared').length + ")"}/></div>
 {!main && <p>{msg("Main is unavailable or still loading. No comparison or merge is being guessed.")}</p>}{comparison.filter(c => shared || c.kind !== 'shared').map(c => <section className="fork-comparison" key={c.id}><header><Checkbox disabled={!c.fork || c.kind === 'shared'} checked={chosen.includes(c.id)} onChange={checked => setChosen(v => checked ? [...v, c.id] : v.filter(k => k !== c.id))} label={msg(COMPARISON_LABEL[c.kind])}/></header><div className="fork-columns"><article><small>{msg("Main")}</small><p>{c.main?.text ?? msg('Not present')}</p></article><article><small>{msg("This Fork")}</small><p>{c.fork?.text ?? msg('Not present')}</p></article></div></section>)}</>}
 <p role="status">{message}</p></Surface>;
}
