import { t as msg } from '../../shared/i18n.ts';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIsPresent } from 'motion/react';
import type { ProjectRepository } from '../../storage/repository.ts';
import { Surface } from './Surface.tsx';
import { Button } from '../primitives/Button.tsx';
/** Field ownership: the stored Fields on this device. Switching never overwrites the current Field. */
export function OpenFieldSurface({ repository, currentId, onSwitch, onCreate, onDuplicate, onDelete, onClose }: {
    repository: ProjectRepository;
    currentId: string;
    onSwitch: (id: string) => Promise<void>;
    onCreate: () => Promise<void>;
    onDuplicate: () => Promise<void>;
    onDelete: (id: string) => Promise<boolean>;
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
    const running = useRef(false);
    const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
    const cancel = useRef<HTMLButtonElement>(null);
    const create = useRef<HTMLButtonElement>(null);
    const deleteTrigger = useRef<string | null>(null);
    const deleteButtons = useRef(new Map<string, HTMLButtonElement>());
    const present = useIsPresent();
    useLayoutEffect(() => {
        // AnimatePresence may revive this same instance before exit finishes. A dismissed
        // confirmation must not reappear as an armed delete when the list is reopened.
        if (!present) { setDeleting(null); setError(''); deleteTrigger.current = null; return; }
        if (deleting) cancel.current?.focus();
        else if (deleteTrigger.current) {
            (deleteButtons.current.get(deleteTrigger.current) ?? create.current)?.focus();
            deleteTrigger.current = null;
        }
    }, [deleting, present]);
    async function run(action: () => Promise<void>) {
        if (running.current) return;
        running.current = true;
        setBusy(true);
        try { await action(); }
        finally { running.current = false; setBusy(false); }
    }
    useEffect(() => {
        let active = true;
        void repository.listProjects().then(list => { if (active)
            setFields(list); }).catch(() => { if (active)
            setError(msg('The stored Fields on this device could not be read.')); });
        return () => { active = false; };
    }, [repository]);
    return <Surface title={msg('Open Field')} subtitle={msg('Stored on this device')} onClose={onClose}>
        {deleting ? <section className="field-delete-confirmation" data-testid="field-delete-confirmation" aria-busy={busy} aria-labelledby="field-delete-heading">
            <h3 id="field-delete-heading">{msg('Delete “{title}”?', { title: deleting.title || msg('Untitled') })}</h3>
            <p>{msg('This permanently deletes this Field and its saved content from this device. This cannot be undone. Export it first if you want a backup.')}</p>
            <p className="muted">{msg('Other Fields and their shared references stay intact. Forks will no longer be able to return to this Field.')}</p>
            {deleting.id === currentId && <p className="muted">{msg('You will enter another Field first, or a new empty Field if this is the last one.')}</p>}
            {error && <p role="alert">{error}</p>}
            <div className="field-management-actions">
                <Button ref={cancel} variant="outline" disabled={busy} onClick={() => { setDeleting(null); setError(''); }}>{msg('Cancel')}</Button>
                <Button variant="solid" tone="danger" disabled={busy} onClick={() => void run(async () => {
                    setError('');
                    if (await onDelete(deleting.id)) {
                        setFields(list => list?.filter(field => field.id !== deleting.id) ?? null);
                        setDeleting(null);
                    } else setError(msg('The Field could not be deleted. It is still stored on this device; try again.'));
                })}>{msg('Delete Field')}</Button>
            </div>
        </section> : <>
        <div className="field-management-actions" aria-busy={busy}>
            <Button ref={create} variant="outline" disabled={busy} onClick={() => void run(onCreate)}>{msg('New Field')}</Button>
            <Button variant="outline" disabled={busy} onClick={() => void run(onDuplicate)}>{msg('Duplicate current Field')}</Button>
        </div>
        {error && <p role="alert">{error}</p>}
        {!fields && !error && <p className="muted">{msg('Reading your Fields...')}</p>}
        {fields && !fields.length && <p className="muted">{msg('No stored Field yet. This is the only one on this device.')}</p>}
        <ul className="field-list">{fields?.map(field => <li key={field.id}><div className="field-list-row">
            {field.id === currentId ? <div className="field-list-current" data-field={field.id} aria-current="true">
                <span>{field.title || msg('Untitled')}</span>
                <small>{msg('Current Field')}</small>
            </div> : <Button variant="ghost" className="field-list-button" data-field={field.id} disabled={busy} onClick={() => void run(() => onSwitch(field.id))}>
                <span>{field.title || msg('Untitled')}</span>
                <small>{new Date(field.updatedAt).toLocaleString()}{field.parentId ? ` \u00b7 ${msg('Fork')}` : ''}</small>
            </Button>}
            <Button ref={element => { if (element) deleteButtons.current.set(field.id, element); else deleteButtons.current.delete(field.id); }} className="field-delete-button" tone="danger" disabled={busy} data-delete-field={field.id} aria-label={msg('Delete Field: {title}', { title: field.title || msg('Untitled') })} onClick={() => {
                deleteTrigger.current = field.id;
                setError('');
                setDeleting(field);
            }}>{msg('Delete')}</Button>
        </div></li>)}</ul>
        </>}
    </Surface>;
}
