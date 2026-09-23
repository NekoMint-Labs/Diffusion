import { useEffect, useState } from 'react';
import { t as msg } from '../../shared/i18n.ts';
import type { Point } from '../../core/model.ts';
import type { ProjectController } from '../../core/controller.ts';
import { useProject } from '../hooks.ts';
import { Surface } from '../surfaces/Surface.tsx';
import { Button } from '../primitives/Button.tsx';
import { presentSpatialTransition } from '../motion/spatialGrammar.ts';

/** A relation stays spatial. Opening it reveals only the explanation and the decision that belongs
 * to this one relation; it is not a review dashboard and a candidate never confirms itself. */
export function RelationSurface({ controller, relationId, anchor, onClose }: {
    controller: ProjectController;
    relationId: string;
    anchor?: Point;
    onClose: () => void;
}) {
    const { project, session } = useProject(controller);
    const confirmedRelation = Object.hasOwn(project.relations, relationId)
        ? project.relations[relationId]
        : undefined;
    const phenomenon = Object.hasOwn(session.phenomena, relationId)
        ? session.phenomena[relationId]
        : undefined;
    const relation = confirmedRelation ?? phenomenon;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    useEffect(() => {
        setEditing(false);
        setDraft(relation?.label ?? '');
    }, [relationId, relation?.label]);
    const confirmed = !!confirmedRelation;
    useEffect(() => {
        const keydown = (event: KeyboardEvent) => {
            if (event.key !== 'Delete' || editing || !relation) return;
            const target = event.target instanceof HTMLElement ? event.target : null;
            if (target?.closest('input,textarea,[contenteditable="true"]')) return;
            event.preventDefault();
            if (confirmedRelation) {
                controller.dispatch({ type: 'relation.remove', id: relationId });
                onClose();
                return;
            }
            if (phenomenon) {
                presentSpatialTransition('dissolve', [phenomenon.a, phenomenon.b]);
                onClose();
                const remove = () => controller.dismissPhenomenon(relationId);
                if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) remove();
                else setTimeout(remove, 150);
            }
        };
        window.addEventListener('keydown', keydown);
        return () => window.removeEventListener('keydown', keydown);
    }, [controller, editing, confirmedRelation, phenomenon, relation, relationId, onClose]);
    if (!relation)
        return null;
    const save = () => {
        const label = draft.trim();
        if (!label) return;
        controller.updatePhenomenon(relationId, { label });
        setEditing(false);
    };
    return <Surface
        title={msg(confirmed ? 'Confirmed relation' : 'Candidate relation')}
        subtitle={msg(confirmed ? 'You confirmed this relation.' : 'Diffusion proposed this. It stays tentative until you keep it.')}
        level="anchored"
        anchor={anchor}
        className="relation-surface"
        onClose={onClose}
    >
        {editing && !confirmed ? <div className="relation-edit">
            <input data-autofocus aria-label={msg('Relation label')} value={draft} maxLength={80} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
                if (event.key === 'Enter') { event.preventDefault(); save(); }
                if (event.key === 'Escape') { event.preventDefault(); setDraft(relation.label); setEditing(false); }
            }}/>
            <div className="surface-choice"><Button variant="solid" size="sm" onClick={save}>{msg('Save')}</Button><Button variant="ghost" size="sm" onClick={() => { setDraft(relation.label); setEditing(false); }}>{msg('Cancel')}</Button></div>
        </div> : <p className="relation-surface-label">{relation.label}</p>}
        {relation.explanation && <p className="relation-surface-explanation">{relation.explanation}</p>}
        <p className="relation-endpoints"><span>{project.thoughts[relation.a]?.text ?? session.ghosts[relation.a]?.text}</span><span className="relation-endpoint-link" aria-hidden="true"/><span>{project.thoughts[relation.b]?.text ?? session.ghosts[relation.b]?.text}</span></p>
        {confirmed
            ? <div className="surface-choice"><Button variant="outline" size="sm" tone="danger" onClick={() => { controller.dispatch({ type: 'relation.remove', id: relationId }); onClose(); }}>{msg('Reconsider this relation')}</Button></div>
            : <div className="surface-choice relation-decisions">
                <Button variant="solid" size="sm" tone="attention" onClick={() => { presentSpatialTransition('settle', [relation.a, relation.b]); controller.confirmPhenomenon(relationId); onClose(); }}>{msg('Keep')}</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>{msg('Modify')}</Button>
                <Button variant="ghost" size="sm" onClick={() => { presentSpatialTransition('dissolve', [relation.a, relation.b]); const dismiss = () => { controller.dismissPhenomenon(relationId); onClose(); }; if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) dismiss(); else setTimeout(dismiss, 150); }}>{msg('Ignore')}</Button>
            </div>}
    </Surface>;
}
