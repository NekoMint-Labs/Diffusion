import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';
import { choose, openSection } from './selects.ts';

async function boot(page: Page) {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo' }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.goto('/?locale=zh');
    await expect(page.getByTestId('field')).toBeVisible();
    const project = createProject('main', '原生交互验收');
    for (const [i, id] of ['root', 'child', 'leaf'].entries()) project.thoughts[id] = { ...makeThought(['根想法：整理课程知识', '子想法：概率与统计', '叶想法：条件概率练习'][i], { x: 300 + i * 260, y: 220 + i * 150 }, 1, id), organizingParentId: i ? ['root', 'child'][i - 1] : null };
    await page.evaluate(project => new Promise<void>((resolve, reject) => { const request = indexedDB.open('diffusion-explorer-v1'); request.onerror = () => reject(request.error); request.onsuccess = () => { const db = request.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(project); tx.oncomplete = () => { db.close(); resolve(); }; }; }), project);
    await page.reload(); await expect(page.locator('[data-thought-id="root"]')).toBeVisible();
}
async function pinch(page: Page, zoom: number) {
    await page.mouse.move(100, 300); await page.keyboard.down('Control');
    for (let i = 0; i < 15; i++) {
        const current = await page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
        if (Math.abs(current - zoom) < .002) break;
        await page.mouse.wheel(0, Math.max(-60, Math.min(60, Math.log(current / zoom) / .006)));
        await page.waitForTimeout(100);
    }
    await page.keyboard.up('Control');
}
test('nested folds survive parent reopen and participate in the existing undo order', async ({ page }, info) => {
    await boot(page);
    const child = page.locator('[data-thought-id="child"]'), root = page.locator('[data-thought-id="root"]'), leaf = page.locator('[data-thought-id="leaf"]');
    await child.click(); await child.getByTestId('branch-expand').click(); await expect(leaf).toHaveCount(0);
    await root.click(); await root.getByTestId('branch-expand').click(); await expect(child).toHaveCount(0);
    await root.getByTestId('branch-expand').click(); await expect(child).toBeVisible(); await expect(leaf).toHaveCount(0);
    await page.keyboard.press('Control+z'); await expect(child).toHaveCount(0);
    await page.keyboard.press('Control+Shift+z'); await expect(child).toBeVisible(); await expect(leaf).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('nested-folds.png') });
});
test('Atlas suggestions use a full-row keyboard-operable review without duplicate cards', async ({ page }, info) => {
    await boot(page); await page.locator('[data-thought-id="root"]').click();
    await page.getByTestId('scope-continue').click(); await page.getByTestId('action-preview-run').click();
    await expect(page.locator('.thought.ghost').first()).toBeVisible();
    await pinch(page, .16); await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'atlas');
    await expect(page.locator('.thought.ghost')).toHaveCount(0);
    const toggle = page.getByTestId('suggestion-review-toggle'), box = await toggle.boundingBox();
    expect(box!.width).toBeGreaterThan(400); await toggle.click({ position: { x: box!.width - 12, y: box!.height / 2 } });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true'); await toggle.focus(); await page.keyboard.press('Space'); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.screenshot({ path: info.outputPath('atlas-suggestions.png') });
});
test('Chinese settings use semantic labels and advanced output controls while preserving search sources', async ({ page }, info) => {
    await boot(page); await page.keyboard.press('Control+,'); await choose(page, 'provider-select', 'openai');
    const ai = page.locator('#setting-ai'); await expect(ai).toContainText('直接连接 OpenAI API'); await expect(ai.getByRole('link', { name: '获取 API 密钥' })).toBeVisible();
    await expect(ai.getByTestId('depth-select')).toHaveCount(0); await ai.getByTestId('ai-advanced').click();
    await expect(ai.getByTestId('depth-select')).toHaveAttribute('aria-label', '输出长度上限');
    await expect(ai).not.toContainText('Create a key'); await expect(ai).not.toContainText('settings.ai.');
    await page.screenshot({ path: info.outputPath('ai-settings-zh.png') });
    await openSection(page, 'search'); await page.getByTestId('external-exploration').click();
    if (await page.getByTestId('source-exa').getAttribute('aria-checked') !== 'true') await page.getByTestId('source-exa').click();
    await page.getByTestId('discovery-advanced').click(); await page.getByTestId('source-tavily').click();
    await page.getByTestId('search-provider').click(); await page.locator('.ui-select-item[data-value="brave"]').click();
    const sources = await page.evaluate(() => JSON.parse(localStorage.getItem('diffusion-settings')!).discovery.sources);
    expect(sources.exa).toBe(true); expect(sources.tavily).toBe(true);
    await page.screenshot({ path: info.outputPath('search-settings-zh.png') });
});
for (const point of [{x: 8,y: 8}, {x: 1270,y: 8}, {x: 8,y: 710}, {x: 1270,y: 710}]) {
    test(`menus remain within the viewport at ${point.x},${point.y}`, async ({ page }, info) => {
        await page.setViewportSize({ width: 1280, height: 720 }); await boot(page);
        await page.mouse.click(point.x, point.y, { button: 'right' });
        const menu = page.getByRole('menu').first();
        // A click on persistent chrome may belong to the browser rather than the Field.
        if (await menu.count() === 0) await page.getByTestId('field').click({ button: 'right', position: { x: Math.min(1250, Math.max(30, point.x)), y: Math.min(650, Math.max(90, point.y)) } });
        await expect(menu).toBeVisible(); const bounds = await menu.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.y).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1280); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(720);
        await page.screenshot({ path: info.outputPath('edge-menu.png') });
    });
}

test('search tests are explicit, content-free, and discard results after backend changes', async ({ page }) => {
    await boot(page); await page.keyboard.press('Control+,'); await openSection(page, 'search');
    await page.getByTestId('external-exploration').check(); await page.getByTestId('source-exa').check();
    await page.getByTestId('source-key-exa').fill('fixture-key-never-live'); await page.getByTestId('source-key-save-exa').click();
    await page.getByTestId('discovery-advanced').click(); await choose(page, 'discovery-backend', 'custom');
    const requests: unknown[] = []; let finish: (() => void) | undefined;
    await page.route('https://search.example.org/search', async route => {
        requests.push(route.request().postDataJSON());
        await new Promise<void>(resolve => { finish = resolve; });
        await route.fulfill({ json: { candidates: [] } }).catch(() => {}); // Configuration changes cancel this request.
    });
    await page.getByTestId('discovery-url').fill('https://search.example.org'); await page.getByTestId('discovery-url').blur();
    await expect(page.getByTestId('search-test')).toBeEnabled(); expect(requests).toHaveLength(0);
    await page.getByTestId('search-test').click(); await expect.poll(() => requests.length).toBe(1);
    expect(requests).toEqual([{ query: 'Diffusion connection test', limit: 1 }]);
    await choose(page, 'discovery-backend', 'built-in');
    await choose(page, 'search-provider', 'tavily'); finish!();
    await expect(page.getByTestId('discovery-status')).not.toContainText('已通过');
    await expect(page.getByTestId('discovery-status')).toContainText('密钥');
    await choose(page, 'search-provider', 'exa');
    await choose(page, 'discovery-backend', 'custom');
    await page.unroute('https://search.example.org/search');
    await page.route('https://search.example.org/search', route => route.fulfill({ json: { candidates: [] } }));
    await page.getByTestId('search-test').click(); await expect(page.getByTestId('discovery-status')).toContainText('未返回结果');
});

test('an old model response cannot overwrite a new endpoint and empty lists stay editable', async ({ page }) => {
    await boot(page); await page.keyboard.press('Control+,'); await choose(page, 'provider-select', 'compatible');
    let finish: (() => void) | undefined, calls = 0;
    await page.route('http://127.0.0.1:11434/**', async route => { calls++; await new Promise<void>(resolve => { finish = resolve; }); await route.fulfill({ json: { data: [{ id: 'stale-model' }] } }); });
    await page.route('http://127.0.0.1:11435/**', route => route.fulfill({ json: { data: [] } }));
    await page.getByTestId('base-url').fill('http://127.0.0.1:11434/v1'); expect(calls).toBe(0);
    await page.getByTestId('refresh-models').click(); await expect.poll(() => calls).toBe(1);
    await page.getByTestId('base-url').fill('http://127.0.0.1:11435/v1'); finish!();
    await expect(page.getByTestId('model-summary')).toContainText('尚未获取');
    await page.getByTestId('refresh-models').click(); await expect(page.getByTestId('model-summary')).toContainText('空列表');
    await page.getByTestId('model-input').fill('manual-model'); await expect(page.getByTestId('model-input')).toHaveValue('manual-model');
    await expect(page.locator('[data-value="stale-model"]')).toHaveCount(0);
});

test('keyboard moves a selected parent and its folded subtree exactly once', async ({ page }) => {
    await boot(page);
    const root = page.locator('[data-thought-id="root"]'), leaf = page.locator('[data-thought-id="leaf"]');
    await leaf.click(); await root.click({ modifiers: ['Shift'] });
    await root.getByTestId('branch-expand').click(); await expect(leaf).toHaveCount(0);
    await page.getByTestId('field').focus(); await page.keyboard.press('ArrowRight');
    await expect.poll(() => page.evaluate(() => new Promise<number>(resolve => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onsuccess = () => { const db = request.result; const get = db.transaction('projects').objectStore('projects').get('main'); get.onsuccess = () => { db.close(); resolve(get.result.thoughts.root.x); }; };
    }))).toBeGreaterThan(300);
    const hiddenX = await page.evaluate(() => new Promise<number>(resolve => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onsuccess = () => { const db = request.result; const get = db.transaction('projects').objectStore('projects').get('main'); get.onsuccess = () => { db.close(); resolve(get.result.thoughts.leaf.x); }; };
    }));
    expect(hiddenX).toBe(830);
    await page.keyboard.press('Control+z'); // Undo the move, then restore the explicit fold.
    await page.keyboard.press('Control+z'); await expect(leaf).toBeVisible();
    // Mounted undo does not mean the asynchronous project write has committed yet.
    await expect.poll(() => page.evaluate(() => new Promise<number>(resolve => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onsuccess = () => { const db = request.result; const get = db.transaction('projects').objectStore('projects').get('main'); get.onsuccess = () => { db.close(); resolve(get.result.thoughts.root.x); }; };
    }))).toBe(300);
    await page.reload(); await expect(leaf).toBeVisible();
    const positions = await page.evaluate(() => new Promise<Record<string, { x: number; y: number }>>(resolve => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onsuccess = () => { const db = request.result; const get = db.transaction('projects').objectStore('projects').get('main'); get.onsuccess = () => { db.close(); resolve(Object.fromEntries(Object.entries(get.result.thoughts).map(([id, t]) => [id, { x: (t as { x: number }).x, y: (t as { y: number }).y }]))); }; };
    }));
    expect(positions).toEqual({ root: { x: 300, y: 220 }, child: { x: 560, y: 370 }, leaf: { x: 820, y: 520 } });
});

test('a long Find result scrolls independently without zooming or changing its source', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 }); await boot(page);
    const wording = '长文验收：' + '条件概率需要区分样本空间与已知条件。'.repeat(200);
    await page.evaluate(wording => new Promise<void>(resolve => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onsuccess = () => { const db = request.result, tx = db.transaction('projects', 'readwrite'), store = tx.objectStore('projects'); const get = store.get('main'); get.onsuccess = () => { get.result.thoughts.leaf.text = wording; get.result.camera = { x: 40, y: 100, zoom: .16 }; store.put(get.result); }; tx.oncomplete = () => { db.close(); resolve(); }; };
    }), wording);
    await page.reload(); await expect(page.getByTestId('field')).toBeVisible(); await page.keyboard.press('Control+f'); await page.locator('.find-bar input').fill('长文验收');
    const preview = page.locator('[data-thought-id="leaf"] .thought-preview');
    await expect(preview).toHaveText(wording);
    await expect.poll(() => preview.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    expect(await preview.evaluate(el => getComputedStyle(el).overflowY)).toBe('auto');
    const zoom = await page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
    await preview.hover(); await page.mouse.wheel(0, 200);
    await expect.poll(() => preview.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    expect(await page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a)).toBe(zoom);
    await page.keyboard.press('Escape'); await expect(preview).toHaveCount(0);
});

test('a refused credential save stays visible and never starts a connection test', async ({ page }) => {
    await page.addInitScript(() => {
        const calls: string[] = [];
        Object.assign(window, { fixtureNativeCalls: calls, __TAURI_INTERNALS__: { invoke: async (command: string) => {
            calls.push(command);
            if (command === 'credential_set') throw new Error('Fixture store refused');
            return false;
        } } });
    });
    await boot(page); await page.keyboard.press('Control+,'); await choose(page, 'provider-select', 'openai');
    const key = page.getByTestId('provider-key'); await key.fill('fixture-key-never-real'); await page.getByTestId('test-connection').click();
    await expect(page.getByTestId('provider-key-error')).toBeVisible(); await expect(key).toHaveValue('fixture-key-never-real');
    const calls = await page.evaluate(() => (window as unknown as { fixtureNativeCalls: string[] }).fixtureNativeCalls);
    expect(calls).toContain('credential_set'); expect(calls).not.toContain('native_ai_request');
    await expect(page.getByTestId('ai-status')).not.toHaveAttribute('data-tone', 'connected');
});

test('an unsaved AI key never transfers to another provider', async ({ page }) => {
    await boot(page); await page.keyboard.press('Control+,'); await choose(page, 'provider-select', 'openai');
    await page.getByTestId('provider-key').fill('fixture-for-openai-only');
    await choose(page, 'provider-select', 'anthropic'); await expect(page.getByTestId('provider-key')).toHaveValue('');
    await choose(page, 'provider-select', 'openai'); await expect(page.getByTestId('provider-key-remove')).toHaveCount(0);
});

test('offscreen children do not make an expanded branch impossible to collapse', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => new Promise<void>(resolve => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onsuccess = () => { const db=request.result, tx=db.transaction('projects','readwrite'), store=tx.objectStore('projects'), get=store.get('main'); get.onsuccess=()=>{get.result.thoughts.leaf.y=3000;store.put(get.result);};tx.oncomplete=()=>{db.close();resolve();}; };
    }));
    await page.reload(); const child=page.locator('[data-thought-id="child"]'); await child.click();
    const toggle=child.getByTestId('branch-expand'); await expect(toggle).toHaveAttribute('aria-expanded','true');
    await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','false');
    await page.keyboard.press('Control+z');await expect(toggle).toHaveAttribute('aria-expanded','true');
});

test('a gateway metadata response never claims the model has been verified', async ({ page }) => {
    let requests = 0;
    await page.route('https://gateway.test/**', route => { requests++; return route.fulfill({ json: { configured: true, defaultModel: 'fixture-model', models: [], allowModelOverride: false, depth: { supported: false, mode: 'none', levels: ['auto'] } } }); });
    await boot(page); await page.keyboard.press('Control+,'); await choose(page, 'provider-select', 'gateway');
    await page.getByTestId('gateway-url').fill('https://gateway.test');
    expect(requests).toBe(0); await page.getByTestId('test-connection').click();
    const status = page.getByTestId('ai-status');
    await expect(status).toContainText('网关可连接'); await expect(status).toContainText('尚未验证模型响应');
    await expect(status).toHaveAttribute('data-tone', 'limited'); expect(requests).toBe(1);
    await page.getByTestId('gateway-token').fill('changed-token'); await expect(status).toContainText('配置已更改');
    await expect(status).not.toContainText('网关可连接'); expect(requests).toBe(1);
});


test('custom search tests and runs without built-in keys, preserving settings across backend switches', async ({ page }, info) => {
    await boot(page); await page.keyboard.press('Control+,'); await openSection(page, 'search');
    await page.getByTestId('external-exploration').check();
    await page.getByTestId('discovery-advanced').click(); await choose(page, 'discovery-backend', 'custom');
    const requests: { query: string; limit: number }[] = [];
    await page.route('https://search.example.org/search', route => {
        requests.push(route.request().postDataJSON());
        return route.fulfill({ json: { candidates: [{ id: 'fixture', title: 'Public fixture', url: 'https://example.org/reference', excerpt: 'A public test excerpt', inspected: 'Snippet only' }] } });
    });
    await expect(page.getByTestId('search-test')).toBeDisabled();
    await page.getByTestId('discovery-url').fill('http://remote.example.org'); await page.getByTestId('discovery-url').blur();
    await expect(page.getByTestId('search-test')).toBeDisabled();
    await page.getByTestId('discovery-url').fill('https://search.example.org/'); await page.getByTestId('discovery-url').blur();
    await expect(page.getByTestId('search-provider')).toHaveCount(0);
    await expect(page.getByTestId('discovery-missing-key')).toHaveCount(0);
    await expect(page.getByTestId('search-test')).toBeEnabled(); expect(requests).toEqual([]);
    await page.getByTestId('search-test').click(); await expect(page.getByTestId('discovery-status')).toHaveAttribute('data-tone', 'connected');
    expect(requests).toEqual([{ query: 'Diffusion connection test', limit: 1 }]);
    await page.screenshot({ path: info.outputPath('custom-search-no-keys.png') });
    await page.keyboard.press('Escape'); await page.locator('[data-thought-id="root"]').click(); await page.getByTestId('scope-angle').click();
    await page.locator('.action-preview-options summary').click();
    await page.getByRole('checkbox', { name: '使用网络搜索' }).check();
    await page.getByTestId('action-preview-run').click();
    await expect.poll(() => requests.length).toBeGreaterThan(1);
    expect(requests[1].query).not.toBe('Diffusion connection test');
    await page.keyboard.press('Control+,'); await openSection(page, 'search');
    await page.getByTestId('discovery-advanced').click(); await choose(page, 'discovery-backend', 'built-in');
    await page.getByTestId('source-exa').check(); await page.getByTestId('source-tavily').check();
    await page.getByTestId('source-key-exa').fill('fixture-key-never-live'); await page.getByTestId('source-key-save-exa').click();
    await expect(page.getByTestId('source-key-remove-exa')).toBeVisible();
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('diffusion-settings')!).discovery);
    await choose(page, 'discovery-backend', 'custom'); await expect(page.getByTestId('search-test')).toBeEnabled();
    await choose(page, 'discovery-backend', 'built-in');
    await expect(page.getByTestId('source-key-remove-exa')).toBeVisible(); await expect(page.getByTestId('source-tavily')).toBeChecked();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('diffusion-settings')!).discovery)).toEqual(before);
});

test('source-derived Atlas retains its Thought anchor through fit and reopen without changing content', async ({ page }, info) => {
    await boot(page);
    const original = await page.evaluate(() => new Promise<any>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1'); request.onerror = () => reject(request.error);
        request.onsuccess = () => { const db = request.result, tx = db.transaction('projects', 'readwrite'), store = tx.objectStore('projects'), get = store.get('main');
            get.onsuccess = () => { const project = get.result; project.thoughts.root.kind = 'source'; project.thoughts.root.sourceId = 'fixture';
                project.sources.fixture = { id: 'fixture', title: 'Public source fixture', status: 'ready', mime: 'text/plain', excerpt: 'Public fixture', inspected: 'Full text', provenance: {} };
                delete project.thoughts.child.organizingParentId; project.thoughts.child.derivedFrom = ['root']; project.thoughts.child.generationAction = 'continue'; project.thoughts.child.origin = { sourceId: 'fixture' };
                project.thoughts.leaf.x = 9000; project.thoughts.leaf.y = 9000; store.put(project); tx.oncomplete = () => { db.close(); resolve(project.thoughts); }; };
        };
    }));
    await page.reload(); await pinch(page, .16);
    await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'atlas');
    await expect(page.locator('[data-thought-id="root"]')).toHaveCount(0);
    await expect(page.locator('[data-thought-id="leaf"]')).toHaveCount(0);
    const anchor = page.locator('[data-thought-id="child"]'); await expect(anchor).toBeVisible();
    await page.keyboard.press('0'); await expect(anchor).toBeInViewport();
    const box = (await anchor.boundingBox())!; expect(box.width).toBeGreaterThan(100);
    await page.screenshot({ path: info.outputPath('source-branch-anchor.png') });
    await expect.poll(() => page.getByTestId('field').getAttribute('data-camera-moving')).toBeNull();
    await page.waitForTimeout(600); await page.reload(); await expect(anchor).toBeVisible();
    const thoughts = await page.evaluate(() => new Promise<any>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1'); request.onerror = () => reject(request.error);
        request.onsuccess = () => { const db = request.result, get = db.transaction('projects').objectStore('projects').get('main'); get.onsuccess = () => { db.close(); resolve(get.result.thoughts); }; };
    }));
    expect(thoughts).toEqual(original);
});
