import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';

async function stored(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise<ProjectState>((resolve, reject) => {
        const r = indexedDB.open('diffusion-explorer-v1'); r.onerror = () => reject(r.error);
        r.onsuccess = () => { const db = r.result, read = db.transaction('projects').objectStore('projects').get('main'); read.onsuccess = () => { db.close(); resolve(read.result); }; read.onerror = () => reject(read.error); };
    }));
}
const positions = (p: ProjectState) => Object.fromEntries(Object.values(p.thoughts).map(t => [t.id, { x: t.x, y: t.y, text: t.text }]));
for (const [profile, zoom, interfaceSize, width, motion] of [
    ['editorial-warm', 1, 100, 1280, 'reduce'],
    ['graphite-night', .75, 120, 980, 'reduce'],
    ['editorial-warm', .65, 100, 980, 'no-preference'],
    ['graphite-night', 1.5, 120, 1280, 'reduce'],
] as const) test.describe('dense controls ' + profile + '/' + zoom, () => {
    test.use({ viewport: { width, height: 720 }, reducedMotion: motion });
    test('pending feedback clears relation wording and keeps Stop/read controls usable', async ({ page }, info) => {
        await page.addInitScript(settings => {
            localStorage.setItem('diffusion-settings', JSON.stringify(settings));
            localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        }, { provider: 'gateway', locale: 'zh', interfaceSize, appearance: { profile } });
        let release!: () => void;
        const hold = new Promise<void>(resolve => { release = resolve; });
        await page.route('**/api/respond', async route => { await hold; await route.fulfill({ json: { providerLabel: 'Dense controls fixture / not live', mock: true, intents: [] } }).catch(() => {}); });
        try {
            await page.goto('/?locale=zh'); await expect(page.getByTestId('field')).toBeVisible();
            const project = createProject('main', '密集控件避让回归'); project.camera = { x: 0, y: 0, zoom };
            project.thoughts.source = makeThought('课程学习和科研入门之间存在取舍，我需要逐步整理自己可以验证的假设，并保留此前的判断依据。'.repeat(3), { x: (width / 2 - 220) / zoom, y: 250 / zoom }, 1, 'source');
            project.thoughts.a = makeThought('已有事实仍需验证', { x: 50 / zoom, y: 460 / zoom }, 1, 'a');
            project.thoughts.b = makeThought('初步假设需要比较', { x: (width - 280) / zoom, y: 460 / zoom }, 1, 'b');
            project.relations.link = { id: 'link', a: 'a', b: 'b', kind: 'gap', label: '这里的条件仍需逐项核对', status: 'confirmed', createdAt: 1 };
            const seed = async () => {
                await page.evaluate(project => new Promise<void>((resolve, reject) => { const r = indexedDB.open('diffusion-explorer-v1'); r.onerror = () => reject(r.error); r.onsuccess = () => { const db = r.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(project); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); }; }), project);
                await page.reload(); await expect(page.locator('[data-thought-id="source"]')).toBeVisible();
            };
            await seed();
            const source = (await page.locator('[data-thought-id="source"]').boundingBox())!;
            project.thoughts.a.y = project.thoughts.b.y = (source.y + source.height - 20) / zoom;
            await seed(); await page.locator('[data-thought-id="source"]').click();
            const before = await stored(page);
            await page.getByTestId('scope-continue').click(); await page.getByTestId('action-preview-run').click();
            const feedback = page.getByTestId('operation-feedback');
            const label = page.locator('[data-relation-token="link"]');
            await expect(feedback).toHaveAttribute('data-copy-visible', 'true');
            await expect(label).toBeVisible();
            await expect.poll(() => page.evaluate(() => {
                const controls = [...document.querySelectorAll<HTMLElement>('.scope-hub, .spatial-operation-feedback, .thought-local-actions')].filter(el => el.getClientRects().length);
                const relations = [...document.querySelectorAll<HTMLElement>('.relation-token-overlay, .relation-token-actions')].filter(el => el.getClientRects().length);
                return controls.every(a => relations.every(b => { const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); return x.right <= y.left || y.right <= x.left || x.bottom <= y.top || y.bottom <= x.top; }));
            })).toBe(true);
            const box = (await feedback.boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
            expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(720);
            await page.screenshot({ path: info.outputPath('dense-controls-clear.png') });
            await feedback.getByRole('button', { name: '停止', exact: true }).click();
            await expect(feedback).toHaveAttribute('data-phase', 'cancelled'); release();
            await label.getByRole('button').click();
            await expect(page.getByRole('dialog')).toContainText('这里的条件仍需逐项核对');
            await page.keyboard.press('Escape');
            expect(positions(await stored(page))).toEqual(positions(before));
            expect((await stored(page)).relations).toEqual(before.relations);
            expect((await stored(page)).camera).toEqual(before.camera);
            await page.reload();
            await expect(page.locator('[data-relation-token="link"]')).toBeVisible();
            expect(positions(await stored(page))).toEqual(positions(before));
            expect((await stored(page)).relations).toEqual(before.relations);
        } finally { release(); }
    });
});
