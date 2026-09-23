import type { CSSProperties, ReactNode } from 'react';

const COPY = {
    resting: 'A quiet thought can stay provisional without becoming invisible.',
    selected: 'Selection should clarify attention without changing the object’s shape.',
    editing: 'Writing stays anchored while the surface becomes more definite.',
    ghost: 'What if the missing connection is about time rather than topic?',
    crystal: 'The strongest ideas become landmarks, not trophies.',
    source: 'Field notes, page 14 — constraints make relationships easier to read.',
    restLabel: 'Resting Thought', selectedLabel: 'Selected Thought', editingLabel: 'Editing Thought',
    ghostLabel: 'AI possibility', crystalLabel: 'Crystal', sourceLabel: 'Source', editAria: 'Editing Thought example',
};

/** Static fixture DOM using the production Thought classes; no interaction or canonical state. */
export function ThoughtComparison() {
    return <div className="field material-gallery-field" data-scope="true" aria-label="Thought state comparison">
        <svg className="phenomena relation-phenomena material-gallery-relations" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
            <g className="relation confirmed"><path d="M 206 220 C 286 214 330 178 445 184"/></g>
            <g className="relation confirmed gallery-relation-active"><path d="M 540 190 C 624 196 650 250 726 283"/></g>
            <g className="relation tentative"><path d="M 190 250 C 180 352 218 412 272 496"/></g>
            <g className="relation confirmed gallery-relation-active"><path d="M 500 218 C 506 340 523 430 555 516"/></g>
            <g className="relation confirmed"><path d="M 782 322 C 804 410 807 490 798 558"/></g>
        </svg>
        <GalleryThought className="thought" label={COPY.restLabel} style={{ left: '9%', top: '25%' }}>
            <p>{COPY.resting}</p>
        </GalleryThought>
        <GalleryThought className="thought" label={COPY.selectedLabel} selected style={{ left: '39%', top: '19%' }}>
            <span className="material-gallery-selected-dot" aria-hidden="true"/><p>{COPY.selected}</p>
        </GalleryThought>
        <GalleryThought className="thought editing" label={COPY.editingLabel} style={{ left: '68%', top: '31%' }}>
            <textarea aria-label={COPY.editAria} value={COPY.editing} readOnly rows={3}/>
        </GalleryThought>
        <GalleryThought className="thought ghost" label={COPY.ghostLabel} ghost style={{ left: '18%', top: '65%' }}>
            <p>{COPY.ghost}</p>
        </GalleryThought>
        <GalleryThought className="thought crystal" label={COPY.crystalLabel} style={{ left: '49%', top: '68%' }}>
            <p>{COPY.crystal}</p>
        </GalleryThought>
        <GalleryThought className="thought source" label={COPY.sourceLabel} style={{ left: '73%', top: '72%' }}>
            <p>{COPY.source}</p>
        </GalleryThought>
    </div>;
}

function GalleryThought({ className, label, selected = false, ghost = false, style, children }: {
    className: string; label: string; selected?: boolean; ghost?: boolean;
    style: CSSProperties; children: ReactNode;
}) {
    return <article className={`${className} material-gallery-thought`} data-size="regular" data-life="active"
        data-emphasis={selected ? 'selected' : 'normal'} data-selected={selected} data-proposal-action={ghost ? 'angle' : undefined}
        style={style} tabIndex={-1} aria-label={label}>
        <div className="thought-preview">{children}</div><span className="material-gallery-state-label">{label}</span>
    </article>;
}
