import { test, expect, type Page } from '@playwright/test';

async function reachGeneration(page: Page) {
    await page.goto('/?locale=en');
    await expect(page.getByTestId('first-field-tutorial')).toHaveAttribute('data-phase', 'write');
    const composer = page.getByRole('textbox', { name: 'Speak', exact: true });
    await composer.fill('I am not sure what this assumption depends on');
    await composer.press('Enter');
    await expect(page.getByTestId('first-field-tutorial')).toHaveAttribute('data-phase', 'move');

    const thought = page.locator('[data-thought-id]').filter({ hasText: 'I am not sure what this assumption depends on' });
    const box = await thought.boundingBox();
    if (!box) throw new Error('tutorial thought is not measurable');
    await page.mouse.move(box.x + 30, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x + 90, box.y + 55, { steps: 6 }); await page.mouse.up();
    await expect(page.getByTestId('first-field-tutorial')).toHaveAttribute('data-phase', 'pan');

    await page.mouse.move(980, 650); await page.mouse.down(); await page.mouse.move(900, 610, { steps: 6 }); await page.mouse.up();
    await expect(page.getByTestId('first-field-tutorial')).toHaveAttribute('data-phase', 'select');
    await thought.click();
    await expect(page.getByTestId('first-field-tutorial')).toHaveAttribute('data-phase', 'generate');
    return thought;
}

for (const reduced of [false, true]) test(`First Field Tutorial follows real interaction and uses no provider for its proposal (reduced=${reduced})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await reachGeneration(page);
    await page.getByTestId('scope-continue').click();
    await expect(page.getByTestId('first-field-tutorial')).toHaveAttribute('data-phase', 'ghost');
    await expect(page.getByText('Tutorial demonstration / no live model was used.')).toBeVisible();

    const ghost = page.locator('.thought.ghost');
    const ghostBox = await ghost.boundingBox();
    if (!ghostBox) throw new Error('tutorial Ghost is not measurable');
    await page.mouse.move(ghostBox.x + 25, ghostBox.y + 18); await page.mouse.down(); await page.mouse.move(ghostBox.x + 80, ghostBox.y + 55, { steps: 6 }); await page.mouse.up();
    await expect(page.getByTestId('first-field-tutorial')).toHaveAttribute('data-phase', 'keep');
    await page.getByTestId('ai-proposal-keep').click();
    await expect(page.getByTestId('first-field-tutorial')).toHaveAttribute('data-phase', 'done');
    await expect(page.locator('.thought.ghost')).toHaveCount(0);
    if (reduced) await expect(page.locator('.tutorial-settled-fragment')).toHaveCount(0);
    await page.getByTestId('tutorial-finish').click();
    await expect(page.getByTestId('first-field-tutorial')).toHaveCount(0);
});

for (const entry of ['toolbar', 'context menu', 'palette']) {
    for (const action of [
        { id: 'continue-thinking', testId: 'scope-continue', kind: 'thought', generation: 'continue' },
        { id: 'diffuse', testId: 'scope-angle', kind: 'thought', generation: 'angle' },
        { id: 'questions', testId: 'scope-question', kind: 'question', generation: 'question' },
    ]) {
        test(`tutorial ${action.id} from ${entry} produces one local proposal with AI off`, async ({ page }) => {
            const requests: string[] = [];
            page.on('request', request => {
                if (['fetch', 'xhr'].includes(request.resourceType())) requests.push(request.url());
            });
            const thought = await reachGeneration(page);
            if (entry === 'toolbar') await page.getByTestId(action.testId).click();
            else if (entry === 'context menu') {
                await thought.click({ button: 'right' });
                await page.getByTestId('thought-menu').locator(`[data-command="${action.id}"]`).click();
            } else {
                await page.keyboard.press('Control+k');
                await page.getByTestId('command-palette').locator(`[data-command="${action.id}"]`).click();
            }
            await expect(page.getByTestId('first-field-tutorial')).toHaveAttribute('data-phase', 'ghost');
            const ghost = page.locator('.thought.ghost');
            await expect(ghost).toHaveCount(1);
            await expect(ghost).toHaveAttribute('data-proposal-kind', action.kind);
            await expect(ghost).toHaveAttribute('data-proposal-action', action.generation);
            await expect(page.getByTestId('action-preview-run')).toHaveCount(0);
            await expect(page.getByTestId('notice-action')).toHaveCount(0);
            expect(requests).toEqual([]);
        });
    }
}

test('Help can restart the First Field Tutorial after it was skipped', async ({ page }) => {
    await page.goto('/?locale=en');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await page.getByTestId('global-more').click();
    await page.getByTestId('global-menu').locator('[data-command="help"]').click();
    await page.getByRole('button', { name: 'Restart First Field Tutorial' }).click();
    await expect(page.getByTestId('first-field-tutorial')).toHaveAttribute('data-phase', 'write');
});
