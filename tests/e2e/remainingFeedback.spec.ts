import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';

async function prepare(page: Page) {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'gateway' }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.goto('/?locale=zh');
    await expect(page.getByTestId('field')).toBeVisible();
}
async function readProject(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise<ProjectState>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { const db = request.result; const read = db.transaction('projects').objectStore('projects').get('main'); read.onsuccess = () => { db.close(); resolve(read.result); }; };
    }));
}
async function settle(page: Page) {
    await expect(page.getByTestId('field')).not.toHaveAttribute('data-camera-moving', 'true');
    await page.waitForTimeout(220);
}
async function write(page: Page, x: number, y: number, text: string) {
    await page.getByTestId('field').dblclick({ position: { x, y } });
    const input = page.locator('.thought.editing textarea');
    await input.fill(text);
    await input.press('Enter');
    await settle(page);
    const id = await page.locator('article.thought:not(.ghost)').filter({ hasText: text }).getAttribute('data-thought-id');
    return page.locator(`[data-thought-id="${id}"]`);
}

for (const position of [{ name: 'center', x: 650, y: 420 }, { name: 'bottom', x: 650, y: 830 }, { name: 'right', x: 1190, y: 430 }]) {
    test(`More supports pointer travel and pinned click at the ${position.name}`, async ({ page }, info) => {
        await prepare(page);
        const thought = await write(page, position.x, position.y, '菜单交互验收');
        for (const diagonal of [false, true]) {
            await thought.click({ button: 'right' });
            const menu = page.getByTestId('thought-menu');
            const more = menu.locator('[data-command="more"]');
            await page.waitForTimeout(220);
            const before = (await more.boundingBox())!;
            await more.hover();
            const panel = page.getByTestId('thought-more-menu');
            await expect(panel).toBeVisible();
            const start = (await more.boundingBox())!;
            expect(Math.abs(start.x - before.x)).toBeLessThan(2);
            expect(Math.abs(start.y - before.y)).toBeLessThan(2);
            const target = panel.locator('[data-command="copy-text"]');
            const end = (await target.boundingBox())!;
            await info.attach(`more-${diagonal}-geometry`, { body: JSON.stringify({ start, end }), contentType: 'application/json' });
            await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
            await page.mouse.move(end.x + end.width / 2, diagonal ? end.y + end.height / 2 : start.y + start.height / 2, { steps: 16 });
            await expect(panel).toBeVisible();
            await target.hover();
            await expect(panel).toBeVisible();
            await page.screenshot({ path: info.outputPath(`more-${diagonal}.png`) });
            await page.keyboard.press('Escape');
            if (await menu.count()) await page.keyboard.press('Escape');
            await expect(menu).toHaveCount(0);
        }
        await thought.click({ button: 'right' });
        const menu = page.getByTestId('thought-menu');
        const more = menu.locator('[data-command="more"]');
        // A physical click begins before the hover timer can resize the popup.
        const point = (await more.boundingBox())!;
        await page.mouse.click(point.x + point.width / 2, point.y + point.height / 2);
        const panel = page.getByTestId('thought-more-menu');
        await expect(panel).toBeVisible();
        await page.mouse.move(80, 650);
        await expect(panel).toBeVisible();
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
        let copyCount = 0;
        await page.exposeFunction('recordClipboardWrite', () => { copyCount++; });
        await page.evaluate(() => {
            const write = navigator.clipboard.writeText.bind(navigator.clipboard);
            navigator.clipboard.writeText = async text => {
                await (window as unknown as { recordClipboardWrite: () => Promise<void> }).recordClipboardWrite();
                return write(text);
            };
        });
        await panel.locator('[data-command="copy-text"]').click();
        await expect(menu).toHaveCount(0);
        await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('菜单交互验收');
        expect(copyCount).toBe(1);
        await expect(page.getByTestId('field')).toBeFocused();
        await thought.click({ button: 'right' });
        await more.focus();
        await more.press('ArrowRight');
        await expect(panel.getByRole('menuitem').first()).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(panel).toHaveCount(0);
        await expect(more).toBeFocused();
        await more.press('Enter');
        await expect(panel).toBeVisible();
        await page.mouse.click(80, 650);
        await expect(menu).toHaveCount(0);
        await expect(page.getByTestId('field')).toBeFocused();
    });
}

for (const initialZoom of [1, .4, .08]) {
    test(`new Continue suggestions stay bounded and clear before and after Keep (zoom ${initialZoom})`, async ({ page }, info) => {
        await prepare(page);
        let response = 0;
        const texts = ['那第一步也许可以先挑一个最小的场景试，比如只管一门课的课件、笔记和往年题这三样，看能不能把它们放到一起还不乱。', '试的时候可以给自己留个标准，比如期末复习时，能不能在往年题直接翻回对应的那节课件，不用来回找——如果这一步就卡住了，那说明三样放一起的方式还得再改。'];
        await page.route('**/api/respond', route => route.fulfill({ json: { providerLabel: 'Controlled regression fixture', mock: false, intents: [{ type: 'surface_possibility', text: texts[response++ % 2] }] } }));
        if (initialZoom === .08) {
            await page.mouse.move(700, 400);
            for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(40); }
            await settle(page);
        }
        if (initialZoom === .4) {
            const project = await readProject(page);
            project.camera = { x: 0, y: 0, zoom: .4 };
            await page.evaluate(p => new Promise<void>(resolve => {
                const request = indexedDB.open('diffusion-explorer-v1');
                request.onsuccess = () => { const db = request.result; const tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(p); tx.oncomplete = () => { db.close(); resolve(); }; };
            }), project);
            await page.reload();
            await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'neighborhood');
        }
        const root = await write(page, 460, 300, '我想做一个帮助大学生整理学习资料的工具');
        await expect.poll(async () => Object.keys((await readProject(page)).thoughts).length).toBe(1);
        const roots = (await readProject(page)).thoughts;
        for (let round = 0; round < 2; round++) {
            await page.getByTestId('scope-continue').click();
            await page.getByTestId('action-preview-run').click();
            const ghost = page.locator('article.ghost');
            await expect(ghost).toHaveCount(1);
            await expect(ghost).toContainText(texts[round].slice(0, 12));
            await settle(page);
            const boxes = await ghost.evaluate(element => {
                const g = element.getBoundingClientRect();
                const overlaps = [...document.querySelectorAll('article.thought:not(.ghost)')].map(node => {
                    const b = node.getBoundingClientRect();
                    return Math.max(0, Math.min(g.right, b.right) - Math.max(g.left, b.left)) * Math.max(0, Math.min(g.bottom, b.bottom) - Math.max(g.top, b.top));
                });
                const style = getComputedStyle(element);
                const world = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.world')!).transform);
                const parent = element.querySelector('.hierarchy-parent')!.getBoundingClientRect();
                const level = element.querySelector('.hierarchy-level')!.getBoundingClientRect();
                return { width: g.width, height: g.height, overlaps, font: parseFloat(style.fontSize) * world.a, parent: parent.toJSON(), level: level.toJSON() };
            });
            await info.attach(`generation-${round}`, { body: JSON.stringify(boxes), contentType: 'application/json' });
            await page.screenshot({ path: info.outputPath(`generation-${round}.png`) });
            expect(Math.max(...boxes.overlaps)).toBeLessThanOrEqual(1);
            expect(boxes.width).toBeLessThanOrEqual(335);
            expect(boxes.height).toBeLessThanOrEqual(245);
            expect(boxes.font).toBeGreaterThanOrEqual(10);
            expect(boxes.parent.width).toBeGreaterThan(50);
            expect(boxes.parent.bottom).toBeLessThanOrEqual(boxes.level.bottom + 20);
            await expect(ghost.locator('.ghost-label')).toContainText('尚未保留');
            await expect(ghost.locator('.hierarchy-parent')).toBeVisible();
            for (const [id, value] of Object.entries(roots)) expect((await readProject(page)).thoughts[id]).toEqual(value);
            await ghost.click();
            if (round === 0) {
                await page.getByTestId('scope-hub').getByRole('button', { name: '留下', exact: true }).click();
                await expect(ghost).toHaveCount(0);
                await expect.poll(async () => Object.keys((await readProject(page)).thoughts).length).toBe(2);
                await page.locator('article.thought').filter({ hasText: texts[0].slice(0, 12) }).click();
            } else {
                await ghost.locator('.proposal-reject').click();
                await expect(ghost).toHaveCount(0);
                expect(Object.keys((await readProject(page)).thoughts)).toHaveLength(2);
            }
        }
        await expect(root).toBeVisible();
    });
}

test('region labels appear only in Atlas even after region selection and reopen', async ({ page }, info) => {
    await prepare(page);
    const project = createProject('main', '区域标签验收');
    project.camera = { x: 400, y: 220, zoom: .2 };
    for (let i = 0; i < 3; i++) project.thoughts[`r${i}`] = makeThought(`区域中的想法 ${i}`, { x: 180 + i * 400, y: 550 }, 1, `r${i}`);
    project.regions.r = { id: 'r', name: '逐渐形成的一片思绪', x: 600, y: 200, members: Object.keys(project.thoughts), activity: 1 };
    await page.evaluate(p => new Promise<void>(resolve => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onsuccess = () => { const db = request.result; const tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(p); tx.oncomplete = () => { db.close(); resolve(); }; };
    }), project);
    await page.reload();
    await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'atlas');
    const label = page.locator('.region-label');
    await expect(label).toBeVisible();
    await page.screenshot({ path: info.outputPath('region-atlas.png') });
    await label.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    for (const target of ['neighborhood', 'local']) {
        await page.mouse.move(700, 400);
        for (let i = 0; i < (target === 'neighborhood' ? 2 : 5); i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(80); }
        await settle(page);
        await expect(page.getByTestId('field')).toHaveAttribute('data-level', target);
        await expect(label).toHaveCount(0);
        await page.screenshot({ path: info.outputPath(`region-${target}.png`) });
    }
    await page.reload();
    await expect(label).toHaveCount(0);
    for (let i = 0; i < 9; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(60); }
    await settle(page);
    await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'atlas');
    await expect(label).toBeVisible();
    expect((await readProject(page)).regions).toEqual(project.regions);
    expect((await readProject(page)).thoughts).toEqual(project.thoughts);
});
