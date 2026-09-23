import { useEffect, useMemo, useRef, useState } from 'react';
import { id, type ProjectState, type SessionState } from '../../core/model.ts';
import type { ProjectController } from '../../core/controller.ts';
import type { FieldHandle } from '../../field/Field.tsx';
import { placePossibility, type ResultPlacementMode } from '../../field/spatial/placement.ts';
import { t } from '../../shared/i18n.ts';
import { useUI } from '../store.ts';
import { presentSpatialTransition } from '../motion/spatialGrammar.ts';
import { Button } from '../primitives/Button.tsx';

const STORAGE_KEY = 'diffusion-first-field-tutorial-v1';
const TUTORIAL_ORIGIN = 'First Field Tutorial / deterministic demonstration';
type Phase = 'write' | 'move' | 'pan' | 'select' | 'generate' | 'ghost' | 'keep' | 'done';
type Stored = { status: 'in-progress' | 'complete' | 'skipped'; projectId?: string; phase?: Phase; thoughtId?: string };

function readStored(): Stored | null {
    if (typeof localStorage === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Stored | null; }
    catch { return null; }
}
function writeStored(value: Stored) { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); }
export function resetFirstFieldTutorialState() { writeStored({ status: 'in-progress', phase: 'write' }); }

function copyFor(phase: Phase): { title: string; body: string } {
    switch (phase) {
        case 'write': return { title: 'Write one unfinished thought.', body: 'Use the normal writing surface. This tutorial follows what you do in the real Field.' };
        case 'move': return { title: 'Now grab the Thought and move it.', body: 'Thoughts are spatial objects. There is no special drag handle.' };
        case 'pan': return { title: 'Drag empty space.', body: 'Blank-space dragging moves the Field. Shift-drag is reserved for selecting several Thoughts.' };
        case 'select': return { title: 'Select your Thought.', body: 'Selection defines the scope. It does not call AI by itself.' };
        case 'generate': return { title: 'Try one of the local thinking actions.', body: 'Continue, Another angle, or Ask will use a deterministic tutorial proposal here — no live model is called.' };
        case 'ghost': return { title: 'This pencil-marked fragment is a proposal.', body: 'Moving it does not accept it. Drag the proposal somewhere that feels useful.' };
        case 'keep': return { title: 'Keep makes the proposal yours.', body: 'Use Keep this. The tutorial will show the settling transition, then remove its practice output so your Field stays yours.' };
        case 'done': return { title: 'That is the core boundary.', body: 'Your words are yours. AI leaves possibilities. Moving changes geometry; Keep changes ownership.' };
    }
}
function actionText(id: string): { text: string; mode: ResultPlacementMode; proposalKind: 'thought' | 'question'; proposalAction: 'continue' | 'angle' | 'question' } {
    if (id === 'questions') return { text: 'What would you need to learn before trusting this thought?', mode: 'question', proposalKind: 'question', proposalAction: 'question' };
    if (id === 'diffuse') return { text: 'What changes if you look at the same thought from the opposite constraint?', mode: 'branch', proposalKind: 'thought', proposalAction: 'angle' };
    return { text: 'A next step might be to make the hidden assumption more concrete.', mode: 'continue', proposalKind: 'thought', proposalAction: 'continue' };
}

export function useFirstFieldTutorial({ project, session, controller, field }: {
    project: ProjectState;
    session: SessionState;
    controller: ProjectController;
    field: { current: FieldHandle | null };
}) {
    const initial = useMemo(() => {
        const stored = readStored();
        const empty = !Object.keys(project.thoughts).length && !Object.keys(session.ghosts).length;
        if (stored?.status === 'complete' || stored?.status === 'skipped') return { active: false, phase: 'write' as Phase, thoughtId: undefined as string | undefined };
        if (stored?.status === 'in-progress' && stored.projectId === project.id && stored.thoughtId && project.thoughts[stored.thoughtId]) {
            const phase = stored.phase === 'ghost' || stored.phase === 'keep' ? 'generate' : stored.phase ?? 'write';
            return { active: true, phase, thoughtId: stored.thoughtId };
        }
        return { active: empty, phase: 'write' as Phase, thoughtId: undefined as string | undefined };
    // The initial tutorial decision belongs to entering this Workspace. Later project changes should
    // advance the tutorial, not recreate its initial state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [active, setActive] = useState(initial.active);
    const [phase, setPhase] = useState<Phase>(initial.phase);
    const [thoughtId, setThoughtId] = useState<string | undefined>(initial.thoughtId);
    const [ghostId, setGhostId] = useState<string | undefined>();
    const [settled, setSettled] = useState<{ text: string; x: number; y: number } | null>(null);
    const baselineIds = useRef(new Set(Object.keys(project.thoughts)));
    const thoughtOrigin = useRef<{ x: number; y: number } | null>(thoughtId && project.thoughts[thoughtId] ? { x: project.thoughts[thoughtId].x, y: project.thoughts[thoughtId].y } : null);
    const cameraOrigin = useRef<{ x: number; y: number } | null>(null);

    const persist = (nextPhase = phase, nextThought = thoughtId) => {
        if (!active) return;
        writeStored({ status: 'in-progress', projectId: project.id, phase: nextPhase, thoughtId: nextThought });
    };
    useEffect(() => { if (active) persist(); }, [active, phase, thoughtId, project.id]);

    useEffect(() => {
        if (!active || phase !== 'write') return;
        const created = Object.values(project.thoughts).filter(thought => !baselineIds.current.has(thought.id)).sort((a, b) => b.createdAt - a.createdAt)[0];
        if (!created) return;
        setThoughtId(created.id);
        thoughtOrigin.current = { x: created.x, y: created.y };
        setPhase('move');
    }, [active, phase, project.thoughts]);
    useEffect(() => {
        if (!active || phase !== 'move' || !thoughtId) return;
        const thought = project.thoughts[thoughtId];
        const origin = thoughtOrigin.current;
        if (!thought || !origin) return;
        if (Math.hypot(thought.x - origin.x, thought.y - origin.y) < 12) return;
        cameraOrigin.current = { x: project.camera.x, y: project.camera.y };
        setPhase('pan');
    }, [active, phase, thoughtId, project.thoughts, project.camera.x, project.camera.y]);
    useEffect(() => {
        if (!active || phase !== 'pan') return;
        const origin = cameraOrigin.current ?? project.camera;
        cameraOrigin.current ??= { x: origin.x, y: origin.y };
        if (Math.hypot(project.camera.x - origin.x, project.camera.y - origin.y) >= 8) {
            // The previous step moved the Thought, and pressing it already selected it. This step asks
            // the person to select it themselves, so it begins with nothing owning attention —
            // otherwise it is satisfied before it is ever shown.
            useUI.getState().patch({ selection: [] });
            setPhase('select');
        }
    }, [active, phase, project.camera.x, project.camera.y]);
    useEffect(() => {
        if (!active || phase !== 'select' || !thoughtId) return;
        if (useUI.getState().selection.includes(thoughtId)) setPhase('generate');
    });
    useEffect(() => {
        if (!active || phase !== 'ghost' || !ghostId) return;
        if (session.ghosts[ghostId]?.spatialDetached) setPhase('keep');
    }, [active, phase, ghostId, session.ghosts]);

    function clearTutorialGhost() {
        const ids = Object.values(controller.getSnapshot().session.ghosts).filter(ghost => ghost.origin?.note === TUTORIAL_ORIGIN).map(ghost => ghost.id);
        for (const key of ids) controller.dismissGhost(key);
        if (ids.length) useUI.getState().patch({ selection: useUI.getState().selection.filter(key => !ids.includes(key)) });
    }
    function start() {
        clearTutorialGhost();
        baselineIds.current = new Set(Object.keys(controller.getSnapshot().project.thoughts));
        thoughtOrigin.current = null; cameraOrigin.current = null;
        setThoughtId(undefined); setGhostId(undefined); setSettled(null); setPhase('write'); setActive(true);
        writeStored({ status: 'in-progress', projectId: controller.getSnapshot().project.id, phase: 'write' });
        field.current?.focus();
    }
    function skip() {
        clearTutorialGhost(); setSettled(null); setActive(false); writeStored({ status: 'skipped' }); field.current?.focus();
    }
    function finish() {
        clearTutorialGhost(); setSettled(null); setActive(false); writeStored({ status: 'complete' }); field.current?.focus();
    }
    function interceptScopeAction(actionId: string): boolean {
        if (!active || phase !== 'generate' || !thoughtId || !['continue-thinking', 'diffuse', 'questions'].includes(actionId)) return false;
        const snapshot = controller.getSnapshot();
        const thought = snapshot.project.thoughts[thoughtId];
        if (!thought) return false;
        clearTutorialGhost();
        const proposal = actionText(actionId);
        const key = id('tutorial-ghost');
        const point = placePossibility(snapshot.project, snapshot.session, { x: thought.x, y: thought.y }, 0, [thought.id], field.current?.viewBounds(), proposal.text, proposal.mode);
        controller.addGhost({ id: key, text: t(proposal.text), ...point, createdAt: Date.now(), scopeIds: [thought.id], origin: { projectId: snapshot.project.id, thoughtId: thought.id, note: TUTORIAL_ORIGIN }, proposalKind: proposal.proposalKind, proposalAction: proposal.proposalAction });
        setGhostId(key); setPhase('ghost');
        // `patch` merges, so this line has to clear an action the previous notice left behind (the
        // AI-off notice carries "Open AI settings") rather than inherit a control it does not own.
        useUI.getState().patch({ selection: [key], notice: t('Tutorial demonstration / no live model was used.'), noticeAction: null });
        return true;
    }
    function interceptProposalAction(ids: string[], action: 'keep' | 'continue' | 'angle' | 'answer' | 'ignore'): boolean {
        if (!active || !ghostId || !ids.includes(ghostId)) return false;
        if (action !== 'keep' || phase !== 'keep') return true;
        const ghost = controller.getSnapshot().session.ghosts[ghostId];
        if (!ghost) return true;
        const screen = field.current?.screenPoint({ x: ghost.x, y: ghost.y });
        presentSpatialTransition('settle', [ghostId]);
        if (screen) setSettled({ text: ghost.text, x: screen.x, y: screen.y });
        controller.dismissGhost(ghostId);
        useUI.getState().patch({ selection: thoughtId ? [thoughtId] : [] });
        setTimeout(() => { setSettled(null); setPhase('done'); }, 620);
        return true;
    }

    return { active, phase, settled, start, skip, finish, interceptScopeAction, interceptProposalAction };
}

export function FirstFieldTutorialCoach({ active, phase, settled, onSkip, onFinish }: {
    active: boolean;
    phase: Phase;
    settled: { text: string; x: number; y: number } | null;
    onSkip: () => void;
    onFinish: () => void;
}) {
    if (!active) return null;
    const copy = copyFor(phase);
    return <aside className="first-field-tutorial" data-testid="first-field-tutorial" data-phase={phase} aria-live="polite">
        <div className="tutorial-coach">
            <span className="tutorial-kicker">{t('First Field / practice')}</span>
            <strong>{t(copy.title)}</strong>
            <p>{t(copy.body)}</p>
            <div className="tutorial-actions">{phase === 'done' && <Button variant="solid" tone="attention" size="sm" data-testid="tutorial-finish" onClick={onFinish}>{t('Enter the Field')}</Button>}<Button variant="ghost" size="sm" onClick={onSkip}>{t('Skip tutorial')}</Button></div>
        </div>
        {settled && <div className="tutorial-settled-fragment" aria-hidden="true" style={{ left: settled.x, top: settled.y }}><p>{settled.text}</p></div>}
    </aside>;
}

const COACHING_KEY = 'diffusion-first-field-coaching-v1';
type CoachingKind = 'relation' | 'verify' | 'crystal' | 'multi' | 'focus';
function readCoaching(): Set<CoachingKind> {
    if (typeof localStorage === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(COACHING_KEY) ?? '[]') as CoachingKind[]); }
    catch { return new Set(); }
}
function coachingCopy(kind: CoachingKind): { title: string; body: string } {
    switch (kind) {
        case 'relation': return { title: 'Find a relation', body: 'Look for a meaningful connection without assuming one exists.' };
        case 'verify': return { title: 'Check evidence', body: 'Find material that supports or challenges this Thought.' };
        case 'crystal': return { title: 'Crystallize', body: 'Turn this thinking into an explicit editable commitment.' };
        case 'multi': return { title: 'Several Thoughts can become one temporary scope.', body: 'Shift-click or Shift-drag to build the scope; actions apply to that selection.' };
        case 'focus': return { title: 'Focus', body: 'F frames the current selection without creating a separate navigation mode.' };
    }
}

/** One-time annotations after the two-minute core lesson. They are device UI state, never Field
 * content, and each concept stays quiet after the person dismisses it. */
export function ProgressiveTutorialCoach({ enabled }: { enabled: boolean }) {
    const ui = useUI();
    const [current, setCurrent] = useState<CoachingKind | null>(null);
    const seen = useRef(readCoaching());
    const offer = (kind: CoachingKind) => { if (enabled && !current && !seen.current.has(kind)) setCurrent(kind); };
    useEffect(() => {
        if (!enabled || current) return;
        if (ui.surface === 'evidence') offer('verify');
        else if (ui.surface === 'crystal') offer('crystal');
        else if (ui.operation?.phase === 'pending' && ui.operation.kind === 'probe') offer('relation');
        else if (ui.selection.length > 1) offer('multi');
    }, [enabled, current, ui.surface, ui.operation?.id, ui.operation?.phase, ui.selection.length]);
    useEffect(() => {
        if (!enabled) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey && !event.altKey && ui.selection.length) offer('focus');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [enabled, current, ui.selection.length]);
    if (!enabled || !current) return null;
    const copy = coachingCopy(current);
    const dismiss = () => {
        seen.current.add(current);
        if (typeof localStorage !== 'undefined') localStorage.setItem(COACHING_KEY, JSON.stringify([...seen.current]));
        setCurrent(null);
    };
    return <aside className="progressive-tutorial-coach" data-testid="progressive-tutorial-coach" data-kind={current} aria-live="polite"><strong>{t(copy.title)}</strong><p>{t(copy.body)}</p><Button variant="ghost" size="sm" onClick={dismiss}>{t('Got it')}</Button></aside>;
}
