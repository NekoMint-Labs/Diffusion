import { useEffect, useMemo, useState } from 'react';
import type { ProjectState } from '../../core/model.ts';
import { findMatches } from './matching.ts';
/** One Find session: query, ordered matches and explicit navigation.
 * State is local to the open Find surface and never persists into the Field.
 */
export function useFindInField({ project, reveal }: {
    project: ProjectState;
    reveal: (ids: string[]) => void;
}) {
    const [session, setSession] = useState({ query: '', index: 0 });
    const matches = useMemo(() => findMatches(project, session.query), [project, session.query]);
    const matchSet = useMemo(() => new Set(matches), [matches]);
    const current = matches.length ? matches[session.index % matches.length] : null;
    useEffect(() => { if (session.index >= matches.length && matches.length)
        setSession(value => ({ ...value, index: 0 })); }, [matches, session.index]);
    return {
        query: session.query,
        index: session.index,
        matches,
        matchSet,
        current,
        search: (query: string) => setSession({ query, index: 0 }),
        /** Find state is not persisted: closing the surface forgets the query. */
        reset: () => setSession({ query: '', index: 0 }),
        step: (delta: number) => {
            if (!matches.length)
                return;
            const index = (session.index + delta + matches.length) % matches.length;
            setSession({ query: session.query, index });
            reveal([matches[index]]);
        },
        focusMatch: (key: string) => {
            const index = matches.indexOf(key);
            if (index < 0)
                return;
            setSession({ query: session.query, index });
            reveal([key]);
        },
    };
}
