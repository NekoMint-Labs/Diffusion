import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { t } from '../../shared/i18n.ts';
import { useUI } from '../store.ts';
import type { Settings } from '../settings.ts';
import { contentTransition, layoutTransition } from '../motion.ts';
import { MOTION_DURATION } from '../motion/tokens.ts';
import { firstThoughtComposerSequence, invitationContractSequence, invitationIdleSequence, useSequencer, useSignature } from '../motion/signature.ts';
import { COMPOSER_SHORTCUT, composerState } from './composer.ts';

const SPEAK_MAX_HEIGHT = 108;
const SPEAK_MIN_HEIGHT = 24;
/** The invitation stays for one short beat after a commit so its release is visible. The hold is
 * derived from the sequence's own duration role rather than a second copy of it: the release is
 * `duration('signature')`, and a hand-written hold here silently cut it in half the moment that
 * retune landed. */
const RELEASE_HOLD = MOTION_DURATION.signature * 1000;
/** The first-use invitation.
 *
 * Decoration only: it carries no pointer ownership, no selection and no interactive descendant,
 * so a blank-Field gesture stays a Field gesture. It is one composed block that is *alive* —
 * a breathing mark while it waits, a contraction when writing begins, a release when the
 * decision is made — and that choreography is an authored GSAP sequence rather than a pile of
 * per-element transitions. Its parts are already real elements, so their text is never split:
 * the accessibility surface of an invitation is not worth a re-split for a reveal nobody reads
 * character by character.
 */
function EmptyFieldInvitation() {
    return <div className="empty-invitation" aria-hidden="true" data-decoration="empty-field">
        <p className="empty-invitation-eyebrow">{t('An empty Field')}</p>
        <p className="empty-invitation-line">{t('Write down a thought')}</p>
        <p className="empty-invitation-hint">{t('Or paste something you are still thinking through.')}</p>
        <span className="empty-invitation-mark" aria-hidden="true">&#8595;</span>
    </div>;
}
/** A temporary expression surface. The workspace owns its draft and intent; this owns how the
 * object looks while it is being written in, and nothing about what a submission means.
 *
 * Idle, it is part of the Field: a caret mark and a short anchor tick, low in weight, obviously
 * interactive. Focused, it *materializes* into a thin writing surface with stronger text presence,
 * one soft illumination layer and one compact action. Scoped, it says what the next thinking
 * action acts on, in the same dot vocabulary the Scope Hub uses. The keyboard contract is not a
 * permanent legend here — the Shortcuts and Help surfaces own it — so the only disclosure is a
 * tertiary Shift+Enter cue inside the focused writing row.
 */
export function Speak({ textareaRef, words, onWords, onSubmit, onStop, onCompose, onExit, composing, empty, typography, scopeIds }: {
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    words: string;
    onWords: (value: string) => void;
    onSubmit: () => void;
    onStop: () => void;
    onCompose: () => void;
    onExit: () => void;
    composing: boolean;
    empty: boolean;
    typography: Settings['thoughtTypography'];
    scopeIds: string[];
}) {
    const busy = useUI(state => state.busy);
    const reduced = useReducedMotion();
    const positioner = useRef<HTMLDivElement>(null);
    const [inputHeight, setInputHeight] = useState(SPEAK_MIN_HEIGHT);
    const [overflowing, setOverflowing] = useState(false);
    /** The invitation stays for one short beat after a commit so its release is visible. It has
     * already stopped owning anything: it is `aria-hidden`, `pointer-events: none` and
     * `data-decoration`, so no gesture can reach it while it is leaving. */
    const [releasing, setReleasing] = useState(false);
    const play = useSequencer(positioner);
    const scoped = scopeIds.length > 0;
    const state = composerState({ composing, scoped, words, busy });
    useSignature(positioner, invitationIdleSequence, [empty, composing]);
    // Focus follows the intent, not the mount. `AnimatePresence` revives this same key when a
    // scope is re-set before the exit finishes, and React applies `autoFocus` only on mount, so
    // the writing surface could appear with `composing` true and no focus (v0.3.2 record §e2e).
    useEffect(() => {
        if (composing)
            textareaRef.current?.focus();
    }, [composing, textareaRef]);
    // Measure only this local writing surface. The state update lets Motion see
    // the resulting layout change instead of racing a one-off DOM transition.
    useLayoutEffect(() => {
        const input = textareaRef.current;
        if (!input)
            return;
        const previous = input.style.height;
        input.style.height = 'auto';
        const nextHeight = Math.max(SPEAK_MIN_HEIGHT, Math.min(SPEAK_MAX_HEIGHT, input.scrollHeight));
        const nextOverflow = input.scrollHeight > SPEAK_MAX_HEIGHT;
        input.style.height = previous;
        setInputHeight(current => current === nextHeight ? current : nextHeight);
        setOverflowing(current => current === nextOverflow ? current : nextOverflow);
    }, [words, typography, textareaRef]);
    useEffect(() => { if (!releasing)
        return; const timer = setTimeout(() => setReleasing(false), RELEASE_HOLD); return () => clearTimeout(timer); }, [releasing]);
    /** The one action, always present while writing: `↵ 思考` says what committing does. It is the
     * surface's own control, so its accessible name is exactly its visible label. */
    const action = composing ? busy ? { key: 'stop', label: t('Stop'), type: 'button' as const, run: onStop }
        : { key: 'think', label: t('Think'), type: 'submit' as const, run: undefined } : null;
    /** The one gesture the whole invitation exists for: commit, then let it release. The first
     * Thought of an empty Field gets the authored two-part sequence — the composer yields the
     * space and the written idea separates from it — while later submissions only release. */
    function commit() {
        if (empty) {
            setReleasing(true);
            play(firstThoughtComposerSequence);
        }
        onSubmit();
    }
    return <div className="speak-positioner" ref={positioner} data-composing={composing || undefined}><LayoutGroup id="speak-surface">
        {/* The invitation stays while the Field is empty, including while it is being answered:
            it contracts as writing begins and releases when the Thought is committed, which is the
            whole point of it. `releasing` covers the moment after the commit, when the Field is no
            longer empty but the release is still on screen as a visual echo. */}
        {(empty || releasing) && <EmptyFieldInvitation/>}
        <motion.form layout data-testid="speak" className="speak" data-composing={composing} data-state={state} data-scope-active={scoped || undefined} initial={composing ? { opacity: reduced ? 1 : 0, y: reduced ? 0 : 2 } : false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : 5, pointerEvents: 'none' }} transition={{ layout: layoutTransition(!!reduced), ...contentTransition(!!reduced) }} onPointerDown={event => {
            if (event.button !== 0 || (event.target as HTMLElement).closest('textarea,button'))
                return;
            event.preventDefault();
            textareaRef.current?.focus();
        }} onFocus={() => {
            useUI.getState().patch({ speakFocused: true });
            if (!composing) {
                play(invitationContractSequence);
                onCompose();
            }
        }} onBlur={event => {
            if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
                return;
            useUI.getState().patch({ speakFocused: false });
            onExit();
        }} onSubmit={event => { event.preventDefault(); commit(); }}>
            <motion.div layout className="speak-shell" transition={{ layout: layoutTransition(!!reduced) }}>
                {/* The illumination layer. CSS-only, opacity 0 at rest: it fades in *with* the
                    material, so the surface reads as one lit object rather than a flat rectangle. */}
                <span className="speak-light" aria-hidden="true"/>
                {composing && scoped && <span className="speak-scope" data-testid="speak-scope">{t(scopeIds.length === 1 ? 'Thinking with this thought' : 'Thinking with {count} thoughts', { count: scopeIds.length })}</span>}
                <motion.div layout="position" className="speak-row" transition={{ layout: layoutTransition(!!reduced) }}>
                    {!composing && <span className="speak-mark" aria-hidden="true"/>}
                    <textarea ref={textareaRef} aria-label={t('Speak')} placeholder={t(composing ? 'Write down something not yet clear...' : empty ? 'Write or paste a thought...' : 'Continue thinking...')} value={words} rows={1} maxLength={12000} data-overflowing={overflowing} style={{ height: inputHeight, overflowY: overflowing ? 'auto' : 'hidden' }} onChange={event => onWords(event.target.value)} onKeyDown={event => {
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            event.stopPropagation();
                            onExit();
                            textareaRef.current?.blur();
                            return;
                        }
                        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                            event.preventDefault();
                            commit();
                        }
                    }}/>
                    {composing && <span className="speak-shortcut" aria-hidden="true"><kbd>{COMPOSER_SHORTCUT.keys[0]}</kbd>{'+'}<kbd>{COMPOSER_SHORTCUT.keys[1]}</kbd><span>{t(COMPOSER_SHORTCUT.label)}</span></span>}
                    {action && <motion.button key={action.key} className="speak-action" type={action.type} onClick={action.run} initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : 1 }} transition={contentTransition(!!reduced)}>
                        <span className="speak-action-key" aria-hidden="true">&#8629;</span><span className="speak-action-label">{action.label}</span>
                    </motion.button>}
                </motion.div>
            </motion.div>
        </motion.form>
    </LayoutGroup></div>;
}
