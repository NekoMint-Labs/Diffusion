import { test, expect, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
    errors.set(page, []);
    page.on('pageerror', error => errors.get(page)?.push(error.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

async function demo(page: Page) {
    await page.goto('/demo?locale=en');
    await expect(page.locator('[data-thought-id="unfinished"]')).toBeVisible();
}

async function coachingLeavesWritingClear(page: Page) {
    return page.locator('.tutorial-coach').evaluate(coach => {
        const a = coach.getBoundingClientRect();
        return [...document.querySelectorAll('.speak,.empty-invitation')].every(element => {
            const b = element.getBoundingClientRect();
            return !b.width || !b.height || a.right + 8 <= b.left || b.right + 8 <= a.left
                || a.bottom + 8 <= b.top || b.bottom + 8 <= a.top;
        });
    });
}

test('a restored response draft fits after focus and viewport width changes', async ({ page }) => {
    const draft = 'FOCUS-READER-RESPONSE-20261025：阅读全文后，这条回应直接接收键盘输入，并保留原文关系。';
    await page.addInitScript(draft => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'off', appearance: { profile: 'graphite-night' } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        localStorage.setItem('diffusion-response-draft:demo', JSON.stringify({ text: draft, scope: ['unfinished'], updatedAt: Date.now() }));
    }, draft);
    await page.goto('/demo?locale=zh');
    const input = page.getByTestId('speak').locator('textarea');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue(draft);
    const fits = () => input.evaluate(element => element.clientHeight + 1 >=
        Math.min(element.scrollHeight, parseFloat(getComputedStyle(element).maxHeight)));
    await expect.poll(fits, 'the focus-only shortcut must not hide the restored draft final line').toBe(true);
    await page.setViewportSize({ width: 460, height: 640 });
    await expect.poll(fits, 'narrowing the writing surface remeasures without editing the draft').toBe(true);
    await expect(input).toHaveValue(draft);
    await expect(input).toBeFocused();
});

for (const [entry, command] of [['palette', 'ask'], ['palette', 'respond'], ['reader', 'respond']] as const) {
    test(`${entry} ${command} hands focus to scoped writing without closing it`, async ({ page }) => {
        await demo(page);
        const card = page.locator('[data-thought-id="unfinished"]');
        await card.click();
        if (entry === 'reader') {
            await card.dblclick();
            const editor = page.getByRole('textbox', { name: 'Edit thought', exact: true });
            await editor.fill('这段原文需要读完后补充自己的想法。'.repeat(40));
            await editor.press('Enter');
        }
        const camera = await page.locator('.world').getAttribute('style');
        if (entry === 'reader') {
            await page.getByRole('button', { name: 'Read full text', exact: true }).click();
            await page.getByRole('dialog', { name: 'Full thought', exact: true })
                .getByRole('button', { name: 'Add my thoughts', exact: true }).click();
        } else {
            await page.keyboard.press('Control+k');
            await page.getByTestId('command-palette').locator(`[data-command="${command}"]`).click();
        }
        const input = page.getByTestId('speak').locator('textarea');
        await expect(input).toBeFocused();
        await input.fill('这份草稿应继续留在我刚打开的写作区。');
        await expect(input).toBeFocused();
        await expect(input).toHaveValue('这份草稿应继续留在我刚打开的写作区。');
        await expect(page.getByTestId('speak')).toHaveAttribute('data-scope-active', 'true');
        await expect(page.getByTestId('speak')).toHaveAttribute('data-mode', command === 'respond' ? 'respond' : 'think');
        await expect(page.locator('.world')).toHaveAttribute('style', camera!);
    });
}

for (const marker of ['isComposing', 'legacy'] as const) {
    test(`response draft keeps composition Escape and Enter with ${marker}`, async ({ page }) => {
        await demo(page);
        await page.locator('[data-thought-id="unfinished"]').click();
        await page.getByRole('button', { name: 'Respond to this question', exact: true }).click();
        const input = page.getByRole('textbox', { name: 'Speak', exact: true });
        const draft = '我还在整理这个问题';
        await input.fill(draft);
        const count = await page.locator('[data-thought-id]').count();
        await input.dispatchEvent('compositionstart', { data: '中' });
        for (const key of ['Escape', 'Enter']) {
            const prevented = await input.evaluate((element, { key, marker }) => {
                const event = new KeyboardEvent('keydown', {
                    key, bubbles: true, cancelable: true,
                    isComposing: marker === 'isComposing',
                    keyCode: marker === 'legacy' ? 229 : key === 'Escape' ? 27 : 13,
                });
                element.dispatchEvent(event);
                return event.defaultPrevented;
            }, { key, marker });
            expect(prevented).toBe(false);
            await expect(input).toBeFocused();
            await expect(input).toHaveValue(draft);
            await expect(page.locator('[data-thought-id]')).toHaveCount(count);
        }
        await input.dispatchEvent('compositionend', { data: '中' });
        await input.press('Shift+Enter');
        await expect(input).toHaveValue(draft + '\n');
        await input.press('Enter');
        const response = page.locator('[data-thought-id]').filter({ has: page.locator('p', { hasText: draft }) });
        await expect(response).toHaveCount(1);
        await expect(response).toHaveAttribute('data-origin-scope', 'unfinished');
        const id = await response.getAttribute('data-thought-id');
        expect(id).toBeTruthy();
        // Painting the response does not await the controller's asynchronous IndexedDB save.
        // Navigate only after its actual durable wording and lineage are present.
        await expect.poll(() => page.evaluate(thoughtId => new Promise<{ text: string; derivedFrom?: string[] } | null>((resolve, reject) => {
            const opening = indexedDB.open('diffusion-explorer-v1');
            opening.onerror = () => reject(opening.error);
            opening.onsuccess = () => {
                const db = opening.result;
                const read = db.transaction('projects').objectStore('projects').get('demo');
                read.onerror = () => { db.close(); reject(read.error); };
                read.onsuccess = () => {
                    const saved = read.result?.thoughts?.[thoughtId!];
                    db.close();
                    resolve(saved ? { text: saved.text, derivedFrom: saved.derivedFrom } : null);
                };
            };
        }), id), 'response wording and lineage are committed before reload').toEqual({ text: draft, derivedFrom: ['unfinished'] });
        await page.reload();
        await expect(page.locator(`[data-thought-id="${id}"] p`)).toHaveText(draft);
        await expect(page.locator(`[data-thought-id="${id}"]`)).toHaveAttribute('data-origin-scope', 'unfinished');
    });
}

for (const replacement of ['palette', 'settings', 'menu'] as const) {
    test(`Find starts empty after replacement by ${replacement}`, async ({ page }) => {
        await demo(page);
        await page.keyboard.press('Control+f');
        const input = page.locator('#field-find');
        await input.fill('context');
        await page.keyboard.press('Control+f');
        await expect(input).toHaveValue('context');
        if (replacement === 'menu') await page.getByTestId('global-more').click();
        else await page.keyboard.press(replacement === 'palette' ? 'Control+k' : 'Control+,');
        await expect(input).toHaveCount(0);
        await page.keyboard.press('Escape');
        await page.keyboard.press('Control+f');
        await expect(input).toBeFocused();
        await expect(input).toHaveValue('');
        await expect(page.locator('[data-find="current"],[data-find="match"]')).toHaveCount(0);
    });
}

test('full thought scrolls by keyboard and returns focus without moving the Field', async ({ page }, info) => {
    await demo(page);
    const card = page.locator('[data-thought-id="unfinished"]');
    await card.dblclick();
    const text = '一段仍待推敲的想法，需要保留上下文并继续阅读。'.repeat(90) + '\n最后一行。';
    const editor = page.getByRole('textbox', { name: 'Edit thought', exact: true });
    await editor.fill(text);
    await editor.press('Enter');
    const camera = await page.locator('.world').getAttribute('style');
    const position = await card.getAttribute('style');
    const trigger = page.getByRole('button', { name: 'Read full text', exact: true });
    await trigger.click();
    const reader = page.getByRole('dialog', { name: 'Full thought', exact: true });
    const body = reader.locator('.surface-body');
    await expect(body).toBeFocused();
    await page.keyboard.press('PageDown');
    await expect.poll(() => body.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await page.screenshot({ path: info.outputPath('keyboard-reading.png') });
    await page.keyboard.press('Escape');
    await expect(reader).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(card).toHaveAttribute('data-selected', 'true');
    await expect(card).toHaveAttribute('style', position!);
    await expect(page.locator('.world')).toHaveAttribute('style', camera!);
});

for (const [width, height, profile] of [
    [1280, 720, 'editorial-warm'], [900, 640, 'graphite-night'], [600, 640, 'editorial-warm'],
] as const) {
    test(`tutorial and feedback remain readable at ${width}x${height} ${profile}`, async ({ page }, info) => {
        await page.setViewportSize({ width, height });
        await page.addInitScript(profile => {
            localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'off', appearance: { profile } }));
        }, profile);
        await page.goto('/?locale=zh');
        const tutorial = page.getByTestId('first-field-tutorial');
        await expect(tutorial).toHaveAttribute('data-phase', 'write');
        const coach = tutorial.locator('.tutorial-coach');
        const input = page.getByTestId('speak').locator('textarea');
        const original = '我想在四周内研究同学怎样选择学习空间。';
        await input.fill(original);
        await input.press('Enter');
        await expect(tutorial).toHaveAttribute('data-phase', 'move');
        const target = page.locator('[data-thought-id]').filter({ has: page.locator('p', { hasText: original }) });
        const targetClear = async () => {
            const a = (await coach.boundingBox())!, b = (await target.boundingBox())!;
            return a.x + a.width + 8 <= b.x || b.x + b.width + 8 <= a.x
                || a.y + a.height + 8 <= b.y || b.y + b.height + 8 <= a.y;
        };
        const notice = page.locator('.notice');
        await expect(notice).toBeVisible();
        await expect.poll(targetClear, 'the practice Thought stays reachable beside its coaching').toBe(true);
        const targetPosition = await target.getAttribute('style');
        await page.screenshot({ path: info.outputPath('tutorial-feedback.png') });
        await expect.poll(async () => {
            const a = (await coach.boundingBox())!, b = (await notice.boundingBox())!;
            return b.y - (a.y + a.height);
        }, 'tutorial ends above the entire feedback line').toBeGreaterThanOrEqual(8);
        await expect(coach).toBeInViewport();
        await expect(page.getByTestId('notice-action')).toBeVisible();
        await page.getByTestId('notice-action').click();
        await expect(page.locator('#setting-ai')).toBeVisible();
        await expect(notice).toHaveCount(0);
        await expect.poll(() => page.locator('.app').evaluate(element =>
            parseFloat(getComputedStyle(element).getPropertyValue('--bottom-notice-height')) || 0)).toBe(0);
        await page.keyboard.press('Escape');
        await expect(page.locator('#setting-ai')).toHaveCount(0);
        await page.getByTestId('field').click({ position: { x: width - 80, y: 110 } });
        await expect(input).toBeVisible();
        await input.click();
        await input.fill('通知关闭后，写作区和教程仍应各自清晰可用。');
        // The empty invitation disappeared after the first Thought. Compare the current reading
        // geometry, not the empty Field's earlier pixel offset against a different UI state.
        await expect.poll(() => coachingLeavesWritingClear(page)).toBe(true);
        await expect.poll(targetClear).toBe(true);
        await expect(target).toHaveAttribute('style', targetPosition!);
        await expect(coach).toBeInViewport();
        await expect(tutorial.getByRole('button', { name: '跳过教程', exact: true })).toBeInViewport();
        await expect(input).toHaveValue('通知关闭后，写作区和教程仍应各自清晰可用。');
        await page.screenshot({ path: info.outputPath('writing-after-settings.png') });
    });
}

test('later guidance also leaves the AI-off feedback and draft accessible', async ({ page }, info) => {
    await page.setViewportSize({ width: 900, height: 640 });
    await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({
        locale: 'en', provider: 'off', appearance: { profile: 'graphite-night' },
    })));
    await demo(page);
    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    const coach = page.getByTestId('progressive-tutorial-coach');
    await expect(coach).toBeVisible();
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();
    const input = page.getByTestId('speak').locator('textarea');
    const draft = 'What information do I still need to compare these two ideas?';
    await input.fill(draft);
    await input.press('Enter');
    const notice = page.locator('.notice');
    await expect(page.getByTestId('notice-action')).toBeVisible();
    await expect.poll(async () => {
        const a = (await coach.boundingBox())!, b = (await notice.boundingBox())!;
        return b.y - (a.y + a.height);
    }).toBeGreaterThanOrEqual(8);
    await expect(input).toHaveValue(draft);
    await page.screenshot({ path: info.outputPath('later-guidance-feedback.png') });
    await coach.getByRole('button', { name: 'Got it', exact: true }).click();
    await expect(coach).toHaveCount(0);
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();
    await expect(input).toHaveValue(draft);
});
