import { test, expect, type Page } from '@playwright/test';

async function openVerify(page: Page, discovery: object) {
    await page.addInitScript(discovery => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'demo', discovery }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    }, discovery);
    await page.goto('/demo?locale=en');
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByRole('menuitem', { name: /^Check evidence/ }).click();
    return page.getByRole('dialog', { name: 'Look for evidence' });
}
for (const [discovery, message] of [
    [{ external: false }, 'Looking outside this Field is off'],
    [{ external: true }, 'Choose at least one source.'],
    [{ external: true, sources: { exa: true } }, 'A key is still needed.'],
] as const) {
    test(`Verify explains unavailable search: ${message}`, async ({ page }) => {
        const dialog = await openVerify(page, discovery);
        await expect(dialog).toContainText(message);
        await expect(dialog.getByRole('button', { name: 'Search the web' })).toBeDisabled();
        await dialog.getByTestId('configure-search').click();
        await expect(page.locator('#setting-search')).toBeVisible();
    });
}
test('Verify distinguishes authentication, empty results and explicit successful retry', async ({ page }) => {
    let calls = 0;
    await page.route('https://verify.example/search', route => {
        calls++;
        return calls === 1 ? route.fulfill({ status: 401, body: '{}' })
            : route.fulfill({ json: { candidates: calls === 2 ? [] : [{ id: 'public', title: 'Public candidate', url: 'https://example.org/reference', excerpt: 'Discovery snippet', inspected: 'Snippet only' }] } });
    });
    const dialog = await openVerify(page, { external: true, backend: 'custom', customUrl: 'https://verify.example' });
    const search = dialog.getByRole('button', { name: 'Search the web' });
    await search.click();
    await expect(dialog.getByRole('alert')).toContainText('Authentication failed');
    await expect(dialog.getByTestId('configure-search')).toBeVisible();
    expect(calls).toBe(1);
    await search.click();
    await expect(dialog).toContainText('External discovery returned no results.');
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await search.click();
    await expect(dialog).toContainText('Public candidate');
    await expect(dialog).toContainText('Discovery snippet, not read evidence');
    await expect(page.locator('.thought.ghost')).toHaveCount(0);
    expect(calls).toBe(3);
});

test('a Verify deadline releases running controls and reports that no judgment was made', async ({ page }) => {
    await page.clock.install();
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route('https://verify.example/search', async route => {
        await held;
        await route.fulfill({ json: { candidates: [] } }).catch(() => {});
    });
    try {
        const dialog = await openVerify(page, { external: true, backend: 'custom', customUrl: 'https://verify.example' });
        await dialog.getByRole('button', { name: 'Search the web' }).click();
        await expect(dialog.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
        await page.clock.fastForward(65000);
        await expect(dialog.getByRole('alert')).toHaveText('The evidence request timed out. No judgment was made.');
        await expect(dialog.getByRole('button', { name: 'Search the web' })).toBeEnabled();
        await expect(dialog.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0);
    } finally { release(); }
});
