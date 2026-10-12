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
        const popup = page.getByRole('alertdialog', { name: 'Request timed out' });
        await expect(popup).toBeVisible();
        await popup.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(dialog.getByRole('alert')).toHaveText('The evidence request timed out. No judgment was made.');
        await expect(dialog.getByRole('button', { name: 'Search the web' })).toBeEnabled();
        await expect(dialog.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0);
    } finally { release(); }
});

test('search reacts immediately to going offline, keeps earlier candidates and retries only explicitly', async ({ page }) => {
    let calls = 0, release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route('https://verify.example/search', async route => {
        calls++;
        if (calls === 2) await held;
        await route.fulfill({ json: { candidates: [{ id: 'public', title: calls === 2 ? 'Late unwanted candidate' : 'Readable candidate', url: 'https://example.org/reference', excerpt: 'A plain search snippet.', inspected: 'Snippet only' }] } }).catch(() => {});
    });
    try {
        const dialog = await openVerify(page, { external: true, backend: 'custom', customUrl: 'https://verify.example' });
        const search = dialog.getByRole('button', { name: 'Search the web' });
        await search.click(); await expect(dialog).toContainText('Readable candidate');
        await search.click(); await expect.poll(() => calls).toBe(2);
        await page.evaluate(() => window.dispatchEvent(new Event('offline')));
        const popup = page.getByRole('alertdialog', { name: 'Connection failed' });
        await expect(popup).toContainText('This device appears to be offline.');
        await popup.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(search).toBeEnabled();
        await expect(dialog).toContainText('Readable candidate');
        await page.evaluate(() => window.dispatchEvent(new Event('online')));
        release(); await expect(dialog.getByText('Late unwanted candidate')).toHaveCount(0);
        expect(calls).toBe(2);
        await search.click(); await expect.poll(() => calls).toBe(3);
        await expect(dialog.getByRole('alert')).toHaveCount(0);
    } finally { release(); }
});

test('an already offline search never starts, while a transport disconnect also opens a popup', async ({ page }) => {
    let calls = 0;
    await page.route('https://verify.example/search', route => { calls++; return route.abort('internetdisconnected'); });
    const dialog = await openVerify(page, { external: true, backend: 'custom', customUrl: 'https://verify.example' });
    await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, value: false }));
    await dialog.getByRole('button', { name: 'Search the web' }).click();
    let popup = page.getByRole('alertdialog', { name: 'Connection failed' });
    await expect(popup).toContainText('This device appears to be offline.');
    expect(calls).toBe(0);
    await popup.getByRole('button', { name: 'Close', exact: true }).click();
    await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }));
    await dialog.getByRole('button', { name: 'Search the web' }).click();
    popup = page.getByRole('alertdialog', { name: 'Connection failed' });
    await expect(popup).toContainText('could not be reached');
    await popup.getByRole('button', { name: 'Close', exact: true }).click();
    expect(calls).toBe(1);
    await expect(dialog.getByRole('button', { name: 'Search the web' })).toBeEnabled();
});
