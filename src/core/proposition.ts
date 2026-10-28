/** Optional display text bound to the exact complete original, never a substitute for it.
 * Exact comparison avoids hash collisions and platform crypto in synchronous Core validation.
 * The duplicate body is bounded by the existing 20,000-character original limit. */
export interface Proposition { version: 1; text: string; original: string; }
export function validProposition(value: unknown, original: string): value is Proposition {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const p = value as Record<string, unknown>;
    return Object.keys(p).length === 3 && p.version === 1 && typeof p.text === 'string'
        && !!p.text.trim() && Array.from(p.text).length <= 120
        && typeof p.original === 'string' && p.original.length <= 20000 && p.original === original;
}
export function bindProposition(text: string, original: string): Proposition | undefined {
    const value = { version: 1 as const, text, original };
    return validProposition(value, original) ? value : undefined;
}
