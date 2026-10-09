import type { Ghost, ThinkingOperation } from '../../core/model.ts';

/** Mounted correction owns only the latest arrival request, never an older displayed batch.
 * Capture controller emissions before mounting: ordinary requests have no Ghost.runId and their
 * results arrive across multiple frames. Unknown/restored proposals are conservatively fixed. */
export class ProposalArrivals {
    private batches = new Map<string, string | null>();
    private active: string | null = null;
    constructor(ghosts: Record<string, Ghost> = {}) {
        for (const key of Object.keys(ghosts)) this.batches.set(key, null);
    }
    observe(ghosts: Record<string, Ghost>, operation: ThinkingOperation | null): void {
        for (const key of this.batches.keys()) if (!ghosts[key]) this.batches.delete(key);
        if (operation?.phase === 'pending') this.active = operation.id;
        for (const key of Object.keys(ghosts)) if (!this.batches.has(key))
            this.batches.set(key, operation?.phase === 'pending' ? operation.id : null);
    }
    batch(key: string): string | null {
        const batch = this.batches.get(key);
        return batch && batch === this.active ? batch : null;
    }
    /** Selecting/reading a proposal gives its position to the person, even after deselection. */
    protect(keys: readonly string[]): void {
        for (const key of keys) if (this.batches.has(key)) this.batches.set(key, null);
    }
}
