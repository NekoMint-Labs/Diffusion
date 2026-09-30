import { expect, type Page } from '@playwright/test';
import type { FieldStyleId } from '../../src/ui/appearance.ts';

/** DOM visibility is not a frame: lazy renderers may not have mounted or drawn yet. */
export async function waitForFieldBackgroundReady(page: Page, style: FieldStyleId) {
    const host = page.getByTestId('field-background');
    await expect(host).toHaveAttribute('data-background-id', style);
    const canvas = host.locator('canvas');
    await expect(canvas).toHaveCount(1, { timeout: 15_000 });
    await expect(canvas).toBeVisible();
    await expect.poll(() => canvas.evaluate((element, style) => {
        const own = element as HTMLCanvasElement;
        const box = own.getBoundingClientRect();
        if (!box.width || !box.height || !own.width || !own.height) return false;
        if (Math.abs(own.width / own.height - box.width / box.height) > .01) return false;
        const renderer = { 'paper-texture': '[data-paper-shader]', topography: '.topography-container',
            threads: '.field-background-renderer', waves: '.waves', silk: '.silk-container' }[style];
        if (!own.closest(renderer)) return false;
        if (style === 'waves') {
            const pixels = own.getContext('2d')!.getImageData(0, 0, own.width, own.height).data;
            for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) return true;
            return false;
        }
        // Do not create a context before the owning renderer has initialized it.
        if (style === 'silk' && !own.hasAttribute('data-engine')) return false;
        const gl = own.getContext('webgl2');
        if (!gl || gl.isContextLost()) return false;
        const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
        if (!program || !gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
        if (style === 'threads' && !gl.getUniformLocation(program, 'uAmplitude')) return false;
        if (style !== 'silk') {
            const location = gl.getUniformLocation(program, style === 'paper-texture' ? 'u_resolution' : 'iResolution');
            const resolution = location && gl.getUniform(program, location) as Float32Array | null;
            if (resolution?.[0] !== own.width || resolution?.[1] !== own.height) return false;
        }
        if (style === 'topography') {
            const controls = gl.getUniform(program, gl.getUniformLocation(program, 'uCtrlA')!) as Float32Array;
            if (!controls.some(value => value !== 0)) return false; // Exclude the preliminary/default draw.
        }
        return true;
    }, style), { timeout: 15_000, message: `${style} has submitted a sized production frame` }).toBe(true);
    await canvas.evaluate(async (element, style) => {
        // Let ResizeObserver/rAF-driven sizing and prop updates reach the renderer, then complete
        // preceding GPU work. This observes a draw; it never forces a shader render or a screenshot.
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        if (style !== 'waves') (element as HTMLCanvasElement).getContext('webgl2')!.finish();
    }, style);
    return host;
}
