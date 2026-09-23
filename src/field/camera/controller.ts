import type { Camera, Point } from '../../core/model.ts';
import { screenToWorld, worldToScreen, zoomCameraAt } from '../spatial/geometry.ts';
/** Owns frame transforms. No React, state store, persistence or AI in this layer. */
export class CameraController {
    private value: Camera;
    private world: HTMLElement;
    private frame: number | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private onStable: (c: Camera) => void;
    private onFrame: (c: Camera) => void;
    private stopped = false;
    constructor(world: HTMLElement, initial: Camera, onStable: (c: Camera) => void, onFrame: (c: Camera) => void) { this.world = world; this.value = { ...initial }; this.onStable = onStable; this.onFrame = onFrame; this.paint(); }
    get(): Camera { return { ...this.value }; }
    set(c: Camera, commit = false) { if (![c.x, c.y, c.zoom].every(Number.isFinite))
        return; const next = { x: Math.max(-1e7, Math.min(1e7, c.x)), y: Math.max(-1e7, Math.min(1e7, c.y)), zoom: Math.max(.08, Math.min(2.5, c.zoom)) }; const unchanged = next.x === this.value.x && next.y === this.value.y && next.zoom === this.value.zoom; this.value = next; this.schedule(); if (commit && !unchanged)
        this.commitSoon(); }
    pan(dx: number, dy: number) { this.set({ ...this.value, x: this.value.x + dx, y: this.value.y + dy }); }
    zoom(point: Point, delta: number) { this.set(zoomCameraAt(this.value, point, this.value.zoom * Math.exp(-delta * .0015))); this.commitSoon(); }
    worldPoint(p: Point) { return screenToWorld(p, this.value); }
    screenPoint(p: Point) { return worldToScreen(p, this.value); }
    private paint() { this.frame = null; if (this.stopped)
        return; const c = this.value; this.world.style.transform = `translate3d(${c.x}px,${c.y}px,0) scale(${c.zoom})`; this.world.style.setProperty('--inverse-zoom', String(1 / c.zoom)); this.onFrame({ ...c }); }
    private schedule() { if (this.frame === null && !this.stopped)
        this.frame = requestAnimationFrame(() => this.paint()); }
    private commitSoon() { if (this.timer)
        clearTimeout(this.timer); this.timer = setTimeout(() => this.commit(), 140); }
    commit() { if (this.timer)
        clearTimeout(this.timer); this.timer = null; if (this.frame !== null) {
        cancelAnimationFrame(this.frame);
        this.paint();
    } if (!this.stopped)
        this.onStable(this.get()); }
    destroy() { this.stopped = true; if (this.frame !== null)
        cancelAnimationFrame(this.frame); if (this.timer)
        clearTimeout(this.timer); }
}
