import { test, expect, type Page } from '@playwright/test';
import type { Point, ProjectState, Thought } from '../../src/core/model.ts';

async function openConnections(page: Page): Promise<void> {
    await expect(page.getByTestId('manage-links')).toHaveCount(0);
    await page.getByTestId('global-more').click();
    await page.getByRole('menuitem', { name: '管理连线', exact: true }).click();
}
async function stored(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise<ProjectState>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const read = db.transaction('projects').objectStore('projects').get('free-link-check');
            read.onsuccess = () => { db.close(); resolve(read.result); };
            read.onerror = () => { db.close(); reject(read.error); };
        };
    }));
}
async function center(page: Page, selector: string): Promise<Point> {
    const box = await page.locator(selector).boundingBox();
    if (!box) throw new Error(`Missing endpoint: ${selector}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
test('manual ports, multi-source, reconnect, delete, Core undo and reload without AI', async ({ page }) => {
    const errors: string[] = [];
    let calls = 0;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/api\/respond|native_ai_request|api.deepseek/.test(request.url())) calls++; });
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'off', locale: 'zh' }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.goto('/?locale=zh&freeLinksTrial=1');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.evaluate(async () => {
        const now = Date.now(), thoughts: Record<string, Thought> = {};
        for (const [index, id] of ['a', 'b', 'c'].entries()) thoughts[id] = {
            id, text: ['学生的复习时间很少', '复习内容很多', '按薄弱点安排复习'][index],
            x: 200 + index * 330, y: 300, kind: 'thought', life: 'active', kept: false,
            createdAt: now, updatedAt: now, touchedAt: now,
        };
        const project: ProjectState = { schemaVersion: 1, id: 'free-link-check', title: '自由连线验收', thoughts,
            relations: {}, regions: {}, sources: {}, inputs: {}, threads: {}, history: [],
            camera: { x: 0, y: 0, zoom: 1 }, createdAt: now, updatedAt: now };
        await new Promise<void>((resolve, reject) => {
            const request = indexedDB.open('diffusion-explorer-v1');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result, transaction = db.transaction('projects', 'readwrite');
                transaction.objectStore('projects').put(project);
                transaction.oncomplete = () => { db.close(); resolve(); };
                transaction.onerror = () => { db.close(); reject(transaction.error); };
            };
        });
        localStorage.setItem('diffusion-active-project', project.id);
    });
    await page.reload();
    await expect(page.locator('[data-free-link-id="a"]').first()).toBeVisible();
    const initial = await stored(page);
    const a = await center(page, '[data-free-link-id="a"][data-free-link-port="left"]');
    const c = await center(page, '[data-free-link-id="c"][data-free-link-port="right"]');
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(c.x, c.y, { steps: 15 }); await page.mouse.up();
    await expect.poll(async () => Object.keys((await stored(page)).relations).length).toBe(1);
    const first = Object.values((await stored(page)).relations)[0];
    expect(first.manual).toEqual({ aPort: 'left', bPort: 'right' });
    expect((await stored(page)).thoughts).toEqual(initial.thoughts);
    await openConnections(page);
    await page.getByRole('combobox', { name: '连线起点' }).selectOption('b');
    await page.locator('[data-link-target="c"]').getByRole('button', { name: '接左点', exact: true }).click();
    await expect.poll(async () => Object.keys((await stored(page)).relations).length).toBe(2);
    const entry = page.locator(`[data-link-entry="${first.id}"]`);
    await entry.getByRole('button', { name: '换终点', exact: true }).click();
    await page.locator('[data-link-target="b"]').getByRole('button', { name: '接右点', exact: true }).click();
    await expect.poll(async () => (await stored(page)).relations[first.id].b).toBe('b');
    await entry.getByRole('button', { name: '删除连线', exact: true }).click();
    await expect.poll(async () => Object.keys((await stored(page)).relations).length).toBe(1);
    await page.getByTestId('free-link-manager').getByRole('button', { name: '撤销', exact: true }).click();
    await expect.poll(async () => (await stored(page)).relations[first.id]?.b).toBe('b');
    await page.reload();
    await expect(page.locator('[data-free-link-id="a"]').first()).toBeVisible();
    const reopened = await stored(page);
    expect(reopened.relations[first.id].manual).toEqual({ aPort: 'left', bPort: 'right' });
    expect(reopened.relations[first.id].b).toBe('b');
    expect(reopened.thoughts).toEqual(initial.thoughts);
    await openConnections(page);
    await page.getByRole('combobox', { name: '连线起点' }).selectOption('b');
    await page.locator('[data-link-target="a"]').getByRole('button', { name: '接左点', exact: true }).click();
    await expect(page.getByTestId('free-link-manager').getByRole('alert')).toHaveText('这两张卡片已经连过了，请修改原连线，不能再重复或反向连接。');
    expect(Object.keys((await stored(page)).relations)).toHaveLength(2);
    const second = Object.values((await stored(page)).relations).find(relation => relation.a === 'b')!;
    await page.locator(`[data-link-entry="${second.id}"]`).getByRole('button', { name: '换终点', exact: true }).click();
    await page.locator('[data-link-target="a"]').getByRole('button', { name: '接右点', exact: true }).click();
    expect((await stored(page)).relations[second.id].b).toBe('c');
    await page.locator(`[data-link-entry="${first.id}"]`).getByRole('button', { name: '查看两端', exact: true }).click();
    await page.getByRole('button', { name: '回到思绪场', exact: true }).click();
    const halo = page.locator('[data-free-link-halo="a"]');
    const beforeHalo = await halo.boundingBox();
    const start = await center(page, '[data-thought-id="a"] .thought-preview');
    if (!beforeHalo) throw new Error('Selected connection must show endpoint halo');
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(start.x, start.y + 120, { steps: 12 });
    await expect.poll(async () => {
        const moved = await halo.boundingBox();
        return moved ? Math.abs(moved.y - beforeHalo.y - 120) : Infinity;
    }).toBeLessThan(3);
    expect((await stored(page)).thoughts.a.y).toBe(initial.thoughts.a.y);
    await page.mouse.up();
    await expect.poll(async () => (await stored(page)).thoughts.a.y).not.toBe(initial.thoughts.a.y);
    const legacy = await stored(page), kept = legacy.relations[first.id];
    legacy.relations['legacy-opposite'] = { ...kept, id: 'legacy-opposite', a: kept.b, b: kept.a };
    await page.evaluate(project => new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onsuccess = () => {
            const db = request.result, tx = db.transaction('projects', 'readwrite');
            tx.objectStore('projects').put(project);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
        };
    }), legacy);
    await page.reload();
    await openConnections(page);
    await expect(page.getByText('发现旧版留下的反向连线，请在下面选择要保留的方向。', { exact: true })).toBeVisible();
    expect(Object.keys((await stored(page)).relations)).toHaveLength(3);
    await page.locator(`[data-link-entry="${first.id}"]`).getByRole('button', { name: '保留此方向', exact: true }).click();
    await expect.poll(async () => Object.keys((await stored(page)).relations).length).toBe(2);
    expect((await stored(page)).relations[first.id]).toEqual(kept);
    expect((await stored(page)).thoughts).toEqual(legacy.thoughts);
    await page.getByTestId('free-link-manager').getByRole('button', { name: '撤销', exact: true }).click();
    await expect.poll(async () => Object.keys((await stored(page)).relations).length).toBe(3);
    expect(calls).toBe(0); expect(errors).toEqual([]);
});
