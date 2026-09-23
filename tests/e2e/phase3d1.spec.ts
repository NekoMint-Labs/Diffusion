import { test, expect, type Page } from '@playwright/test';

/** Phase 3D.1: an action states what it will do before it does it, and organization is not commitment.
 *
 * Continue, Another angle and Ask each open a small local prediction beside the selection instead of
 * entering an execution path from the first click. Writing your own question and the Thread place
 * keep their own explicit entries, and 理一理 (Organize thoughts) reveals structure among existing
 * Thoughts without forming a new one.
 */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
    errors.set(page, []);
    page.on('pageerror', error => errors.get(page)?.push(error.message));
    await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'demo' })));
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

const selected = (page: Page) => page.locator('[data-selected="true"]').count();
async function relations(page: Page) {
    return page.evaluate(async () => new Promise<number>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => { const db = opening.result;
            const request = db.transaction('projects').objectStore('projects').get('demo');
            request.onerror = () => { db.close(); reject(request.error); };
            request.onsuccess = () => { db.close(); resolve(Object.keys(request.result.relations ?? {}).length); }; };
    }));
}

test('Continue predicts its run before it starts, and the Thread place keeps its own entry', async ({ page }) => {
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('scope-continue').click();
    const preview = page.getByRole('dialog', { name: 'Continue thinking', exact: true });
    await expect(preview).toBeVisible();
    // Nothing has been asked of a provider yet, and no place was opened on the first click.
    await expect(page.getByRole('dialog', { name: 'Thinking with', exact: true })).toHaveCount(0);
    await expect(preview.getByTestId('action-preview-run')).toBeVisible();
    // The preview reads the fixed product default rather than inventing one; a local choice belongs
    // to this run and never writes back (there is no persisted thinking-default preference any more).
    await expect(preview.getByRole('button', { name: '3', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await preview.getByRole('button', { name: '5', exact: true }).click();
    await expect(preview.getByRole('button', { name: '5', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await preview.getByTestId('action-preview-run').click();
    await expect(preview).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('diffusion-settings') ?? '{}').thinkingDefaults)).toBeUndefined();
    await expect(page.getByRole('group', { name: 'Thinking activity' })).toHaveCount(0);

    // The Thread place is still one explicit click away, and it is not what Continue does.
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="thread"]').click();
    await expect(page.getByRole('dialog', { name: 'Thinking with', exact: true })).toBeVisible();
});

test('AI question is the obvious primary action while writing your own question stays explicit', async ({ page }) => {
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('scope-question').click();
    const preview = page.getByRole('dialog', { name: 'Generate a question', exact: true });
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('Generate a question that could move the thinking.');
    await preview.getByTestId('action-preview-run').click();
    await expect(preview).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Speak', exact: true })).toHaveCount(0);

    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await expect(input).toBeFocused();
    await expect(page.getByTestId('speak')).toHaveAttribute('data-state', 'scoped');
});

test('three Thoughts organize into proposals that change nothing until Apply', async ({ page }) => {
    const before = await relations(page);
    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    await page.locator('[data-thought-id="quiet"]').click({ modifiers: ['Shift'] });
    await expect.poll(() => selected(page)).toBe(3);

    const organize = page.getByTestId('scope-organize');
    await expect(organize).toHaveText('Organize thoughts');
    await organize.click();
    const surface = page.getByRole('dialog', { name: 'Organize thoughts', exact: true });
    await expect(surface).toBeVisible();
    // The first analysis is a proposal: it is transient until it is applied.
    await expect(surface.getByTestId('organize-proposal')).toHaveAttribute('data-version', '1', { timeout: 15000 });
    expect(await relations(page)).toBe(before);

    // Cancel leaves canonical content untouched and removes what the run proposed.
    await surface.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(surface).toHaveCount(0);
    await expect(page.locator('.relation.tentative, .thought.ghost')).toHaveCount(0);
    expect(await relations(page)).toBe(before);
});
