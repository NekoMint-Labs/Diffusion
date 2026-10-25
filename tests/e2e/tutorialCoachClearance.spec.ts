import { test, expect, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
async function clearWriting(page: Page) {
    return page.locator('.tutorial-coach').evaluate(coach => {
        const a = coach.getBoundingClientRect();
        return [...document.querySelectorAll('.speak,.empty-invitation')].every(element => {
            const b = element.getBoundingClientRect();
            return !b.width || !b.height || a.right + 8 <= b.left || b.right + 8 <= a.left
                || a.bottom + 8 <= b.top || b.bottom + 8 <= a.top;
        });
    });
}

test.describe('animated writing at the native high-DPI work area', () => {
    test.use({ reducedMotion: 'no-preference', viewport: { width: 1078, height: 648 } });
    test('tutorial clears writing after a short draft wraps naturally', async ({ page }, info) => {
        await page.goto('/?locale=zh');
        const input = page.getByTestId('speak').locator('textarea');
        await input.fill('用于检查系统缩放后的独立想法。');
        await input.press('Enter');
        await expect(page.getByTestId('first-field-tutorial')).toHaveAttribute('data-phase', 'move');
        await page.locator('.notice button').filter({ hasText: '关闭' }).click();
        await page.getByTestId('field').click({ position: { x: 700, y: 110 } });
        await input.click();
        const draft = '200% 系统缩放草稿：输入区和教程应各自清晰可用。';
        await input.fill(draft);
        await expect(input).toHaveValue(draft);
        await expect.poll(() => input.evaluate(element => parseFloat(element.style.height))).toBeGreaterThan(24);
        await expect.poll(() => clearWriting(page), 'animated two-line writing stays clear of the tutorial').toBe(true);
        await expect(page.getByRole('button', { name: '跳过教程', exact: true })).toBeInViewport();
        await page.screenshot({ path: info.outputPath('native-dpi-natural-wrap.png') });
        await input.fill('缩回一行后，教程仍应留出间距。');
        await expect.poll(() => clearWriting(page), 'contracted animated writing stays clear').toBe(true);
    });
});
for (const [width, height] of [[900, 640], [1280, 800], [1440, 960]] as const) {
    test(`first tutorial leaves idle and multiline writing readable at ${width}x${height}`, async ({ page }, info) => {
        await page.setViewportSize({ width, height });
        await page.goto('/?locale=zh');
        const coach = page.locator('.tutorial-coach');
        await expect(coach).toBeVisible();
        await expect.poll(() => clearWriting(page), 'idle invitation and input stay clear of coaching').toBe(true);
        const input = page.getByTestId('speak').locator('textarea');
        await input.click();
        await expect(input).toBeFocused();
        await input.fill('这是一段用于检查写作区域的合成文字。\n'.repeat(8));
        await expect.poll(() => clearWriting(page), 'expanded writing stays clear of coaching').toBe(true);
        await expect(coach).toBeInViewport();
        await expect(page.getByRole('button', { name: '跳过教程', exact: true })).toBeInViewport();
        await page.screenshot({ path: info.outputPath('multiline-writing-and-tutorial.png') });
        await input.fill('这段内容用于确认输入框缩回一行。');
        await expect.poll(() => clearWriting(page)).toBe(true);
    });
}
