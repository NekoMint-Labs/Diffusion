import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { manualLink, type LinkPort } from '../../core/manualLinks.ts';
import type { Camera, Point, Relation } from '../../core/model.ts';
import type { ProjectController } from '../../core/controller.ts';
import { useProject } from '../../ui/hooks.ts';
import { useUI } from '../../ui/store.ts';
import { t } from '../../shared/i18n.ts';
import { report } from '../../ui/workspace/feedback.ts';
import { Surface } from '../../ui/surfaces/Surface.tsx';
import { Button } from '../../ui/primitives/Button.tsx';
import type { GeometryCache } from '../spatial/index.ts';
import { linkPath, linkPoint } from './geometry.ts';
import './freeLinks.css';

interface Props {
    controller: ProjectController;
    geometry: GeometryCache;
    world: HTMLElement | null;
    viewport: RefObject<HTMLDivElement | null>;
    camera: () => Camera;
    visible: string[];
    local: boolean;
    reveal: (ids: string[]) => void;
}
type Pending = { kind: 'new'; from: string; port: LinkPort } | { kind: 'change'; id: string; end: 'a' | 'b' };

/** An explicit user gesture submits one Core command. Pointer frames only paint the preview. */
export function FreeLinks({ controller, geometry, world, viewport, camera, visible, local, reveal }: Props) {
    const { project } = useProject(controller);
    const ui = useUI();
    const [selected, setSelected] = useState<string | null>(null);
    const [pending, setPending] = useState<Pending | null>(null);
    const [error, setError] = useState('');
    const preview = useRef<SVGPathElement>(null);
    const active = useRef<Pending | null>(null);
    const dragged = useRef(false);
    const previewFrame = useRef<number | null>(null);
    const latestPoint = useRef<Point | null>(null);
    const panel = useRef<HTMLDivElement>(null);
    const live = useRef({ project, camera }); live.current = { project, camera };
    const links = Object.values(project.relations).filter(r => r.manual);
    const opposite = (relation: Relation) => links.filter(r => r.id !== relation.id && r.a === relation.b && r.b === relation.a);
    const keepDirection = (relation: Relation) => {
        cancel();
        controller.batch(() => { for (const other of opposite(relation)) controller.dispatch({ type: 'relation.remove', id: other.id }); });
        setSelected(relation.id);
    };
    const chosen = links.find(r => r.id === selected);
    const enabled = ui.surface === 'none' || ui.surface === 'links';
    const editable = enabled && !ui.editing && !ui.menu;
    const cancel = () => {
        active.current = null; dragged.current = false; setPending(null);
        if (preview.current) preview.current.style.display = 'none';
    };
    const announce = (message: string) => report(t(message));
    const commit = (operation: Pending, target: string, side: LinkPort) => {
        const current = controller.getSnapshot().project;
        try {
            let relation: Relation;
            if (operation.kind === 'new') relation = manualLink(current, operation.from, target, { aPort: operation.port, bPort: side });
            else {
                const old = current.relations[operation.id];
                if (!old?.manual) { cancel(); return; }
                relation = manualLink(current, operation.end === 'a' ? target : old.a, operation.end === 'b' ? target : old.b,
                    { ...old.manual, [operation.end === 'a' ? 'aPort' : 'bPort']: side }, old.id);
            }
            controller.dispatch({ type: 'relation.confirm', relation });
            setSelected(relation.id);
            setError('');
            useUI.getState().patch({ selection: [] });
            announce('Connection saved. Undo is available.');
            cancel();
        } catch (error) {
            const message = t(error instanceof Error ? error.message : 'Connection could not be saved.');
            setError(message); report(message, 'error'); cancel();
        }
    };
    const choose = (relation: Relation) => {
        cancel(); setSelected(relation.id);
        useUI.getState().patch({ surface: 'links', returnPoint: null, selection: [], editing: null });
    };
    const begin = (operation: Pending) => { setError(''); active.current = operation; setPending(operation); };
    useEffect(() => { if (!editable) cancel(); }, [editable]);
    useEffect(() => { cancel(); setSelected(null); }, [project.id]);
    useLayoutEffect(() => { if (ui.surface === 'links') panel.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }); }, [ui.surface]);
    useEffect(() => {
        const host = viewport.current;
        if (!host) return;
        const targetAt = (event: PointerEvent) => {
            const el = document.elementFromPoint(event.clientX, event.clientY);
            const port = el?.closest<HTMLElement>('[data-free-link-port]');
            const key = port?.dataset.freeLinkId ?? el?.closest<HTMLElement>('[data-thought-id]')?.dataset.thoughtId;
            const thought = key && controller.getSnapshot().project.thoughts[key];
            if (!thought) return null;
            const bounds = geometry.get(key!);
            const rect = host.getBoundingClientRect(), cam = live.current.camera();
            const x = (event.clientX - rect.left - cam.x) / cam.zoom;
            return { key: key!, side: (port?.dataset.freeLinkPort ?? (bounds && x > bounds.x + bounds.width / 2 ? 'right' : 'left')) as LinkPort };
        };
        const down = (event: PointerEvent) => {
            if (!active.current || dragged.current || event.button !== 0 || (event.target as Element).closest('[data-surface],.free-link-manager')) return;
            const target = targetAt(event);
            if (!target) return;
            event.preventDefault(); event.stopPropagation(); commit(active.current, target.key, target.side);
        };
        const move = (event: PointerEvent) => {
            if (!active.current) return;
            const r = host.getBoundingClientRect(), cam = live.current.camera();
            latestPoint.current = { x: (event.clientX - r.left - cam.x) / cam.zoom, y: (event.clientY - r.top - cam.y) / cam.zoom };
            if (previewFrame.current !== null) return;
            previewFrame.current = requestAnimationFrame(() => {
                previewFrame.current = null;
                const operation = active.current, point = latestPoint.current, element = preview.current;
                if (!operation || !point || !element) return;
                const old = operation.kind === 'change' ? controller.getSnapshot().project.relations[operation.id] : null;
                const key = operation.kind === 'new' ? operation.from : old ? old[operation.end === 'a' ? 'b' : 'a'] : '';
                const side = operation.kind === 'new' ? operation.port : old?.manual?.[operation.end === 'a' ? 'bPort' : 'aPort'];
                const box = geometry.get(key);
                if (!box || !side) return;
                const fixed = linkPoint(box, side);
                element.setAttribute('d', operation.kind === 'change' && operation.end === 'a'
                    ? linkPath(point, fixed, { aPort: 'right', bPort: side })
                    : linkPath(fixed, point, { aPort: side, bPort: 'left' }));
                element.style.display = 'block';
            });
        };
        const up = (event: PointerEvent) => {
            if (!active.current || !dragged.current) return;
            const target = targetAt(event), operation = active.current;
            if (target) commit(operation, target.key, target.side); else cancel();
        };
        const key = (event: KeyboardEvent) => {
            if (event.isComposing || event.keyCode === 229 || (event.target as Element)?.closest('input,textarea,[contenteditable="true"]')) return;
            if (event.key === 'Escape' && active.current) { event.preventDefault(); event.stopImmediatePropagation(); cancel(); }
        };
        host.addEventListener('pointerdown', down, true);
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
        window.addEventListener('keydown', key, true); window.addEventListener('blur', cancel); window.addEventListener('pointercancel', cancel);
        return () => {
            host.removeEventListener('pointerdown', down, true); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
            window.removeEventListener('keydown', key, true); window.removeEventListener('blur', cancel); window.removeEventListener('pointercancel', cancel);
            if (previewFrame.current !== null) cancelAnimationFrame(previewFrame.current);
        };
    }, [controller, geometry, viewport]);
    const remove = (id: string) => { cancel(); controller.dispatch({ type: 'relation.remove', id }); if (selected === id) setSelected(null); announce('Connection deleted. Undo is available.'); };
    const changeEnd = (relation: Relation, end: 'a' | 'b') => { choose(relation); begin({ kind: 'change', id: relation.id, end }); };
    const ports = local && editable ? visible.flatMap(key => {
        if (!project.thoughts[key] || ui.carry.includes(key)) return [];
        const box = geometry.get(key); if (!box) return [];
        return (['left', 'right'] as const).map(side => {
            const point = linkPoint(box, side);
            return <button type="button" key={`${key}-${side}`} data-free-link-id={key} data-free-link-port={side} className="free-link-port" aria-label={t(side === 'left' ? 'Connect from left port' : 'Connect from right port')} title={t('Drag to another thought to connect')} style={{ left: point.x, top: point.y }} onPointerDown={event => {
                if (event.button !== 0) return; event.preventDefault(); event.stopPropagation();
                dragged.current = true; begin({ kind: 'new', from: key, port: side });
            }} onClick={event => { event.stopPropagation(); }} onDoubleClick={event => event.stopPropagation()} onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); begin({ kind: 'new', from: key, port: side }); useUI.getState().patch({ surface: 'links', returnPoint: null }); }
            }} />;
        });
    }) : [];
    const worldLayer = <div className="free-link-world">
        <svg className="free-link-wires" aria-label={t('Manual connections')}>
            {chosen && enabled && [chosen.a, chosen.b].map(key => {
                const box = geometry.get(key);
                return box && visible.includes(key) ? <rect key={key} data-free-link-halo={key} className="free-link-halo" x={box.x - 5} y={box.y - 5} width={box.width + 10} height={box.height + 10} rx={8} /> : null;
            })}
            {links.map(relation => {
                const a = geometry.get(relation.a), b = geometry.get(relation.b);
                if (!a || !b || !visible.includes(relation.a) || !visible.includes(relation.b) || !local) return null;
                const d = linkPath(linkPoint(a, relation.manual!.aPort), linkPoint(b, relation.manual!.bPort), relation.manual!);
                return <g key={relation.id} data-manual-link={relation.id} data-selected={selected === relation.id}>
                    <path d={d} className="free-link-ink" />
                    {editable && <path d={d} className="free-link-hit" role="button" tabIndex={0} aria-label={t('Manage this connection')} onPointerDown={event => { event.preventDefault(); event.stopPropagation(); choose(relation); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); choose(relation); } }} />}
                </g>;
            })}
            <path ref={preview} className="free-link-preview" style={{ display: 'none' }} />
        </svg>{ports}
    </div>;
    const picker = (operation: Pending) => {
        const old = operation.kind === 'change' ? project.relations[operation.id] : null;
        const fixed = operation.kind === 'new' ? operation.from : old?.[operation.end === 'a' ? 'b' : 'a'];
        return <div className="free-link-picker"><p>{t('Choose a thought below, or click a card or port in the Field.')}</p>{Object.values(project.thoughts).filter(thought => thought.id !== fixed).map(thought => <div key={thought.id} data-link-target={thought.id}><p>{thought.text}</p><div className="surface-choice"><Button size="sm" onClick={() => commit(operation, thought.id, 'left')}>{t('Use left port')}</Button><Button size="sm" onClick={() => commit(operation, thought.id, 'right')}>{t('Use right port')}</Button></div></div>)}<Button onClick={cancel}>{t('Cancel reconnection')}</Button></div>;
    };
    return <>
        {world && createPortal(worldLayer, world)}
        {pending && ui.surface !== 'links' && <div className="free-link-tip" role="status">{t('Drop on a saved thought. Escape cancels; no AI request.')}</div>}
        {ui.surface === 'links' && <Surface title={t('Manage connections')} level="window" className="free-link-manager" onClose={() => { cancel(); useUI.getState().patch({ surface: 'none', returnPoint: null }); viewport.current?.focus(); }}>
            <div ref={panel} data-testid="free-link-manager"><p>{t('Manual associations only. Original sources and hierarchy stay unchanged.')}</p>
                {error && <p role="alert">{error}</p>}
                <p>{t('Only one direction is allowed between two thoughts.')}</p>
                {links.some(r => opposite(r).length) && <p role="status">{t('Older opposite connections are preserved. Choose which direction to keep below.')}</p>}
                <div className="surface-choice"><Button size="sm" onClick={() => { if (chosen) reveal([chosen.a, chosen.b]); }}>{t('Locate both ends')}</Button><Button size="sm" onClick={() => controller.undo()} disabled={!controller.canUndo}>{t('Undo')}</Button><Button size="sm" onClick={() => controller.redo()} disabled={!controller.canRedo}>{t('Redo')}</Button></div>
                {pending ? picker(pending) : <><div className="free-link-new"><label>{t('Start a connection')}<select aria-label={t('Connection start')} defaultValue="" onChange={event => { if (event.target.value) begin({ kind: 'new', from: event.target.value, port: 'right' }); }}><option value="">{t('Choose a saved thought')}</option>{Object.values(project.thoughts).map(thought => <option key={thought.id} value={thought.id}>{thought.text.slice(0,100)}</option>)}</select></label></div>
                    {!links.length && <p>{t('No manual connections yet. Drag a dot, or choose a source above.')}</p>}
                    {links.map(relation => <section key={relation.id} className="free-link-entry" data-link-entry={relation.id} data-selected={relation.id === selected}><p>{project.thoughts[relation.a]?.text}</p><span aria-hidden="true">{'↓'}</span><p>{project.thoughts[relation.b]?.text}</p><div className="surface-choice"><Button size="sm" onClick={() => { choose(relation); reveal([relation.a, relation.b]); }}>{t('Locate both ends')}</Button><Button size="sm" onClick={() => changeEnd(relation, 'a')}>{t('Change start')}</Button><Button size="sm" onClick={() => changeEnd(relation, 'b')}>{t('Change end')}</Button>{opposite(relation).length > 0 && <Button size="sm" onClick={() => keepDirection(relation)}>{t('Keep this direction')}</Button>}<Button size="sm" tone="danger" onClick={() => remove(relation.id)}>{t('Delete connection')}</Button></div></section>)}
                </>}
            </div>
        </Surface>}
    </>;
}
