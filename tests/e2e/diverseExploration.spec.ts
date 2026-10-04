import { test, expect } from '@playwright/test';
import type { ContextPacket, UserIntent } from '../../src/core/semantics.ts';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'gateway' })));
    await page.goto('/demo?locale=en');
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
});

for (const end of ['repeated', 'empty'] as const) {
    test('an ignored exploration result stays excluded and a ' + end + ' step ends with an honest count', async ({ page }, testInfo) => {
        const requests: { packet: ContextPacket; intent: UserIntent }[] = [];
        const text = 'An authored observation fixture about who pays for extra views.';
        let release!: () => void;
        const secondReady = new Promise<void>(resolve => { release = resolve; });
        await page.route('**/api/respond', async route => {
            requests.push(route.request().postDataJSON());
            if (requests.length === 2) await secondReady;
            await route.fulfill({ json: { providerLabel: 'Diversity fixture / not live', mock: true, intents: requests.length === 1
                ? [{ type: 'surface_possibility', text }, { type: 'surface_possibility', text: 'Excess fixture that must not appear.' }]
                : end === 'empty' ? [] : [{ type: 'surface_possibility', text: '  ' + text.slice(0, -1) + '！' }] } });
        });
        const source = page.locator('[data-thought-id="attention"]');
        await source.click();
        const before = await source.boundingBox();
        const original = await source.locator('p').innerText();
        const transform = await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform);
        await page.getByTestId('scope-angle').click();
        await page.getByTestId('action-preview-run').click();
        const ghost = page.locator('.thought.ghost');
        await expect(ghost).toHaveCount(1);
        await expect(ghost).toContainText(text);
        await expect.poll(() => requests.length).toBe(2);
        expect(requests.every(request => request.packet.maxCandidates === 1)).toBe(true);
        expect(requests[1].packet.scope.map(item => item.id)).toEqual(['attention']);
        expect(JSON.stringify(requests[1].packet)).not.toContain(text);
        expect(requests[1].intent.text).toContain(text);
        await ghost.click({ button: 'right' });
        await page.getByTestId('thought-menu').getByRole('menuitem', { name: 'Ignore', exact: true }).click();
        await expect(ghost).toHaveCount(0);
        release();
        const indicator = page.getByRole('group', { name: 'Thinking activity', exact: true });
        await expect(indicator).toContainText('Found 1 angle');
        await expect(indicator.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0);
        await expect(page.locator('.notice[role="status"]')).toContainText('No new suggestion was surfaced this time.');
        await indicator.getByRole('button', { name: 'Details', exact: true }).click();
        const details = page.getByRole('dialog', { name: 'Run settings', exact: true });
        await expect(details).toContainText('No new direction was surfaced. This exploration has ended.');
        await expect(ghost).toHaveCount(0);
        expect(requests).toHaveLength(2);
        expect(await source.boundingBox()).toEqual(before);
        await expect(source.locator('p')).toHaveText(original);
        expect(await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform)).toBe(transform);
        await page.screenshot({ path: testInfo.outputPath('honest-empty-exploration.png') });
    });
}

test('three directions produce at most three temporary cards from the same owned scope', async ({ page }, testInfo) => {
    const requests: { packet: ContextPacket; intent: UserIntent }[] = [];
    await page.route('**/api/respond', async route => {
        requests.push(route.request().postDataJSON());
        await route.fulfill({ json: { providerLabel: 'Diversity fixture / not live', mock: true, intents: [
            { type: 'surface_possibility', text: 'Distinct authored direction fixture ' + requests.length },
            { type: 'surface_possibility', text: 'Excess authored fixture ' + requests.length },
        ] } });
    });
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('scope-angle').click();
    await page.getByTestId('action-preview-run').click();
    await expect(page.getByRole('group', { name: 'Thinking activity', exact: true })).toContainText('Found 3 angles');
    await expect(page.locator('.thought.ghost')).toHaveCount(3);
    expect(requests).toHaveLength(3);
    expect(requests.every(request => request.packet.scope.map(item => item.id).join() === 'attention' && request.packet.maxCandidates === 1)).toBe(true);
    expect(requests[2].intent.text).toContain('Distinct authored direction fixture 1');
    expect(requests[2].intent.text).toContain('Distinct authored direction fixture 2');
    await expect(page.locator('[data-kind="thought"]').filter({ hasText: 'Distinct authored direction fixture' })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('three-bounded-directions.png') });
});

test('an empty Continue clearly reports no new card without moving the source or camera', async ({ page }, testInfo) => {
    let requests = 0;
    await page.route('**/api/respond', async route => {
        requests++;
        await route.fulfill({ json: { providerLabel: 'Empty feedback fixture / not live', mock: true, intents: [] } });
    });
    const source = page.locator('[data-thought-id="attention"]');
    await source.click();
    const before = await source.boundingBox();
    const transform = await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform);
    await page.getByTestId('scope-continue').click();
    await page.getByTestId('action-preview-run').click();
    await expect(page.locator('.notice[role="status"]')).toContainText('No new suggestion was surfaced this time.');
    await expect(page.locator('.thought.ghost')).toHaveCount(0);
    expect(requests).toBe(1);
    expect(await source.boundingBox()).toEqual(before);
    expect(await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform)).toBe(transform);
    await page.screenshot({ path: testInfo.outputPath('no-new-card-feedback.png') });
});

for (const action of ['continue', 'angle'] as const) {
    test('a second explicit ' + action + ' avoids ignored wording without expanding owned scope', async ({ page }) => {
        const requests: { packet: ContextPacket; intent: UserIntent }[] = [];
        const text = 'An authored alternative frame about the cost of attention.';
        await page.route('**/api/respond', async route => {
            requests.push(route.request().postDataJSON());
            await route.fulfill({ json: { providerLabel: 'Repeated thinking fixture / not live', mock: true, intents: [{ type: 'surface_possibility', text }] } });
        });
        const source = page.locator('[data-thought-id="attention"]');
        await source.click();
        await page.getByTestId('scope-' + action).click();
        if (action === 'angle') await page.getByRole('button', { name: '1', exact: true }).click();
        await page.getByTestId('action-preview-run').click();
        const ghost = page.locator('.thought.ghost');
        await expect(ghost).toHaveCount(1);
        await ghost.click({ button: 'right' });
        await page.getByTestId('thought-menu').getByRole('menuitem', { name: 'Ignore', exact: true }).click();
        await expect(ghost).toHaveCount(0);
        await source.click();
        await page.getByTestId('scope-' + action).click();
        if (action === 'angle') await page.getByRole('button', { name: '1', exact: true }).click();
        await page.getByTestId('action-preview-run').click();
        await expect(page.locator('.notice[role="status"]')).toContainText('No new suggestion was surfaced this time.');
        expect(requests).toHaveLength(2);
        expect(requests[1].packet).toEqual(requests[0].packet);
        expect(JSON.stringify(requests[1].packet)).not.toContain(text);
        expect(requests[1].intent.text).toContain(text);
        await expect(ghost).toHaveCount(0);
    });
}

test('Continue and Angle share avoidance while preserving the selected text and camera', async ({ page }) => {
    const requests: { packet: ContextPacket; intent: UserIntent }[] = [];
    const text = 'An authored possibility fixture about an unstated attention cost.';
    await page.route('**/api/respond', async route => {
        requests.push(route.request().postDataJSON());
        await route.fulfill({ json: { providerLabel: 'Cross-action fixture / not live', mock: true, intents: [{ type: 'surface_possibility', text }] } });
    });
    const source = page.locator('[data-thought-id="attention"]');
    await source.click();
    const before = await source.boundingBox();
    const original = await source.locator('p').innerText();
    const transform = await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform);
    await page.getByTestId('scope-continue').click();
    await page.getByRole('button', { name: '1', exact: true }).click();
    await page.getByTestId('action-preview-run').click();
    const ghost = page.locator('.thought.ghost');
    await expect(ghost).toHaveCount(1);
    await ghost.click({ button: 'right' });
    await page.getByTestId('thought-menu').getByRole('menuitem', { name: 'Ignore', exact: true }).click();
    await expect(ghost).toHaveCount(0);
    await source.click();
    await page.getByTestId('scope-angle').click();
    await page.getByRole('button', { name: '1', exact: true }).click();
    await page.getByTestId('action-preview-run').click();
    await expect(page.locator('.notice[role="status"]')).toContainText('No new suggestion was surfaced this time.');
    await expect(ghost).toHaveCount(0);
    expect(requests).toHaveLength(2);
    expect(requests.map(request => request.intent.kind)).toEqual(['continue', 'angle']);
    expect(requests[1].intent.text).toContain(text);
    expect(requests[1].packet).toEqual(requests[0].packet);
    expect(JSON.stringify(requests[1].packet)).not.toContain(text);
    expect(await source.boundingBox()).toEqual(before);
    await expect(source.locator('p')).toHaveText(original);
    expect(await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform)).toBe(transform);
});

test('default three-direction Angle remembers an ignored prior run without replacement calls', async ({ page }, testInfo) => {
    const requests: { packet: ContextPacket; intent: UserIntent }[] = [];
    const text = 'An authored default-count frame about the cost of attention.';
    await page.route('**/api/respond', async route => {
        requests.push(route.request().postDataJSON());
        await route.fulfill({ json: { providerLabel: 'Default-count fixture / not live', mock: true, intents: [{ type: 'surface_possibility', text }] } });
    });
    const source = page.locator('[data-thought-id="attention"]');
    await source.click();
    await page.getByTestId('scope-angle').click();
    await page.getByTestId('action-preview-run').click();
    const ghost = page.locator('.thought.ghost');
    await expect(ghost).toHaveCount(1);
    await expect.poll(() => requests.length).toBe(2);
    const activity = page.getByRole('group', { name: 'Thinking activity', exact: true });
    await expect(activity.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0);
    await ghost.click({ button: 'right' });
    await page.getByTestId('thought-menu').getByRole('menuitem', { name: 'Ignore', exact: true }).click();
    await expect(ghost).toHaveCount(0);
    await source.click();
    await page.getByTestId('scope-angle').click();
    await page.getByTestId('action-preview-run').click();
    await expect.poll(() => requests.length).toBe(3);
    await expect(activity.getByRole('button', { name: 'Stop', exact: true })).toHaveCount(0);
    await expect(page.locator('.notice[role="status"]')).toContainText('No new suggestion was surfaced this time.');
    await expect(ghost).toHaveCount(0);
    expect(requests[2].intent.text).toContain(text);
    expect(requests[2].packet).toEqual(requests[0].packet);
    expect(JSON.stringify(requests[2].packet)).not.toContain(text);
    expect(requests).toHaveLength(3);
    await page.screenshot({ path: testInfo.outputPath('default-angle-ignored-history.png') });
});
