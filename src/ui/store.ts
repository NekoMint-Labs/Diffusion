import { create } from 'zustand';
import type { Camera, InputRange, Point, ThinkingOperation } from '../core/model.ts';
import { transientPatch, type TransientState } from './transient.ts';
import type { NoticeAction } from './workspace/feedback.ts';
export type { Surface } from './transient.ts';
export interface ReturnPoint {
    camera: Camera;
    selection: string[];
}
interface UIState extends TransientState {
    selection: string[];
    editing: string | null;
    threadId: string | null;
    sourceId: string | null;
    regionId: string | null;
    handoffId: string | null;
    relationId: string | null;
    returnPoint: ReturnPoint | null;
    theme: 'system' | 'light' | 'dark';
    dragging: boolean;
    speakFocused: boolean;
    carry: string[];
    anchor: Point | null;
    notice: string;
    /** Feedback is one line with one tone. Ordinary acknowledgement settles on its own; a failure
     * stays until it is answered. Never a queue, never a toast stack. */
    noticeTone: 'info' | 'error';
    /** The single action a notice may offer. Stored as a *kind*, never a callback: the surface that
     * renders the line decides what the action does, so no closure is smuggled through state. */
    noticeAction: NoticeAction | null;
    busy: boolean;
    /** The words a person just submitted, held in view while the structure of them is asked for.
     *
     * It is the local acknowledgement of the person's own input on a path whose structure has not
     * arrived yet. The words are already durable as an `InputRecord`, so this is presentation only:
     * it is never a Ghost (that means an AI possibility) and never canonical Field content. It is
     * owned by the request that raised it — only that request may clear it. */
    structuring: { inputId: string; text: string; point: Point; requestId?: string; phase: 'active' | 'partial' | 'settling'; highlight?: InputRange[]; proposalIds?: string[] } | null;
    /** One short-lived authored presentation bridge. Canonical objects never move through this state. */
    spatialTransition: { id: string; kind: 'converge' | 'dissolve' | 'settle' | 'arrive'; scopeIds: string[]; material?: true } | null;
    /** Request-id-aware source of truth for AI work. `busy` is only a compatibility projection. */
    operation: ThinkingOperation | null;
    patch: (p: Partial<Omit<UIState, 'patch' | 'select'>>) => void;
    select: (id: string, extend?: boolean) => void;
}
export const useUI = create<UIState>((set) => ({
    selection: [], editing: null, surface: 'none', menu: null, transientEpoch: 0, threadId: null, sourceId: null, regionId: null, handoffId: null, relationId: null, returnPoint: null,
    theme: 'system', dragging: false, speakFocused: false, carry: [], anchor: null, notice: '', noticeTone: 'info', noticeAction: null, busy: false, operation: null, structuring: null, spatialTransition: null,
    patch: (p) => set(state => transientPatch(state, p)), select: (key, extend = false) => set(s => ({ selection: extend ? (s.selection.includes(key) ? s.selection.filter(k => k !== key) : [...s.selection, key]) : [key] })),
}));

