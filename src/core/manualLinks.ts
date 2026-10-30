import { DomainError } from './errors.ts';
import { id, type ProjectState, type Relation } from './model.ts';

export type LinkPort = 'left' | 'right';
export interface ManualLink { aPort: LinkPort; bPort: LinkPort; }
export function validManualLink(value: unknown): value is ManualLink {
    if (!value || typeof value !== 'object') return false;
    const link = value as ManualLink;
    return ['left', 'right'].includes(link.aPort) && ['left', 'right'].includes(link.bPort);
}
/** One manual association per unordered pair, even when endpoints are swapped. */
export function requireManualPair(project: ProjectState, a: string, b: string, existingId?: string): void {
    if (Object.values(project.relations).some(r => r.id !== existingId && r.manual &&
        (r.a === a && r.b === b || r.a === b && r.b === a))) {
        throw new DomainError('These thoughts already have a manual connection. Edit the existing one.');
    }
}
/** User-drawn association only: never changes lineage, organization or wording. */
export function manualLink(project: ProjectState, a: string, b: string, ports: ManualLink, existingId?: string): Relation {
    if (!project.thoughts[a] || !project.thoughts[b] || a === b || !validManualLink(ports)) throw new DomainError('Choose two different saved thoughts.');
    const existing = existingId ? project.relations[existingId] : undefined;
    if (existingId && !existing?.manual) throw new DomainError('Only manual connections can be reconnected here.');
    requireManualPair(project, a, b, existingId);
    return { id: existingId ?? id('link'), a, b, kind: 'bridge', label: 'Manual connection', status: 'confirmed', createdAt: existing?.createdAt ?? Date.now(), manual: { ...ports } };
}
