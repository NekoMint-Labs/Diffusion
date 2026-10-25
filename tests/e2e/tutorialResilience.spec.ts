import { test, expect, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
    errors.set(page, []);
    page.on('pageerror', error => errors.get(page)?.push(error.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

async function boot(page: Page) {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        localStorage.setItem('diffusion-first-field-coaching-v1', JSON.stringify(['relation', 'verify', 'crystal', 'multi']));
    });
    await page.goto('/demo?locale=en');
    const card = page.locator('[data-thought-id="attention"]');
    await expect(card).toBeVisible();
    await card.click();
    return card;
}

for (const owner of ['composer', 'thought editor', 'Find', 'command palette'] as const) {
    test(`typing f in ${owner} does not trigger Field focus coaching`, async ({ page }, info) => {
        const card = await boot(page);
        const camera = await page.locator('.world').getAttribute('style');
        let input;
        if (owner === 'composer') {
            await page.getByTestId('thought-more').click();
            await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();
            input = page.getByTestId('speak').locator('textarea');
        } else if (owner === 'thought editor') {
            await card.dblclick();
            input = page.getByRole('textbox', { name: 'Edit thought', exact: true });
        } else if (owner === 'Find') {
            await page.keyboard.press('Control+f');
            input = page.locator('#field-find');
        } else {
            await page.keyboard.press('Control+k');
            input = page.locator('#command-palette-input');
        }
        await input.fill('draft ');
        await input.press('f');
        await expect(input).toHaveValue('draft f');
        await expect(input).toBeFocused();
        await expect(page.getByTestId('progressive-tutorial-coach')).toHaveCount(0);
        if (owner === 'composer') await page.screenshot({ path: info.outputPath('typing-f-stays-in-composer.png') });
        await expect(page.locator('.world')).toHaveAttribute('style', camera!);
        await input.press('Escape');
        await card.click();
        await page.getByTestId('field').focus();
        await page.keyboard.press('f');
        await expect(page.getByTestId('progressive-tutorial-coach')).toHaveAttribute('data-kind', 'focus');
        if (owner === 'composer') await page.screenshot({ path: info.outputPath('field-focus-coaching.png') });
    });
}

test('composition f belongs to the input method and preserves the response draft', async ({ page }) => {
    await boot(page);
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();
    const input = page.getByTestId('speak').locator('textarea');
    await input.fill('还在选词');
    await input.dispatchEvent('compositionstart', { data: '中' });
    await input.dispatchEvent('keydown', { key: 'f', code: 'KeyF', keyCode: 229, isComposing: true, bubbles: true });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('还在选词');
    await expect(page.getByTestId('progressive-tutorial-coach')).toHaveCount(0);
    await input.dispatchEvent('compositionend', { data: '中' });
});

test('unavailable tutorial preference storage leaves writing, skip and reload usable', async ({ page }, info) => {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'off', locale: 'en' }));
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            if (key === 'diffusion-first-field-tutorial-v1') throw new DOMException('Synthetic preference quota', 'QuotaExceededError');
            return original.call(this, key, value);
        };
    });
    await page.goto('/?locale=en');
    const tutorial = page.getByTestId('first-field-tutorial');
    await expect(tutorial).toHaveAttribute('data-phase', 'write');
    const input = page.getByTestId('speak').locator('textarea');
    const text = 'This thought remains durable even if optional tutorial progress cannot be saved.';
    await input.fill(text);
    await input.press('Enter');
    await expect(tutorial).toHaveAttribute('data-phase', 'move');
    await tutorial.getByRole('button', { name: 'Skip tutorial', exact: true }).click();
    await expect(tutorial).toHaveCount(0);
    const thought = page.locator('[data-thought-id]').filter({ has: page.locator('p', { hasText: text }) });
    const id = await thought.getAttribute('data-thought-id');
    await expect.poll(() => page.evaluate(id => new Promise<string | undefined>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
            const db = opening.result;
            const read = db.transaction('projects').objectStore('projects').get('main');
            read.onerror = () => { db.close(); reject(read.error); };
            read.onsuccess = () => { db.close(); resolve(read.result?.thoughts[id!]?.text); };
        };
    }), id)).toBe(text);
    await page.reload();
    await expect(page.locator(`[data-thought-id="${id}"] p`)).toHaveText(text);
    await page.screenshot({ path: info.outputPath('preference-failure-keeps-thought.png') });
});

test('a coaching preference write failure still closes the hint for this session', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            if (key === 'diffusion-first-field-coaching-v1') throw new DOMException('Synthetic preference quota', 'QuotaExceededError');
            return original.call(this, key, value);
        };
    });
    await page.goto('/demo?locale=en');
    const first = page.locator('[data-thought-id="attention"]');
    const second = page.locator('[data-thought-id="structure"]');
    await first.click();
    await second.click({ modifiers: ['Shift'] });
    const coach = page.getByTestId('progressive-tutorial-coach');
    await expect(coach).toHaveAttribute('data-kind', 'multi');
    await coach.getByRole('button', { name: 'Got it', exact: true }).click();
    await expect(coach).toHaveCount(0);
    await first.click();
    await second.click({ modifiers: ['Shift'] });
    await expect(coach).toHaveCount(0);
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('command-palette')).toBeVisible();
});

for (const key of ['diffusion-first-field-tutorial-v1', 'diffusion-first-field-coaching-v1']) {
    test(`unreadable ${key} does not prevent writing or commands`, async ({ page }) => {
        await page.addInitScript(key => {
            const original = Storage.prototype.getItem;
            Storage.prototype.getItem = function (name) {
                if (name === key) throw new DOMException('Synthetic blocked preference read', 'SecurityError');
                return original.call(this, name);
            };
        }, key);
        await page.goto('/demo?locale=en');
        const thought = page.locator('[data-thought-id="attention"]');
        await expect(thought).toBeVisible();
        await thought.click();
        await page.getByTestId('thought-more').click();
        await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();
        const input = page.getByTestId('speak').locator('textarea');
        const text = 'Writing remains available when an optional tutorial preference cannot be read.';
        await input.fill(text);
        await input.press('Enter');
        await expect(page.locator('[data-thought-id] p', { hasText: text })).toHaveCount(1);
        await page.keyboard.press('Control+k');
        await expect(page.getByTestId('command-palette')).toBeVisible();
    });
}

test('a damaged saved tutorial phase leaves the existing Field usable', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({
            status: 'in-progress', projectId: 'demo', thoughtId: 'attention', phase: 'removed-step',
        }));
    });
    await page.goto('/demo?locale=en');
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
    await expect(page.getByTestId('first-field-tutorial')).toHaveCount(0);
    await page.keyboard.press('Control+f');
    await page.locator('#field-find').fill('Attention');
    await expect(page.locator('#field-find')).toHaveValue('Attention');
    await expect(page.locator('#field-find')).toBeFocused();
});
