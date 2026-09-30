import { expect, type Page } from '@playwright/test';
import type { FieldStyleId } from '../../src/ui/appearance.ts';

// Temporary simplification experiment: no shader uniforms, readback or GPU finish.
export async function waitForFieldBackgroundReadyMinimal(page: Page, style: FieldStyleId) {
    const host = page.getByTestId('field-background');
    await expect(host).toHaveAttribute('data-background-id', style);
    const canvas = host.locator('canvas');
    await expect(canvas).toHaveCount(1, { timeout: 15_000 });
    await expect(canvas).toBeVisible();
    await expect.poll(() => canvas.evaluate(element => {
        const own = element as HTMLCanvasElement;
        const box = own.getBoundingClientRect();
        return own.width > 0 && own.height > 0 && box.width > 0 && box.height > 0
            && Math.abs(own.width / own.height - box.width / box.height) < .01
            && performance.getEntriesByType('paint').some(entry => entry.name === 'first-contentful-paint');
    }), { timeout: 15_000 }).toBe(true);
    await canvas.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    return host;
}
