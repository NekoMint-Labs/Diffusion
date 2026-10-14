import { test, expect } from '@playwright/test';
import { choose, openSection } from './selects.ts';

test('explicit keyless search works without saved credentials and can be turned off', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'demo', discovery: { external: true, sources: { tavily: true } } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        const fixture = { calls: [] as unknown[], credentialReads: 0 };
        Object.assign(window, { keylessFixture: fixture, __TAURI_INTERNALS__: { invoke: async (command: string, args: unknown) => {
            if (command === 'credential_has') return false;
            if (command === 'credential_get') fixture.credentialReads++;
            if (command === 'discovery_available') return true;
            if (command === 'discovery_version') return 'keyless-fixture';
            if (command === 'discovery_run') {
                fixture.calls.push(args);
                return JSON.stringify({ version: 1, operation: 'search', status: 'complete', error: null, data: { candidates: [{ title: 'Public keyless candidate', url: 'https://example.org/reference', snippet: 'Discovery snippet', provider: 'tavily' }] }, attempts: [] });
            }
            return false;
        } } });
    });
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+,');
    await openSection(page, 'search');
    await choose(page, 'search-provider', 'tavily');
    await expect(page.getByTestId('search-test')).toBeDisabled();
    await page.getByTestId('tavily-keyless').check();
    await expect(page.getByTestId('source-key-tavily')).toHaveCount(0);
    await expect(page.getByTestId('search-test')).toBeEnabled();
    await page.getByTestId('search-test').click();
    await expect.poll(() => page.evaluate(() => (window as any).keylessFixture.calls.length)).toBe(1);
    expect(await page.evaluate(() => (window as any).keylessFixture.calls[0])).toMatchObject({ sources: ['tavily'], tavilyKeyless: true });
    await page.keyboard.press('Escape');
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByRole('menuitem', { name: /^Check evidence/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Look for evidence' });
    await dialog.getByRole('button', { name: 'Search the web' }).click();
    await expect(dialog).toContainText('Public keyless candidate');
    await expect(dialog).toContainText('Discovery snippet, not read evidence');
    expect(await page.evaluate(() => (window as any).keylessFixture.credentialReads)).toBe(0);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+,');
    await openSection(page, 'search');
    await page.getByTestId('tavily-keyless').uncheck();
    await expect(page.getByTestId('source-key-tavily')).toBeVisible();
    await expect(page.getByTestId('search-test')).toBeDisabled();
});
