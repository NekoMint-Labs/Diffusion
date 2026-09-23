import { intersects, type Bounds } from './geometry.ts';
export interface SpatialIndex {
    set(id: string, bounds: Bounds): void;
    delete(id: string): void;
    query(bounds: Bounds): string[];
    get(id: string): Bounds | undefined;
}
export class GridIndex implements SpatialIndex {
    private cells = new Map<string, Set<string>>();
    private bounds = new Map<string, Bounds>();
    private keysById = new Map<string, string[]>();
    private size: number;
    constructor(size = 512) { this.size = size; }
    private keys(b: Bounds): string[] {
        const keys: string[] = [];
        for (let x = Math.floor(b.x / this.size); x <= Math.floor((b.x + b.width) / this.size); x++)
            for (let y = Math.floor(b.y / this.size); y <= Math.floor((b.y + b.height) / this.size); y++)
                keys.push(`${x},${y}`);
        return keys;
    }
    set(id: string, b: Bounds) { this.delete(id); const keys = this.keys(b); this.bounds.set(id, { ...b }); this.keysById.set(id, keys); for (const key of keys) {
        let set = this.cells.get(key);
        if (!set) {
            set = new Set();
            this.cells.set(key, set);
        }
        set.add(id);
    } }
    delete(id: string) { for (const key of this.keysById.get(id) ?? []) {
        const cell = this.cells.get(key);
        cell?.delete(id);
        if (cell?.size === 0)
            this.cells.delete(key);
    } this.bounds.delete(id); this.keysById.delete(id); }
    get(id: string) { return this.bounds.get(id); }
    query(b: Bounds): string[] {
        // Avoid iterating millions of empty grid cells at extreme Atlas extents.
        const area = ((b.width / this.size) + 2) * ((b.height / this.size) + 2);
        const candidates = new Set<string>();
        if (area > this.cells.size * 2) {
            for (const [key, box] of this.bounds)
                if (intersects(b, box))
                    candidates.add(key);
            return [...candidates];
        }
        for (const key of this.keys(b))
            for (const id of this.cells.get(key) ?? [])
                candidates.add(id);
        return [...candidates].filter(id => intersects(b, this.bounds.get(id)!));
    }
    get count() { return this.bounds.size; }
}
export class GeometryCache {
    readonly index = new GridIndex();
    private sizes = new Map<string, {
        width: number;
        height: number;
    }>();
    setPosition(id: string, x: number, y: number) { const size = this.sizes.get(id) ?? { width: 250, height: 102 }; const current = this.index.get(id); if (current && current.x === x && current.y === y && current.width === size.width && current.height === size.height)
        return; this.index.set(id, { x, y, ...size }); }
    measure(id: string, width: number, height: number) { const old = this.index.get(id); if (!old)
        return; const w = Math.max(1, width), h = Math.max(1, height); this.sizes.set(id, { width: w, height: h }); if (old.width !== w || old.height !== h)
        this.index.set(id, { ...old, width: w, height: h }); }
    get(id: string) { return this.index.get(id); }
    remove(id: string) { this.index.delete(id); this.sizes.delete(id); }
}
