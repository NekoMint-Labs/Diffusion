import { test, expect, type Page } from '@playwright/test';

async function recordOpening(page: Page) {
    await page.evaluate(() => {
        const samples: { time: number; opacity: number; error: number }[] = [];
        const armed = performance.now();
        let start: number | null = null;
        const capture = () => {
            const menu = document.querySelector('[data-testid="global-menu"]');
            const shell = menu?.querySelector('.command-menu-shared-shell');
            if (menu && shell) {
                start ??= performance.now();
                const box = menu.getBoundingClientRect(), background = shell.getBoundingClientRect();
                const opacity = Number(getComputedStyle(menu).opacity);
                if (opacity > .05 && box.width && box.height) samples.push({
                    time: performance.now() - start, opacity,
                    error: Math.max(Math.abs(box.left - background.left), Math.abs(box.top - background.top),
                        Math.abs(box.right - background.right), Math.abs(box.bottom - background.bottom)),
                });
            }
            if (start === null ? performance.now() - armed < 15_000 : performance.now() - start < 650) requestAnimationFrame(capture);
            else (window as unknown as { menuShellFrames: unknown }).menuShellFrames = samples;
        };
        (window as unknown as { menuShellFrames: unknown }).menuShellFrames = null;
        requestAnimationFrame(capture);
    });
}

for (const profile of ['editorial-warm', 'graphite-night']) for (const mode of ['normal', 'reduced', 'motion-zero']) {
    test(`menu background stays with its content during opening: ${profile}/${mode}`, async ({ page }, info) => {
        await page.addInitScript(({ profile, mode }) => {
            localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'off',
                appearance: { profile, fieldStyle: 'paper-texture', ...(mode === 'motion-zero' ? { ambientMotion: 0 } : {}) } }));
        }, { profile, mode });
        await page.emulateMedia({ reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
        await page.goto('/demo?locale=en');
        await expect(page.locator('html')).toHaveAttribute('data-style-profile', profile);
        if (mode === 'motion-zero') await expect(page.locator('html')).toHaveAttribute('data-field-motion', 'off');
        const trigger = page.getByTestId('global-more');
        for (const stage of ['first', 'reopen', 'after-settings', 'rapid-reopen']) {
            await recordOpening(page);
            await trigger.click();
            await expect(page.getByTestId('global-menu')).toBeVisible();
            await expect.poll(() => page.evaluate(() => (window as unknown as { menuShellFrames: unknown }).menuShellFrames !== null)).toBe(true);
            const samples = await page.evaluate(() => (window as unknown as { menuShellFrames: { time: number; opacity: number; error: number }[] }).menuShellFrames);
            await info.attach(`${stage}-frames`, { body: JSON.stringify(samples), contentType: 'application/json' });
            expect(samples.length, 'sample the visible opening rather than only the settled menu').toBeGreaterThan(2);
            expect(Math.max(...samples.map(frame => frame.error)), 'background must cover its own menu on every visible frame').toBeLessThanOrEqual(1);
            await page.screenshot({ path: info.outputPath(`${stage}.png`) });
            if (stage === 'reopen') {
                await page.getByTestId('global-menu').locator('[data-command="settings"]').click();
                const settings = page.getByRole('dialog', { name: 'Field settings' });
                await expect(settings).toBeVisible();
                await expect(page.getByTestId('locale-select')).toBeFocused();
                await settings.getByRole('button', { name: 'Return to Field', exact: true }).click();
                await expect(settings).toHaveCount(0);
                await expect(trigger).toBeFocused();
            } else if (stage === 'after-settings') {
                // Reopen while the previous visual echo is still retiring.
                await page.keyboard.press('Escape');
                await expect(trigger).toHaveAttribute('aria-expanded', 'false');
            } else {
                await page.keyboard.press('Escape');
                await expect(page.getByTestId('global-menu')).toHaveCount(0);
                await expect(trigger).toBeFocused();
            }
        }
    });
}
