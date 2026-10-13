import { test, expect } from '@playwright/test';
import { wordhippoSnippet } from '../fixtures/wordhippoSnippet.ts';

for (const [sentence, query] of [
    ['Do not answer "Ready?" with Yes without confirmation.', 'Yes'],
    ['不要把“你好吗？”翻译为 Hello；它是问句。', 'Hello'],
    ['Do not translate e.g. 你好 as goodbye; it means hello.', '你好'],
    ['Only if p < 0.05, translate 你好 as hello.', '你好'],
    ['不要参考版本 1.2 的错误示例把你好翻译成再见。', '你好'],
    ['Do not send reports to Prof. Smith without consent.', 'Smith'],
    ['Only send the request to Dept. Alpha after approval.', 'Alpha'],
]) test('search preview preserves the complete qualification: ' + sentence, async ({ page }) => {
    const raw = 'Navigation '.repeat(20) + sentence;
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'demo', discovery: { external: true, backend: 'custom', customUrl: 'https://snippet.example' } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.route('https://snippet.example/search', route => route.fulfill({ json: { candidates: [{ id: 'qualified', title: 'Qualified example', url: 'https://example.org/qualified', excerpt: raw, inspected: 'Snippet only' }] } }));
    await page.goto('/demo?locale=en');
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByRole('menuitem', { name: /^Check evidence/ }).click();
    await page.locator('#evidence-query').fill(query); await page.locator('#evidence-query').press('Enter');
    await expect(page.getByTestId('search-snippet-preview')).toContainText(sentence);
    // Conservative fallback already displays the complete, unmodified source;
    // only transformed/truncated excerpts need a separate original expander.
    await expect(page.getByTestId('search-snippet-preview')).toHaveText(raw);
    await expect(page.getByText('Show original search snippet', { exact: true })).toHaveCount(0);
    await expect(page.locator('[data-evidence-stage="candidate"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Assess against claim' })).toHaveCount(0);
});

test('reported collapsed table is readable in search and reading while assessment retains the original', async ({ page }, info) => {
    const raw = wordhippoSnippet;
    let assessments = 0;
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'compatible', baseUrl: 'http://127.0.0.1:11434/v1', model: 'fixture', discovery: { external: true, backend: 'custom', customUrl: 'https://snippet.example' } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.route('https://snippet.example/search', route => route.fulfill({ json: { candidates: [{ id: 'hello', title: 'Greeting dictionary', url: 'https://example.org/hello', excerpt: raw, inspected: 'Snippet only' }] } }));
    await page.route('https://snippet.example/fetch', route => route.fulfill({ json: { url: 'https://example.org/hello', title: 'Greeting dictionary', text: raw, inspected: 'Fetched source text' } }));
    await page.route('https://snippet.example/extract', route => route.fulfill({ json: { chunks: [{ text: raw, locator: 'Original table', inspected: 'Matched fetched text' }] } }));
    await page.route('http://127.0.0.1:11434/**', route => {
        assessments++;
        const wire = route.request().postDataJSON();
        const input = JSON.parse(wire.messages.findLast((message: { role: string }) => message.role === 'user').content);
        expect(input.passages[0].text).toBe(raw);
        return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ outcome: 'inconclusive', rationale: 'A vocabulary table alone cannot establish the claim.', passageIds: [input.passages[0].id] }) }, finish_reason: 'stop' }] } });
    });
    await page.goto('/demo?locale=en');
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByRole('menuitem', { name: /^Check evidence/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Look for evidence' });
    await dialog.getByRole('textbox', { name: 'What should be checked?' }).fill('你好');
    await dialog.getByRole('button', { name: 'Search the web' }).click();
    const snippet = dialog.getByTestId('search-snippet-preview');
    await expect(snippet).toContainText('hello to you too');
    await expect(snippet).not.toContainText('|');
    await expect(snippet).not.toContainText('Amazon');
    await expect(dialog.locator('[data-evidence-stage="candidate"]')).toHaveCount(1);
    await dialog.getByText('Show original search snippet', { exact: true }).click();
    await expect(dialog.locator('.search-snippet-original p')).toHaveText(raw);
    await dialog.getByRole('button', { name: 'Read source', exact: true }).click();
    await expect(dialog.locator('[data-evidence-stage="read"]')).toHaveCount(1);
    await expect(dialog.locator('.source-excerpt')).toContainText('bonjour');
    await expect(dialog.locator('.source-excerpt')).not.toContainText('See Also');
    await expect(dialog.locator('.source-excerpt')).not.toContainText('|');
    await page.screenshot({ path: info.outputPath('wordhippo-read-preview.png') });
    await dialog.getByText('Show original read passage', { exact: true }).click();
    await expect(dialog.locator('.search-snippet-original p')).toHaveText(raw);
    expect(assessments).toBe(0);
    await dialog.getByRole('button', { name: 'Assess against claim' }).click();
    await expect(dialog.locator('[data-evidence-stage="judged"]')).toBeVisible();
    expect(assessments).toBe(1);
});

test('the reported dictionary snippet previews the definition and keeps the original noise expandable', async ({ page }, info) => {
    const raw = 'Skip to content Mandarin Temple Beta Come for Knowledge. Stay for Wisdom. Start your Chinese Learning JourneyStart Now 你好 — pronunciations, definitions, and tags | Hanzi | Pinyin | English | Tags | | 你好 | nǐhǎo | hello; hi | HSK 1, l, Easy | nǐhǎo(ni3hao3) T3 1. 1hello; hi Listen to the audio pronunciation 3 times to gain XP May 27, 2026 # 你好nǐhǎo(ni3hao3) 你好 (nǐhǎo) is a common greeting in Mandarin that means \'hello.\' It is used in both formal and informal contexts to acknowledge someone\'s presence.';
    await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo', discovery: { external: true, backend: 'custom', customUrl: 'https://snippet.example' } })));
    await page.route('https://snippet.example/search', route => route.fulfill({ json: { candidates: [{ id: 'hello', title: '你好 (nǐhǎo)', url: 'https://example.org/hello', excerpt: raw, inspected: 'Snippet only' }] } }));
    await page.goto('/demo?locale=zh');
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="verify"]').click();
    await page.locator('#evidence-query').fill('你好');
    await page.locator('#evidence-query').press('Enter');
    const preview = page.getByTestId('search-snippet-preview');
    await expect(preview).toContainText('你好 (nǐhǎo) is a common greeting');
    await expect(preview).not.toContainText('gain XP');
    await expect(preview).not.toContainText('pronunciations, definitions');
    await page.screenshot({ path: info.outputPath('reported-dictionary-preview.png') });
    await page.locator('.search-snippet-original summary').click();
    await expect(page.locator('.search-snippet-original p')).toHaveText(raw);
    await expect(page.locator('[data-evidence-stage="candidate"]')).toHaveCount(1);
});

test('a noisy Chinese snippet is bounded, expandable and remains unread', async ({ page }, testInfo) => {
    const raw = 'Skip to content Mandarin Temple Beta Come for Knowledge. Stay for Wisdom. Start your Chinese Learning Journey. '.repeat(2) + '你好 — pronunciations | Hanzi | Pinyin | English | 你好 | nǐhǎo | hello; hi | ' + '## Frequently Asked Questions 关于你好。'.repeat(100) + '原始摘要末尾';
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'demo', discovery: { external: true, backend: 'custom', customUrl: 'https://snippet.example' } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.route('https://snippet.example/search', route => route.fulfill({ json: { candidates: [{ id: 'hello', title: '你好 (nǐhǎo) Meaning: hello; hi', url: 'https://example.org/hello', excerpt: raw, inspected: 'Snippet only' }] } }));
    await page.goto('/demo?locale=en');
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByRole('menuitem', { name: /^Check evidence/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Look for evidence' });
    await dialog.getByRole('textbox', { name: 'What should be checked?' }).fill('你好');
    await dialog.getByRole('button', { name: 'Search the web' }).click();
    const preview = dialog.getByTestId('search-snippet-preview');
    await expect(preview).toContainText('你好');
    await expect(preview).toContainText('nǐhǎo');
    expect((await preview.textContent())!.startsWith('Skip to content')).toBe(false);
    // Internal wording is retained when period boundaries are ambiguous, even if noisy.
    await expect(preview).toContainText('Journey. Skip to content Mandarin Temple');
    await expect(preview).not.toContainText('##');
    expect(Array.from((await preview.textContent())!).length).toBeLessThanOrEqual(362);
    const original = dialog.locator('.search-snippet-original p');
    await expect(original).toBeHidden();
    await expect(dialog).toContainText('Discovery snippet, not read evidence');
    await expect(dialog.getByRole('button', { name: 'Read source', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Assess against claim' })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('bounded-chinese-snippet.png') });
    await dialog.getByText('Show original search snippet', { exact: true }).click();
    await expect(original).toHaveText(raw);
    expect((await original.boundingBox())!.height).toBeLessThanOrEqual(241);
    await dialog.getByText('Show original search snippet', { exact: true }).click();
    await expect(original).toBeHidden();
});
