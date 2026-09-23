import { t as msg } from '../../shared/i18n.ts';
import { useEffect, useState } from 'react';
import type { ProjectRepository } from '../../storage/repository.ts';
import { Surface } from './Surface.tsx';
import { Button } from '../primitives/Button.tsx';
/** Field ownership: the stored Fields on this device. Switching never overwrites the current Field. */
export function OpenFieldSurface({ repository, currentId, onSwitch, onCreate, onClose }: {
    repository: ProjectRepository;
    currentId: string;
    onSwitch: (id: string) => Promise<void>;
    /** Where a person starts when this device has no stored Field at all. */
    onCreate: () => void;
    onClose: () => void;
}) {
    const [fields, setFields] = useState<{
        id: string;
        title: string;
        parentId?: string;
        updatedAt: number;
    }[] | null>(null);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        void repository.listProjects().then(list => { if (active)
            setFields(list); }).catch(() => { if (active)
            setError(msg('The stored Fields on this device could not be read.')); });
        return () => { active = false; };
    }, [repository]);
    return <Surface title={msg('Open Field')} subtitle={msg('Stored on this device')} onClose={onClose}>
        {error && <p role="alert">{error}</p>}
        {!fields && !error && <p className="muted">{msg('Reading your Fields...')}</p>}
        {fields && !fields.length && <div><p className="muted">{msg('No stored Field yet. This is the only one on this device.')}</p><Button variant="solid" onClick={onCreate}>{msg('Create an empty Field')}</Button></div>}
        <ul className="field-list">{fields?.map(field => <li key={field.id}>
            <Button variant="ghost" className="field-list-button" data-field={field.id} disabled={field.id === currentId} onClick={() => void onSwitch(field.id)}>
                <span>{field.title || msg('Untitled')}</span>
                <small>{new Date(field.updatedAt).toLocaleString()}{field.parentId ? ` \u00b7 ${msg('Fork')}` : ''}</small>
            </Button>
        </li>)}</ul>
    </Surface>;
}
