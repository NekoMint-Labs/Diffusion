import { describe, expect, it } from 'vitest';
import { CameraController } from '../../src/field/camera/controller.ts';

// The frame owner is a browser boundary; this test only needs it to exist.
globalThis.requestAnimationFrame ??= ((callback: FrameRequestCallback) => { callback(0); return 1; }) as typeof requestAnimationFrame;
globalThis.cancelAnimationFrame ??= (() => { }) as typeof cancelAnimationFrame;

function harness() {
    let commits = 0;
    let frames = 0;
    const world = { style: { transform: '', setProperty: () => { } } } as unknown as HTMLElement;
    const controller = new CameraController(world, { x: 0, y: 0, zoom: 1 }, () => { commits += 1; }, () => { frames += 1; });
    return { controller, commits: () => commits, frames: () => frames };
}

const settle = () => new Promise(resolve => setTimeout(resolve, 200));

describe('camera commit boundary', () => {
    it('does not dirty the Field when the camera value is unchanged', async () => {
        // Returning to a surface's saved camera restores the same value; that is not a change.
        const { controller, commits } = harness();
        controller.set({ x: 0, y: 0, zoom: 1 }, true);
        await settle();
        expect(commits()).toBe(0);
    });

    it('commits a real camera change at the gesture boundary', async () => {
        const { controller, commits } = harness();
        controller.set({ x: 120, y: 40, zoom: 1.4 }, true);
        await settle();
        expect(commits()).toBe(1);
        expect(controller.get()).toMatchObject({ x: 120, y: 40, zoom: 1.4 });
    });

    it('clamps zoom and ignores non-finite input', () => {
        const { controller } = harness();
        controller.set({ x: 0, y: 0, zoom: 9 });
        expect(controller.get().zoom).toBe(2.5);
        controller.set({ x: Number.NaN, y: 0, zoom: 1 });
        expect(controller.get()).toMatchObject({ x: 0, y: 0, zoom: 2.5 });
    });
});
