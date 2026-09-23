import { test, expect } from '@playwright/test';
import { choose } from './selects.ts';

/** The interaction primitives Phase 2 adopted are product code now, so the behaviours a native
 * control used to supply for free are asserted here rather than assumed: the trigger states the
 * chosen label, keyboard selection works, Escape leaves the value alone, and the Settings tablist
 * moves with the keyboard and reveals the panel that goes with it. */
const errors = new WeakMap<object, string[]>();
test.beforeEach(async ({ page }) => {
    errors.set(page, []);
    page.on('pageerror', error => errors.get(page)?.push(error.message));
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

test('the one Select states its label, and keyboard use changes and can abandon the value', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    const dialog = page.getByRole('dialog', { name: 'Field settings' });
    await expect(dialog).toBeVisible();
    const trigger = page.getByTestId('locale-select');
    /** Opened, not merely present. The popup's markup — the list, the items, the highlight — is
     * mounted before the popup is open (Base UI keeps it for closed-trigger typeahead), and Base UI
     * moves focus from the trigger into the highlighted option a beat *after* opening. Until that
     * has happened the trigger still consumes an arrow key as "enter the list" rather than "move to
     * the next option", so waiting on the markup counts alone does not wait for the state the
     * keyboard sequence below actually depends on. These three are that state. */
    const opened = async () => {
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('.ui-select-item')).toHaveCount(3);
        await expect(page.locator('.ui-select-item[data-highlighted]')).toBeFocused();
    };
    // The label the user reads is the chosen option, not an internal value.
    await expect(trigger).toContainText('Follow system');
    await trigger.click();
    // The keyboard sequence below is what a person does next, and it must not race the popup's arrival.
    await opened();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('data-value', 'en');
    await expect(trigger).toContainText('English');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    // Escape abandons the highlighted option without committing it.
    await trigger.click();
    await opened();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('data-value', 'en');
    await expect(page.locator('.ui-select-list')).toBeHidden();
    // An outside press closes it the same way: dismissed, not committed. The press lands inside
    // the Settings place, so this exercises the Select's own dismissal and not the surface scrim.
    await trigger.click();
    await opened();
    await page.keyboard.press('ArrowDown');
    await dialog.locator('.surface-header h2').click();
    await expect(trigger).toHaveAttribute('data-value', 'en');
    await expect(page.locator('.ui-select-list')).toBeHidden();
    await expect(dialog).toBeVisible();
});

test('the Settings tablist moves with the keyboard and reveals the panel with it', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    const dialog = page.getByRole('dialog', { name: 'Field settings' });
    await expect(dialog).toBeVisible();
    const general = dialog.locator('.settings-nav button[data-section="general"]');
    await expect(general).toHaveAttribute('aria-selected', 'true');
    await expect(dialog.locator('#setting-general')).toBeVisible();
    await expect(dialog.locator('#setting-appearance')).toBeHidden();
    await general.focus();
    await page.keyboard.press('ArrowDown');
    const appearance = dialog.locator('.settings-nav button[data-section="appearance"]');
    await expect(appearance).toHaveAttribute('aria-selected', 'true');
    await expect(dialog.locator('#setting-appearance')).toBeVisible();
    await expect(dialog.locator('#setting-general')).toBeHidden();
});

test('the close control is one affordance with a real target on every place', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    const dialog = page.getByRole('dialog', { name: 'Field settings' });
    const close = dialog.getByRole('button', { name: 'Return to Field', exact: true });
    await expect(close).toBeVisible();
    const box = await close.boundingBox();
    if (!box)
        throw new Error('The close affordance has no bounds');
    // A hit area large enough to be a real target, not just the glyph.
    expect(box.width).toBeGreaterThanOrEqual(32);
    expect(box.height).toBeGreaterThanOrEqual(32);
    await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    let reachedClose = false;
    for (let step = 0; step < 12; step++) {
        if (await close.evaluate(element => element === document.activeElement)) {
            reachedClose = true;
            break;
        }
        await page.keyboard.press('Shift+Tab');
    }
    expect(reachedClose, 'keyboard navigation reaches the close affordance').toBe(true);
    await expect(close).toBeFocused();
    expect(await close.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the Field title renames in place and keeps the identity block on one line', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.getByTestId('field-title').click();
    await page.getByTestId('field-menu').locator('[data-command="rename-field"]').click();
    const input = page.getByTestId('field-rename');
    await expect(input).toBeFocused();
    const field = await page.getByTestId('field-rename-shell').boundingBox();
    if (!field)
        throw new Error('The rename shell has no bounds');
    // No giant input across the screen: editing happens where the title already is.
    expect(field.width).toBeLessThan(520);
    expect(field.y).toBeLessThan(90);
    await input.fill('A short name');
    await input.press('Enter');
    await expect(page.locator('.identity h1')).toHaveText('A short name');
});
