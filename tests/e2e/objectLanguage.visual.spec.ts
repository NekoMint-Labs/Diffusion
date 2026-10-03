import { test, expect } from '@playwright/test';
import { waitForFieldBackgroundReady } from './fieldBackgroundReady.ts';

const profiles = ['editorial-warm', 'studio-slate', 'quiet-forest', 'graphite-night'] as const;
const backgrounds = ['paper-texture', 'topography', 'threads', 'waves', 'silk'] as const;
for (const profile of profiles) for (const [index, fieldStyle] of backgrounds.entries()) {
    const locale = index % 2 ? 'en' : 'zh';
    test.describe(`${profile} / ${fieldStyle}`, () => {
        test.use({ viewport: index === 2 ? { width: 1440, height: 960 } : index === 3 ? { width: 1920, height: 1080 } : { width: 1280, height: 720 }, reducedMotion: index % 2 ? 'no-preference' : 'reduce' });
        test('real background preserves object ownership and selection', async ({ page }, testInfo) => {
            const errors: string[] = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(settings => localStorage.setItem('diffusion-settings', JSON.stringify(settings)), { locale, provider: 'demo', appearance: { profile, fieldStyle, ambientMotion: index === 1 ? 0 : 35 } });
            await page.goto(`/demo?locale=${locale}`);
            const background = await waitForFieldBackgroundReady(page, fieldStyle);
            await expect(background).toHaveAttribute('data-profile', profile);
            await expect(background).toHaveCSS('pointer-events', 'none');
            if (index % 2 === 0 || index === 1) await expect(background).toHaveAttribute('data-motion', '0');
            const source = page.locator('[data-thought-id="attention"]');
            await source.click();
            await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
            await expect(page.locator('.thought-selected-dot')).toHaveCount(2);
            await page.getByTestId('scope-continue').click();
            await page.getByTestId('action-preview-run').click();
            const ghost = page.locator('article.ghost').first();
            await expect(ghost).toBeVisible();
            await expect(page.locator('[data-testid="operation-feedback"][data-phase="pending"]')).toHaveCount(0);
            await expect.poll(() => page.evaluate(() => {
                const chrome = [...document.querySelectorAll('.identity, .global-actions')].map(el => el.getBoundingClientRect());
                return [...document.querySelectorAll('article.ghost')].some(el => {
                    const a = el.getBoundingClientRect();
                    return chrome.some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
                });
            }), { message: 'new suggestions clear measured Field chrome' }).toBe(false);
            await ghost.click();
            await expect(ghost.locator('.ghost-label')).toBeVisible();
            // Approved paper-and-single-rail design replaces the former open dashed boundary.
            await expect(ghost.locator('.ghost-boundary')).toHaveCount(0);
            expect(await ghost.evaluate(el => getComputedStyle(el, '::before').width)).toBe('2px');
            expect(await ghost.evaluate(el => getComputedStyle(el, '::after').content)).toBe('none');
            await expect(page.getByTestId('ai-proposal-keep')).toBeVisible();
            await expect(page.getByTestId('ai-proposal-ignore')).toBeVisible();
            await expect(page.locator('article.crystal').first()).toBeVisible();
            await page.screenshot({ path: testInfo.outputPath(`${profile}-${fieldStyle}.png`) });
            expect(errors).toEqual([]);
        });
    });
}
