const cancellers = new Map<string, () => void>();

/** Cancellation is request-scoped, not stored in UI state. The presentation can ask to stop a
 * visible operation by id without retaining provider/surface closures inside Zustand. */
export function registerOperationCancellation(id: string, cancel: () => void): () => void {
    cancellers.set(id, cancel);
    return () => { if (cancellers.get(id) === cancel) cancellers.delete(id); };
}

export function canCancelThinkingOperation(id: string): boolean { return cancellers.has(id); }
export function cancelThinkingOperation(id: string): boolean {
    const cancel = cancellers.get(id);
    if (!cancel) return false;
    cancel();
    return true;
}
