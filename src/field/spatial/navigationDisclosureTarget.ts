/** Follow explicitly collapsed branches without expanding them as a Find side effect. */
export function navigationDisclosureTarget(id: string | null | undefined, parents: ReadonlyMap<string, string | null>, branches: Readonly<Record<string, boolean>> = {}): string | null {
    if (!id || !parents.has(id)) return null;
    let target = id, ancestor = parents.get(id);
    const seen = new Set([id]);
    while (ancestor && !seen.has(ancestor)) {
        seen.add(ancestor);
        if (branches[ancestor] === false) target = ancestor;
        ancestor = parents.get(ancestor);
    }
    return target;
}
