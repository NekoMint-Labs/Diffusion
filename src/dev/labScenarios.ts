/** Fixtures for the development-only Motion Lab (`/dev/motion`).
 *
 * This file holds data only: scenario metadata, the comparable variants for each scenario, and
 * every user-visible string. The locale checker scans TSX for raw JSX text and string-literal
 * attributes, so labels live here as plain data and the components render them as expressions.
 * Nothing here imports Dexie, the platform adapters, or the core controller.
 */
import type { Point } from '../core/model.ts';
import type { MenuRow } from '../ui/commands/compose.ts';
export type { DurationRole, EaseRole } from '../ui/motion/tokens.ts';
import type { DurationRole, EaseRole } from '../ui/motion/tokens.ts';

/** One real role (and the ease it resolves to) that an authored sequence uses. */
export interface SignatureRole { role: DurationRole; ease: EaseRole; }
/** A comparable variant of one scenario.
 *
 * For a Motion-driven primitive `role`/`ease` are the shared motion roles the variant demonstrates
 * and `mode` names the extra axis (presence, placement, level, state).
 *
 * For an authored-sequence frame, `functions` names the *production* functions the variant
 * executes and `roles` lists the *real* roles+durations those functions resolve through — a
 * variant selects a production path (`composer` vs `placement`, departure vs arrival), it never
 * retunes one. `role`/`ease` mirror the sequence's first role so the frame chip stays meaningful.
 */
export interface Variant {
    id: string;
    /** Frame label naming the role (primitive) or the production path (authored sequence). */
    label: string;
    role: DurationRole;
    ease: EaseRole;
    mode?: string;
    /** Authored-sequence frames: the production functions this variant runs. */
    functions?: string[];
    /** Authored-sequence frames: the real roles the executed sequence resolves through. */
    roles?: SignatureRole[];
}
export interface ScenarioMeta {
    id: string;
    name: string;
    blurb: string;
    variants: Variant[];
}
const v = (id: string, role: DurationRole, ease: EaseRole, mode?: string): Variant => ({ id, role, ease, mode, label: `${role} · ${ease}` });
/** An authored-sequence variant: it names the production function(s) and the real roles. */
const sig = (id: string, label: string, mode: string, functions: string[], roles: [DurationRole, EaseRole][]): Variant =>
    ({ id, label, mode, functions, roles: roles.map(([role, ease]) => ({ role, ease })), role: roles[0][0], ease: roles[0][1] });

export const SCENARIO_METAS: ScenarioMeta[] = [
    { id: 'button', name: 'Button hover / press', blurb: 'Local feedback on a control: how fast a pointer state reads.', variants: [v('micro', 'micro', 'enter'), v('instant', 'instant', 'enter'), v('control', 'control', 'attention')] },
    { id: 'menu', name: 'Menu (anchored)', blurb: 'The real CommandMenu, anchored to a trigger element and mounted through AnimatePresence.', variants: [v('mount', 'surface', 'enter', 'presence · mount / unmount'), v('swap', 'surface', 'enter', 'presence · no exit (instant swap)')] },
    { id: 'context', name: 'Context menu (pointer)', blurb: 'The same primitive anchored to a pointer instead of an element.', variants: [v('start', 'surface', 'enter', 'placement · bottom-start'), v('end', 'surface', 'enter', 'placement · bottom-end')] },
    { id: 'select', name: 'Select', blurb: 'The real Select primitive; the value-change beat is the variant you compare.', variants: [v('micro', 'micro', 'enter', 'value-change beat'), v('control', 'control', 'enter', 'value-change beat')] },
    { id: 'dialog', name: 'Dialog', blurb: 'The real Surface primitive at each depth level.', variants: [v('split', 'surface', 'enter', 'level · split'), v('window', 'settle', 'settle', 'level · window (panel spring)'), v('anchored', 'surface', 'enter', 'level · anchored')] },
    { id: 'close', name: 'Close control', blurb: 'SurfaceClose in isolation, compared by state on the active theme.', variants: [v('hover', 'micro', 'enter', 'state · hover'), v('focus', 'micro', 'enter', 'state · focus'), v('disabled', 'instant', 'enter', 'state · disabled')] },
    { id: 'settings', name: 'Settings rhythm', blurb: 'Section swapping inside the Settings surface: the nav picks a section and its content changes presence.', variants: [v('settle', 'settle', 'settle', 'section swap'), v('micro', 'micro', 'enter', 'section swap')] },
    { id: 'rename', name: 'Title rename', blurb: 'Resting identity to committed name, stepped through by hand.', variants: [v('settle', 'settle', 'settle', 'identity'), v('micro', 'micro', 'enter', 'identity'), v('spatial', 'spatial', 'move', 'identity')] },
    { id: 'empty', name: 'Empty state to first Thought', blurb: 'The invitation an empty Field offers: it breathes while it waits, then contracts as writing begins. Both halves are the production sequences, run on real invitation DOM.', variants: [
        sig('idle', 'invitation idle', 'the invitation waiting', ['invitationIdleSequence'], [['settle', 'settle'], ['surface', 'enter']]),
        sig('contract', 'invitation contract', 'writing begins', ['invitationContractSequence'], [['micro', 'exit'], ['control', 'move']]),
    ] },
    { id: 'thought', name: 'Thought create / delete', blurb: 'A Thought arriving and leaving the Field.', variants: [v('surface', 'surface', 'enter', 'arrival'), v('micro', 'micro', 'exit', 'removal')] },
    { id: 'field', name: 'New Field / Field switch', blurb: 'Leaving is part of entering: the outgoing Field recedes, then the veil lifts over the arrived one and its Thoughts come up in small groups. Both halves are the production sequences.', variants: [
        sig('departure', 'departure', 'outgoing Field recedes', ['fieldDepartureSequence'], [['surface', 'exit'], ['settle', 'settle']]),
        sig('arrival', 'arrival', 'veil lifts, groups emerge', ['fieldSwitchSequence'], [['settle', 'settle'], ['surface', 'enter']]),
    ] },
    { id: 'ghost', name: 'Ghost arrival', blurb: 'A faint, unattributed hint of something not yet written.', variants: [v('signature', 'signature', 'enter', 'arrival'), v('settle', 'settle', 'settle', 'arrival')] },
    { id: 'recall', name: 'Recall wake', blurb: 'Something the Field surfaced again, waking from a dim state.', variants: [v('attention', 'control', 'attention', 'wake'), v('micro', 'micro', 'enter', 'wake')] },
    { id: 'crystal', name: 'Crystal settle', blurb: 'A settled, crystallized Thought, worth reading rather than noticing.', variants: [v('settle', 'settle', 'settle', 'settle'), v('signature', 'signature', 'settle', 'settle')] },
    { id: 'history', name: 'History timeline', blurb: 'A timeline read as hierarchy: the overview lands, then the structure, then the events fill in. The production historyRevealSequence on real history DOM.', variants: [
        sig('hierarchy', 'hierarchy', 'overview → structure → events', ['historyRevealSequence'], [['micro', 'enter'], ['surface', 'settle'], ['spatial', 'settle']]),
    ] },
    { id: 'composer', name: 'Quiet Composer', blurb: 'The composer yields: the invitation withdraws and the writing surface contracts, then returns to identity. The production firstThoughtComposerSequence.', variants: [
        sig('yield', 'composer yield', 'first thought commits', ['firstThoughtComposerSequence'], [['micro', 'exit'], ['signature', 'signature'], ['control', 'move'], ['settle', 'settle']]),
    ] },
    { id: 'first', name: 'First Thought', blurb: 'The first Thought of an empty Field. The two real creation paths: written in the composer (a measured flight into the Field) or placed by a gesture (a short local settle).', variants: [
        sig('composer', 'composer path', 'written in the composer', ['firstThoughtComposerSequence', 'firstThoughtEmergence(id, composer)'], [['signature', 'signature'], ['micro', 'settle']]),
        sig('placement', 'placement path', 'placed by a gesture', ['firstThoughtEmergence(id, placement)'], [['spatial', 'settle']]),
    ] },
    { id: 'emergence', name: 'Thought creation feedback', blurb: 'A Thought appearing resolves through its own material and typography at the placed position. The retired circular Field bloom is absent; firstThoughtEmergence(id, placement) remains the production arrival.', variants: [
        sig('local', 'local creation', 'in-place material arrival', ['firstThoughtEmergence(id, placement)'], [['spatial', 'settle']]),
    ] },
    { id: 'speak', name: 'Composer idle / focused', blurb: 'The real composerState machine on the real markup: idle is a caret line in the Field, focused materializes the shell (a low-contrast fill, a thin edge, one illumination layer) as one row — the writing, focused Shift+Enter cue, and inline action. data-state is composerState(...), so the stylesheet and the state machine cannot drift.', variants: [
        v('idle', 'instant', 'enter', 'state · idle'),
        v('focused', 'control', 'enter', 'state · focused'),
    ] },
    { id: 'speakOverflow', name: 'Composer multiline', blurb: "Writing past the composer's cap: the textarea grows to the cap the stylesheet declares (the .speak textarea max-height in field.css) and only then scrolls, with data-overflowing driving overflow-y exactly as Speak.tsx sets it. No number is copied into the lab; the cap is read from the product's own CSS.", variants: [
        v('overflow', 'instant', 'enter', 'state · overflowing'),
    ] },
    { id: 'settingsOpen', name: 'Settings open', blurb: 'Settings is a place with two beats: the navigation settles first, then the section it points at appears. The production settingsEnterSequence.', variants: [
        sig('enter', 'enter', 'two beats', ['settingsEnterSequence'], [['control', 'enter'], ['settle', 'settle']]),
    ] },
    { id: 'settingsClose', name: 'Settings close', blurb: 'The Field behind Settings settles home from its pull-back and the atmosphere comes back up. The production settingsRecedeSequence.', variants: [
        sig('recede', 'recede', 'field returns', ['settingsRecedeSequence'], [['control', 'move'], ['settle', 'settle']]),
    ] },
    { id: 'help', name: 'Help place', blurb: 'Help is a centred application place, not a panel anchored to a corner: the real Surface at level "window" with the help-surface class, so the real .surface.window.help-surface geometry and the real surfaceMotionRoles are what you see — a panel spring arriving from center, a short micro/exit recede.', variants: [
        sig('place', 'window place', 'level · window (panel spring)', ['surfaceMotionRoles'], [['micro', 'exit']]),
    ] },
    { id: 'feedback', name: 'Feedback', blurb: 'A single notice line arriving from the Field.', variants: [v('surface', 'surface', 'enter', 'notice'), v('micro', 'micro', 'enter', 'notice')] },
    { id: 'scopeEnter', name: 'Scope enter', blurb: 'A thought coming into scope, and the scope it states.', variants: [v('control', 'control', 'enter', 'enter'), v('micro', 'micro', 'enter', 'enter')] },
    { id: 'scopeExit', name: 'Scope exit', blurb: 'Scope clearing: the chip leaves and the thought returns to rest.', variants: [v('surface', 'surface', 'exit', 'exit'), v('micro', 'micro', 'exit', 'exit')] },
    { id: 'atmosphere', name: 'Atmosphere', blurb: 'The Field material at rest versus at attention, using the real Atmosphere layer.', variants: [v('rest', 'settle', 'settle', 'rest'), v('attention', 'settle', 'attention', 'attention')] },
];

/** Every user-visible string in the lab. Rendered as expressions, never as raw JSX text. */
export const TEXT = {
    eyebrow: 'Dev only',
    title: 'Motion Lab',
    lead: 'The production choreography and every interaction primitive, side by side. Not reachable in a production build.',
    scenariosHeading: 'Scenarios',
    variantsHeading: 'Variants',
    modeHeading: 'Motion mode',
    modeSystem: 'system',
    modeNormal: 'force normal',
    modeReduced: 'force reduced',
    osReducedMotion: 'OS reduced-motion:',
    previewMode: 'Preview mode:',
    themeLight: 'Light',
    themeDark: 'Dark',
    curve: 'Curve',
    hoverMe: 'Hover me',
    menuTrigger: 'Open anchored menu',
    menuNote: 'A menu is a projection: it closes at once.',
    menuLogEmpty: 'No menu action run yet.',
    contextSurface: 'Right-click this surface',
    contextHint: 'No point chosen.',
    contextNote: 'Pointer-anchored menu.',
    selectLabel: 'Typography',
    selectBefore: 'value:',
    pointBefore: 'point:',
    dialogOpenSplit: 'Open split dialog',
    dialogOpenWindow: 'Open window dialog',
    dialogOpenAnchored: 'Open anchored dialog',
    dialogTitle: 'Session notes',
    dialogSubtitle: 'A place that owns input',
    dialogBody: 'This is the real Surface primitive, mounted through AnimatePresence exactly as the app does.',
    dialogAction: 'Keep',
    closeHint: 'Compare the one close affordance across its states.',
    closeDisabledNote: 'disabled state',
    renameStep: 'Step',
    renameReset: 'Reset',
    renameEyebrow: 'Field',
    renameResting: 'Field notes',
    renameHint: 'Enter to save / Escape to cancel',
    renameCommitted: 'Reading Room',
    emptyEyebrow: 'An empty Field',
    emptyLine: 'What is still unclear?',
    emptyHint: 'Place one thought here. Nothing in a Field has to be finished.',
    emptyMark: '\u2193',
    emptyReveal: 'Replay invitation',
    speakPlaceholder: 'Speak a thought…',
    thoughtCreate: 'Create Thought',
    thoughtDelete: 'Delete Thought',
    thoughtBody: 'A single Thought, arrived.',
    fieldSwitch: 'Replay Field switch',
    fieldThoughts: ['A Thought already here.', 'Another, further out.', 'A third, at the edge.'],
    identityArrival: 'A new Field. Nothing has grown here yet.',
    ghostPlay: 'Play ghost arrival',
    ghostBody: 'Something, not yet anyone’s.',
    recallPlay: 'Play recall wake',
    recallBody: 'A thought the Field had let dim.',
    crystalPlay: 'Play crystal settle',
    crystalBody: 'A crystallized Thought.',
    historyPlay: 'Replay history',
    historyEntries: ['Created the Field', 'Wrote a Thought', 'Renamed the Field', 'Crystallized one Thought', 'Forked a world'],
    historyOverview: 'Recorded in this scope',
    historyDays: 'Today · 3 decisions',
    historyDay: 'Today',
    historyDayCount: '3 decisions',
    historyScopeKind: 'Current thought',
    historyScopeText: 'A thought the Field is holding.',
    firstComposer: 'The composer yields',
    firstThought: 'A first Thought.',
    firstPlay: 'Replay first Thought',
    composerWords: 'A thought being written…',
    composerStep: 'Replay composer yield',
    settingsOpenPlay: 'Replay Settings open',
    settingsClosePlay: 'Replay Settings close',
    feedbackNotice: 'Demo possibilities / no live model was used.',
    feedbackPlay: 'Play feedback',
    scopeThought: 'A Thought coming into scope',
    scopeEnterChip: 'About here',
    scopeEnterPlay: 'Play scope enter',
    scopeExitChip: 'Scope cleared',
    scopeExitPlay: 'Play scope exit',
    atmospherePlay: 'Replay atmosphere',
    atmosphereRole: 'atmosphereRole() →',
    atmosphereBusy: 'busy:',
    atmosphereRest: 'rest',
    atmosphereAttention: 'attention',
    emergenceThought: 'A Thought appeared here.',
    emergePlay: 'Replay creation',
    emergeResponding: 'responding at',
    emergeNotCentre: '— the created Thought’s own point in this fixture, not the viewport centre.',
    emergeRest: 'illumination elapsed — Replay to fire it again.',
    speakShortcut: 'New line',
    speakAction: 'Think',
    speakState: 'data-state',
    speakMeasured: 'textarea',
    speakScrolling: '· scrolling',
    speakOverflowWords: [
        'A thought that runs past the composer cap,',
        'so the writing surface stops growing',
        'and starts scrolling instead:',
        'one line,',
        'another line,',
        'and a third,',
        'a fourth,',
        'a fifth,',
        'a sixth,',
        'and one more for good measure.',
    ].join('\n'),
    helpTitle: 'Help',
    helpSubtitle: 'A centred place, not a panel',
    helpBody: 'Double-click to write. Space + drag pans; the wheel zooms.',
    helpAction: 'Explore an example Field',
    helpOpen: 'Open Help',
    helpClose: 'Close Help',
    helpRoles: 'surfaceMotionRoles →',
} as const;

/** Fake menu rows; `run` reports the action and the origin it was invoked from. */
export function labRows(sink: (label: string, origin?: Point) => void): MenuRow[] {
    return [
        { id: 'new-thought', label: 'New Thought', hint: 'N', keyshortcuts: 'N', run: origin => sink('New Thought', origin) },
        { id: 'find', label: 'Find', hint: '/', keyshortcuts: '/', separator: true, run: origin => sink('Find', origin) },
        { id: 'settings', label: 'Settings', hint: ',', keyshortcuts: ',', run: origin => sink('Settings', origin) },
    ];
}
export function labContextRows(sink: (label: string, origin?: Point) => void): MenuRow[] {
    return [
            { id: 'find-relation', label: 'Find a relation', run: origin => sink('Find a relation', origin) },
        { id: 'continue', label: 'Continue thinking', run: origin => sink('Continue thinking', origin) },
        { id: 'delete', label: 'Delete', separator: true, run: origin => sink('Delete', origin) },
    ];
}
export const typographyChoices = [{ value: 'serif', label: 'Serif' }, { value: 'sans', label: 'Sans' }];
export const themeChoices = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }];

export interface SettingRow {
    id: string;
    label: string;
    help: string;
    value: string;
    options: { value: string; label: string }[];
}
export interface SettingSection {
    id: string;
    label: string;
    rows: SettingRow[];
}
export const SETTINGS_SECTIONS: SettingSection[] = [
    { id: 'appearance', label: 'Appearance', rows: [
        { id: 'theme', label: 'Theme', help: 'How the Field is lit.', value: 'light', options: themeChoices },
        { id: 'density', label: 'Density', help: 'How much space a row keeps.', value: 'comfortable', options: [{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }] },
    ] },
    { id: 'reading', label: 'Reading', rows: [
        { id: 'typography', label: 'Thought typography', help: 'The face every Thought is set in.', value: 'serif', options: typographyChoices },
    ] },
    { id: 'motion', label: 'Motion', rows: [
        { id: 'reduced', label: 'Reduced motion', help: 'State changes arrive without travel.', value: 'natural', options: [{ value: 'natural', label: 'Natural' }, { value: 'reduced', label: 'Reduced' }] },
    ] },
];
