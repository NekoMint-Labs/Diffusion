import { test, expect } from '@playwright/test';

test('authored comparison/deep words stay Ask and only answer cards appear', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'gateway' })));
    const calls: { intent: { kind: string; text: string }; packet: { scope: { id: string }[] } }[] = [];
    await page.route('**/api/respond', async route => {
        calls.push(route.request().postDataJSON());
        await route.fulfill({ json: { providerLabel: 'Ask fixture / not live', mock: true, intents: [
            { type: 'respond_in_field', text: 'The first direct answer component.' },
            { type: 'surface_possibility', text: 'Unsolicited another-angle card.' },
            { type: 'respond_in_field', text: 'The second direct answer component.' },
        ] } });
    });
    await page.goto('/demo?locale=en');
    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    const words = 'Compare these thoughts in depth; go deeper and answer my question.';
    await input.fill(words); await expect(input).toHaveValue(words); await page.getByTestId('speak').locator('.speak-action').click();
    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0].intent).toMatchObject({ kind: 'ask', text: words });
    await expect(page.locator('.thought.ghost').filter({ hasText: 'The first direct answer component.' })).toBeVisible();
    await expect(page.locator('.thought.ghost').filter({ hasText: 'The second direct answer component.' })).toBeVisible();
    await expect(page.locator('.thought.ghost').filter({ hasText: 'Unsolicited another-angle card.' })).toHaveCount(0);
    expect(calls).toHaveLength(1);
    expect(calls[0].intent).toMatchObject({ kind: 'ask', text: words });
    expect(calls[0].packet.scope.map(t => t.id).sort()).toEqual(['attention', 'structure']);
});
