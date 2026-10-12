import { test, expect, type Page } from '@playwright/test';

const text = '你好 is a common Chinese greeting meaning hello. This paragraph is the fetched source text.';
async function open(page: Page, provider = 'compatible') {
    await page.addInitScript(provider => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider, baseUrl: 'http://127.0.0.1:11434/v1', model: 'fixture', discovery: { external: true, backend: 'custom', customUrl: 'https://verify.example' } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    }, provider);
    await page.route('https://verify.example/search', route => route.fulfill({ json: { candidates: [{ id: 'hello', title: 'Greeting dictionary', url: 'https://example.org/hello', excerpt: 'Search summary only', inspected: 'Snippet only' }] } }));
    await page.route('https://verify.example/fetch', route => route.fulfill({ json: { url: 'https://example.org/hello', title: 'Greeting dictionary', text, inspected: 'Fetched source text' } }));
    await page.route('https://verify.example/extract', route => route.fulfill({ json: { chunks: [{ text, locator: 'Paragraph 1', inspected: 'Extracted paragraph' }] } }));
    await page.goto('/demo?locale=en');
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByRole('menuitem', { name: /^Check evidence/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Look for evidence' });
    await dialog.getByRole('textbox', { name: 'What should be checked?' }).fill('你好 means hello');
    await dialog.getByRole('button', { name: 'Search the web' }).click();
    return dialog;
}

test('Verify assesses read passages only on explicit request, recovers auth failure, and keeps provenance', async ({ page }, testInfo) => {
    let calls = 0;
    await page.route('http://127.0.0.1:11434/**', async route => {
        calls++;
        const wire = route.request().postDataJSON();
        const input = JSON.parse(wire.messages.findLast((message: { role: string }) => message.role === 'user').content);
        expect(input.claim).toBe('你好 means hello');
        expect(input.passages).toHaveLength(1);
        expect(input.passages[0].text).toBe(text);
        expect(JSON.stringify(input)).not.toContain('Search summary only');
        if (calls === 1) return route.fulfill({ status: 401, body: '{}' });
        return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ outcome: 'support', rationale: 'The read paragraph explicitly defines the greeting.', passageIds: [input.passages[0].id] }) }, finish_reason: 'stop' }] } });
    });
    const dialog = await open(page);
    expect(calls).toBe(0);
    await expect(dialog.getByRole('button', { name: 'Assess against claim' })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Read source', exact: true }).click();
    await expect(dialog.locator('[data-evidence-stage="read"]')).toContainText(text);
    expect(calls).toBe(0);
    const assess = dialog.getByRole('button', { name: 'Assess against claim' });
    await assess.click();
    await expect(dialog.getByRole('alert')).toContainText('Authentication failed');
    await expect(dialog.getByRole('button', { name: 'Open AI settings' })).toBeVisible();
    await expect(dialog.getByTestId('configure-search')).toHaveCount(0);
    await expect(dialog.locator('[data-evidence-stage="read"]')).toBeVisible();
    expect(calls).toBe(1);
    await assess.click();
    await expect(dialog.locator('[data-evidence-stage="judged"]')).toContainText('The read paragraph explicitly defines the greeting.');
    await expect(dialog.locator('.evidence-judgment')).toContainText('OpenAI compatible');
    expect(calls).toBe(2);
    await page.screenshot({ path: testInfo.outputPath('read-and-assessed.png') });
});

test('Demo can read sources but never silently fabricates an assessment', async ({ page }) => {
    const dialog = await open(page, 'demo');
    await dialog.getByRole('button', { name: 'Read source', exact: true }).click();
    await expect(dialog).toContainText('Configure a live AI provider to assess the read passages.');
    await expect(dialog.getByRole('button', { name: 'Assess against claim' })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Open AI settings' }).click();
    await expect(page.locator('#setting-ai')).toBeVisible();
});
