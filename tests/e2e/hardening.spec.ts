import { test, expect, type Page } from '@playwright/test';
import { choose, expectChoice, openSection } from './selects.ts';
import type { ProjectState } from '../../src/core/model.ts';

type MenuTrigger = 'global-more' | 'field-title';
async function openMenu(page: Page, trigger: MenuTrigger, command: string) {
    await page.getByTestId(trigger).click();
    const scope = trigger === 'field-title' ? 'field' : 'global';
    const root = page.getByTestId(`${scope}-menu`);
    const direct = root.locator(`[data-command="${command}"]`);
    if (await direct.count()) {
        await direct.click();
        return;
    }
    // More is a second page of the same popup, not a nested menu.
    await root.locator('[data-command="more"]').click();
    await page.getByTestId(`${scope}-more-menu`).locator(`[data-command="${command}"]`).click();
}
async function readProject(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise<ProjectState>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('projects', 'readonly');
            const read = tx.objectStore('projects').get('demo');
            read.onsuccess = () => resolve(read.result);
            read.onerror = () => reject(read.error);
            tx.oncomplete = () => db.close();
        };
    }));
}

for (const [trigger, command, title, items, modal] of [
    ['global-more', 'settings', 'Field settings', 5, true], ['global-more', 'find', 'Find in Field', 5, false],
    ['field-title', 'import', 'Import / Restore', 4, true], ['global-more', 'help', 'Help', 5, true],
] as const) {
    test(`${trigger} -> ${command}: exclusive owner, Escape, return focus, reopen`, async ({ page }) => {
        await page.goto('/demo?locale=en');
        const thought = page.locator('[data-thought-id="attention"]');
        await thought.click();
        const before = await thought.boundingBox();
        await openMenu(page, trigger, command);
        await expect(page.locator('.command-menu')).toHaveCount(0);
        await expect(page.getByRole('dialog', { name: title, exact: true })).toBeVisible();
        // Find in Field stays non-modal: it reveals content in place and never locks the Field.
        await expect(page.locator('[data-global-owner]')).toHaveCount(modal ? 1 : 0);
        await expect(page.getByTestId('surface-input-shield')).toHaveCount(modal ? 1 : 0);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(page.getByTestId(trigger)).toBeFocused();
        await expect(thought).toHaveAttribute('data-selected', 'true');
        expect(await thought.boundingBox()).toEqual(before);
        await page.getByTestId(trigger).click();
        await expect(page.locator('.command-menu').getByRole('menuitem')).toHaveCount(items);
        await page.keyboard.press('Escape');
    });
}
test('Field menu -> Import -> Restore transfers ownership without an old menu or dialog', async ({ page }) => {
    await page.goto('/demo?locale=en'); await openMenu(page, 'field-title', 'import');
    await page.getByRole('button', { name: 'Restore a project export...' }).click();
    await expect(page.locator('.command-menu')).toHaveCount(0);
    const restore = page.getByRole('dialog', { name: 'Restore a project export', exact: true });
    await expect(restore).toBeFocused();
    await expect(page.locator('[data-global-owner="restore"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(restore).toHaveCount(0);
    await expect(page.getByTestId('field-title')).toBeFocused();
});
test('keyboard menu navigation hands focus to Settings and traps Tab in both directions', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await page.getByTestId('global-more').focus(); await page.keyboard.press('Enter');
    // Base UI moves focus into its roving menu after opening. Wait for that ownership handoff
    // before sending navigation keys; asserting against the trigger's opening key was stale custom-menu timing.
    await expect(page.getByTestId('global-menu')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.locator('[data-command="palette"]')).toBeFocused();
    await page.keyboard.press('End'); await expect(page.locator('[data-command="help"]')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.locator('[data-command="palette"]')).toBeFocused();
    await page.keyboard.press('End'); await page.keyboard.press('ArrowUp'); await expect(page.locator('[data-command="settings"]')).toBeFocused();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Field settings' });
    await expect(page.getByTestId('global-menu')).toHaveCount(0);
    await expect(page.getByTestId('locale-select')).toBeFocused();
    for (let index = 0; index < 12; index++) {
        await page.keyboard.press(index < 6 ? 'Tab' : 'Shift+Tab');
        expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    await page.getByRole('button', { name: 'Return to Field', exact: true }).click();
    await expect(page.getByTestId('global-more')).toBeFocused();
});
test('Tab dismisses a non-modal menu without leaving a hidden interactive owner', async ({ page }) => {
    await page.goto('/demo?locale=en'); await page.getByTestId('global-more').click();
    await expect(page.getByTestId('global-menu')).toBeFocused();
    await page.keyboard.press('Home'); await page.keyboard.press('Shift+Tab');
    await expect(page.getByTestId('global-more')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('menu')).toHaveCount(0);
    const exiting = page.locator('.command-menu');
    if (await exiting.count()) await expect(exiting).toHaveAttribute('inert', '');
    await expect(page.getByTestId('global-menu')).toHaveCount(0);
    await expect(page.getByTestId('global-more')).toBeFocused();
});
test('outside click dismisses Settings without selecting or dragging the underlying Field', async ({ page }) => {
    await page.goto('/demo?locale=en'); await page.locator('[data-thought-id="attention"]').click();
    const before = await readProject(page);
    await openMenu(page, 'global-more', 'settings'); await page.mouse.click(8, 500);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('global-more')).toBeFocused();
    await expect(page.locator('[data-thought-id="attention"]')).toHaveAttribute('data-selected', 'true');
    expect(await readProject(page)).toEqual(before);
});
test('Ctrl K replaces the menu with the command palette; a delayed menu callback cannot steal its focus', async ({ page }) => {
    await page.goto('/demo?locale=en'); await page.getByTestId('global-more').click();
    await page.keyboard.press('Control+k');
    await expect(page.locator('.command-menu')).toHaveCount(0);
    await expect(page.locator('#command-palette-input')).toBeFocused();
    await page.locator('#command-palette-input').fill('settings');
    await page.keyboard.press('Escape'); await expect(page.getByTestId('global-more')).toBeFocused();
});

for (const typography of ['serif', 'sans']) for (const [profile, tone] of [['editorial-warm', 'light'], ['graphite-night', 'dark']] as const) for (const locale of ['en', 'zh']) {
    test(`preference matrix ${typography}/${profile}/${locale}: persist, no inference, no project replacement`, async ({ page }) => {
        let requests = 0;
        await page.route('**/api/**', async route => { requests++; await route.fulfill({ status: 503, body: '{}' }); });
        await page.goto('/demo'); await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
        const before = await readProject(page);
        const transform = await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform);
        await openMenu(page, 'global-more', 'settings');
        await choose(page, 'typography-select', typography);
        await choose(page, 'style-profile-select', profile);
        // The locale control lives in General; the section is entered before it is focused so this
        // exercises the control rather than a hidden panel.
        await openSection(page, 'general');
        await page.getByTestId('locale-select').focus();
        await choose(page, 'locale-select', locale);
        await expect(page.getByTestId('locale-select')).toBeFocused();
        await expect(page.locator('html')).toHaveAttribute('data-thought-typography', typography);
        await expect(page.locator('html')).toHaveAttribute('data-theme', tone);
        await expect(page.locator('html')).toHaveAttribute('lang', locale === 'zh' ? 'zh-CN' : 'en');
        const contentFont = await page.locator('[data-thought-id="attention"]').evaluate(element => getComputedStyle(element).fontFamily);
        expect(contentFont).toContain(typography === 'serif' ? 'Georgia' : 'ui-sans-serif');
        const chromeFont = await page.locator('.surface-header h2').evaluate(element => getComputedStyle(element).fontFamily);
        expect(chromeFont).toContain('ui-sans-serif'); expect(chromeFont).not.toContain('Georgia');
        expect(await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform)).toBe(transform);
        expect(await readProject(page)).toEqual(before); expect(requests).toBe(0);
        await page.keyboard.press('Escape'); await page.reload();
        await expect(page.locator('html')).toHaveAttribute('data-thought-typography', typography);
        await expect(page.locator('html')).toHaveAttribute('lang', locale === 'zh' ? 'zh-CN' : 'en');
        await openMenu(page, 'global-more', 'settings');
        await expectChoice(page, 'typography-select', typography);
        await expectChoice(page, 'style-profile-select', profile);
        await expectChoice(page, 'locale-select', locale);
        expect(await readProject(page)).toEqual(before); expect(requests).toBe(0);
    });
}
test('Ambient Motion persists independently while Field Styles interpret it', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await openMenu(page, 'global-more', 'settings');
    await openSection(page, 'appearance');
    const motion = page.getByTestId('ambient-motion');
    await expect(motion).toHaveValue('50');
    await motion.fill('0');
    await expect(page.locator('html')).toHaveAttribute('data-field-motion', 'off');
    await choose(page, 'field-style-select', 'waves');
    await expect(page.getByTestId('field-background')).toHaveAttribute('data-motion', '0');
    await motion.fill('75');
    await expect(motion).toHaveValue('75');
    await expect(page.locator('html')).toHaveAttribute('data-ambient-motion', '75');
    await expect(page.locator('html')).toHaveAttribute('data-field-style', 'waves');
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-ambient-motion', '75');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('diffusion-settings') ?? '{}').appearance.ambientMotion)).toBe(75);
});

test('Speak grows to four lines, scrolls, and preserves an unsent draft across Settings', async ({ page }) => {
    await page.goto('/?locale=en');
    let speak = page.getByRole('textbox', { name: 'Speak', exact: true });
    expect((await page.getByTestId('speak').boundingBox())!.width).toBe(250);
    await speak.focus();
    await expect(page.getByTestId('speak')).toHaveAttribute('data-composing', 'true');
    await expect.poll(async () => (await page.getByTestId('speak').boundingBox())!.width).toBeCloseTo(480, 0);
    await speak.fill('First line\nSecond line\nThird line');
    expect((await speak.boundingBox())!.height).toBeGreaterThan(30);
    await speak.fill('One\nTwo\nThree\nFour\nFive\nSix');
    expect(await speak.evaluate(element => element.clientHeight)).toBeLessThanOrEqual(108);
    expect(await speak.evaluate(element => element.scrollHeight > element.clientHeight && getComputedStyle(element).overflowY === 'auto')).toBe(true);
    await speak.press('Enter');
    await expect(page.getByTestId('speak')).toHaveCount(0);
    await expect(page.getByTestId('scope-hub')).toBeVisible();
    await page.getByTestId('field').click({ position: { x: 1200, y: 700 } });
    await expect(page.getByTestId('scope-hub')).toHaveCount(0);
    speak = page.getByRole('textbox', { name: 'Speak', exact: true });
    expect((await page.getByTestId('speak').boundingBox())!.width).toBe(250);
    await speak.fill('An unfinished expression');
    await openMenu(page, 'global-more', 'settings');
    await expect(speak).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(speak).toHaveValue('An unfinished expression');
    await expect(page.getByTestId('speak')).toHaveAttribute('data-composing', 'false');
});
test('Thread stays non-modal and its frozen scope does not change with Field selection', async ({ page }) => {
    await page.goto('/demo?locale=en'); await openMenu(page, 'global-more', 'settings');
    await choose(page, 'typography-select', 'sans'); await page.keyboard.press('Escape');
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="thread"]').click();
    const scope = await page.locator('.thread-scope').innerText();
    await expect(page.getByTestId('surface-input-shield')).toHaveCount(0);
    expect(await page.locator('.thread-scope').evaluate(element => getComputedStyle(element).fontFamily)).toContain('ui-sans-serif');
    await page.locator('[data-thought-id="structure"]').click();
    await expect(page.locator('.thread-scope')).toHaveText(scope);
    await expect(page.getByRole('dialog')).toHaveCount(1);
});

test('outside click dismisses More and does not steal the new Field focus', async ({ page }) => {
    await page.goto('/demo?locale=en'); await page.getByTestId('global-more').click();
    await page.mouse.click(8, 500);
    await expect(page.getByTestId('global-menu')).toHaveCount(0);
    await expect(page.getByTestId('field')).toBeFocused();
    await expect(page.getByRole('dialog')).toHaveCount(0);
});
