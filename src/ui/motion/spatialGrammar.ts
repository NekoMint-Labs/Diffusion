import { id, type InputRange, type Thought } from '../../core/model.ts';
import type { ProjectController } from '../../core/controller.ts';
import { useUI } from '../store.ts';
import { MOTION_DURATION } from './tokens.ts';

/** The product vocabulary for motion. These names describe presentation, never semantic truth. */
export const SPATIAL_GRAMMAR = {
    create: 'emerge', decompose: 'unfold', explore: 'radiate', relate: 'bridge', verify: 'anchor',
    recall: 'surface', bring: 'arrive', crystallize: 'converge', reject: 'dissolve', commit: 'settle',
} as const;

export type SpatialTransitionKind = 'converge' | 'dissolve' | 'settle' | 'arrive';

/** Request-owned local transition. A late timer can only clear the transition it created. */
export function presentSpatialTransition(kind: SpatialTransitionKind, scopeIds: string[], duration = MOTION_DURATION.spatial * 1000, material = false): string {
    const transitionId = id('motion');
    useUI.getState().patch({ spatialTransition: { id: transitionId, kind, scopeIds: [...scopeIds], ...(material ? { material: true as const } : {}) } });
    if (duration <= 0) {
        if (useUI.getState().spatialTransition?.id === transitionId) useUI.getState().patch({ spatialTransition: null });
        return transitionId;
    }
    setTimeout(() => {
        if (useUI.getState().spatialTransition?.id === transitionId) useUI.getState().patch({ spatialTransition: null });
    }, duration);
    return transitionId;
}

export function inputHighlightText(text: string, ranges: InputRange[] | undefined): Array<{ text: string; highlighted: boolean }> {
    if (!ranges?.length) return [{ text, highlighted: false }];
    const normalized = ranges
        .map(range => ({ start: Math.max(0, Math.min(text.length, range.start)), end: Math.max(0, Math.min(text.length, range.end)) }))
        .filter(range => range.end > range.start)
        .sort((a, b) => a.start - b.start);
    if (!normalized.length) return [{ text, highlighted: false }];
    const out: Array<{ text: string; highlighted: boolean }> = [];
    let cursor = 0;
    for (const range of normalized) {
        if (range.start > cursor) out.push({ text: text.slice(cursor, range.start), highlighted: false });
        out.push({ text: text.slice(Math.max(cursor, range.start), range.end), highlighted: true });
        cursor = Math.max(cursor, range.end);
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor), highlighted: false });
    return out.filter(part => part.text.length > 0);
}

export function presentMaterialSettle(scopeIds: string[]): string {
    return presentSpatialTransition('settle', scopeIds, MOTION_DURATION.spatial * 1000, true);
}

export function claimWithSettle(controller: ProjectController, key: string): Thought | null {
    if (controller.getSnapshot().session.ghosts[key]) presentMaterialSettle([key]);
    return controller.claim(key);
}

export function dismissGhostWithDissolve(controller: ProjectController, key: string, onRemoved?: () => void): void {
    presentSpatialTransition('dissolve', [key]);
    const remove = () => { controller.dismissGhost(key); onRemoved?.(); };
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) remove();
    else setTimeout(remove, 150);
}
