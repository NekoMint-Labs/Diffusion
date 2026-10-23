import { test, expect, type Page } from '@playwright/test';

const notebookKey = 'diffusion-next-exploration-v1';
async function openTrial(page: Page) {
    await page.goto('/next/explore?locale=zh');
    await expect(page.getByTestId('next-trial')).toBeVisible();
    await page.getByRole('button', { name: '填入一个示例', exact: true }).click();
}
async function liveConnection(page: Page) {
    await page.getByRole('button', { name: /思考连接/ }).click();
    await page.getByTestId('next-provider').selectOption('compatible');
    await page.getByTestId('next-model').fill('fixture-model');
    await page.getByTestId('next-base-url').fill('http://127.0.0.1:4173/model-fixture');
    await page.getByTestId('next-api-key').fill('fixture-only-key');
}
test('demo is explicit, stops, restores its checkpoint, and leaves the Field records alone', async ({ page }) => {
    const outbound: string[] = [];
    page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173')) outbound.push(request.url()); });
    await page.addInitScript(() => {
        if (!localStorage.getItem('next-field-sentinel')) {
            localStorage.setItem('diffusion-active-project', 'existing-field');
            localStorage.setItem('next-field-sentinel', 'present');
        }
    });
    await openTrial(page);
    await expect(page.getByTestId('next-mode')).toContainText('不调用模型');
    await page.getByTestId('next-run').click();
    await expect(page.getByTestId('next-status')).toContainText('本轮结束');
    await expect(page.getByTestId('next-note')).toHaveCount(2);
    await expect(page.getByTestId('next-note').first()).toContainText('模拟示例');
    const before = await page.evaluate(key => localStorage.getItem(key), notebookKey);
    await page.reload();
    await expect(page.getByTestId('next-note')).toHaveCount(2);
    expect(await page.evaluate(key => localStorage.getItem(key), notebookKey)).toBe(before);
    expect(await page.evaluate(() => localStorage.getItem('diffusion-active-project'))).toBe('existing-field');
    expect(outbound).toEqual([]);
});
test('source quotes are matched and remain labeled as simulations and user-supplied text', async ({ page }) => {
    await openTrial(page);
    await page.getByText('添加原文资料', { exact: true }).click();
    await page.getByLabel('资料名称', { exact: true }).fill('人工输入的示例材料');
    const body = '这段原文只用于演示引用匹配，不是关于校园交易的真实研究证据。';
    await page.getByLabel('原文内容，12–6000 字符').fill(body);
    await page.getByRole('button', { name: '添加资料', exact: true }).click();
    await page.getByTestId('next-step').click();
    await expect(page.getByTestId('next-note')).toHaveCount(1);
    await expect(page.locator('.next-quotation blockquote')).toHaveText(body);
    await expect(page.getByTestId('next-note')).toContainText('模拟示例');
    await expect(page.getByTestId('next-note')).toContainText('尚无法判断');
});
test('branches share only explicitly retained findings and flag changes to earlier premises', async ({ page }) => {
    await openTrial(page);
    await page.getByTestId('next-response').fill('只属于信任分支的独特限制：不讨论支付系统。');
    await page.getByRole('button', { name: '加入当前分支', exact: true }).click();
    await page.getByRole('button', { name: '添加分支', exact: true }).click();
    await page.getByTestId('next-branch-name').fill('成本');
    await page.getByTestId('next-question').fill('如何限制开发成本？');
    await page.getByText('查看下一步实际能看到的内容', { exact: true }).click();
    await expect(page.getByTestId('next-context')).not.toContainText('不讨论支付系统');
    await page.getByRole('button', { name: '交易信任', exact: true }).click();
    await page.getByRole('button', { name: '共享给其他分支', exact: true }).click();
    await page.getByRole('button', { name: '成本', exact: true }).click();
    await expect(page.getByTestId('next-context')).toContainText('不讨论支付系统');
    await page.getByTestId('next-priorities').fill('只考虑一个学院的小范围试点。');
    await expect(page.getByTestId('next-context')).toContainText('"needsReview": true');
    await page.getByRole('button', { name: '交易信任', exact: true }).click();
    await expect(page.getByTestId('next-note')).toContainText('问题或优先级已改变');
});
test('live transport fixture sees the latest finding and stops at a real decision boundary; exports omit keys', async ({ page }) => {
    const contexts: { branch: { recent: { text: string }[] }; overview: { priorities: string } }[] = [];
    await page.route('**/model-fixture/chat/completions', async route => {
        const body = route.request().postDataJSON(); contexts.push(JSON.parse(body.messages[1].content));
        const decision = contexts.length === 1
            ? { action: 'explore', reason: '缺少可以检验的假设', text: '建议先检验一个明确的信任假设。' }
            : { action: 'ask-user', reason: '需要区分试点范围', text: '你希望先在哪个学院试点？' };
        await route.fulfill({ json: { model: 'fixture-model', choices: [{ message: { content: JSON.stringify(decision) }, finish_reason: 'stop' }] } });
    });
    await openTrial(page); await liveConnection(page);
    await page.getByTestId('next-run').click();
    await expect(page.getByTestId('next-status')).toContainText('等待你的补充');
    expect(contexts).toHaveLength(2);
    expect(contexts[1].branch.recent[0].text).toBe('建议先检验一个明确的信任假设。');
    expect(contexts[1].overview.priorities).toContain('开发成本');
    await expect(page.getByTestId('next-note').first()).toContainText('AI 候选');
    const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: '导出试用记录', exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('diffusion-next-notebook.json');
    const stream = await download.createReadStream(); let content = ''; for await (const chunk of stream!) content += chunk.toString();
    expect(content).not.toContain('fixture-only-key'); expect(content).not.toContain('model-fixture');
    expect(content).toContain('建议先检验');
});
test('a mismatched model quotation is rejected rather than displayed', async ({ page }) => {
    await page.route('**/model-fixture/chat/completions', route => route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ action: 'assess-source', reason: '假引用测试', text: '这条不应显示', sourceId: 'invented-id', quote: '这是凭空编造的引文，不能被当成证据。', outcome: 'support' }) }, finish_reason: 'stop' }] } }));
    await openTrial(page); await liveConnection(page); await page.getByTestId('next-step').click();
    await expect(page.getByRole('alert')).toContainText('引用未能匹配');
    await expect(page.getByTestId('next-note')).toHaveCount(0);
});
test('pause and reload never resume a request automatically', async ({ page }) => {
    await openTrial(page); await page.getByTestId('next-run').click();
    await expect(page.getByTestId('next-status')).toContainText('正在探索');
    await page.getByRole('button', { name: '立即暂停', exact: true }).click();
    await expect(page.getByTestId('next-status')).toContainText('已暂停');
    const checkpoint = await page.evaluate(key => localStorage.getItem(key), notebookKey);
    await page.reload();
    await expect(page.getByTestId('next-status')).toContainText('已暂停');
    expect(await page.evaluate(key => localStorage.getItem(key), notebookKey)).toBe(checkpoint);
    await expect(page.getByTestId('next-note')).toHaveCount(0);
});
test('invalid stored data remains available for recovery without silent replacement', async ({ page }) => {
    await page.addInitScript(key => localStorage.setItem(key, '{not valid json'), notebookKey);
    await page.goto('/next/explore?locale=zh');
    await expect(page.getByRole('heading', { name: '试用记录暂时无法恢复' })).toBeVisible();
    expect(await page.evaluate(key => localStorage.getItem(key), notebookKey)).toBe('{not valid json');
    await expect(page.getByRole('button', { name: '下载恢复副本' })).toBeVisible();
});
test('narrow dark and reduced-motion layouts remain readable and scrollable', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await openTrial(page);
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByTestId('next-step').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('next-step')).toBeInViewport();
    expect(await page.locator('.next-trial').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.getByTestId('next-step').click(); await expect(page.getByTestId('next-note')).toHaveCount(1);
    await page.screenshot({ path: 'verification/next-mobile-dark.png', fullPage: true });
    expect(errors).toEqual([]);
});
