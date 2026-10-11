import { test, expect } from '@playwright/test';
import type { ContextPacket, UserIntent } from '../../src/core/semantics.ts';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'gateway' })));
    await page.goto('/demo?locale=en');
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
});

test('questions default to one and an ignored repeated question ends without replacement calls', async ({ page }, testInfo) => {
    const requests: { packet: ContextPacket; intent: UserIntent }[] = [];
    const text = 'Which observation would change the chosen stopping threshold?';
    await page.route('**/api/respond', async route => {
        requests.push(route.request().postDataJSON());
        await route.fulfill({ json: { providerLabel: 'Question fixture / not live', mock: true, intents: [{ type: 'surface_question', text }] } });
    });
    const source = page.locator('[data-thought-id="attention"]');
    const original = await source.locator('p').innerText();
    const before = await source.boundingBox();
    await source.click();
    await page.getByTestId('scope-question').click();
    const preview = page.getByRole('dialog', { name: 'Generate a question', exact: true });
    await expect(preview.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: testInfo.outputPath('one-question-default.png') });
    await preview.getByTestId('action-preview-run').click();
    const ghost = page.locator('.thought.ghost');
    await expect(ghost).toHaveCount(1);
    await ghost.click({ button: 'right' });
    await page.getByTestId('thought-menu').getByRole('menuitem', { name: 'Ignore', exact: true }).click();
    await expect(ghost).toHaveCount(0);
    await source.click();
    await page.getByTestId('scope-question').click();
    await page.getByTestId('action-preview-run').click();
    await expect(page.locator('.notice[role="status"]')).toContainText('No new suggestion was surfaced this time.');
    await expect(ghost).toHaveCount(0);
    expect(requests).toHaveLength(2);
    expect(requests.every(request => request.intent.kind === 'question' && request.packet.maxCandidates === 1)).toBe(true);
    expect(requests[0].intent.text).toContain('missing definition or distinction');
    expect(requests[1].intent.text).toContain('missing observation');
    expect(JSON.stringify(requests[1])).not.toContain(text);
    await expect(source.locator('p')).toHaveText(original);
    expect(await source.boundingBox()).toEqual(before);
});

test('explicit three-question batches accept fewer or no questions without repeating focus guidance or retrying', async ({ page }, testInfo) => {
    const requests: { packet: ContextPacket; intent: UserIntent }[] = [];
    const batches = [
        ['What counts as an attention decision?', 'Which observation changes the decision?', 'What assumption connects attention to this criterion?'],
        ['Under what boundary would this criterion fail?'],
        [],
    ];
    await page.route('**/api/respond', async route => {
        requests.push(route.request().postDataJSON());
        await route.fulfill({ json: { providerLabel: 'Batch fixture / not live', mock: true, intents: batches[requests.length - 1].map(text => ({ type: 'surface_question', text })) } });
    });
    const source = page.locator('[data-thought-id="attention"]');
    const original = await source.locator('p').innerText();
    const before = await source.boundingBox();
    const transform = await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform);
    const durableThoughts = await page.locator('[data-kind="thought"]').count();
    const ghosts = page.locator('.thought.ghost');
    for (const batch of batches) {
        await source.click();
        await page.getByTestId('scope-question').click();
        const preview = page.getByRole('dialog', { name: 'Generate a question', exact: true });
        await preview.getByRole('button', { name: '3', exact: true }).click();
        await preview.getByTestId('action-preview-run').click();
        await expect(ghosts).toHaveCount(batch.length);
        if (!batch.length) await expect(page.locator('.notice[role="status"]')).toContainText('No new suggestion was surfaced this time.');
        for (const text of batch) await expect(ghosts.filter({ hasText: text })).toHaveCount(1);
        for (let index = 0; index < batch.length; index++) {
            await ghosts.first().click({ button: 'right' });
            await page.getByTestId('thought-menu').getByRole('menuitem', { name: 'Ignore', exact: true }).click();
        }
        await expect(ghosts).toHaveCount(0);
    }
    expect(requests).toHaveLength(3);
    expect(requests.every(request => request.intent.kind === 'question' && request.packet.maxCandidates === 3 && request.packet.scope.map(item => item.id).join() === 'attention')).toBe(true);
    expect(requests[0].intent.text).toContain('Ask up to 3');
    expect(requests[0].intent.text).toContain('missing definition or distinction');
    expect(requests[1].intent.text).toContain('one boundary');
    expect(requests[1].intent.text).toContain('criterion for choosing');
    expect(requests[1].intent.text).not.toContain('missing definition or distinction');
    expect(requests[1].intent.text).not.toContain('missing observation');
    expect(requests[1].intent.text).not.toContain('unstated assumption');
    expect(requests[2].intent.text).toContain('does not prove');
    for (const text of batches.flat()) expect(JSON.stringify(requests.slice(1))).not.toContain(text);
    await expect(source.locator('p')).toHaveText(original);
    expect(await source.boundingBox()).toEqual(before);
    expect(await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform)).toBe(transform);
    await expect(page.locator('[data-kind="thought"]')).toHaveCount(durableThoughts);
    await page.screenshot({ path: testInfo.outputPath('three-questions-fewer-and-empty.png') });
});

test('explicit Another Angle previews rotate their lens even after dismissing each result', async ({ page }) => {
    const requests: { packet: ContextPacket; intent: UserIntent }[] = [];
    await page.route('**/api/respond', async route => {
        requests.push(route.request().postDataJSON());
        await route.fulfill({ json: { providerLabel: 'Angle fixture / not live', mock: true, intents: [{ type: 'surface_possibility', text: 'Distinct authored observation fixture ' + requests.length }] } });
    });
    for (let run = 0; run < 3; run++) {
        await page.locator('[data-thought-id="attention"]').click();
        await page.getByTestId('scope-angle').click();
        const preview = page.getByRole('dialog', { name: 'Another angle', exact: true });
        await preview.getByRole('button', { name: '1', exact: true }).click();
        await preview.getByTestId('action-preview-run').click();
        const ghost = page.locator('.thought.ghost');
        await expect(ghost).toHaveCount(1);
        const indicator = page.getByRole('group', { name: 'Thinking activity', exact: true });
        await expect(indicator).toContainText('Found 1 angle');
        await ghost.click({ button: 'right' });
        await page.getByTestId('thought-menu').getByRole('menuitem', { name: 'Ignore', exact: true }).click();
        await indicator.getByRole('button', { name: 'Dismiss', exact: true }).click();
        await expect(ghost).toHaveCount(0);
    }
    expect(requests).toHaveLength(3);
    expect(new Set(requests.map(request => request.intent.text)).size).toBe(3);
    expect(requests[1].intent.text).toContain('cost of an alternative');
    expect(requests[2].intent.text).toContain('time horizon');
    expect(requests.every(request => request.packet.scope[0].id === 'attention' && request.packet.maxCandidates === 1)).toBe(true);
    expect(requests.every(request => !JSON.stringify(request).includes('Distinct authored observation fixture'))).toBe(true);
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
        expect(requests[1].intent.text).not.toContain(text);
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
    expect(requests[2].intent.text).not.toContain('Distinct authored direction fixture 1');
    expect(requests[2].intent.text).not.toContain('Distinct authored direction fixture 2');
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
        expect(requests[1].intent.text).not.toContain(text);
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
    expect(requests[1].intent.text).not.toContain(text);
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
    expect(requests[2].intent.text).not.toContain(text);
    expect(requests[2].packet).toEqual(requests[0].packet);
    expect(JSON.stringify(requests[2].packet)).not.toContain(text);
    expect(requests).toHaveLength(3);
    await page.screenshot({ path: testInfo.outputPath('default-angle-ignored-history.png') });
});
