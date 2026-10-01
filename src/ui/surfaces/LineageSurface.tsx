import { useMemo, useState } from 'react';
import type { ProjectController } from '../../core/controller.ts';
import type { ProjectState } from '../../core/model.ts';
import { thoughtHierarchy } from '../../core/hierarchy.ts';
import { t } from '../../shared/i18n.ts';
import { Surface } from './Surface.tsx';
import { Button } from '../primitives/Button.tsx';
import { Select } from '../primitives/Select.tsx';

export function LineageSurface({ controller, project, thoughtId, onClose }: { controller: ProjectController; project: ProjectState; thoughtId: string; onClose: () => void }) {
    const thought = project.thoughts[thoughtId];
    const [choice, setChoice] = useState(thought?.organizingParentId === undefined ? 'default' : thought.organizingParentId === null ? 'root' : `parent:${thought.organizingParentId}`);
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');
    const hierarchy = useMemo(() => thoughtHierarchy(project.thoughts), [project.thoughts]);
    const descendants = useMemo(() => {
        const excluded = new Set([thoughtId]), queue = [thoughtId];
        for (let index = 0; index < queue.length; index++) for (const child of hierarchy.children.get(queue[index]) ?? []) if (!excluded.has(child)) { excluded.add(child); queue.push(child); }
        return excluded;
    }, [hierarchy, thoughtId]);
    const allowed = Object.values(project.thoughts).filter(item => item.kind !== 'source' && !descendants.has(item.id));
    const selectedParent = allowed.find(item => choice === `parent:${item.id}`);
    const candidates = [...(selectedParent ? [selectedParent] : []), ...allowed.filter(item => item !== selectedParent && item.text.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, selectedParent ? 79 : 80)];
    const options = [{ value: 'default', label: t('Use original sources') }, { value: 'root', label: t('Independent thought') }, ...candidates.map(item => ({ value: `parent:${item.id}`, label: item.text.slice(0, 90) || t('New thought') }))];
    const apply = () => {
        try {
            controller.dispatch({ type: 'thought.reparent', id: thoughtId, parentId: choice === 'default' ? undefined : choice === 'root' ? null : choice.slice(7) });
            onClose();
        } catch (failure) { setError(t(failure instanceof Error ? failure.message : String(failure))); }
    };
    return <Surface title={t('Sources and parent')} level="anchored" onClose={onClose}>
        {!thought ? <p role="alert">{t('Thought not found')}</p> : <>
            <p>{thought.text}</p>
            <h3>{t('Original sources')}</h3>
            {thought.derivedFrom?.length ? <ul>{thought.derivedFrom.map(id => <li key={id}>{project.thoughts[id]?.text ?? t('Missing thought')}</li>)}</ul> : <p className="muted">{t('Written independently')}</p>}
            <p className="muted">{t('Organization does not rewrite sources, words or positions. With several sources, the first surviving source is the default parent.')}</p>
            <p className="muted">{t('Arrows show original sources; dashed lines show a different organizing parent. Labeled connections describe meaning.')}</p>
            <label>{t('Find a parent')}<input data-testid="parent-query" value={query} onChange={event => setQuery(event.target.value)} /></label>
            <Select value={choice} options={options} onChange={setChoice} ariaLabel={t('Organizing parent')} testId="organizing-parent" />
            <p className="muted">{t('Current parent')}{': '}{hierarchy.parent.get(thoughtId) ? project.thoughts[hierarchy.parent.get(thoughtId)!]?.text : t('Independent thought')}</p>
            {error && <p role="alert">{error}</p>}
            <Button variant="solid" data-testid="apply-parent" onClick={apply}>{t('Apply parent change')}</Button>
        </>}
    </Surface>;
}
