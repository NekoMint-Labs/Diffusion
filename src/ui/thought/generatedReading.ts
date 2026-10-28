import type { Ghost, Thought } from '../../core/model.ts';

/** Display eligibility, not factual endorsement. Only explicit generation metadata qualifies;
 * Fork/Bring provenance applies equally to hand-written content and must never grant access. */
export function generatedReading(item: Thought | Ghost | undefined): boolean {
    if (!item || item.origin?.inputId || item.origin?.ranges?.length || item.origin?.sourceId || item.origin?.url) return false;
    if (!('kind' in item)) return !item.proposal && !!item.proposalKind;
    return item.kind === 'thought' && !item.sourceId
        && item.generatedBy === 'ai';
}
