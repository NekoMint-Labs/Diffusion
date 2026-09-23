import { test, expect, type Page } from '@playwright/test';
import { choose, openSection } from './selects.ts';

/** Phase 3B.1 hotfix: three behaviours that were fragile in a real session.
 *
 *  - "More" is no longer a hover submenu in its own portal. It is a second page of the same popup,
 *    so moving the pointer toward the advanced rows can never lose the whole menu;
 *  - unscoped words are acknowledged locally at once (the composer clears, the person's own
 *    sentence stays visible) and only a later model failure falls back to their wording;
 *  - ordinary unscoped writing performs decomposition only; relation discovery stays an explicit
 *    interaction instead of adding a hidden second model stage.
 */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page)?.push(error.message)); });
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

/** A gate the test owns: the request handler waits on it, so the model's answer arrives exactly
 * when the test says so rather than on a timer. */
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(settle => { resolve = settle; });
    return { promise, resolve };
}
/** The OpenAI chat-completions envelope the compatible provider reads its text back out of. */
const chatEnvelope = (content: unknown) => ({ choices: [{ message: { content: JSON.stringify(content) }, finish_reason: 'stop' }], model: 'a-model' });
interface ModelGate { extraction: ReturnType<typeof deferred<unknown>>; calls: () => number; }
/** One promise resolved from the test: ordinary unscoped writing makes one decomposition request. */
async function installModelGate(page: Page): Promise<ModelGate> {
    const extraction = deferred<unknown>();
    let calls = 0;
    await page.route('http://127.0.0.1:11434/**', async route => {
        if (route.request().method() !== 'POST') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
            return;
        }
        calls++;
        const payload = await extraction.promise;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
    });
    return { extraction, calls: () => calls };
}
/** A direct provider configured the way a person configures it, with a base address the gate owns. */
async function configureCompatible(page: Page) {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toBeVisible();
    await openSection(page, 'ai');
    const ai = page.getByRole('dialog', { name: 'Field settings' }).locator('#setting-ai');
    await choose(page, 'provider-select', 'compatible');
    await ai.getByTestId('base-url').fill('http://127.0.0.1:11434/v1');
    await ai.getByTestId('model-input').fill('a-model');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toHaveCount(0);
}

test('More opens a delayed secondary column without replacing the primary menu', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    const attention = page.locator('[data-thought-id="attention"]');
    await expect(attention).toBeVisible();
    const box = await attention.boundingBox();
    if (!box) throw new Error('Thought bounds are unavailable');
    await page.mouse.click(box.x + 10, box.y + 6, { button: 'right' });
    const root = page.getByTestId('thought-menu');
    await expect(root).toBeVisible();
    const moreTrigger = root.getByRole('menuitem', { name: 'More', exact: true });

    // A brief pass does not hijack the primary menu.
    await moreTrigger.hover();
    await page.waitForTimeout(80);
    await expect(page.getByTestId('thought-more-menu')).toHaveCount(0);
    await expect(root.locator('[data-command="continue-thinking"]')).toBeVisible();

    // Intentional hover opens a right-hand panel while the primary choices remain present.
    await page.waitForTimeout(120);
    const secondary = page.getByTestId('thought-more-menu');
    await expect(secondary).toBeVisible();
    await expect(root.locator('[data-command="continue-thinking"]')).toBeVisible();
    expect(await secondary.getByRole('menuitem').count()).toBeLessThanOrEqual(6);
    const rows = secondary.getByRole('menuitem');
    for (let index = 0; index < await rows.count(); index++) {
        const row = await rows.nth(index).boundingBox();
        if (!row) continue;
        await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2, { steps: 4 });
        await page.waitForTimeout(30);
        await expect(root).toBeVisible();
        await expect(secondary).toBeVisible();
    }

    // Keyboard can enter and leave the secondary column without dismissing the root menu.
    await moreTrigger.focus();
    await page.keyboard.press('Enter');
    await expect(secondary).toBeVisible();
    await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[data-secondary-panel]')))).toBe(true);
    await page.keyboard.press('ArrowLeft');
    await expect(secondary).toHaveCount(0);
    await expect(moreTrigger).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(root).toHaveCount(0);
});

test('a semantic relation candidate survives selection changes until it is explicitly dismissed', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'demo' })));
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.locator('[data-thought-id="unfinished"]').click();
    await page.locator('[data-thought-id="quiet"]').click({ modifiers: ['Shift'] });
    // Exactly two Thoughts selected: the relation action is now the named Find a relation.
    await page.getByTestId('scope-find-relation').click();

    const candidate = page.locator('.relation-label-overlay[data-status="tentative"]');
    await expect(candidate).toHaveCount(1, { timeout: 5000 });
    const relationId = await candidate.getAttribute('data-relation-token');
    expect(relationId).toBeTruthy();

    await page.getByTestId('field').click({ position: { x: 1280, y: 700 } });
    await expect(page.locator(`.relation-label-overlay[data-relation-token="${relationId}"]`)).toBeVisible();
    await page.locator('[data-thought-id="attention"]').click({ button: 'right' });
    await expect(page.locator(`.relation-label-overlay[data-relation-token="${relationId}"]`)).toBeVisible();
    await page.keyboard.press('Escape');

    const persistent = page.locator(`.relation-label-overlay[data-relation-token="${relationId}"]`);
    await persistent.hover();
    await persistent.getByRole('button', { name: 'Ignore', exact: true }).click();
    await expect(persistent).toHaveCount(0, { timeout: 2000 });
});

test('submitting unscoped words is acknowledged locally before any model answers', async ({ page }) => {
    const gate = await installModelGate(page);
    await configureCompatible(page);
    const sentence = '我想去北京玩，但我担心机票太贵。';
    await page.getByTestId('speak').click({ position: { x: 5, y: 5 } });
    await page.keyboard.type(sentence);
    await page.keyboard.press('Enter');

    // Neither gate has been released, yet the person has already been heard: the composer is empty,
    // their own sentence is still on screen, and no proposal can exist because no model answered.
    await expect(page.getByTestId('speak').locator('textarea')).toHaveValue('');
    const structuring = page.getByTestId('input-seed');
    await expect(structuring).toBeVisible();
    await expect(structuring).toContainText(sentence);
    await expect(page.locator('article.thought.ghost')).toHaveCount(0);

    // Release the one decomposition request. Two real proposals should then land.
    gate.extraction.resolve(chatEnvelope({ units: [
        { text: '我想去北京玩', sourceQuotes: ['我想去北京玩'] },
        { text: '我担心机票太贵', sourceQuotes: ['我担心机票太贵'] },
    ] }));
    await expect(page.locator('article.thought.ghost')).toHaveCount(2, { timeout: 15000 });
    await expect(page.locator('.relation-label-overlay')).toHaveCount(0);

    // Writing does not infer a relation; that remains an explicit two-Thought action.
    expect(gate.calls()).toBe(1);
    await expect(page.locator('.relation-label-overlay')).toHaveCount(0);
});

test('a compound paragraph becomes several manipulable proposals', async ({ page }) => {
    const gate = await installModelGate(page);
    await configureCompatible(page);
    const paragraph = '我还不知道要不要考研，读研可能让我多一点时间探索，但我也不知道三年到底值不值。';
    await page.getByTestId('speak').click({ position: { x: 5, y: 5 } });
    await page.keyboard.type(paragraph);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('input-seed')).toContainText(paragraph);

    gate.extraction.resolve(chatEnvelope({ units: [
        { text: '我还没决定要不要考研', sourceQuotes: ['我还不知道要不要考研'] },
        { text: '读研可能让我有更多时间探索', sourceQuotes: ['读研可能让我多一点时间探索'] },
        { text: '我不确定三年研究生值不值', sourceQuotes: ['我也不知道三年到底值不值'] },
    ] }));
    await expect(page.locator('article.thought.ghost')).toHaveCount(3, { timeout: 15000 });
    // The paragraph is not collapsed into one committed Thought: each part stays its own proposal.
    await expect(page.locator('article.thought:not(.ghost)').filter({ hasText: paragraph })).toHaveCount(0);
});


test('editing a 500+ character Thought exposes its final character', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    const suffix = 'PHASE3C-FINAL-SUFFIX';
    const text = `${'A long canonical thought keeps every authored character reachable. '.repeat(14)}${suffix}`;

    await page.getByTestId('field').dblclick({ position: { x: 1040, y: 620 } });
    const editor = page.getByRole('textbox', { name: 'Edit thought', exact: true });
    await editor.fill(text);
    await editor.press('Enter');

    const thought = page.locator('article.thought').filter({ hasText: suffix }).last();
    await expect(thought).toBeVisible();
    await thought.dblclick();
    const reopened = page.getByRole('textbox', { name: 'Edit thought', exact: true });
    await expect(reopened).toHaveValue(text);
    expect((await reopened.inputValue()).endsWith(suffix)).toBe(true);
    const disclosure = await reopened.evaluate(element => ({
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        overflowY: getComputedStyle(element).overflowY,
    }));
    expect(disclosure.scrollHeight).toBeGreaterThan(0);
    expect(disclosure.clientHeight).toBeGreaterThan(0);
    expect(disclosure.overflowY).toBe('auto');
});
