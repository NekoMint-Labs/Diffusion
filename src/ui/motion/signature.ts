/** Authored sequences. GSAP owns deliberate choreography; React/Motion owns ordinary
 * component animation, and the same visual property never has both at once.
 *
 * Everything here resolves through `motion/tokens.ts`, so a signature role is the same curve
 * and the same duration as its Motion counterpart, and reduced motion collapses the sequence
 * instead of hiding the result: the caller resolves the state change, the timeline is simply
 * not built.
 *
 * `useSignature` wraps `useGSAP`, whose context collects every tween created inside the build
 * function so one revert (on dependency change or unmount) removes all of them. No tween may
 * outlive the element it animates, and no sequence may write a property the Field writes
 * imperatively: `.thought` keeps its inline world transform, so only its text child is animated.
 *
 * The redesigned vocabulary is a choreography, not an opacity + 4–8px translate:
 *   - `firstThoughtComposerSequence` + `useFirstThoughtEmergence` split one thought arriving into
 *     a composer half (the invitation/composer yields space) and a Thought half (a measured flight
 *     from the composer, a depth change, and a typography resolution).
 *   - `invitationReleaseSequence` is not needed: a first Thought placed by a gesture (rather than
 *     written in the composer) establishes itself through `firstThoughtEmergence` in `placement`
 *     mode, so one creation path is never animated while the other is dead.
 *   - `fieldDepartureSequence` is the leaving half of a Field switch; `fieldSwitchSequence` is the
 *     arriving half and now emerges Thoughts in small groups.
 *   - `settingsEnterSequence` / `settingsRecedeSequence` are the two beats of a place arriving.
 *   - `historyRevealSequence` is read as hierarchy: overview, then structure, then events.
 *
 * Every sequence here is replayable in the development-only Motion Lab, which imports these
 * functions rather than re-describing them: what is reviewed there is what the product runs.
 */
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { useCallback, useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';
import { MOTION_DURATION, MOTION_EASE, type EaseRole } from './tokens.ts';

/** A gesture's screen position, for a sequence measured from a pointer rather than an element. */
type ScreenPoint = { x: number; y: number };

let registered = false;
/** One registration, one easing vocabulary shared with CSS and Motion. */
function registerSignature() {
    if (registered)
        return;
    gsap.registerPlugin(useGSAP, CustomEase);
    for (const [role, points] of Object.entries(MOTION_EASE) as [EaseRole, readonly number[]][])
        CustomEase.create(`diffusion-${role}`, points.join(','));
    registered = true;
}
/** A role as a GSAP ease name. */
export const ease = (role: EaseRole): string => `diffusion-${role}`;
export const duration = (role: keyof typeof MOTION_DURATION): number => MOTION_DURATION[role];

/* ---------------------------------------------------------------------------------------------
 * The motion preference, and the one deliberate way to preview past it
 * ------------------------------------------------------------------------------------------- */

/** How motion is resolved for every sequence and hook in this module.
 *
 * `system` is production: the operating system's `prefers-reduced-motion` decides. The other two
 * exist for the development-only Motion Lab, and for nothing else — a visual review on a machine
 * whose OS asks for reduced motion would otherwise be unable to see any of the choreography at all,
 * and every review of this product's motion had been comparing two different modes unknowingly.
 * No production code path ever calls `setMotionPreview`. */
export type MotionPreview = 'system' | 'normal' | 'reduced';
const preferenceListeners = new Set<() => void>();
let preview: MotionPreview = 'system';
let media: MediaQueryList | null = null;
function announce(): void {
    for (const listener of preferenceListeners)
        listener();
}
/** One media query, one change listener: the preference is reactive whether it comes from the OS
 * or from the preview seam. */
function ensureMedia(): MediaQueryList | null {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
        return null;
    if (!media) {
        media = window.matchMedia('(prefers-reduced-motion: reduce)');
        media.addEventListener('change', announce);
    }
    return media;
}
/** The resolved preference, read without React: an imperative sequence has no MotionConfig to
 * consult, so it consults the same source every hook below does. */
export function prefersReducedMotion(): boolean {
    if (preview === 'reduced')
        return true;
    if (preview === 'normal')
        return false;
    return ensureMedia()?.matches ?? false;
}
/** Development-only: force a motion mode so the Lab can show the real choreography on a machine
 * whose OS asks for reduced motion (and the reverse). Production never calls this. */
export function setMotionPreview(value: MotionPreview): void {
    if (preview === value)
        return;
    preview = value;
    announce();
}
export function motionPreview(): MotionPreview {
    return preview;
}
function subscribeToPreference(listener: () => void): () => void {
    preferenceListeners.add(listener);
    ensureMedia();
    return () => { preferenceListeners.delete(listener); };
}
/** The resolved preference as React state, so a sequence re-runs when it changes. */
export function useMotionReduced(): boolean {
    return useSyncExternalStore(subscribeToPreference, prefersReducedMotion, () => false);
}

/** Build a timeline scoped to `scope`; it is reverted when the dependencies change or on unmount.
 * Returns whether reduced motion is in force, so a caller can resolve the state without motion. */
export function useSignature(scope: RefObject<HTMLElement | null>, build: (root: HTMLElement, tl: gsap.core.Timeline) => unknown, dependencies: unknown[]): boolean {
    const reduced = useMotionReduced();
    useGSAP(() => {
        const root = scope.current;
        if (!root || reduced)
            return;
        const tl = gsap.timeline();
        build(root, tl);
        return () => { tl.kill(); };
    }, { scope, dependencies: [reduced, ...dependencies], revertOnUpdate: true });
    return reduced;
}

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

/* ---------------------------------------------------------------------------------------------
 * Imperative sequences
 * ------------------------------------------------------------------------------------------- */

/** A trigger for a one-shot sequence (a focus, a commit) rather than a state change.
 * The animations are created inside the `useGSAP` context, so they are reverted with the
 * component even when the trigger was called from an event handler.
 *
 * It calls `context.add(fn)` and NOT `contextSafe(fn)`, and that is not a style choice. Against
 * GSAP 3.15, `@gsap/react`'s `contextSafe` is implemented as `context.add(null, fn)`, and `add`
 * resolves a falsy name to "return the wrapper without running it" — so every one-shot sequence in
 * this product was a silent no-op: the invitation's contraction, the composer yielding on commit,
 * and the first Thought's flight were all *never built*, while the Motion Lab (which used to replay
 * them through Motion replicas) looked animated. The single-argument form runs the function
 * immediately *and* collects what it creates. `tests/unit/motion.test.ts` pins the difference. */
export function useSequencer(scope: RefObject<HTMLElement | null>): (build: (root: HTMLElement, tl: gsap.core.Timeline) => unknown) => void {
    const reduced = useMotionReduced();
    const running = useRef<gsap.core.Timeline | null>(null);
    const { context } = useGSAP({ scope });
    useEffect(() => () => { running.current?.kill(); running.current = null; }, []);
    return useCallback((build: (root: HTMLElement, tl: gsap.core.Timeline) => unknown) => {
        const root = scope.current;
        if (!root || reduced)
            return;
        context.add(() => {
            running.current?.kill();
            const tl = gsap.timeline();
            running.current = tl;
            build(root, tl);
        });
    }, [context, reduced, scope]);
}

/* ---------------------------------------------------------------------------------------------
 * Empty Field -> First Thought
 * --------------------------------------------------------------------------------------------- */

/** The invitation is alive while it waits, but only just: a breathing mark, not a loop of motion.
 * Deliberately decoration — it is `[data-decoration]`, so it can never become an interaction
 * target for the blank Field underneath. */
export function invitationIdleSequence(root: HTMLElement, tl: gsap.core.Timeline) {
    const mark = root.querySelector('.empty-invitation-mark');
    const line = root.querySelector('.empty-invitation-line');
    if (line)
        tl.from(line, { opacity: 0, y: 10, duration: duration('settle'), ease: ease('settle') }, 0);
    const eyebrow = root.querySelector('.empty-invitation-eyebrow');
    const hint = root.querySelector('.empty-invitation-hint');
    if (eyebrow)
        tl.from(eyebrow, { opacity: 0, duration: duration('surface'), ease: ease('enter') }, 0.06);
    if (hint)
        tl.from(hint, { opacity: 0, duration: duration('surface'), ease: ease('enter') }, 0.12);
    if (mark)
        tl.from(mark, { opacity: 0, scale: 0.7, duration: duration('surface'), ease: ease('enter') }, 0.18)
            // The breath: an ever-changing sine that never resolves, so the empty Field feels
            // awake rather than parked. Amplitude and rate are the whole effect.
            .to(mark, { y: -4, opacity: 0.55, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }, '>');
}
/** Writing begins: the invitation stops being an invitation and becomes the thing being
 * replaced. It contracts and gives up its secondary lines, while the line the user is answering
 * gains presence. Nothing here moves the textarea or delays focus. */
export function invitationContractSequence(root: HTMLElement, tl: gsap.core.Timeline) {
    const invitation = root.querySelector('.empty-invitation');
    if (!invitation)
        return;
    tl.to(invitation.querySelectorAll('.empty-invitation-hint, .empty-invitation-mark'), { opacity: 0, duration: duration('micro'), ease: ease('exit') }, 0)
        .to(invitation, { scale: 0.955, y: 8, opacity: 0.62, duration: duration('control'), ease: ease('move'), transformOrigin: 'center bottom' }, 0)
        .to(invitation.querySelector('.empty-invitation-line'), { opacity: 1, duration: duration('control'), ease: ease('enter') }, 0);
}
/** The invitation withdraws. Shared by both ways a first Thought arrives: written in the composer
 * (where the composer also yields) and placed by a blank-Field gesture (where the invitation is
 * the only thing that has to give way). */
function releaseInvitation(root: HTMLElement, tl: gsap.core.Timeline) {
    const invitation = root.querySelector('.empty-invitation');
    if (!invitation)
        return;
    const secondary = invitation.querySelectorAll('.empty-invitation-eyebrow, .empty-invitation-hint, .empty-invitation-mark');
    if (secondary.length)
        tl.to(secondary, { opacity: 0, y: -8, duration: duration('micro'), ease: ease('exit'), stagger: { each: 0.018, from: 'end' } }, 0);
    tl.to(invitation, { opacity: 0, y: -26, scale: 0.96, duration: duration('signature'), ease: ease('signature'), transformOrigin: 'center bottom' }, 0);
}
/** The composer half of the first Thought arriving. The written idea does not just appear next
 * to the input: the input first *yields*. The invitation's secondary lines withdraw, the
 * invitation itself lifts away, and the composer contracts (a transform, never a layout change)
 * before releasing the space the Thought is about to occupy. The contraction is a visible recoil
 * rather than a nudge: this is the one moment where the writing surface is meant to be seen
 * letting go of what was written in it.
 *
 * `root` is the `.speak-positioner` (the element the sequencer already scopes to), so the
 * contraction is applied to a wrapper Motion never transforms — the composer's own `> textarea`
 * is never touched and focus is never delayed. Play this in the same beat as
 * `useFirstThoughtEmergence` (whose `origin` is that same positioner) at commit time. */
export function firstThoughtComposerSequence(root: HTMLElement, tl: gsap.core.Timeline) {
    releaseInvitation(root, tl);
    tl.to(root, { scale: 0.958, y: 9, duration: duration('control'), ease: ease('move'), transformOrigin: 'center bottom' }, 0)
        .to(root, { scale: 1, y: 0, duration: duration('settle'), ease: ease('settle') }, duration('control') * 0.85)
        // The wrapper returns to identity whether the sequence finished or was interrupted, so it
        // is never left transformed.
        .set(root, { clearProps: 'transform' });
}
/** The thought half of the same moment: the first Thought travels from where the words were
 * written into its own resting place. It starts at a *measured* offset from the composer (the
 * origin element) toward the Thought's resting screen position, clamped so a zoomed Field cannot
 * launch an absurd flight, changes depth as it separates from the input, and finally resolves its
 * typography (letter-spacing and ink settling toward rest). The article's own inline world
 * transform is never touched — only its text child (a `p`, or the editor while it is being
 * written) is animated.
 *
 * Two shapes, because there are two real paths:
 *   `composer`  a flight from the writing surface into the Field: the long, watched travel.
 *   `placement` the Thought establishes itself where the gesture happened (a double-click, a
 *               right-click, dropped words): the same depth and typography resolution over a short
 *               local settle, because a flight measured from a pointer would be a lie about where
 *               the words came from. */
export type EmergeMode = 'composer' | 'placement';
const EMERGE_TRAVEL_MIN = 36;
const EMERGE_TRAVEL_MAX = 120;
const EMERGE_TRAVEL_FALLBACK = 78;
const EMERGE_LETTER_SPACING = 0.8;
const PLACEMENT_TRAVEL = 24;
/** Frames the arrival is allowed to wait for its own element. A Thought is rendered from React
 * state, and a commit is not promised inside one frame: on a first paint (a fresh Field, fonts
 * loading, the composer leaving) the element arrived several frames late, and the single-frame
 * deferral this used to have animated nothing at all — silently, and in the real product, while the
 * Lab showed an animation that the product never ran. Bounded so a Thought that never appears (it
 * was deleted, or the switch was refused) does not leave a rAF loop running. */
const EMERGE_WAIT_FRAMES = 24;
/** A Thought's own body: the rendered text, or the editor while it is being written in, one level
down inside `.thought-preview`.
 *
 * The wrapper is part of the Thought's real structure — `ThoughtView` owns the preview — so every
 * motion lookup names it. A direct-child lookup (`article > p`) matched nothing once the wrapper
 * landed, which silenced every sequence built on it with no error anywhere: the orchestration simply
 * had no target. */
function thoughtBody(article: Element): HTMLElement | null {
    return article.querySelector<HTMLElement>(':scope > .thought-preview > p, :scope > .thought-preview > textarea');
}
/** The Thought's own text element: the only thing an arrival may animate, because the article keeps
 * its inline world transform. */
function thoughtText(id: string): HTMLElement | null {
    if (typeof document === 'undefined')
        return null;
    const article = document.querySelector<HTMLElement>(`[data-thought-id="${CSS.escape(id)}"]`);
    return article ? thoughtBody(article) : null;
}
/** A Thought arriving, in one of the two shapes the product actually has (see `EmergeMode`). The
 * start state is applied with `gsap.set` in the same frame the element is found, before that frame
 * paints, so the words are never painted at rest and then thrown backwards: they are already
 * displaced on their first paint. */
export function firstThoughtEmergence(id: string, origin: HTMLElement | ScreenPoint | null, mode: EmergeMode = 'composer'): gsap.core.Timeline | null {
    const text = thoughtText(id);
    if (!text)
        return null;
    const target = text.getBoundingClientRect();
    const targetCenter = target.top + target.height / 2;
    const tl = gsap.timeline();
    if (mode === 'placement') {
        gsap.set(text, { opacity: 0, y: PLACEMENT_TRAVEL, scale: 0.94, letterSpacing: `${EMERGE_LETTER_SPACING * 0.6}px`, transformOrigin: 'left top' });
        tl.to(text,
            { opacity: 1, y: 0, scale: 1, letterSpacing: '0px', duration: duration('spatial'), ease: ease('settle') }, 0)
            .set(text, { clearProps: 'transform,opacity,letterSpacing' });
        return tl;
    }
    // A measured vertical offset from the composer toward the Thought's resting position. A point
    // origin (a remembered gesture) is used directly; a missing one falls back to a fixed, still
    // perceptible travel rather than none.
    const originY = origin ? ('getBoundingClientRect' in origin ? origin.getBoundingClientRect().top + origin.getBoundingClientRect().height / 2 : origin.y) : null;
    const raw = originY === null ? EMERGE_TRAVEL_FALLBACK : originY - targetCenter;
    const magnitude = clamp(Math.abs(raw), EMERGE_TRAVEL_MIN, EMERGE_TRAVEL_MAX);
    const travel = raw < 0 ? -magnitude : magnitude;
    gsap.set(text, { opacity: 0, y: travel, scale: 0.88, letterSpacing: `${EMERGE_LETTER_SPACING}px`, transformOrigin: 'left top' });
    tl.to(text,
        { opacity: 1, y: 0, scale: 1.012, letterSpacing: '0px', duration: duration('signature'), ease: ease('signature') }, 0)
        // A restrained overshoot, then the depth resolves to exactly 1: the Thought is placed, not
        // bounced.
        .to(text, { scale: 1, duration: duration('micro'), ease: ease('settle') }, duration('signature') * 0.82)
        .set(text, { clearProps: 'transform,opacity,letterSpacing' });
    return tl;
}
/** The first Thought of an empty Field arrives through the invitation it is replacing.
 *
 * It is a hook rather than a function because it needs both halves of the motion contract: the
 * user's reduced-motion preference, and a context that kills the tween if the Thought is gone
 * before it finishes. The element is waited for rather than assumed (see `EMERGE_WAIT_FRAMES`).
 *
 * `origin` is what the flight is measured from: the composer element (`.speak-positioner`) for the
 * written path, or the gesture's screen point for the placed one. It is optional: callers that do
 * not pass it still get a fixed, perceptible travel rather than no motion. */
export function useFirstThoughtEmergence(): (id: string, origin?: HTMLElement | ScreenPoint | null, mode?: EmergeMode) => void {
    const reduced = useMotionReduced();
    const running = useRef<gsap.core.Timeline | null>(null);
    const waiting = useRef<number | null>(null);
    const { context } = useGSAP();
    useEffect(() => () => {
        if (waiting.current !== null)
            cancelAnimationFrame(waiting.current);
        waiting.current = null;
        running.current?.kill();
        running.current = null;
    }, []);
    return useCallback((id: string, origin?: HTMLElement | ScreenPoint | null, mode: EmergeMode = 'composer') => {
        if (reduced)
            return;
        if (waiting.current !== null)
            cancelAnimationFrame(waiting.current);
        let frames = EMERGE_WAIT_FRAMES;
        const step = () => {
            waiting.current = null;
            if (!thoughtText(id)) {
                if (frames-- > 0)
                    waiting.current = requestAnimationFrame(step);
                return;
            }
            // `context.add(fn)`, never `contextSafe(fn)`: see `useSequencer`. The arrival must
            // actually be built, and this is the one place where a silent no-op is invisible.
            context.add(() => {
                running.current?.kill();
                running.current = firstThoughtEmergence(id, origin ?? null, mode);
            });
        };
        waiting.current = requestAnimationFrame(step);
    }, [context, reduced]);
}

/* ---------------------------------------------------------------------------------------------
 * Field switch
 * --------------------------------------------------------------------------------------------- */

/** Leaving is part of entering: before the project swaps, the outgoing Field recedes. Visible
 * Thoughts lose presence and drift *outward* from the viewport centre (computed per element,
 * applied to the Thought's text child — never its canonical coordinates, never the article's world
 * transform), nearest first so the departure reads as the place coming apart, the identity lifts
 * away, and the atmosphere drains.
 *
 * This is presentation only: the swap must never depend on it completing, so it is safe to kill
 * at any moment. It returns its own timeline (the caller owns it and kills it on the swap) and
 * resolves to `null` under reduced motion, so a caller can build no sequence at all. */
const DEPARTURE_SPREAD = 26;
const DEPARTURE_DEPTH = 0.985;
const DEPARTURE_STAGGER_CAP = 16;
export function fieldDepartureSequence(root: HTMLElement): gsap.core.Timeline | null {
    if (typeof document === 'undefined' || !root || prefersReducedMotion())
        return null;
    const centreX = window.innerWidth / 2;
    const centreY = window.innerHeight / 2;
    // The tweens are created inside a GSAP context, so one revert removes all of them, and the
    // timeline is returned so the caller owns the kill: the swap must never wait on this finishing.
    let timeline!: gsap.core.Timeline;
    gsap.context(() => {
        const tl = timeline = gsap.timeline();
        const measured = Array.from(root.querySelectorAll('.thought')).filter(element => !element.closest('.ghost,.recall')).slice(0, 48).map(article => {
            const text = thoughtBody(article);
            const rect = article.getBoundingClientRect();
            const dx = rect.left + rect.width / 2 - centreX;
            const dy = rect.top + rect.height / 2 - centreY;
            return { text, dx, dy, distance: Math.hypot(dx, dy) || 1 };
        }).filter(entry => entry.text);
        // Nearest first: the place comes apart from where the person is standing outward.
        measured.sort((a, b) => a.distance - b.distance);
        for (const [index, entry] of measured.entries()) {
            tl.to(entry.text, {
                x: (entry.dx / entry.distance) * DEPARTURE_SPREAD,
                y: (entry.dy / entry.distance) * DEPARTURE_SPREAD - 6,
                scale: DEPARTURE_DEPTH, opacity: 0,
                duration: duration('surface'), ease: ease('exit'),
            }, Math.min(index, DEPARTURE_STAGGER_CAP) * 0.008);
        }
        const identity = root.querySelector('.identity');
        if (identity)
            tl.to(identity, { opacity: 0, y: -16, duration: duration('surface'), ease: ease('exit') }, 0);
        const atmosphere = root.querySelector('.atmosphere');
        if (atmosphere)
            tl.to(atmosphere, { opacity: 0.2, duration: duration('settle'), ease: ease('settle') }, 0);
    }, root);
    return timeline;
}
/** Arriving in another Field: the veil lifts, the identity settles in, the atmosphere comes back
 * to rest, and the thoughts that are already visible come up through the surface in small groups
 * rather than one flat stagger. Every animated property belongs to GSAP alone (the veil, the
 * title's opacity/offset, the word element of a Thought); the world transform and the camera are
 * untouched, and the veil never owns pointer input.
 *
 * The veil rests at `opacity: 0` and the sequence raises it before lowering it, so a run that
 * never happens (reduced motion) leaves the Field fully visible instead of hidden behind an
 * opaque rectangle.
 *
 * Total arrival is bounded around half a second, so a whole Field switch (departure + arrival)
 * lands inside the 500–900 ms the product promises and stays interruptible throughout. */
const THOUGHT_GROUP = 3;
export function fieldSwitchSequence(root: HTMLElement, tl: gsap.core.Timeline) {
    const veil = root.querySelector('.field-arrival');
    const atmosphere = root.querySelector('.atmosphere');
    const eyebrow = root.querySelector('.identity-eyebrow');
    const title = root.querySelector('.identity-title');
    // A ghost or a recalled Thought is a Motion-owned presence; only committed text is ours, and
    // committed text is the paragraph inside the Thought's own `.thought-preview`.
    const thoughts = Array.from(root.querySelectorAll('.thought > .thought-preview > p')).filter(element => !element.closest('.ghost,.recall')).slice(0, 48);
    if (veil)
        tl.fromTo(veil, { opacity: 1 }, { opacity: 0, duration: duration('settle'), ease: ease('settle') }, 0);
    // The atmosphere briefly holds a little more presence, then settles: the place is lit before
    // it is read. It always ends at rest, never leaving the Field lit oddly.
    if (atmosphere)
        tl.fromTo(atmosphere, { opacity: 0.45 }, { opacity: 1, duration: duration('settle'), ease: ease('settle') }, 0);
    if (eyebrow)
        tl.from(eyebrow, { opacity: 0, y: 5, duration: duration('surface'), ease: ease('enter') }, 0.05);
    if (title)
        tl.from(title, { opacity: 0, y: 12, duration: duration('settle'), ease: ease('settle') }, 0.08);
    const caption = root.querySelector('.identity-arrival');
    if (caption)
        tl.from(caption, { opacity: 0, duration: duration('settle'), ease: ease('settle') }, 0.24);
    // Thoughts emerge in small groups, so the Field reads as filling in rather than a list
    // mounting. Each group is a few neighbours; the beat between groups shortens as the Field gets
    // busier, so the whole arrival keeps one bounded length whatever is on screen.
    const groups = Math.max(1, Math.ceil(thoughts.length / THOUGHT_GROUP));
    const beat = Math.min(0.055, 0.2 / groups);
    for (let index = 0; index < thoughts.length; index += THOUGHT_GROUP) {
        const group = thoughts.slice(index, index + THOUGHT_GROUP);
        tl.from(group, { opacity: 0, y: 22, scale: 0.97, duration: duration('surface'), ease: ease('enter'), transformOrigin: 'left top', stagger: { each: 0.014, from: 'start' } }, 0.14 + (index / THOUGHT_GROUP) * beat);
    }
    // An empty Field offers its invitation as part of the same arrival, never as a late pop-in.
    const invitation = root.querySelector('.empty-invitation');
    if (invitation)
        tl.from(invitation, { opacity: 0, y: 20, scale: 0.98, duration: duration('settle'), ease: ease('settle') }, 0.2);
}

/* ---------------------------------------------------------------------------------------------
 * Settings open / close
 * --------------------------------------------------------------------------------------------- */

/** Opening Settings is deliberately two beats: the navigation settles first, then the section the
 * navigation points at appears. `root` is the Settings surface root (`.settings-layout` lives
 * inside it), called from `Workspace.tsx` as `ui.surface` becomes `'settings'`; the surface still
 * owns input immediately either way. */
export function settingsEnterSequence(root: HTMLElement, tl: gsap.core.Timeline) {
    const tabs = root.querySelectorAll('.settings-nav-tab');
    const nav = root.querySelector('.settings-nav');
    const section = root.querySelector('.settings-section:not([hidden])') ?? root.querySelector('.settings-section');
    // Beat one: the navigation, and this time you can see it arrive — a place settling into its own
    // shape is the half that says "Settings is now the active place".
    if (tabs.length)
        tl.from(tabs, { opacity: 0, x: -10, duration: duration('control'), ease: ease('enter'), stagger: { each: 0.025, from: 'start' }, clearProps: 'transform,opacity' }, 0);
    else if (nav)
        tl.from(nav, { opacity: 0, x: -10, duration: duration('surface'), ease: ease('enter'), clearProps: 'transform,opacity' }, 0);
    // Beat two: the content the navigation settled on. Opacity only, deliberately: this panel
    // *contains* the controls, and an inline `transform` here would make it a containing block for
    // the portalled Select popup and shift the measured geometry of everything inside it. The
    // second beat is a change of presence, not of position. Props are cleared when the beat ends.
    if (section)
        tl.from(section, { opacity: 0, duration: duration('settle'), ease: ease('settle'), clearProps: 'opacity' }, duration('control') + 0.08);
}
/** The Field behind a place acknowledges it arriving. The *held* recede — the Field staying a
 * little less present for as long as Settings owns input — is a CSS state derived from
 * `data-active-surface`, so it survives the whole visit and reverses when the place closes; an
 * animation cannot hold a state it is not running. What GSAP owns here is only the arrival beat:
 * a brief pull-back of the Field's *transform* that resolves home, plus the atmosphere's dip.
 *
 * `appRoot` is the `.app` element. The Field's own pointer math reads its rect, so its transform is
 * always cleared (`clearProps`) and it is never left scaled; opacity is left entirely to CSS. */
export function settingsRecedeSequence(appRoot: HTMLElement, tl: gsap.core.Timeline) {
    const field = appRoot.querySelector('.field');
    const atmosphere = appRoot.querySelector('.atmosphere');
    if (field)
        tl.fromTo(field, { scale: 1 }, { scale: 0.986, duration: duration('control'), ease: ease('move') }, 0)
            .to(field, { scale: 1, duration: duration('settle'), ease: ease('settle') }, duration('control'))
            .set(field, { clearProps: 'transform' });
    if (atmosphere)
        tl.fromTo(atmosphere, { opacity: 1 }, { opacity: 0.55, duration: duration('control'), ease: ease('move') }, 0)
            .to(atmosphere, { opacity: 1, duration: duration('settle'), ease: ease('settle') }, duration('control'));
}

/* ---------------------------------------------------------------------------------------------
 * History reveal
 * --------------------------------------------------------------------------------------------- */

/** How did this form? The answer is a hierarchy, so it arrives as one: the overview lands first,
 * then the structure (the scope, the day markers and their spine), then the events fill in. It
 * reads as recovering how the Field formed, not as a list mounting. Only the surface's own
 * content is animated — opening the surface still owns input immediately. */
export function historyRevealSequence(root: HTMLElement, tl: gsap.core.Timeline) {
    const overview = root.querySelectorAll('.history-overview li');
    const scope = root.querySelectorAll('.history-scope-item');
    const dayRows = root.querySelectorAll('.history-day-row');
    const days = root.querySelectorAll('.history-day');
    const events = root.querySelectorAll('.history-event');
    if (overview.length)
        tl.from(overview, { opacity: 0, y: 6, duration: duration('micro'), ease: ease('enter'), stagger: { each: 0.03, from: 'start' } }, 0);
    if (scope.length)
        tl.from(scope, { opacity: 0, y: 8, duration: duration('surface'), ease: ease('settle'), stagger: { each: 0.04, from: 'start' } }, duration('micro') * 1.5);
    // The structure: day markers and their spine arrive together, a clear beat after the overview.
    if (dayRows.length || days.length)
        tl.from(dayRows.length ? dayRows : days, { opacity: 0, x: -12, duration: duration('surface'), ease: ease('enter'), stagger: { each: 0.07, from: 'start' } }, duration('surface') * 1.4);
    if (events.length)
        tl.from(events, { opacity: 0, y: 8, duration: duration('spatial'), ease: ease('settle'), stagger: { each: 0.016, from: 'start' } }, duration('surface') * 2.2);
}

registerSignature();
