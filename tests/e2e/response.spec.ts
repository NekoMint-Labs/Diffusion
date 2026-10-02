import { test, expect } from '@playwright/test';

const question = 'If the background fades, do we lose the context that made this matter?';
test.beforeEach(async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.locator('[data-thought-id="unfinished"]')).toBeVisible();
});

test('a selected question accepts a local response and keeps its connection after reloading', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let modelRequests = 0;
    await page.route('**/api/respond', route => { modelRequests++; return route.abort(); });
    await page.locator('[data-thought-id="unfinished"]').click();
    await page.getByRole('button', { name: 'Respond to this question', exact: true }).click();
    await expect(page.locator('.speak-references')).toContainText(question);
    const reply = 'I want to preserve the context while making the selected idea easier to read.';
    await page.getByRole('textbox', { name: 'Speak', exact: true }).fill(reply);
    await page.getByRole('button', { name: 'Save response', exact: true }).click();
    const response = page.locator('[data-thought-id]').filter({ hasText: reply });
    await expect(response).toBeVisible();
    const id = await response.getAttribute('data-thought-id');
    await expect(response).toHaveAttribute('data-origin-scope', 'unfinished');
    expect(modelRequests).toBe(0);
    await expect(page.locator('[data-thought-id="unfinished"] p')).toHaveText(question);
    await expect(page.locator('.thought.ghost')).toHaveCount(0);
    await page.reload();
    const persisted = page.locator(`[data-thought-id="${id}"]`);
    await expect(persisted).toContainText(reply);
    await persisted.click();
    await expect(persisted).toHaveAttribute('data-origin-scope', 'unfinished');
    await expect(page.locator(`[data-causal-id="causal:unfinished:${id}"]`)).toHaveAttribute('data-causal-state', 'wake');
    expect(errors).toEqual([]);
});

test('leaving and reopening a response retains its draft and original reference', async ({ page }) => {
    await page.locator('[data-thought-id="unfinished"]').click();
    await page.getByRole('button', { name: 'Respond to this question', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await input.fill('Still deciding how much context to retain.');
    await input.press('Escape');
    await page.keyboard.press('Escape');
    await input.click();
    await expect(input).toHaveValue('Still deciding how much context to retain.');
    await expect(page.locator('.speak-references')).toContainText(question);
    await expect(page.getByRole('button', { name: 'Save response', exact: true })).toBeVisible();
    await expect(page.locator('[data-thought-id]')).toHaveCount(6);
});

test('long wording opens in a read-only place, including its final lines', async ({ page }) => {
    await page.getByTestId('field').dblclick({ position: { x: 1120, y: 610 } });
    const editor = page.getByRole('textbox', { name: 'Edit thought', exact: true });
    const text = 'A long thought should remain readable without rewriting it. '.repeat(8) + '\n\nThis final paragraph must be visible in full.';
    await editor.fill(text);
    await editor.press('Enter');
    const card = page.locator('[data-thought-id]').filter({ hasText: 'This final paragraph must be visible in full.' });
    const id = await card.getAttribute('data-thought-id');
    await page.getByRole('button', { name: 'Read full text', exact: true }).click();
    const reader = page.getByRole('dialog', { name: 'Full thought', exact: true });
    await expect(reader).toBeVisible();
    await expect(reader.locator('.thought-reader-text')).toHaveText(text);
    await expect(page.getByRole('textbox', { name: 'Edit thought', exact: true })).toHaveCount(0);
    await reader.getByRole('button', { name: 'Return to Field', exact: true }).click();
    await expect(card).toHaveAttribute('data-selected', 'true');
    await page.reload();
    await expect(page.locator(`[data-thought-id="${id}"] p`)).toHaveText(text);
});


test.describe('Chinese response preview', () => {
    test.use({ viewport: { width: 900, height: 804 } });
    test('labels the referenced wording clearly and leaves enough room for the selected card actions', async ({ page }, testInfo) => {
        await page.goto('/demo?locale=zh');
        const card = page.locator('[data-thought-id="unfinished"]');
        await card.click();
        const responseButton = page.getByTestId('thought-respond');
        await expect(responseButton).toHaveText('回应这个问题');
        const cardBounds = await card.boundingBox();
        const hubBounds = await page.getByTestId('scope-hub').boundingBox();
        expect(cardBounds).not.toBeNull();
        expect(hubBounds).not.toBeNull();
        const a = cardBounds!, b = hubBounds!;
        expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
        await responseButton.click();
        await expect(page.getByTestId('speak-scope')).toHaveText('正在回应');
        const input = page.getByRole('textbox', { name: '说点什么', exact: true });
        await expect(input).toHaveAttribute('aria-describedby', 'speak-references');
        await input.fill('我想先保留上下文，再让选中的想法更容易读懂。');
        const save = page.getByRole('button', { name: '保存回应', exact: true });
        await expect(save).toBeVisible();
        await expect.poll(async () => {
            const shell = await page.locator('.speak-shell').boundingBox();
            const button = await save.boundingBox();
            return Boolean(shell && button && button.x >= shell.x && button.x + button.width <= shell.x + shell.width + 1 && button.y + button.height <= shell.y + shell.height + 1);
        }).toBe(true);
        await expect.poll(() => page.getByTestId('speak').evaluate(element => {
            const style = getComputedStyle(element);
            const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
            return Number(style.opacity) > .995 && Math.abs(matrix.a - 1) < .001 && Math.abs(matrix.e) < .1 && Math.abs(matrix.f) < .1;
        })).toBe(true);
        await page.screenshot({ path: testInfo.outputPath('response-preview.png') });
        await input.press('Escape');
        await page.getByTestId('field').dblclick({ position: { x: 760, y: 350 } });
        const editor = page.getByRole('textbox', { name: '编辑想法', exact: true });
        const text = '当一条想法需要更多文字来解释时，我希望先完整读懂它，再判断自己赞同什么、还不确定什么。\n\n保留原文，能让我回到当时的思路；写下自己的回应，则能让我看清思考是怎样往前走的。\n\n这段文字应该完整展示，也应该能够关闭后继续回应。';
        await editor.fill(text);
        await editor.press('Enter');
        await page.getByRole('button', { name: '阅读全文', exact: true }).click();
        const reader = page.getByRole('dialog', { name: '完整内容', exact: true });
        await expect(reader.locator('.thought-reader-text')).toHaveText(text);
        await expect.poll(() => reader.evaluate(element => {
            const style = getComputedStyle(element);
            const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
            return Number(style.opacity) > .995 && Math.abs(matrix.a - 1) < .001 && Math.abs(matrix.e) < .1 && Math.abs(matrix.f) < .1;
        })).toBe(true);
        await page.screenshot({ path: testInfo.outputPath('reading-preview.png') });
    });
});


test('an unsubmitted response restores its wording and scope after reload, then clears after saving', async ({ page }) => {
    await page.locator('[data-thought-id="unfinished"]').click();
    await page.getByRole('button', { name: 'Respond to this question', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    const text = 'A draft about retaining context, to continue after reopening.';
    await input.fill(text);
    await expect(page.getByRole('status')).toHaveText('Draft saved on this device.');
    await page.reload();
    await expect(input).toHaveValue(text);
    await expect(page.locator('.speak-references')).toContainText(question);
    await expect(page.getByRole('button', { name: 'Save response', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save response', exact: true }).click();
    await expect(page.locator('[data-thought-id]').filter({ hasText: text })).toBeVisible();
    await page.reload();
    await expect(input).toHaveValue('');
    await expect(page.locator('.speak-references')).toHaveCount(0);
});

test('responding to a second card reopens the unfinished draft on its original question', async ({ page }) => {
    await page.locator('[data-thought-id="unfinished"]').click();
    await page.getByRole('button', { name: 'Respond to this question', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await input.fill('I have not finished responding to the background question.');
    await input.press('Escape');
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByRole('button', { name: 'Add my thoughts', exact: true }).click();
    await expect(input).toHaveValue('I have not finished responding to the background question.');
    await expect(page.locator('.speak-references')).toContainText(question);
    await expect(page.locator('.notice')).toContainText('linked to another thought');
});

test('clearing an unsubmitted response remains cleared after reload', async ({ page }) => {
    await page.locator('[data-thought-id="unfinished"]').click();
    await page.getByRole('button', { name: 'Respond to this question', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await input.fill('An old response draft.');
    await expect(page.getByRole('status')).toHaveText('Draft saved on this device.');
    await input.fill('');
    await input.press('Escape');
    await page.reload();
    await expect(input).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Save response', exact: true })).toHaveCount(0);
});

test('a failed device write retains the response and reports its actual save status', async ({ page }) => {
    await page.evaluate(() => {
        const write = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
            if (key.startsWith('diffusion-response-draft:')) throw new DOMException('Full', 'QuotaExceededError');
            return write.call(this, key, value);
        };
    });
    await page.locator('[data-thought-id="unfinished"]').click();
    await page.getByRole('button', { name: 'Respond to this question', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await input.fill('Preserve this text even if storage is full.');
    await expect(page.getByRole('status')).toHaveText('Draft is only kept in this window. Copy it before closing.');
    await expect(input).toHaveValue('Preserve this text even if storage is full.');
});

test('a restored response keeps a missing reference and refuses to save against a different scope', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('diffusion-response-draft:demo', JSON.stringify({
        text: 'My response to the original two thoughts.', scope: ['unfinished', 'removed-thought'], updatedAt: Date.now(),
    })));
    await page.reload();
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await expect(input).toHaveValue('My response to the original two thoughts.');
    await expect(page.locator('.speak-references')).toContainText('A referenced thought is no longer available.');
    await page.getByRole('button', { name: 'Save response', exact: true }).click();
    await expect(input).toHaveValue('My response to the original two thoughts.');
    await expect(page.locator('[data-thought-id]')).toHaveCount(6);
});

test('response controls remain readable in dark mode', async ({ page }, testInfo) => {
    await page.evaluate(() => localStorage.setItem('diffusion-settings', JSON.stringify({ theme: 'dark', locale: 'en', appearance: { profile: 'graphite-night' } })));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('[data-thought-id="unfinished"]').click();
    const respond = page.getByRole('button', { name: 'Respond to this question', exact: true });
    await respond.focus();
    await expect(respond).toBeFocused();
    await respond.click();
    await page.getByRole('textbox', { name: 'Speak', exact: true }).fill('A saved response draft in dark mode.');
    await expect(page.getByRole('status')).toHaveText('Draft saved on this device.');
    await expect(page.getByRole('button', { name: 'Save response', exact: true })).toBeVisible();
    await expect.poll(() => page.getByTestId('speak').evaluate(element => {
        const style = getComputedStyle(element);
        const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
        return Number(style.opacity) > .995 && Math.abs(matrix.a - 1) < .001 && Math.abs(matrix.e) < .1 && Math.abs(matrix.f) < .1;
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('response-dark.png') });
});

// Selection may expose read/respond controls, but it cannot reflow Thought geometry or let the
// existing Scope Hub cover those controls. Use the top edge to exercise its below-card fallback.
for (const [name, text, actionCount] of [
    ['short', 'A concrete thought at the top edge.', 1],
    ['long', 'A long thought keeps its original footprint when reading actions appear. '.repeat(8), 2],
] as const) {
    test(`${name} reading and response actions preserve card bounds and clear the Scope Hub`, async ({ page }) => {
        await page.getByTestId('field').dblclick({ position: { x: 920, y: 22 } });
        const editor = page.getByRole('textbox', { name: 'Edit thought', exact: true });
        await editor.fill(text);
        await editor.press('Enter');
        const card = page.locator('article.thought').filter({ has: page.locator('p', { hasText: text }) });
        await expect(card).toBeVisible();
        await page.getByTestId('field').click({ position: { x: 70, y: 850 } });
        await expect(card).toHaveAttribute('data-selected', 'false');
        const before = await card.boundingBox();
        expect(before).not.toBeNull();
        await card.click();
        const actions = card.locator('.thought-local-actions');
        await expect(actions.getByRole('button')).toHaveCount(actionCount);
        expect(await card.boundingBox()).toEqual(before);
        await expect.poll(async () => {
            const strip = await actions.boundingBox();
            const hub = await page.getByTestId('scope-hub').boundingBox();
            return Boolean(strip && hub && (strip.x + strip.width <= hub.x || hub.x + hub.width <= strip.x || strip.y + strip.height <= hub.y || hub.y + hub.height <= strip.y));
        }).toBe(true);
        const respond = card.getByTestId('thought-respond');
        expect((await respond.boundingBox())!.height).toBeGreaterThanOrEqual(32);
        await respond.focus();
        await respond.press('Enter');
        await expect(page.locator('.speak-references')).toContainText(text.slice(0, 55));
        expect(await card.boundingBox()).toEqual(before);
    });
}
