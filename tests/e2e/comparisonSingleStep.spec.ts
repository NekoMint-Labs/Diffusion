import { test, expect } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';
import { runScenario } from '../../experiments/role-b-comparison/flow.mjs';

for (const propositions of [false, true]) for (const action of ['angle', 'diffuse']) {
    test('comparison driver runs exactly one ' + action + ' request with propositions=' + propositions, async ({ page }) => {
        const calls: any[] = [];
        await page.addInitScript(() => {
            localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'gateway', locale: 'en', theme: 'light' }));
            localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        });
        await page.route('**/api/structured', async route => {
            calls.push(route.request().postDataJSON().input);
            await route.fulfill({ json: { mock: false, providerLabel: 'Injected driver regression, not a real model', value: { intents: [{ type: 'surface_possibility', text: '先观察学生是否愿意重新使用公开例题的复习流程；在没有试用记录之前，不能把方便展示当成真实需求。这个方向只是一种待验证的理解，还需要记录学生现在如何选择复习内容，以及哪里使他们无法继续。'.repeat(2), reading: { point: '先观察学生是否愿意再用公开例题复习，尚不能据此认定需求存在。' } }] } } });
        });
        await page.route('**/api/respond', route => { throw new Error('Unexpected second provider path: ' + route.request().url()); });
        await page.goto('/?locale=en&readingTrial=1' + (propositions ? '&propositionTrial=1' : ''));
        await expect(page.getByTestId('field')).toBeVisible();
        const project = createProject('main', 'Public capture regression', 1);
        project.thoughts.question = makeThought('我想验证大学生是否需要考前复习工具，每周只有两小时，使用公开例题，尚未访谈。', { x: 300, y: 200 }, 1, 'question');
        await page.evaluate(project => new Promise<void>((resolve, reject) => {
            const open = indexedDB.open('diffusion-explorer-v1');
            open.onerror = () => reject(open.error);
            open.onsuccess = () => { const db = open.result; const tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(project); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
        }), project);
        await page.reload(); await expect(page.getByTestId('field')).toBeVisible();
        const config = await runScenario(page, action, 'gateway', () => calls.length);
        await expect(page.locator('article.ghost')).toHaveCount(1);
        await expect(page.locator('.diffuse-indicator')).toContainText('Found 1 angle');
        expect(config.configuredSteps).toBe(1);
        if (action === 'diffuse') expect(config.setupRequests).toBe(0);
        expect(calls).toHaveLength(1);
        expect(calls[0].intent.kind).toBe(action);
        expect(calls[0].context.maxCandidates).toBe(1);
        expect(calls[0].context.scope.map((item: any) => item.id)).toEqual(['question']);
        await page.locator('.diffuse-indicator').getByRole('button', { name: 'Dismiss', exact: true }).click();
        expect(calls).toHaveLength(1);
    });
}
