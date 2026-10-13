import { test, expect } from '@playwright/test';
import type { ProjectState } from '../../src/core/model.ts';

test('Ask Keep preserves real source IDs and action through browser reload', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'gateway' })));
    await page.route('**/api/respond', route => route.fulfill({ json: { providerLabel: 'Ask lineage fixture / not live', mock: true, intents: [{ type: 'respond_in_field', text: 'This direct answer retains the question source.' }] } }));
    await page.goto('/demo?locale=en');
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await input.fill('Please directly answer this question.');
    await expect(input).toHaveValue('Please directly answer this question.');
    await page.getByTestId('speak').locator('.speak-action').click();
    const ghost = page.locator('.thought.ghost').filter({ hasText: 'This direct answer retains the question source.' });
    await expect(ghost).toBeVisible();
    await expect(ghost).toHaveAttribute('data-proposal-action', 'ask');
    const id = await ghost.getAttribute('data-thought-id');
    expect(id).toBeTruthy();
    await ghost.click();
    await page.getByTestId('scope-hub').getByRole('button', { name: 'Keep this', exact: true }).click();
    const kept = page.locator(`[data-thought-id="${id}"]`);
    await expect(kept).not.toHaveClass(/ghost/);
    await expect(kept).toHaveAttribute('data-generation-action', 'ask');
    await expect.poll(() => page.evaluate(id => new Promise<unknown>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
            const db = opening.result;
            const read = db.transaction('projects').objectStore('projects').get('demo');
            read.onsuccess = () => { db.close(); resolve((read.result as ProjectState)?.thoughts[id!]?.derivedFrom); };
            read.onerror = () => { db.close(); reject(read.error); };
        };
    }), id)).toEqual(['attention']);
    await page.reload();
    await expect(kept).toBeVisible();
    await expect(kept).toHaveAttribute('data-generation-action', 'ask');
    await expect(kept).toHaveAttribute('data-origin-scope', 'attention');
});
