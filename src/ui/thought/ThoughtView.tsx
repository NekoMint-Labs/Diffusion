import { t } from '../../shared/i18n.ts';
import { useLocale } from '../useLocale.ts';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Ghost, Thought } from '../../core/model.ts';
import { isAuthoredExample } from '../../core/demo.ts';
import type { GeometryCache } from '../../field/spatial/index.ts';
import { estimateThoughtSize, thoughtSizeClass } from '../../field/spatial/collision.ts';
import { semanticExcerpt } from '../../field/spatial/representation.ts';
import { TransientTextPresence } from '../motion/TransientTextPresence.tsx';
interface Props {
    item: Thought | Ghost;
    ghost: boolean;
    recalled: boolean;
    selected: boolean;
    emphasis: 'normal' | 'selected' | 'direct' | 'nearby' | 'peripheral' | 'receded';
    settling: boolean;
    /** Find in Field emphasis. Presentation only; never changes canonical state. */
    find?: 'current' | 'match' | 'dim';
    editing: boolean;
    level: 'local' | 'neighborhood' | 'atlas';
    geometry: GeometryCache;
    onEdit: (id: string, text: string) => void;
    onCancel: () => void;
    onReject?: (id: string) => void;
    onMeasure?: (id: string) => void;
    onHover?: (id: string | null) => void;
}
export const ThoughtView = memo(function ThoughtView({ item, ghost, recalled, selected, emphasis, settling, find, editing, level, geometry, onEdit, onCancel, onReject, onMeasure, onHover }: Props) {
    useLocale();
    const ref = useRef<HTMLElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    const settled = useRef(false);
    const wasEditing = useRef(false);
    const focusOnDraft = useRef(false);
    const [draft, setDraft] = useState(item.text);
    const kind = 'kind' in item ? item.kind : 'ghost';
    const proposal = ghost && 'proposal' in item ? item.proposal : undefined;
    const proposalKind = ghost && 'proposalKind' in item ? item.proposalKind : undefined;
    const proposalAction = ghost && 'proposalAction' in item ? item.proposalAction : undefined;
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const measure = () => { geometry.measure(item.id, el.offsetWidth, el.offsetHeight); onMeasure?.(item.id); };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [item.id, geometry, level, onMeasure]);
    useLayoutEffect(() => {
        const entering = editing && !wasEditing.current;
        wasEditing.current = editing;
        if (!entering) return;
        settled.current = false;
        focusOnDraft.current = true;
        setDraft(item.text);
    }, [editing, item.id, item.text]);
    useLayoutEffect(() => {
        if (!editing || !focusOnDraft.current || draft !== item.text) return;
        const textarea = input.current;
        if (!textarea) return;
        focusOnDraft.current = false;
        textarea.focus();
        textarea.setSelectionRange(item.text.length, item.text.length);
    }, [editing, draft, item.text]);
    useLayoutEffect(() => {
        const textarea = input.current;
        if (!editing || !textarea) return;
        textarea.style.height = '0px';
        const maxHeight = Math.max(180, Math.round(window.innerHeight * 0.7));
        textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
        textarea.style.maxHeight = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
    }, [editing, draft]);
    const cancel = () => {
        if (settled.current)
            return;
        settled.current = true;
        onCancel();
    };
    const save = () => {
        if (settled.current)
            return;
        settled.current = true;
        if (draft.trim() !== item.text)
            onEdit(item.id, draft.trim());
        else
            onCancel();
    };
    const text = 'origin' in item && isAuthoredExample(item) ? t(item.text) : item.text;
    const size = kind === 'thought' || kind === 'ghost' ? thoughtSizeClass(text) : undefined;
    const short = semanticExcerpt(text, level, kind);
    return <article ref={ref} data-thought-id={item.id} data-kind={kind} data-size={size} data-life={'life' in item ? item.life : 'active'} data-emphasis={emphasis} data-selected={selected} data-material-settling={settling || undefined} data-recalled={recalled} data-causal={'scopeIds' in item ? item.scopeIds.length ? 'true' : undefined : 'derivedFrom' in item && item.derivedFrom?.length ? 'true' : undefined} data-origin-scope={'scopeIds' in item ? item.scopeIds.join(' ') : 'derivedFrom' in item ? item.derivedFrom?.join(' ') : undefined} data-proposal-kind={proposalKind} data-proposal-action={proposalAction} data-generation-action={'generationAction' in item ? item.generationAction : undefined} className={`thought ${kind} ${editing ? 'editing' : ''} ${ghost ? 'ghost' : ''} ${recalled ? 'recall' : ''}`} data-find={find} style={{ width: editing ? (geometry.get(item.id)?.width ?? estimateThoughtSize(text).width) : undefined, transform: `translate(${item.x}px, ${item.y}px)` }} tabIndex={0} aria-label={`${t(kind)}: ${text || t('New thought')}`} aria-current={selected ? 'true' : undefined} onPointerEnter={() => onHover?.(item.id)} onPointerLeave={() => onHover?.(null)}>
   <div className="thought-preview">{editing ? <textarea ref={input} aria-label={t('Edit thought')} value={draft} maxLength={20000} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => {
                e.stopPropagation();
                if (e.nativeEvent.isComposing || e.keyCode === 229)
                    return;
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    save();
                }
            }} rows={1}/>
            : ghost || recalled
                ? <TransientTextPresence phase={ghost ? 'ghost' : 'recall'}>{short || t('A thought, not yet in words...')}</TransientTextPresence>
                : <p>{short || t('A thought, not yet in words...')}</p>}</div>
    {selected && <span className="thought-selected-dot" aria-hidden="true"/>}
    {ghost && <span className="ghost-boundary" aria-hidden="true"/>}
    {kind === 'source' && <span className="thought-meta">{t('Source')}</span>}
    {ghost && <span className="thought-meta ghost-label">{t(proposal ? 'AI material proposal' : proposalKind === 'question' ? 'AI question proposal' : proposalAction === 'continue' ? 'Continuation proposal' : proposalAction === 'angle' ? 'Another angle proposal' : 'AI possibility')}</span>}
    {ghost && proposalKind === 'question' && <span className="question-mark" aria-hidden="true">?</span>}
    {ghost && (proposal || proposalKind) && onReject && <button type="button" className="proposal-reject" aria-label={t('Remove proposal')} title={t('Remove proposal')} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onReject(item.id); }}>{'×'}</button>}
   {recalled && <span className="thought-meta">{t('Earlier thought')}</span>}
   {'kept' in item && item.kept && kind === 'thought' && <span className="kept-mark" title={t('Kept, not crystallized')}>.</span>}
 </article>;
});
