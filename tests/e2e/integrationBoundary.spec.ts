import { test, expect } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';

test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
for (const zoom of [1, .4, .16]) {
    test(`reading and responding stay usable at zoom ${zoom} without camera travel`, async ({ page }, info) => {
        let requests = 0;
        await page.route('**/api/respond', route => { requests++; return route.abort(); });
        await page.addInitScript(() => {
            localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo' }));
            localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        });
        await page.goto('/?locale=zh');
        await expect(page.getByTestId('field')).toBeVisible();
        const text = '整理课程资料时，我想先区分学习目标和材料来源。'.repeat(18) + '同一份材料能否属于多个课程视角？';
        const project = createProject('main', '整合边界');
        const initialZoom = Math.max(zoom, .4);
        project.camera = { x: 0, y: 0, zoom: initialZoom };
        project.thoughts.source = makeThought(text, { x: 250 / initialZoom, y: 180 / initialZoom }, 1, 'source');
        await page.evaluate(project => new Promise<void>((resolve, reject) => {
            const request = indexedDB.open('diffusion-explorer-v1');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result, tx = db.transaction('projects', 'readwrite');
                tx.objectStore('projects').put(project);
                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = () => reject(tx.error);
            };
        }), project);
        await page.reload();
        const source = page.locator('[data-thought-id="source"]');
        await source.click({ position: { x: 20, y: 20 } });
        if (zoom < initialZoom) {
            // Atlas frontiers deliberately own the unselected root's label. Retain a real
            // selection while the person pinches out, then test reading without camera travel.
            await page.mouse.move(250, 180);
            await page.keyboard.down('Control');
            const delta = Math.log(initialZoom / zoom) / .0015 / 4 / 4;
            for (let i = 0; i < 4; i++) {
                await page.mouse.wheel(0, delta);
                await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
            }
            await page.keyboard.up('Control');
            await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'atlas');
            await expect(page.getByTestId('field')).not.toHaveAttribute('data-camera-moving', 'true');
            const actualZoom = await page.locator('.world').evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).a);
            expect(actualZoom).toBeCloseTo(zoom, 6);
        }
        const sourcePosition = await source.getAttribute('style');
        const camera = await page.locator('.world').getAttribute('style');
        const respond = source.getByTestId('thought-respond');
        const read = source.getByRole('button', { name: '阅读全文', exact: true });
        for (const control of [respond, read]) {
            await expect(control).toBeVisible();
            const bounds = await control.boundingBox();
            expect(bounds!.height).toBeGreaterThanOrEqual(31.5);
            expect(bounds!.width).toBeGreaterThanOrEqual(48);
            expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(720);
            const hub = await page.getByTestId('scope-hub').boundingBox();
            const a = bounds!, b = hub!;
            expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
        }
        await page.screenshot({ path: info.outputPath('read-and-response-controls.png') });
        await read.click();
        const reader = page.getByRole('dialog', { name: '完整内容', exact: true });
        await expect(reader.locator('.thought-reader-text')).toHaveText(text);
        expect(await page.locator('.world').getAttribute('style')).toBe(camera);
        await reader.getByRole('button', { name: '回到思绪场', exact: true }).click();
        await respond.click();
        const reply = '我的回应：先保留材料的来源，再为不同课程建立归属。';
        await page.getByRole('textbox', { name: '说点什么', exact: true }).fill(reply);
        await page.getByRole('button', { name: '保存回应', exact: true }).click();
        const response = page.locator('[data-thought-id]').filter({ hasText: reply });
        await expect(response).toBeVisible();
        await expect(response).toHaveAttribute('data-origin-scope', 'source');
        // Camera paint is imperative and scheduled; inspect after its frame, not before it.
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        expect(await source.getAttribute('style')).toBe(sourcePosition);
        expect(await page.locator('.world').getAttribute('style')).toBe(camera);
        expect(requests).toBe(0);
    });
}
