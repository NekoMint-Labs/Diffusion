import { id, type ProjectState, type Region } from '../../core/model.ts';
import { estimateItemSize } from './collision.ts';
import { GridIndex } from './index.ts';
/** Spatial activity, never semantic similarity or hidden preference learning. */
export class RegionObserver {
    private visits = new Map<string, number>();
    observe(project: ProjectState, touched: string[]): Region[] {
        const thoughts = project.thoughts;
        const grid = new GridIndex(512);
        for (const t of Object.values(thoughts))
            if (t.kind !== 'source' && t.life !== 'memory')
                grid.set(t.id, { x: t.x, y: t.y, ...estimateItemSize(t) });
        const regions = Object.values(project.regions).map(r => ({ ...r, members: r.members.filter(k => !!thoughts[k]) })).filter(r => r.members.length >= 3);
        const observed = new Set<string>();
        for (const key of touched) {
            const t = thoughts[key];
            if (!t || t.kind === 'source')
                continue;
            const nearby = grid.query({ x: t.x - 430, y: t.y - 320, width: 860, height: 640 }).filter(k => { const n = thoughts[k]; return Math.hypot(n.x - t.x, n.y - t.y) < 520; }).sort();
            if (nearby.length < 3)
                continue;
            const existing = regions.find(r => r.members.filter(k => nearby.includes(k)).length >= Math.min(3, r.members.length));
            const bucket = existing?.id ?? nearby.slice(0, 8).join('|');
            if (observed.has(bucket))
                continue;
            observed.add(bucket);
            const count = (this.visits.get(bucket) ?? existing?.activity ?? 0) + 1;
            this.visits.set(bucket, count);
            if (count < 3)
                continue;
            const members = [...new Set(nearby)].slice(0, 80);
            const x = members.reduce((sum, k) => sum + thoughts[k].x, 0) / members.length;
            const y = Math.min(...members.map(k => thoughts[k].y)) - 85;
            if (existing) {
                existing.members = members;
                existing.x = x;
                existing.y = y;
                existing.activity = count;
            }
            else {
                const region = { id: id('region'), name: 'An emerging neighborhood', x, y, members, activity: count };
                regions.push(region);
                observed.add(region.id);
            }
        }
        // Dissolve stale neighborhoods when their members have genuinely dispersed.
        return regions.map(r => { const members = r.members.filter(k => Math.hypot(thoughts[k].x - r.x, thoughts[k].y - (r.y + 150)) < 950); return { ...r, members }; }).filter(r => r.members.length >= 3).slice(0, 120);
    }
}
export function activeFrontiers(project: ProjectState, limit = 3): string[] {
    return Object.values(project.thoughts).filter(t => t.kind === 'thought' && t.life !== 'memory' && /[?\uff1f]/.test(t.text)).sort((a, b) => b.touchedAt - a.touchedAt).slice(0, limit).map(t => t.id);
}
