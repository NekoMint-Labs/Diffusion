export interface ResponseDraft {
    text: string;
    scope: string[];
    updatedAt: number;
}

const RESPONSE_DRAFT_PREFIX = 'diffusion-response-draft:';
const key = (projectId: string) => `${RESPONSE_DRAFT_PREFIX}${projectId}`;

/** A response keeps its original scope even if an endpoint has since been removed.
 * The composer explains missing references; it must never silently reassign authored text. */
export function readResponseDraft(projectId: string): ResponseDraft | null {
    try {
        const raw = localStorage.getItem(key(projectId));
        if (!raw) return null;
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== 'object') return null;
        const draft = value as Partial<ResponseDraft>;
        if (typeof draft.text !== 'string' || !draft.text.trim() || draft.text.length > 12000
            || !Array.isArray(draft.scope) || !draft.scope.length || draft.scope.length > 32
            || draft.scope.some(id => typeof id !== 'string' || !id || id.length > 256)) return null;
        return { text: draft.text, scope: [...new Set(draft.scope)], updatedAt: typeof draft.updatedAt === 'number' ? draft.updatedAt : 0 };
    }
    catch { return null; }
}

export function clearResponseDraft(projectId: string): boolean {
    try { localStorage.removeItem(key(projectId)); return true; }
    catch { return false; }
}

export function writeResponseDraft(projectId: string, text: string, scope: string[]): boolean {
    if (!text.trim()) return clearResponseDraft(projectId);
    try { localStorage.setItem(key(projectId), JSON.stringify({ text, scope, updatedAt: Date.now() })); return true; }
    catch { return false; }
}

export function sameResponseScope(a: string[] | null, b: string[]): boolean {
    return !!a && a.length === b.length && b.every(id => a.includes(id));
}
