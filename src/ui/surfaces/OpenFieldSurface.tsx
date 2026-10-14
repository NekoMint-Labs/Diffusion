import { t as msg } from '../../shared/i18n.ts';
import { useEffect, useState } from 'react';
import type { ProjectRepository } from '../../storage/repository.ts';
import { Surface } from './Surface.tsx';
import { Button } from '../primitives/Button.tsx';
/** Field ownership: the stored Fields on this device. Switching never overwrites the current Field. */
export function OpenFieldSurface({ repository, currentId, onSwitch, onCreate, onDuplicate, onClose }: {
    repository: ProjectRepository;
    currentId: string;
    onSwitch: (id: string) => Promise<void>;
    onCreate: () => Promise<void>;
    onDuplicate: () => Promise<void>;
    onClose: () => void;
}) {
    const [fields, setFields] = useState<{
        id: string;
        title: string;
        parentId?: string;
        updatedAt: number;
    }[] | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    async function run(action: () => Promise<void>) {
        if (busy) return;
        setBusy(true);
        try { await action(); }
        finally { setBusy(false); }
    }
    useEffect(() => {
        let active = true;
        void repository.listProjects().then(list => { if (active)
            setFields(list); }).catch(() => { if (active)
            setError(msg('The stored Fields on this device could not be read.')); });
        return () => { active = false; };
    }, [repository]);
    return <Surface title={msg('Open Field')} subtitle={msg('Stored on this device')} onClose={onClose}>
        <div className="field-management-actions" aria-busy={busy}>
            <Button variant="outline" disabled={busy} onClick={() => void run(onCreate)}>{msg('New Field')}</Button>
            <Button variant="outline" disabled={busy} onClick={() => void run(onDuplicate)}>{msg('Duplicate current Field')}</Button>
        </div>
        {error && <p role="alert">{error}</p>}
        {!fields && !error && <p className="muted">{msg('Reading your Fields...')}</p>}
        {fields && !fields.length && <p className="muted">{msg('No stored Field yet. This is the only one on this device.')}</p>}
        <ul className="field-list">{fields?.map(field => <li key={field.id}>
            {field.id === currentId ? <div className="field-list-current" data-field={field.id} aria-current="true">
                <span>{field.title || msg('Untitled')}</span>
                <small>{msg('Current Field')}</small>
            </div> : <Button variant="ghost" className="field-list-button" data-field={field.id} disabled={busy} onClick={() => void run(() => onSwitch(field.id))}>
                <span>{field.title || msg('Untitled')}</span>
                <small>{new Date(field.updatedAt).toLocaleString()}{field.parentId ? ` \u00b7 ${msg('Fork')}` : ''}</small>
            </Button>}
        </li>)}</ul>
    </Surface>;
}
