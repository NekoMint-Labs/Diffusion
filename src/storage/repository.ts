import type { ProjectState, SourceRecord, Thought, TrajectoryEntry } from '../core/model.ts';
import type { DomainEvent } from '../core/events.ts';
export interface SearchHit {
    id: string;
    kind: 'thought' | 'source' | 'region' | 'thread';
    label: string;
    thoughtIds: string[];
}
export interface ProjectRepository {
    listProjects(): Promise<{
        id: string;
        title: string;
        parentId?: string;
        updatedAt: number;
    }[]>;
    loadProject(id: string): Promise<ProjectState | null>;
    saveProject(project: ProjectState): Promise<void>;
    applyEvent(projectId: string, event: DomainEvent): Promise<void>;
    getThought(projectId: string, id: string): Promise<Thought | null>;
    getTrajectory(projectId: string, id?: string): Promise<TrajectoryEntry[]>;
    search(projectId: string, query: string): Promise<SearchHit[]>;
    saveSource(projectId: string, source: SourceRecord): Promise<void>;
    saveOriginal(key: string, file: Blob): Promise<void>;
    getOriginal(key: string): Promise<Blob | undefined>;
}
export function searchProject(p: ProjectState, query: string): SearchHit[] {
    const q = query.trim().toLocaleLowerCase();
    if (!q)
        return [];
    const hits: SearchHit[] = [];
    const referenced = new Map<string, string[]>();
    const seenThoughts = new Set<string>();
    for (const t of Object.values(p.thoughts)) {
        if (t.sourceId)
            referenced.set(t.sourceId, [...(referenced.get(t.sourceId) ?? []), t.id]);
        if (t.text.toLocaleLowerCase().includes(q)) {
            hits.push({ id: t.id, kind: t.kind === 'source' ? 'source' : 'thought', label: t.text, thoughtIds: [t.id] });
            seenThoughts.add(t.id);
        }
    }
    for (const source of Object.values(p.sources)) {
        const ids = referenced.get(source.id) ?? [];
        if ((source.title + ' ' + source.excerpt).toLocaleLowerCase().includes(q) && !ids.some(k => seenThoughts.has(k)))
            hits.push({ id: source.id, kind: 'source', label: source.title + ' / ' + source.excerpt.slice(0, 350), thoughtIds: ids });
    }
    for (const r of Object.values(p.regions))
        if (r.name.toLocaleLowerCase().includes(q))
            hits.push({ id: r.id, kind: 'region', label: r.name, thoughtIds: r.members });
    for (const t of Object.values(p.threads))
        if (t.title.toLocaleLowerCase().includes(q) || t.messages.some(m => m.text.toLocaleLowerCase().includes(q)))
            hits.push({ id: t.id, kind: 'thread', label: t.title, thoughtIds: t.scopeIds });
    return hits.slice(0, 80);
}
