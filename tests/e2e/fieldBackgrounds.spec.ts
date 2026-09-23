import { expect, test, type Page } from '@playwright/test';
import { choose, openSection } from './selects.ts';

const styles = ['paper-texture', 'topography', 'threads', 'waves', 'silk'] as const;

async function openAppearance(page: Page) {
    await page.getByTestId('global-more').click();
    const menu = page.getByTestId('global-menu');
    const direct = menu.locator('[data-command="settings"]');
    if (await direct.count()) await direct.click();
    else {
        await menu.locator('[data-command="more"]').click();
        await page.getByTestId('global-more-menu').locator('[data-command="settings"]').click();
    }
    await openSection(page, 'appearance');
}

async function selectBackground(page: Page, style: typeof styles[number]) {
    await choose(page, 'field-style-select', style);
    const host = page.getByTestId('field-background');
    await expect(host).toHaveAttribute('data-background-id', style);
    await expect(host.locator('canvas')).toHaveCount(1, { timeout: 15_000 });
    return host;
}

test('approved backgrounds switch through one inert viewport host and remain static at Motion 0', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', error => errors.push(error));
    await page.goto('/demo?locale=en');
    await openAppearance(page);
    await page.getByTestId('ambient-motion').fill('0');

    for (const style of styles) {
        const host = await selectBackground(page, style);
        await expect(host).toHaveCount(1);
        await expect(host).toHaveAttribute('aria-hidden', 'true');
        await expect(host).toHaveAttribute('data-motion', '0');
        await expect(host).toHaveCSS('pointer-events', 'none');
        expect(await host.evaluate(element => element.contains(document.querySelector('[data-testid="global-more"]')))).toBe(false);

        const canvas = host.locator('canvas');
        const dimensions = await canvas.evaluate(element => {
            const box = element.getBoundingClientRect();
            const own = element as HTMLCanvasElement;
            const hostBox = element.closest('.field-background-layer')!.getBoundingClientRect();
            return { width: own.width, height: own.height, boxWidth: box.width, boxHeight: box.height,
                hostWidth: hostBox.width, hostHeight: hostBox.height };
        });
        expect(Math.max(dimensions.width, dimensions.height)).toBeLessThanOrEqual(1920);
        expect(dimensions.boxWidth).toBeLessThanOrEqual(dimensions.hostWidth + 1);
        expect(dimensions.boxHeight).toBeLessThanOrEqual(dimensions.hostHeight + 1);

        await page.waitForTimeout(250);
        const first = await host.screenshot();
        await page.waitForTimeout(250);
        expect(await host.screenshot()).toEqual(first);
    }
    expect(errors).toEqual([]);
});

test('reduced motion forces effective background motion to zero without changing the preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/demo?locale=en');
    await openAppearance(page);
    await page.getByTestId('ambient-motion').fill('75');
    for (const style of styles) {
        const host = await selectBackground(page, style);
        await expect(host).toHaveAttribute('data-motion', '0');
    }
    await expect(page.getByTestId('ambient-motion')).toHaveValue('75');
});
