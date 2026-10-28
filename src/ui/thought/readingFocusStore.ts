import { useSyncExternalStore } from 'react';
import type { FocusReadingResult } from '../../ai/readingFocus.ts';

export const propositionTrialEnabled = () => typeof location !== 'undefined' && new URLSearchParams(location.search).get('propositionTrial') === '1';
export const readingTrialEnabled = () => typeof location !== 'undefined' && (new URLSearchParams(location.search).get('readingTrial') === '1' || propositionTrialEnabled());
interface Entry { text: string; result: FocusReadingResult; }
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** Bounded session-only presentation. Never substitutes for canonical text or crosses a text edit. */
export function rememberReadingFocus(id: string, text: string, result: FocusReadingResult) {
    entries.delete(id); entries.set(id, { text, result });
    while (entries.size > 24) entries.delete(entries.keys().next().value!);
    for (const listener of listeners) listener();
}
export function readReadingFocus(id: string, text: string) {
    const entry = entries.get(id); return entry?.text === text ? entry.result : undefined;
}
export function useReadingFocus(id: string, text: string) {
    return useSyncExternalStore(subscribe, () => readingTrialEnabled() ? readReadingFocus(id, text) : undefined, () => undefined);
}
