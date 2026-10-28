import type { Ghost, Thought } from '../../core/model.ts';

/** Display eligibility, not authorship or truth. Generic Diffuse has provider provenance but
 * no generationAction: that field records causal actions and must not be fabricated for UI. */
export function generatedReading(item: Thought | Ghost | undefined): boolean {
    if (!item || item.origin?.inputId || item.origin?.ranges?.length || item.origin?.sourceId || item.origin?.url) return false;
    if (!('kind' in item)) return !item.proposal;
    return item.kind === 'thought' && !item.sourceId
        && !!(item.generationAction || item.origin?.projectId && item.origin.note);
}
