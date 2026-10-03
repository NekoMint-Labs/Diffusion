import { useMemo, useState } from 'react';
import type { ProjectController } from '../../core/controller.ts';
import type { ProjectState } from '../../core/model.ts';
import { thoughtHierarchy } from '../../core/hierarchy.ts';
import { t } from '../../shared/i18n.ts';
import { Surface } from './Surface.tsx';
import { Button } from '../primitives/Button.tsx';
import { Combobox } from '@base-ui/react/combobox';

export function LineageSurface({ controller, project, thoughtId, onClose }: { controller: ProjectController; project: ProjectState; thoughtId: string; onClose: () => void }) {
    const thought = project.thoughts[thoughtId];
    const [choice, setChoice] = useState(thought?.organizingParentId === undefined ? 'default' : thought.organizingParentId === null ? 'root' : `parent:${thought.organizingParentId}`);
    const [query, setQuery] = useState(() => choice === 'default' ? t('settings.lineage.default') : choice === 'root' ? t('Independent thought') : project.thoughts[choice.slice(7)]?.text.slice(0, 90) ?? '');
    const [open, setOpen] = useState(false);
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
    const options = [{ value: 'default', label: t('settings.lineage.default') }, { value: 'root', label: t('Independent thought') }, ...candidates.map(item => ({ value: `parent:${item.id}`, label: item.text.slice(0, 90) || t('New thought') }))];
    const apply = () => {
        try {
            controller.dispatch({ type: 'thought.reparent', id: thoughtId, parentId: choice === 'default' ? undefined : choice === 'root' ? null : choice.slice(7) });
            onClose();
        } catch (failure) { setError(t(failure instanceof Error ? failure.message : String(failure))); }
    };
    return <Surface title={t('settings.lineage.title')} level="anchored" onClose={onClose}>
        {!thought ? <p role="alert">{t('Thought not found')}</p> : <>
            <p>{thought.text}</p>
            <h3>{t('Original sources')}</h3>
            {thought.derivedFrom?.length ? <ul>{thought.derivedFrom.map(id => <li key={id}>{project.thoughts[id]?.text ?? t('Missing thought')}</li>)}</ul> : <p className="muted">{t('Written independently')}</p>}
            <label id="lineage-parent-label">{t('settings.lineage.parent')}</label>
            <Combobox.Root open={open} onOpenChange={value => { setOpen(value); if (value) setQuery(''); }} items={options} value={options.find(option => option.value === choice) ?? null} itemToStringLabel={item => item.label} itemToStringValue={item => item.value} onValueChange={item => { if (item) setChoice(item.value); }} inputValue={query} onInputValueChange={setQuery}>
                <div className="settings-key-row"><Combobox.Input aria-labelledby="lineage-parent-label" data-testid="parent-query" placeholder={t('settings.lineage.placeholder')} className="ui-combobox-input" onKeyDownCapture={event => { if (event.key === 'Escape' && !open) { event.preventDefault(); event.stopPropagation(); onClose(); } }}/><Combobox.Trigger data-testid="organizing-parent" data-value={choice} aria-label={t('settings.lineage.parent')}>{'▾'}</Combobox.Trigger></div>
                <Combobox.Portal><Combobox.Positioner sideOffset={5} className="ui-select-positioner"><Combobox.Popup className="ui-select-popup" data-width="trigger">
                    <Combobox.Empty className="ui-combobox-empty">{t('settings.lineage.noMatch')}</Combobox.Empty>
                    <Combobox.List className="ui-select-list">{(item: typeof options[number]) => <Combobox.Item key={item.value} value={item} className="ui-select-item" data-value={item.value}>{item.label}</Combobox.Item>}</Combobox.List>
                </Combobox.Popup></Combobox.Positioner></Combobox.Portal>
            </Combobox.Root>
            <p className="muted">{t('settings.lineage.note')}</p>
            {error && <p role="alert">{error}</p>}
            <Button variant="solid" data-testid="apply-parent" onClick={apply}>{t('Apply parent change')}</Button>
        </>}
    </Surface>;
}
