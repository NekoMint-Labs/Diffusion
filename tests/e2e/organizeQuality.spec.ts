import { test, expect } from '@playwright/test';

test('a growing Organize proposal stays inside the viewport and Cancel preserves the Field', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'gateway' })));
    let respond!: () => void;
    const release = new Promise<void>(resolve => { respond = resolve; });
    await page.route('**/api/respond', async route => {
        await release;
        await route.fulfill({ json: { providerLabel: 'Long structure fixture / not live', mock: true, intents: [{
            type: 'surface_structure',
            groups: ['attention', 'structure', 'quiet'].map(id => ({ label: 'A supported fixture group', thoughtIds: [id] })),
            relations: [{ a: 'attention', b: 'structure', kind: 'gap', label: 'A fixture evidence gap', explanation: 'An authored observation about the boundary between these thoughts. '.repeat(4) }],
            note: 'This authored fixture leaves a premise unresolved and requires further evidence. '.repeat(5),
        }] } });
    });
    await page.goto('/demo?locale=en');
    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    await page.locator('[data-thought-id="quiet"]').click({ modifiers: ['Shift'] });
    const before = await page.locator('[data-kind="thought"], [data-kind="crystal"]').evaluateAll(elements => elements.map(element => ({ id: element.getAttribute('data-thought-id'), text: element.querySelector('p')?.textContent, style: element.getAttribute('style') })));
    const camera = await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform);
    await page.getByTestId('scope-organize').click();
    const surface = page.getByRole('dialog', { name: 'Organize thoughts', exact: true });
    await expect(surface).toContainText('Looking for structure...');
    respond();
    await expect(surface.getByTestId('structure-proposal')).toBeVisible();
    await expect.poll(async () => {
        const box = await surface.boundingBox();
        const viewport = page.viewportSize()!;
        return Boolean(box && box.x >= 16 && box.y >= 16 && box.x + box.width <= viewport.width - 16 && box.y + box.height <= viewport.height - 16);
    }).toBe(true);
    await surface.getByRole('button', { name: 'Cancel', exact: true }).scrollIntoViewIfNeeded();
    const cancel = surface.getByRole('button', { name: 'Cancel', exact: true });
    const box = (await cancel.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height - 16);
    await page.screenshot({ path: testInfo.outputPath('long-organize-controls-visible.png') });
    await cancel.click();
    await expect(surface).toHaveCount(0);
    expect(await page.locator('[data-kind="thought"], [data-kind="crystal"]').evaluateAll(elements => elements.map(element => ({ id: element.getAttribute('data-thought-id'), text: element.querySelector('p')?.textContent, style: element.getAttribute('style') })))).toEqual(before);
    expect(await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform)).toBe(camera);
    await expect(page.locator('.relation.tentative')).toHaveCount(0);
});