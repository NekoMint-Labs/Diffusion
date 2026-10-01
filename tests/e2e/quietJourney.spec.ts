import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
test('an empty Field grows through proposals, explicit relations and a confirmed Crystal', async ({ page }, testInfo) => {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo' }));
        // Tutorial has its own real-interaction suite; this journey uses ordinary thinking actions.
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.goto('/?locale=zh');
    await expect(page.locator('article.thought')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('01-empty.png') });
    const place = async (text: string, x: number, y: number) => {
        await page.getByTestId('field').dblclick({ position: { x, y } });
        const edit = page.locator('.thought.editing textarea');
        await edit.fill(text); await edit.press('Enter');
        const result = page.locator('article.thought').filter({ hasText: text });
        await expect(result).toBeVisible();
        return result;
    };
    const first = await place('我想让学习计划更容易坚持', 280, 220);
    const second = await place('每天能投入的时间有限', 580, 380);
    const firstId = (await first.getAttribute('data-thought-id'))!;
    const source = page.locator(`[data-thought-id="${firstId}"]`);
    await first.click();
    await page.getByTestId('scope-continue').click();
    await page.getByTestId('action-preview-run').click();
    const proposed = page.locator('article.ghost').first();
    await expect(proposed).toBeVisible();
    await expect(page.locator('[data-testid="operation-feedback"][data-phase="pending"]')).toHaveCount(0);
    const keptId = (await proposed.getAttribute('data-thought-id'))!;
    await proposed.click();
    await page.screenshot({ path: testInfo.outputPath('02-proposed.png') });
    await page.getByTestId('ai-proposal-keep').click();
    await expect(page.locator(`[data-thought-id="${keptId}"]`)).toHaveAttribute('data-kind', 'thought');
    const ignored = page.locator('article.ghost').first();
    const ignoredId = (await ignored.getAttribute('data-thought-id'))!;
    await ignored.click(); await page.getByTestId('ai-proposal-ignore').click();
    await expect(page.locator(`[data-thought-id="${ignoredId}"]`)).toHaveCount(0);
    await source.click(); await second.click({ modifiers: ['Shift'] });
    await expect(page.locator('.thought-selected-dot')).toHaveCount(2);
    await page.getByTestId('scope-find-relation').click();
    const candidate = page.locator('.relation-label-overlay[data-status="tentative"]');
    await expect(candidate).toBeVisible();
    await candidate.locator('.relation-token-label').click();
    const relation = page.locator('.relation-surface[role="dialog"]');
    await expect(relation).toBeVisible();
    await relation.locator('.relation-decisions .ui-button-solid').click();
    await expect(page.locator('.relation-label-overlay[data-status="confirmed"]')).toBeVisible();
    await source.click();
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="crystallize"]').click();
    await expect(source).toHaveAttribute('data-kind', 'thought');
    const preview = page.locator('[role="dialog"]');
    await preview.locator('#crystal-wording').fill('先保留每天都能完成的小目标');
    await page.screenshot({ path: testInfo.outputPath('03-confirmation.png') });
    await preview.getByRole('button', { name: '确认凝结', exact: true }).click();
    // Both Thoughts remain selected: a multi-thought commitment creates a new landmark.
    const crystal = page.locator('article.crystal').filter({ hasText: '先保留每天都能完成的小目标' });
    await expect(crystal).toBeVisible();
    await expect(source).toHaveAttribute('data-kind', 'thought');
    await page.keyboard.press('Escape');
    await crystal.click();
    await expect(crystal).toHaveAttribute('data-selected', 'true');
    await page.getByTestId('scope-continue').click();
    await page.locator('.thought.editing textarea').fill('下一步：试行一周，再调整目标');
    await page.locator('.thought.editing textarea').press('Enter');
    await page.screenshot({ path: testInfo.outputPath('04-continued.png') });
    await expect.poll(() => page.evaluate(() => new Promise<boolean>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
            const db = opening.result;
            const read = db.transaction('projects').objectStore('projects').getAll();
            read.onerror = () => { db.close(); reject(read.error); };
            read.onsuccess = () => {
                db.close();
                resolve(read.result.some(project => Object.values(project.thoughts as Record<string, { text: string }>).some(thought => thought.text === '下一步：试行一周，再调整目标')));
            };
        };
    }))).toBe(true);
    await page.reload();
    await expect(crystal).toBeVisible();
    await expect(source).toHaveAttribute('data-kind', 'thought');
    await expect(page.locator(`[data-thought-id="${keptId}"]`)).toHaveAttribute('data-kind', 'thought');
    await expect(page.locator('article.ghost')).toHaveCount(0);
    await expect(page.locator('article.thought').filter({ hasText: '下一步：试行一周，再调整目标' })).toBeVisible();
});
