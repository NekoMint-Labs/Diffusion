import { migrateProjectV2, migrateProjectV3 } from './migrations.ts';
import Dexie, { type Table } from 'dexie';
import type { ProjectState, SourceRecord } from '../core/model.ts';
import type { DomainEvent } from '../core/events.ts';
import { reduceProject } from '../core/reducer.ts';
import { searchProject, type ProjectRepository } from './repository.ts';
export class Database extends Dexie {
    projects!: Table<ProjectState, string>;
    originals!: Table<{
        key: string;
        data: Blob;
    }, string>;
    constructor(name = 'diffusion-explorer-v1') {
        super(name);
        this.version(1).stores({ projects: 'id,updatedAt', originals: 'key' });
        this.version(2).stores({ projects: 'id,updatedAt', originals: 'key' }).upgrade(transaction =>
            transaction.table('projects').toCollection().modify((project: ProjectState) => { Object.assign(project, migrateProjectV2(project)); })
        );
        this.version(3).stores({ projects: 'id,updatedAt', originals: 'key' }).upgrade(transaction =>
            transaction.table('projects').toCollection().modify((project: ProjectState) => { Object.assign(project, migrateProjectV3(project)); })
        );
    }
}
export class DexieRepository implements ProjectRepository {
    private db: Database;
    constructor(name = 'diffusion-explorer-v1') { this.db = new Database(name); }
    close() { this.db.close(); }
    async deleteDatabase() { await this.db.delete(); }
    async listProjects() { return (await this.db.projects.orderBy('updatedAt').reverse().toArray()).map(p => ({ id: p.id, title: p.title, parentId: p.fork?.parentId, updatedAt: p.updatedAt })); }
    async loadProject(key: string) { return (await this.db.projects.get(key)) ?? null; }
    async saveProject(p: ProjectState) { await this.db.projects.put(p); }
    async applyEvent(projectId: string, event: DomainEvent) { await this.db.transaction('rw', this.db.projects, async () => { const p = await this.db.projects.get(projectId); if (!p)
        throw new Error('Project not found'); await this.db.projects.put(reduceProject(p, event)); }); }
    async getThought(projectId: string, key: string) { return (await this.loadProject(projectId))?.thoughts[key] ?? null; }
    async getTrajectory(projectId: string, key?: string) { const p = await this.loadProject(projectId); return (p?.history ?? []).filter(h => !key || h.thoughtIds.includes(key)); }
    async search(projectId: string, q: string) { const p = await this.loadProject(projectId); return p ? searchProject(p, q) : []; }
    async saveSource(projectId: string, s: SourceRecord) { await this.db.transaction('rw', this.db.projects, async () => { const p = await this.loadProject(projectId); if (!p)
        throw new Error('Project not found'); await this.db.projects.put({ ...p, sources: { ...p.sources, [s.id]: s } }); }); }
    async saveOriginal(key: string, data: Blob) { await this.db.originals.put({ key, data }); }
    async getOriginal(key: string) { return (await this.db.originals.get(key))?.data; }
}
