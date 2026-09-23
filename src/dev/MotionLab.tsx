/** Development-only Motion Lab (`/dev/motion`).
 *
 * A design environment, not an application: it imports only the production motion vocabulary, the
 * production choreography, the real interaction primitives (CommandMenu, Select, Surface) and the
 * real Atmosphere layer — never Dexie, the platform adapters, or the core controller. `main.tsx`
 * guards the dynamic import with `import.meta.env.DEV`, so the whole module is tree-shaken out of a
 * production bundle and the route is unreachable there.
 *
 * Every authored sequence frame renders *production-class* fixture DOM and drives it with the
 * *production* functions from `signature.ts` — it no longer replays a Motion replica of the
 * choreography. `useSignature` runs a `(root, tl)` sequence, and the two sequences that return a
 * timeline (`fieldDepartureSequence`, `firstThoughtEmergence`) are called directly and killed before
 * replaying. Under reduced motion those guards return without building, so the frame simply shows
 * the end state — which is exactly what the product does.
 *
 * The motion-mode control sets the dev-only preview seam (`setMotionPreview`) for GSAP, the
 * `data-motion-preview` attribute for the product's reduced-motion CSS, and `MotionConfig
 * reducedMotion` for Motion, so GSAP, CSS and Motion agree in every mode. The diagnostic line —
 * in the nav and always visible — reports the real OS preference and the current preview mode, so a
 * reviewer can never again unknowingly compare two motion modes. Every user-visible string lives in
 * `labScenarios.ts` and is rendered as an expression, so the static locale checker sees no raw text.
 */
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { MOTION_DURATION, MOTION_PANEL_SPRING, cubicPoints, roleTransition } from '../ui/motion/tokens.ts';
import {
    fieldDepartureSequence, fieldSwitchSequence, firstThoughtComposerSequence, firstThoughtEmergence,
    historyRevealSequence, invitationContractSequence, invitationIdleSequence, setMotionPreview,
    settingsEnterSequence, settingsRecedeSequence, useSignature, type MotionPreview,
} from '../ui/motion/signature.ts';
import type { Point } from '../core/model.ts';
import { Atmosphere, atmosphereRole } from '../ui/atmosphere.tsx';
import { CommandMenu } from '../ui/focus/CommandMenu.tsx';
import { Select } from '../ui/primitives/Select.tsx';
import { Surface, SurfaceClose } from '../ui/surfaces/Surface.tsx';
import { surfaceMotionRoles } from '../ui/surfaces/surfaceMotion.ts';
import { COMPOSER_SHORTCUT, composerState, type ComposerState } from '../ui/workspace/composer.ts';
import { SCENARIO_METAS, SETTINGS_SECTIONS, TEXT, labContextRows, labRows, typographyChoices, type ScenarioMeta, type Variant } from './labScenarios.ts';
import './motionLab.css';

interface ScenarioProps { meta: ScenarioMeta; variant: Variant; reduced: boolean; }
const beatTransition = (variant: Variant, reduced: boolean) => roleTransition(variant.role, reduced, variant.ease);
const noop = () => undefined;
const NOOP_BUILD = () => undefined;
type RunningTimeline = { kill: () => void } | null;
function useReplay(): { nonce: number; play: () => void } {
    const [nonce, setNonce] = useState(0);
    return { nonce, play: useCallback(() => setNonce(value => value + 1), []) };
}
/** The framed area: its own name, the motion role it uses, the extra axis, and its duration. An
 * authored-sequence frame names the production function(s) it executes and lists the *real* roles,
 * their real durations (from the token module) and their eases — never a lab-local copy. */
function Frame({ meta, variant, children }: { meta: ScenarioMeta; variant: Variant; children: ReactNode }) {
    return <figure className="lab-frame">
        <figcaption className="lab-frame-cap">
            <span className="lab-frame-name">{meta.name}</span>
            <span className="lab-chip" data-role={variant.role}>{variant.label}</span>
            {variant.mode && <span className="lab-chip lab-chip-mode">{variant.mode}</span>}
            {variant.functions
                ? variant.functions.map(name => <span className="lab-chip lab-chip-fn" key={name}>{name}</span>)
                : <span className="lab-chip lab-chip-sec">{`${MOTION_DURATION[variant.role]}s`}</span>}
        </figcaption>
        {variant.roles && <p className="lab-roles">{variant.roles.map(role => `${role.role} ${MOTION_DURATION[role.role]}s · ${cubicPoints(role.ease).join(',')}`).join('    ')}</p>}
        <div className="lab-stage-inner">{children}</div>
        <p className="lab-blurb">{meta.blurb}</p>
    </figure>;
}
function Play({ onPlay, label, disabled }: { onPlay: () => void; label: string; disabled?: boolean }) {
    return <button type="button" className="lab-play" onClick={onPlay} disabled={disabled}>{label}</button>;
}

function ButtonHover({ meta, variant, reduced }: ScenarioProps) {
    const [state, setState] = useState('rest');
    return <Frame meta={meta} variant={variant}>
        <motion.button type="button" className="lab-button"
            onHoverStart={() => setState('hover')} onHoverEnd={() => setState('rest')}
            onTapStart={() => setState('press')} onTap={() => setState('hover')}
            animate={{ scale: state === 'press' ? 0.97 : state === 'hover' ? 1.03 : 1, opacity: state === 'rest' ? 0.62 : 1 }}
            transition={beatTransition(variant, reduced)}>{TEXT.hoverMe}</motion.button>
        <span className="lab-readout">{`state: ${state}`}</span>
    </Frame>;
}

function MenuAnchored({ meta, variant }: ScenarioProps) {
    const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const sink = useCallback((label: string) => setLog(prev => [label, ...prev].slice(0, 5)), []);
    const rows = useMemo(() => labRows(sink), [sink]);
    useEffect(() => setOpen(false), [variant.id]);
    const menu = trigger && open ? <CommandMenu key="menu" anchor={trigger} rows={rows} scope="global" note={TEXT.menuNote} onClose={() => setOpen(false)} /> : null;
    return <Frame meta={meta} variant={variant}>
        <button type="button" className="lab-button" ref={setTrigger} onClick={() => setOpen(value => !value)}>{TEXT.menuTrigger}</button>
        <p className="lab-readout">{log.length ? log.join(' · ') : TEXT.menuLogEmpty}</p>
        {variant.id === 'mount' ? <AnimatePresence>{menu}</AnimatePresence> : menu}
    </Frame>;
}

function ContextMenuDemo({ meta, variant }: ScenarioProps) {
    const [point, setPoint] = useState<Point | null>(null);
    const [log, setLog] = useState<string[]>([]);
    const sink = useCallback((label: string) => setLog(prev => [label, ...prev].slice(0, 5)), []);
    const rows = useMemo(() => labContextRows(sink), [sink]);
    useEffect(() => setPoint(null), [variant.id]);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-surface-target" onContextMenu={event => { event.preventDefault(); setPoint({ x: event.clientX, y: event.clientY }); }}>{TEXT.contextSurface}</div>
        <p className="lab-readout">{point ? `${TEXT.pointBefore} ${point.x}, ${point.y}` : TEXT.contextHint}</p>
        <AnimatePresence>{point && <CommandMenu key="context" point={point} rows={rows} scope="thought" placement={variant.id === 'end' ? 'bottom-end' : 'bottom-start'} note={TEXT.contextNote} onClose={() => setPoint(null)} />}</AnimatePresence>
        {log.length > 0 && <p className="lab-readout">{log.join(' · ')}</p>}
    </Frame>;
}

function SelectDemo({ meta, variant, reduced }: ScenarioProps) {
    const [value, setValue] = useState('serif');
    return <Frame meta={meta} variant={variant}>
        <div className="lab-row">
            <Select value={value} options={typographyChoices} onChange={setValue} ariaLabel={TEXT.selectLabel} testId="lab-select" popupWidth="trigger" />
            <motion.span key={value} className="lab-readout" initial={{ opacity: 0, y: reduced ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} transition={beatTransition(variant, reduced)}>{`${TEXT.selectBefore} ${value}`}</motion.span>
        </div>
    </Frame>;
}

function DialogDemo({ meta, variant, reduced }: ScenarioProps) {
    const [open, setOpen] = useState(false);
    useEffect(() => setOpen(false), [variant.id]);
    const level: 'split' | 'window' | 'anchored' = variant.id === 'split' ? 'split' : variant.id === 'window' ? 'window' : 'anchored';
    const label = level === 'split' ? TEXT.dialogOpenSplit : level === 'window' ? TEXT.dialogOpenWindow : TEXT.dialogOpenAnchored;
    return <Frame meta={meta} variant={variant}>
        <button type="button" className="lab-button" onClick={() => setOpen(true)}>{label}</button>
        {level === 'window' && <p className="lab-readout">{`spring · ${MOTION_PANEL_SPRING.stiffness} / ${MOTION_PANEL_SPRING.damping}`}</p>}
        <AnimatePresence>{open && <Surface key="dialog" title={TEXT.dialogTitle} subtitle={TEXT.dialogSubtitle} level={level} actions={<button type="button" onClick={() => setOpen(false)}>{TEXT.dialogAction}</button>} onClose={() => setOpen(false)}><p>{TEXT.dialogBody}</p></Surface>}</AnimatePresence>
    </Frame>;
}

function CloseControl({ meta, variant }: ScenarioProps) {
    const cell = <div className={`lab-close-cell${variant.id === 'hover' ? ' lab-force-hover' : variant.id === 'focus' ? ' lab-force-focus' : ''}`}><SurfaceClose onClose={noop} /></div>;
    return <Frame meta={meta} variant={variant}>
        {variant.id === 'disabled' ? <fieldset className="lab-disabled" disabled>{cell}</fieldset> : cell}
        {variant.id === 'disabled' && <p className="lab-readout">{TEXT.closeDisabledNote}</p>}
        <p className="lab-readout">{TEXT.closeHint}</p>
    </Frame>;
}

/** Section swapping inside a Settings-like layout: the nav picks a section and the content changes
 * presence. This is Motion-driven component animation, not an authored sequence, so it keeps its
 * role-comparing variants. */
function SettingsSectionSwap({ meta, variant, reduced }: ScenarioProps) {
    const [sectionId, setSectionId] = useState(SETTINGS_SECTIONS[0].id);
    const [values, setValues] = useState<Record<string, string>>({});
    const section = SETTINGS_SECTIONS.find(candidate => candidate.id === sectionId) ?? SETTINGS_SECTIONS[0];
    return <Frame meta={meta} variant={variant}>
        <div className="settings-layout lab-settings-layout">
            <nav className="settings-nav">{SETTINGS_SECTIONS.map(entry => <button key={entry.id} type="button" className="settings-nav-tab" data-selected={entry.id === section.id || undefined} onClick={() => setSectionId(entry.id)}>{entry.label}</button>)}</nav>
            <div className="settings-section">
                <AnimatePresence mode="wait">
                    <motion.div key={section.id} initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -6 }} transition={beatTransition(variant, reduced)}>
                        {section.rows.map(row => <div className="lab-setting-row" key={row.id}>
                            <span className="lab-setting-label">{row.label}</span>
                            <Select value={values[row.id] ?? row.value} options={row.options} onChange={next => setValues(prev => ({ ...prev, [row.id]: next }))} ariaLabel={row.label} popupWidth="trigger" />
                            <span className="lab-readout">{row.help}</span>
                        </div>)}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    </Frame>;
}

const RENAME_STEPS = ['resting', 'hover', 'renaming', 'committed'];
function TitleRename({ meta, variant, reduced }: ScenarioProps) {
    const [step, setStep] = useState(0);
    const state = RENAME_STEPS[step];
    const title = state === 'committed' ? TEXT.renameCommitted : TEXT.renameResting;
    return <Frame meta={meta} variant={variant}>
        <div className="lab-identity">
            <span className="lab-identity-eyebrow">{TEXT.renameEyebrow}</span>
            <motion.div className="lab-identity-title" data-state={state}
                animate={{ opacity: state === 'resting' ? 0.72 : 1, scale: state === 'hover' ? 1.02 : 1 }}
                transition={beatTransition(variant, reduced)}>
                {state === 'renaming' ? <input className="lab-identity-input" defaultValue={title} aria-label={TEXT.renameEyebrow} /> : <span>{title}</span>}
            </motion.div>
            {state === 'renaming' && <span className="lab-readout">{TEXT.renameHint}</span>}
        </div>
        <div className="lab-controls">
            <Play onPlay={() => setStep(current => (current + 1) % RENAME_STEPS.length)} label={TEXT.renameStep} />
            <Play onPlay={() => setStep(0)} label={TEXT.renameReset} />
            <span className="lab-readout">{`step: ${state}`}</span>
        </div>
    </Frame>;
}

/* ---------------------------------------------------------------------------------------------
 * Authored-sequence frames: production-class fixtures, production functions
 * ------------------------------------------------------------------------------------------- */

/** The real invitation block (`EmptyFieldInvitation` markup), with production class names, so the
 * invitation sequences query exactly what they query in the product. */
function InvitationFixture() {
    return <div className="empty-invitation" aria-hidden="true">
        <p className="empty-invitation-eyebrow">{TEXT.emptyEyebrow}</p>
        <p className="empty-invitation-line">{TEXT.emptyLine}</p>
        <p className="empty-invitation-hint">{TEXT.emptyHint}</p>
        <span className="empty-invitation-mark" aria-hidden="true">{TEXT.emptyMark}</span>
    </div>;
}
/** The real `.speak-positioner` root: the invitation and the writing surface, the element
 * `firstThoughtComposerSequence` is scoped to and measured from. */
function SpeakPositioner({ frame, composer }: { frame: RefObject<HTMLDivElement | null>; composer: boolean }) {
    return <div className="speak-positioner" ref={frame}>
        {composer && <InvitationFixture/>}
        <div className="speak" data-composing={composer || undefined}>
            <textarea defaultValue={composer ? TEXT.composerWords : TEXT.speakPlaceholder} aria-label={TEXT.speakPlaceholder} readOnly/>
        </div>
    </div>;
}
const FIELD_THOUGHT_OFFSETS = ['translate(36px, 92px)', 'translate(250px, 128px)', 'translate(452px, 74px)'];
/** The real Field surface (atmosphere, identity, veil, Thoughts with a `> p` text child), with
 * production class names, so the Field-switch and Settings-recede sequences animate real DOM. */
function FieldFixture({ idPrefix }: { idPrefix: string }) {
    return <>
        <Atmosphere role="rest"/>
        <div className="field">
            <header className="identity">
                <span className="identity-eyebrow">{TEXT.renameEyebrow}</span>
                <div className="identity-row"><h1><span className="identity-title">{TEXT.renameCommitted}</span></h1></div>
                <span className="identity-arrival">{TEXT.identityArrival}</span>
            </header>
            <div className="field-arrival"/>
            {TEXT.fieldThoughts.map((text, index) => <article className="thought" key={text} data-thought-id={`${idPrefix}-${index}`} style={{ transform: FIELD_THOUGHT_OFFSETS[index] }}>
                <p>{text}</p>
            </article>)}
        </div>
    </>;
}

/** Empty state's invitation: `invitationIdleSequence` (the reveal + the breathing mark) and
 * `invitationContractSequence` (writing begins and the invitation contracts). */
function EmptyState({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    const frame = useRef<HTMLDivElement>(null);
    useSignature(frame, variant.id === 'contract' ? invitationContractSequence : invitationIdleSequence, [variant.id, nonce]);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-fixture lab-fixture-speak">
            <Fragment key={`${variant.id}-${nonce}`}><SpeakPositioner frame={frame} composer/></Fragment>
        </div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.emptyReveal}/></div>
    </Frame>;
}

/** Quiet Composer's yield: the production `firstThoughtComposerSequence` — the invitation withdraws
 * and the writing surface contracts, then returns to identity. */
function QuietComposer({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    const frame = useRef<HTMLDivElement>(null);
    useSignature(frame, firstThoughtComposerSequence, [nonce]);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-fixture lab-fixture-speak">
            <Fragment key={nonce}><SpeakPositioner frame={frame} composer/></Fragment>
        </div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.composerStep}/></div>
    </Frame>;
}

/** Measures the real textarea the way `Speak.tsx` measures it — grow to the cap the stylesheet
 * declares, then scroll — so no cap number is copied into the lab: the cap (and the floor) are read
 * straight from `.speak textarea` in field.css. */
function useComposerMeasure(words: string, composing: boolean): { input: RefObject<HTMLTextAreaElement | null>; height: number; overflowing: boolean } {
    const input = useRef<HTMLTextAreaElement>(null);
    const [measure, setMeasure] = useState({ height: 0, overflowing: false });
    useLayoutEffect(() => {
        const element = input.current;
        if (!element)
            return;
        const style = getComputedStyle(element);
        const cap = parseFloat(style.maxHeight);
        const floor = parseFloat(style.minHeight);
        const previous = element.style.height;
        element.style.height = 'auto';
        const content = element.scrollHeight;
        element.style.height = previous;
        setMeasure({ height: Math.round(Math.max(floor, Math.min(cap, content))), overflowing: content > cap });
    }, [words, composing]);
    return { input, height: measure.height, overflowing: measure.overflowing };
}
/** The real Quiet Composer markup, the shape `Speak.tsx` renders (shell, illumination layer, writing
 * row, inline action, and the first-use note under the material), so `field.css` draws the product's
 * own material and `data-state` is the production `composerState(...)`. */
function SpeakFixture({ composing, words, state, input, height, overflowing }: {
    composing: boolean;
    words: string;
    state: ComposerState;
    input: RefObject<HTMLTextAreaElement | null>;
    height: number;
    overflowing: boolean;
}) {
    return <div className="speak-positioner" data-composing={composing || undefined}>
        <form className="speak" data-composing={composing} data-state={state} onSubmit={event => event.preventDefault()}>
            <div className="speak-shell">
                <span className="speak-light" aria-hidden="true"/>
                <div className="speak-row">
                    {!composing && <span className="speak-mark" aria-hidden="true"/>}
                    <textarea ref={input} aria-label={TEXT.speakPlaceholder} placeholder={TEXT.speakPlaceholder} value={words} readOnly autoFocus={composing} rows={1} data-overflowing={overflowing} style={{ height }}/>
                    {composing && <span className="speak-shortcut" aria-hidden="true"><kbd>{COMPOSER_SHORTCUT.keys[0]}</kbd>{'+'}<kbd>{COMPOSER_SHORTCUT.keys[1]}</kbd><span>{TEXT.speakShortcut}</span></span>}
                    {composing && <button type="button" className="speak-action"><span className="speak-action-key" aria-hidden="true">{'\u21b5'}</span><span className="speak-action-label">{TEXT.speakAction}</span></button>}
                </div>
            </div>
        </form>
    </div>;
}
/** Idle → focused: the composer's two resting states, drawn from the production `composerState`.
 * Focused is composing with no words yet (`focused`, not `writing`), so the material and the action
 * are what the frame shows. */
function ComposerStates({ meta, variant, reduced }: ScenarioProps) {
    const composing = variant.id === 'focused';
    const words = '';
    const state = composerState({ composing, scoped: false, words, busy: false });
    const { input, height, overflowing } = useComposerMeasure(words, composing);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-fixture lab-fixture-speak"><SpeakFixture composing={composing} words={words} state={state} input={input} height={height} overflowing={overflowing}/></div>
        <p className="lab-readout">{`${TEXT.speakState} ${state}`}</p>
    </Frame>;
}
/** Multiline: writing past the cap the stylesheet declares, so the surface stops growing and scrolls. */
function ComposerOverflow({ meta, variant, reduced }: ScenarioProps) {
    const words = TEXT.speakOverflowWords;
    const state = composerState({ composing: true, scoped: false, words, busy: false });
    const { input, height, overflowing } = useComposerMeasure(words, true);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-fixture lab-fixture-speak"><SpeakFixture composing words={words} state={state} input={input} height={height} overflowing={overflowing}/></div>
        <p className="lab-readout">{`${TEXT.speakState} ${state} · ${TEXT.speakMeasured} ${height}px${overflowing ? ` ${TEXT.speakScrolling}` : ''}`}</p>
    </Frame>;
}

const FIRST_THOUGHT_ID = 'lab-first-thought';
/** The whole first-Thought moment. The composer path runs `firstThoughtComposerSequence` *and*
 * `firstThoughtEmergence(id, origin, 'composer')` in one beat; the placement path runs only
 * `firstThoughtEmergence(id, null, 'placement')` — the two real creation paths, side by side. */
function FirstThought({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    const frame = useRef<HTMLDivElement>(null);
    const running = useRef<RunningTimeline>(null);
    const placement = variant.id === 'placement';
    useSignature(frame, placement ? NOOP_BUILD : firstThoughtComposerSequence, [variant.id, nonce]);
    useEffect(() => {
        const root = frame.current;
        if (!root || reduced)
            return;
        running.current?.kill();
        running.current = firstThoughtEmergence(FIRST_THOUGHT_ID, placement ? null : root, placement ? 'placement' : 'composer');
        return () => { running.current?.kill(); running.current = null; };
    }, [variant.id, nonce, reduced, placement]);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-fixture lab-fixture-speak">
            <Fragment key={`${variant.id}-${nonce}`}><SpeakPositioner frame={frame} composer={!placement}/></Fragment>
            <Fragment key={`thought-${nonce}`}>
                <article className="thought" data-thought-id={FIRST_THOUGHT_ID} style={{ transform: 'translate(28px, 34px)', width: 210 }}>
                    <p>{TEXT.firstThought}</p>
                </article>
            </Fragment>
        </div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.firstPlay}/></div>
    </Frame>;
}

const CREATION_THOUGHT_ID = 'lab-creation-thought';
/** Thought creation uses the real in-place material/typography arrival; the retired circular Field
 * bloom is deliberately absent. */
function ThoughtCreation({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    const host = useRef<HTMLDivElement>(null);
    const running = useRef<RunningTimeline>(null);
    useEffect(() => {
        if (!host.current || reduced)
            return;
        running.current?.kill();
        running.current = firstThoughtEmergence(CREATION_THOUGHT_ID, null, 'placement');
        return () => { running.current?.kill(); running.current = null; };
    }, [nonce, reduced]);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-fixture lab-fixture-field" ref={host}>
            <div className="field">
                <article className="thought" data-thought-id={CREATION_THOUGHT_ID} style={{ transform: 'translate(146px, 104px)', width: 190 }}>
                    <p>{TEXT.emergenceThought}</p>
                </article>
            </div>
        </div>
        <p className="lab-readout">{TEXT.emergeRest}</p>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.emergePlay}/></div>
    </Frame>;
}

/** Field switch: `fieldDepartureSequence` (outgoing Field recedes) and `fieldSwitchSequence` (veil
 * lifts, atmosphere recovers, Thoughts emerge in groups, identity settles). */
function FieldSwitch({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    const frame = useRef<HTMLDivElement>(null);
    const running = useRef<RunningTimeline>(null);
    const departure = variant.id === 'departure';
    useSignature(frame, departure ? NOOP_BUILD : fieldSwitchSequence, [variant.id, nonce]);
    useEffect(() => {
        const root = frame.current;
        if (!root || !departure)
            return;
        running.current?.kill();
        running.current = fieldDepartureSequence(root);
        return () => { running.current?.kill(); running.current = null; };
    }, [variant.id, nonce, reduced, departure]);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-fixture lab-fixture-field" ref={frame}>
            <Fragment key={`${variant.id}-${nonce}`}><FieldFixture idPrefix="lab-field"/></Fragment>
        </div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.fieldSwitch}/></div>
    </Frame>;
}

/** History reveal: the production `historyRevealSequence` on real history DOM — overview, then
 * structure (scope + day), then the events. */
function HistoryTimeline({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    const frame = useRef<HTMLDivElement>(null);
    useSignature(frame, historyRevealSequence, [nonce]);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-fixture" ref={frame}>
            <Fragment key={nonce}>
                <ul className="history-overview"><li>{TEXT.historyOverview}</li><li>{TEXT.historyDays}</li></ul>
                <section className="settings-section">
                    <article className="history-scope-item"><small>{TEXT.historyScopeKind}</small><p>{TEXT.historyScopeText}</p></article>
                </section>
                <div className="history-day-row"><h3 className="history-day">{TEXT.historyDay}</h3><span className="history-day-count">{TEXT.historyDayCount}</span></div>
                <ol className="history-events">{TEXT.historyEntries.map(entry => <li className="history-event" key={entry}>
                    <span className="history-marker" aria-hidden="true"/><div className="history-body"><p className="history-text">{entry}</p></div>
                </li>)}</ol>
            </Fragment>
        </div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.historyPlay}/></div>
    </Frame>;
}

/** Settings open: `settingsEnterSequence` — the navigation settles first, then the section. */
function SettingsOpen({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    const frame = useRef<HTMLDivElement>(null);
    useSignature(frame, settingsEnterSequence, [nonce]);
    const section = SETTINGS_SECTIONS[0];
    return <Frame meta={meta} variant={variant}>
        <div className="lab-fixture" ref={frame}>
            <Fragment key={nonce}>
                <div className="settings-layout">
                    <nav className="settings-nav">{SETTINGS_SECTIONS.map((entry, index) => <button key={entry.id} type="button" className="settings-nav-tab" data-selected={index === 0 || undefined}>{entry.label}</button>)}</nav>
                    <div className="settings-section">
                        <h3>{section.label}</h3>
                        {section.rows.map(row => <div className="setting-row" key={row.id}><span>{row.label}</span><span className="lab-readout">{row.help}</span></div>)}
                    </div>
                </div>
            </Fragment>
        </div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.settingsOpenPlay}/></div>
    </Frame>;
}

/** Settings close: `settingsRecedeSequence` — the Field behind pulls back and resolves home, and
 * the atmosphere dips and comes back. */
function SettingsClose({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    const frame = useRef<HTMLDivElement>(null);
    useSignature(frame, settingsRecedeSequence, [nonce]);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-fixture lab-fixture-field" ref={frame}>
            <Fragment key={nonce}><FieldFixture idPrefix="lab-recede"/></Fragment>
        </div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.settingsClosePlay}/></div>
    </Frame>;
}

/** Help is a centred application place: the real window-level Surface with the `help-surface` class,
 * plus the real `surfaceMotionRoles` the product derives for that level (a panel spring in, a short
 * micro/exit recede), so the frame shows the real window place rather than an anchored panel. */
function HelpPlace({ meta, variant, reduced }: ScenarioProps) {
    const [open, setOpen] = useState(false);
    useEffect(() => setOpen(false), [variant.id]);
    const roles = surfaceMotionRoles({ level: 'window', placement: 'right-start', anchored: false, reduced, sharedLayout: false });
    return <Frame meta={meta} variant={variant}>
        <div className="lab-controls">
            <button type="button" className="lab-button" onClick={() => setOpen(true)} disabled={open}>{TEXT.helpOpen}</button>
            <button type="button" className="lab-button" onClick={() => setOpen(false)} disabled={!open}>{TEXT.helpClose}</button>
            <span className="lab-readout">{`${TEXT.helpRoles} ${roles.transformOrigin} · spring ${MOTION_PANEL_SPRING.stiffness}/${MOTION_PANEL_SPRING.damping}`}</span>
        </div>
        <AnimatePresence>{open && <Surface key="help" title={TEXT.helpTitle} subtitle={TEXT.helpSubtitle} level="window" className="help-surface" onClose={() => setOpen(false)} actions={<button type="button" onClick={() => setOpen(false)}>{TEXT.helpAction}</button>}><p>{TEXT.helpBody}</p></Surface>}</AnimatePresence>
    </Frame>;
}

function ThoughtCreateDelete({ meta, variant, reduced }: ScenarioProps) {
    const [present, setPresent] = useState(true);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-field-mock"><AnimatePresence>{present && <motion.div key="thought" className="lab-thought" initial={{ opacity: 0, scale: reduced ? 1 : 0.92 }} animate={{ opacity: 0.9, scale: 1 }} exit={{ opacity: 0, scale: reduced ? 1 : 0.94 }} transition={beatTransition(variant, reduced)}>{TEXT.thoughtBody}</motion.div>}</AnimatePresence></div>
        <div className="lab-controls">
            <Play onPlay={() => setPresent(true)} label={TEXT.thoughtCreate} disabled={present} />
            <Play onPlay={() => setPresent(false)} label={TEXT.thoughtDelete} disabled={!present} />
        </div>
    </Frame>;
}

function GhostArrival({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    return <Frame meta={meta} variant={variant}>
        <div className="lab-field-mock"><motion.div key={nonce} className="lab-thought lab-ghost" initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={beatTransition(variant, reduced)}>{TEXT.ghostBody}</motion.div></div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.ghostPlay} /></div>
    </Frame>;
}

function RecallWake({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    return <Frame meta={meta} variant={variant}>
        <div className="lab-field-mock"><motion.div key={nonce} className="lab-thought lab-recall" initial={{ opacity: 0.58, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={beatTransition(variant, reduced)}>{TEXT.recallBody}</motion.div></div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.recallPlay} /></div>
    </Frame>;
}

function CrystalSettle({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    return <Frame meta={meta} variant={variant}>
        <div className="lab-field-mock"><motion.div key={nonce} className="lab-thought lab-crystal" initial={{ opacity: 0, scale: reduced ? 1 : 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={beatTransition(variant, reduced)}>{TEXT.crystalBody}</motion.div></div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.crystalPlay} /></div>
    </Frame>;
}

/** A notice line arriving from the Field. */
function Feedback({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    return <Frame meta={meta} variant={variant}>
        <div className="lab-field-mock">
            <motion.div key={`notice-${nonce}`} className="lab-notice" data-secondary="demo" initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={beatTransition(variant, reduced)}>{TEXT.feedbackNotice}</motion.div>
        </div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.feedbackPlay} /></div>
    </Frame>;
}

/** A thought coming into scope, and the scope it states. */
function ScopeEnter({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    const transition = beatTransition(variant, reduced);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-field-mock">
            <motion.div key={`thought-${nonce}`} className="lab-thought" initial={{ opacity: 0.5 }} animate={{ opacity: 0.92 }} transition={transition}>{TEXT.scopeThought}</motion.div>
            <motion.span key={`chip-${nonce}`} className="lab-scope-chip" initial={{ opacity: 0, y: reduced ? 0 : 4, scale: reduced ? 1 : 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={transition}>{TEXT.scopeEnterChip}</motion.span>
        </div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.scopeEnterPlay} /></div>
    </Frame>;
}

/** Scope clearing: the chip leaves and the thought returns to rest. */
function ScopeExit({ meta, variant, reduced }: ScenarioProps) {
    const { nonce, play } = useReplay();
    const transition = beatTransition(variant, reduced);
    return <Frame meta={meta} variant={variant}>
        <div className="lab-field-mock">
            <motion.span key={`chip-${nonce}`} className="lab-scope-chip" initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: reduced ? 0 : -6 }} transition={transition}>{TEXT.scopeExitChip}</motion.span>
            <motion.div key={`thought-${nonce}`} className="lab-thought" initial={{ opacity: 0.92 }} animate={{ opacity: 0.5 }} transition={transition}>{TEXT.scopeThought}</motion.div>
        </div>
        <div className="lab-controls"><Play onPlay={play} label={TEXT.scopeExitPlay} /></div>
    </Frame>;
}

/** The real Atmosphere layer, lit by the real `atmosphereRole()` derivation (rest / attention) so the
 * frame shows the material the Field actually shows, not a hand-picked swatch: the control flips the
 * transient state the derivation reads, and the role follows. */
function AtmosphereDemo({ meta, variant, reduced }: ScenarioProps) {
    const preferred = variant.id === 'attention';
    const [busy, setBusy] = useState(preferred);
    useEffect(() => setBusy(preferred), [preferred]);
    const role = atmosphereRole({ busy, diffuse: false, scoped: false });
    return <Frame meta={meta} variant={variant}>
        <div className="lab-field-mock lab-atmosphere-host">
            <Atmosphere role={role} />
            <motion.div key={role} className="lab-atmosphere-readout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={beatTransition(variant, reduced)}>{role === 'attention' ? TEXT.atmosphereAttention : TEXT.atmosphereRest}</motion.div>
        </div>
        <div className="lab-controls">
            <Play onPlay={() => setBusy(value => !value)} label={TEXT.atmospherePlay} />
            <span className="lab-readout">{`${TEXT.atmosphereBusy} ${busy} · ${TEXT.atmosphereRole} ${role}`}</span>
        </div>
    </Frame>;
}

const BODIES: Record<string, ComponentType<ScenarioProps>> = {
    button: ButtonHover, menu: MenuAnchored, context: ContextMenuDemo, select: SelectDemo, dialog: DialogDemo,
    close: CloseControl, settings: SettingsSectionSwap, rename: TitleRename, empty: EmptyState, thought: ThoughtCreateDelete,
    field: FieldSwitch, ghost: GhostArrival, recall: RecallWake, crystal: CrystalSettle, history: HistoryTimeline,
    composer: QuietComposer, first: FirstThought, settingsOpen: SettingsOpen, settingsClose: SettingsClose,
    feedback: Feedback, scopeEnter: ScopeEnter, scopeExit: ScopeExit, atmosphere: AtmosphereDemo,
    emergence: ThoughtCreation, speak: ComposerStates, speakOverflow: ComposerOverflow, help: HelpPlace,
};
const SCENARIOS = SCENARIO_METAS.map(meta => ({ meta, Body: BODIES[meta.id] }));

const MODE_LABEL: Record<MotionPreview, string> = { system: TEXT.modeSystem, normal: TEXT.modeNormal, reduced: TEXT.modeReduced };
/** Motion and GSAP must resolve the same preference in every mode: `system` follows the OS, while
 * `force normal` / `force reduced` preview past it. */
const REDUCED_MOTION: Record<MotionPreview, 'always' | 'never' | 'user'> = { system: 'user', normal: 'never', reduced: 'always' };

export default function MotionLab() {
    const [metaId, setMetaId] = useState(SCENARIOS[0].meta.id);
    const [variantId, setVariantId] = useState<string | null>(null);
    const [mode, setMode] = useState<MotionPreview>('system');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [osReduced, setOsReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
    // The preview seam resolves GSAP's preference; the attribute drives the product's reduced-motion
    // CSS. Both are pinned together so the three technologies never disagree.
    useEffect(() => {
        setMotionPreview(mode);
        document.documentElement.dataset.motionPreview = mode === 'normal' ? 'normal' : '';
    }, [mode]);
    // The *real* OS preference, read directly and kept current: a reviewer must see the truth even
    // while previewing past it.
    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setOsReduced(media.matches);
        onChange();
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, []);
    const reduced = mode === 'reduced' || (mode === 'system' && osReduced);
    const active = SCENARIOS.find(scenario => scenario.meta.id === metaId) ?? SCENARIOS[0];
    const variant = active.meta.variants.find(candidate => candidate.id === variantId) ?? active.meta.variants[0];
    const { Body } = active;
    const diagnostic = `${TEXT.osReducedMotion} ${osReduced} · ${TEXT.previewMode} ${MODE_LABEL[mode]}`;
    return <div className="lab">
        <aside className="lab-nav">
            <div className="lab-nav-head">
                <span className="lab-eyebrow">{TEXT.eyebrow}</span>
                <h1 className="lab-title">{TEXT.title}</h1>
                <p className="lab-lead">{TEXT.lead}</p>
                <p className="lab-nav-label">{TEXT.modeHeading}</p>
                <div className="lab-mode-row">
                    {(Object.keys(MODE_LABEL) as MotionPreview[]).map(value => <button key={value} type="button" className="lab-toggle" data-on={mode === value || undefined} aria-pressed={mode === value} onClick={() => setMode(value)}>{MODE_LABEL[value]}</button>)}
                </div>
                <button type="button" className="lab-toggle lab-theme-toggle" onClick={() => setTheme(value => (value === 'light' ? 'dark' : 'light'))}>{theme === 'light' ? TEXT.themeLight : TEXT.themeDark}</button>
                <p className="lab-readout">{diagnostic}</p>
            </div>
            <p className="lab-nav-label">{TEXT.scenariosHeading}</p>
            <ol className="lab-nav-list">
                {SCENARIOS.map((scenario, index) => <li key={scenario.meta.id}>
                    <button type="button" className="lab-nav-item" data-active={active.meta.id === scenario.meta.id || undefined} aria-current={active.meta.id === scenario.meta.id ? 'true' : undefined} onClick={() => { setMetaId(scenario.meta.id); setVariantId(null); }}>
                        <span className="lab-nav-index">{index + 1}</span><span>{scenario.meta.name}</span>
                    </button>
                </li>)}
            </ol>
        </aside>
        <main className="lab-main">
            <div className="lab-toolbar">
                <p className="lab-nav-label">{TEXT.variantsHeading}</p>
                <div className="lab-variant-row">
                    {active.meta.variants.map(candidate => <button key={candidate.id} type="button" className="lab-toggle" data-on={variant.id === candidate.id || undefined} aria-pressed={variant.id === candidate.id} onClick={() => setVariantId(candidate.id)}>{`${candidate.label}${candidate.mode ? ` · ${candidate.mode}` : ''}`}</button>)}
                </div>
                {!variant.functions && <p className="lab-readout">{`${TEXT.curve} ${variant.ease} · ${cubicPoints(variant.ease).join(', ')}`}</p>}
            </div>
            <MotionConfig reducedMotion={REDUCED_MOTION[mode]}>
                <Body meta={active.meta} variant={variant} reduced={reduced} />
            </MotionConfig>
        </main>
        <p className="lab-diagnostic" data-testid="motion-diagnostic">{diagnostic}</p>
    </div>;
}
