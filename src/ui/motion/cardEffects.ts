/** Explicit visual trial: no settings, model, or persistent content changes. */
export function glassEffectsEnabled(): boolean {
    return typeof document !== 'undefined' && document.documentElement.dataset.cardEffects === 'glass';
}
