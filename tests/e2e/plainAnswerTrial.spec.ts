import { test, expect } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';
import { PLAIN_ANSWER_INSTRUCTIONS } from '../../src/ai/plainAnswer.ts';
import type { StructuredRequest } from '../../src/ai/contracts.ts';

for (const enabled of [false, true]) test('wording trial is explicit and preserves Read / Keep / reload, enabled=' + enabled, async ({ page }, info) => {
    const requests: StructuredRequest[] = [];
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const text = '可以先问一位愿意聊的同学：“上次复习时，你在哪一步卡住了？”这只是一个可选的问法，不是必须先做访谈。\n\n如果对方能说出具体经历，再看看现有工具有没有帮上忙；一句“我想要”还不能说明他真的会用。不要收集私人作业、成绩或身份资料，也不能因为暂时没人回答，就认定这个方向没价值。';
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'gateway', locale: 'zh', theme: 'light' }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.route('**/api/structured', route => {
        requests.push(route.request().postDataJSON());
        return route.fulfill({ json: { value: { intents: [{ type: 'surface_possibility', text }] }, mock: false, providerLabel: 'Injected fixture, not a live quality result' } });
    });
    let unexpected = 0;
    await page.route('**/api/respond', route => { unexpected++; return route.abort(); });
    await page.goto('/?locale=zh&readingTrial=1&propositionTrial=1' + (enabled ? '&plainAnswerTrial=1' : ''));
    await expect(page.getByTestId('field')).toBeVisible();
    const project = createProject('main', '表达试用自动检查（注入响应）');
    project.thoughts.question = makeThought('我想做复习工具，但还不知道同学是否需要。不接触私人作业或成绩。', { x: 300, y: 180 }, 1, 'question');
    await page.evaluate(project => new Promise<void>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onsuccess = () => { const db = opening.result; const tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(project); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    }), project);
    await page.reload(); await page.locator('[data-thought-id="question"]').click();
    await page.getByTestId('scope-continue').click(); await page.getByTestId('action-preview-run').click();
    const ghost = page.locator('article.ghost'); await expect(ghost).toHaveCount(1);
    expect(requests).toHaveLength(1); expect(requests[0].instructions.includes(PLAIN_ANSWER_INSTRUCTIONS)).toBe(enabled);
    await ghost.click(); await ghost.getByRole('button', { name: '阅读原文', exact: true }).click();
    await expect(page.getByTestId('reading-original')).toHaveText(text);
    await page.getByTestId('proposition-reader').locator('.surface-close').click();
    const id = (await ghost.getAttribute('data-thought-id'))!;
    await ghost.click(); await page.getByTestId('ai-proposal-keep').click();
    const kept = page.locator('[data-thought-id="' + id + '"]'); await expect(kept).toHaveAttribute('data-kind', 'thought');
    // Keep updates the rendered state before the asynchronous save commits. A reload test
    // must observe persisted text first, rather than racing that write on a fast runner.
    await expect.poll(() => page.evaluate(id => new Promise<string | undefined>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
            const db = opening.result;
            const read = db.transaction('projects').objectStore('projects').get('main');
            read.onsuccess = () => { db.close(); resolve(read.result?.thoughts[id]?.text); };
            read.onerror = () => { db.close(); reject(read.error); };
        };
    }), id)).toBe(text);
    await page.reload(); await kept.click(); await kept.getByRole('button', { name: '阅读原文', exact: true }).click();
    await expect(page.getByTestId('reading-original')).toHaveText(text);
    await page.screenshot({ path: info.outputPath('plain-trial-kept-reader.png') });
    expect(requests).toHaveLength(1); expect(unexpected).toBe(0); expect(errors).toEqual([]);
});
