import type { ProjectState, SessionState } from '../core/model.ts';
import type { SemanticIntent } from '../core/semantics.ts';

type ProposedRelation = Extract<SemanticIntent, { type: 'surface_structure' }>['relations'][number];
const identity = (relation: ProposedRelation) => JSON.stringify([
    [relation.a, relation.b].sort(), relation.kind,
    relation.label.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/gu, ' '),
]);

/** Exact duplicate wording is not a second relation. Different interpretations remain reviewable.
 * Invalid relation wording never discards independently useful reading groups or unresolved notes. */
export function omitRepeatedRelations(candidate: SemanticIntent, project: ProjectState, session: SessionState,
    wordingAllowed: (label: string, explanation?: string) => boolean, seen = new Set<string>()): SemanticIntent | null {
    if (candidate.type !== 'surface_relation' && candidate.type !== 'surface_structure') return candidate;
    const known = new Set([...Object.values(project.relations), ...Object.values(session.phenomena)].map(identity).concat([...seen]));
    const accept = (relation: ProposedRelation) => {
        const key = identity(relation);
        if (known.has(key) || !wordingAllowed(relation.label, relation.explanation)) return false;
        known.add(key);
        seen.add(key);
        return true;
    };
    if (candidate.type === 'surface_relation') return accept(candidate) ? candidate : null;
    return { ...candidate, relations: candidate.relations.filter(accept) };
}
