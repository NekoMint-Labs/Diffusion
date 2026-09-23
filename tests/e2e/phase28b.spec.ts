import { test, expect, type Page } from '@playwright/test';
import { choose, openSection } from './selects.ts';

/** Phase 2.8B: Settings is four product questions, and the two capability sections tell the truth
 * about what they can do *before* anything is attempted.
 *
 * The previous five-section layout buried discovery inside AI, so a missing key, a missing provider
 * and a missing search source looked the same. AI ("who helps it think?") and Search & Evidence
 * ("where may it look?") are independent capabilities and now independent sections. The audit's
 * P1-5 was a discovery toggle that looked available and then failed on first use; these tests hold
 * the answer in the UI — the Search section knows whether a source is configured before a single
 * search runs, and the AI section never claims "Ready" until a real request has answered.
 *
 * The retired Thinking, Shortcuts and About sections are gone: thinking runs use fixed product
 * defaults with their own per-run controls, the shortcut reference is its own surface, and the
 * About facts moved into Help. General, Appearance, AI and Search & Evidence are the four that remain.
 */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
    errors.set(page, []);
    page.on('pageerror', error => errors.get(page)?.push(error.message));
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

const settings = (page: Page) => page.getByRole('dialog', { name: 'Field settings' });
async function openSettings(page: Page) {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    await expect(settings(page)).toBeVisible();
}

test('Settings is four sections, named and ordered, each reachable as its own panel', async ({ page }) => {
    await openSettings(page);
    const nav = settings(page).locator('.settings-nav button');
    // Exactly four, in the order a person asks the questions, each carrying the value its panel uses.
    await expect(nav).toHaveCount(4);
    expect(await nav.evaluateAll(buttons => buttons.map(button => button.getAttribute('data-section'))))
        .toEqual(['general', 'appearance', 'ai', 'search']);
    expect(await nav.allTextContents())
        .toEqual(['General', 'Appearance', 'AI', 'Search & Evidence']);
    // Every section is a real panel behind its own tab, not merely a name in the nav.
    for (const section of ['general', 'appearance', 'ai', 'search']) {
        await openSection(page, section);
        await expect(settings(page).locator(`#setting-${section}`)).toBeVisible();
    }
});

test('Search & Evidence is reachable and states its capability before any search is attempted', async ({ page }) => {
    await openSettings(page);
    await openSection(page, 'search');
    const search = settings(page).locator('#setting-search');
    await expect(search).toContainText('Search & Evidence');
    // Looking outside the Field is opt-in and off by default, and the status says exactly that.
    await expect(search.getByTestId('external-exploration')).not.toBeChecked();
    const status = search.getByTestId('discovery-status');
    await expect(status).toHaveAttribute('data-tone', 'unconfigured');
    await expect(status).toContainText('Off');
    await expect(status).toContainText('Nothing outside this Field will be searched');
    // With nothing to look outside the Field, there is nothing to configure: no source is offered.
    await expect(search.getByTestId('source-exa')).toHaveCount(0);
});

test('turning external exploration on with no source is a known limited state, not a first-use failure', async ({ page }) => {
    let apiRequests = 0;
    page.on('request', request => { if (request.url().includes('/api/')) apiRequests++; });
    await openSettings(page);
    await openSection(page, 'search');
    const search = settings(page).locator('#setting-search');
    await search.getByTestId('external-exploration').check();
    await expect(search.getByTestId('external-exploration')).toBeChecked();
    // The capability is described the moment the switch is on — before any search is attempted, and
    // the empty choice is stated rather than left to fail later (the audit's P1-5).
    const status = search.getByTestId('discovery-status');
    await expect(status).toHaveAttribute('data-tone', 'limited');
    await expect(status).toContainText('No search source configured');
    await expect(search.getByTestId('discovery-empty')).toBeVisible();
    await expect(search.getByTestId('discovery-empty')).toContainText('Choose at least one source');
    // Knowing the answer cost nothing: no search request left the browser.
    expect(apiRequests).toBe(0);
});

test('enabling a source reveals its key field and says the key is still missing', async ({ page }) => {
    await openSettings(page);
    await openSection(page, 'search');
    const search = settings(page).locator('#setting-search');
    await search.getByTestId('external-exploration').check();
    await expect(search.getByTestId('source-exa')).toBeVisible();
    // A source that is off has no key field; turning it on is what asks for the credential.
    await expect(search.getByTestId('source-key-exa')).toHaveCount(0);
    await search.getByTestId('source-exa').check();
    await expect(search.getByTestId('source-key-exa')).toBeVisible();
    // A chosen source is not a ready source, and the note says which is which — in the singular,
    // because exactly one source was enabled: a count-1 line reading "1 enabled sources" was the
    // string this assertion used to accept by substring.
    await expect(search.getByTestId('discovery-missing-key')).toHaveText('1 enabled source still needs a key.');
    await expect(search.getByTestId('discovery-empty')).toHaveCount(0);
});

test('a direct provider is honest about not being verified, and typing reaches no network', async ({ page }) => {
    const providerRequests: string[] = [];
    page.on('request', request => { if (request.url().includes('api.openai.com')) providerRequests.push(request.url()); });
    await openSettings(page);
    await openSection(page, 'ai');
    const ai = settings(page).locator('#setting-ai');
    await choose(page, 'provider-select', 'openai');
    // A real provider asks for a credential and a model. Its depth control is an output cap with no
    // reasoning meaning, so it lives behind Advanced (see friction.spec.ts for that contract).
    await expect(ai.getByTestId('provider-key')).toBeVisible();
    await expect(ai.getByTestId('model-input')).toBeVisible();
    await expect(ai.getByTestId('depth-select')).toHaveCount(0);
    await ai.getByTestId('ai-advanced').click();
    await expect(ai.getByTestId('depth-select')).toHaveCount(1);
    await ai.getByTestId('ai-advanced').click();
    const status = ai.getByTestId('ai-status');
    // Nothing has been verified yet, so nothing may be claimed: no "Ready", no "Connected".
    await expect(status).not.toHaveAttribute('data-tone', 'connected');
    await expect(status).not.toContainText('Ready');
    await expect(status).not.toContainText('Connected');
    // Typing a model id is editing, not asking: no request leaves, and the status stays honest.
    await ai.getByTestId('model-input').fill('gpt-4o-mini');
    await expect(ai.getByTestId('model-input')).toHaveValue('gpt-4o-mini');
    await expect(status).not.toHaveAttribute('data-tone', 'connected');
    await expect(status).not.toContainText('Ready');
    expect(providerRequests).toEqual([]);
});

test('only a deliberate Test connection moves the status, and it never invents readiness', async ({ page }) => {
    const providerRequests: string[] = [];
    page.on('request', request => { if (request.url().includes('api.openai.com')) providerRequests.push(request.url()); });
    // This suite has no key and no reachable provider, so an address that is not running stands in
    // for the missing network: the honest outcome of a test is a blocked or failed state.
    await page.route('http://127.0.0.1:1/**', route => route.abort());
    await openSettings(page);
    await openSection(page, 'ai');
    const ai = settings(page).locator('#setting-ai');
    const status = ai.getByTestId('ai-status');
    // A provider that needs only an address is asked for real. Before the press it is unverified;
    // an unreachable endpoint then becomes a failure the person can act on — the press is what moved
    // it, and it never turns into "Ready".
    await choose(page, 'provider-select', 'compatible');
    await ai.getByTestId('base-url').fill('http://127.0.0.1:1');
    await expect(ai.getByTestId('base-url')).toHaveValue('http://127.0.0.1:1');
    await ai.getByTestId('model-input').fill('local-model');
    await expect(status).toHaveAttribute('data-tone', 'limited');
    await expect(status).toContainText('Not yet verified');
    await ai.getByTestId('test-connection').click();
    await expect(status).toHaveAttribute('data-tone', 'error');
    await expect(status).toContainText('Failed');
    await expect(status).not.toContainText(/Ready|Connected/);
    // With a keyed provider and no key, the press cannot verify anything and sends nothing at all.
    await choose(page, 'provider-select', 'openai');
    await ai.getByTestId('test-connection').click();
    await expect(status).not.toHaveAttribute('data-tone', 'connected');
    await expect(status).not.toContainText(/Ready|Connected/);
    expect(providerRequests).toEqual([]);
});

test('the provider select offers every provider, in product order', async ({ page }) => {
    await openSettings(page);
    await openSection(page, 'ai');
    await page.getByTestId('provider-select').click();
    await expect(page.getByTestId('provider-select')).toHaveAttribute('aria-expanded', 'true');
    const offered = page.locator('.ui-select-item[data-value]:visible');
    await expect(offered).toHaveCount(8);
    expect(await offered.evaluateAll(items => items.map(item => item.getAttribute('data-value'))))
        .toEqual(['off', 'demo', 'openai', 'anthropic', 'gemini', 'deepseek', 'compatible', 'gateway']);
    await page.keyboard.press('Escape');
});
