import { useEffect, useRef, useState } from 'react';
import { t } from '../../shared/i18n.ts';
import type { Point } from '../../core/model.ts';
import type { RelationPhenomenon } from './describe.ts';
import type { RelationLabelPlacement } from './relationLabelPlacement.ts';

type Props = {
    relation: RelationPhenomenon;
    placement: RelationLabelPlacement;
    onOpen: (id: string, point: Point) => void;
    onKeep: (id: string) => void;
    onIgnore: (id: string) => void;
    onRename: (id: string, label: string) => void;
};

/** Compact spatial object for a semantic relation. Candidate decisions stay attached to the token. */
export function RelationToken({ relation, placement, onOpen, onKeep, onIgnore, onRename }: Props) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(relation.label);
    const input = useRef<HTMLInputElement>(null);
    useEffect(() => { if (!editing) setDraft(relation.label); }, [relation.label, editing]);
    useEffect(() => { if (editing) input.current?.focus(); }, [editing]);
    const commit = () => {
        const label = draft.trim();
        if (label && label !== relation.label) onRename(relation.id, label);
        setEditing(false);
    };
    const status = relation.confirmed ? 'confirmed' : 'tentative';
    return <div
        className="relation-token-overlay relation-label-overlay"
        data-relation-label={relation.id}
        data-relation-token={relation.id}
        data-status={status}
        style={{ width: placement.width, minHeight: placement.height, transform: `translate(${placement.x}px,${placement.y}px) scale(var(--inverse-zoom))` }}
    >
        {editing ? <input
            ref={input}
            className="relation-token-input"
            aria-label={t('Relation label')}
            value={draft}
            maxLength={80}
            onChange={event => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={event => {
                event.stopPropagation();
                if (event.key === 'Enter') { event.preventDefault(); commit(); }
                if (event.key === 'Escape') { event.preventDefault(); setDraft(relation.label); setEditing(false); }
            }}
        /> : <button
            type="button"
            className="relation-token-label"
            aria-label={`${t(relation.confirmed ? 'Confirmed relation' : 'Candidate relation')}: ${relation.label}`}
            onClick={() => onOpen(relation.id, placement.anchor)}
        >{relation.label}</button>}
        {!relation.confirmed && !editing && <div className="relation-token-actions" role="group" aria-label={t('Candidate relation')}>
            <button type="button" onClick={() => onKeep(relation.id)}>{t('Keep')}</button>
            <button type="button" onClick={() => setEditing(true)}>{t('Modify')}</button>
            <button type="button" onClick={() => onIgnore(relation.id)}>{t('Ignore')}</button>
        </div>}
    </div>;
}
