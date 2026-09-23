import { test, expect, type Page } from '@playwright/test';
import { choose, openSection } from './selects.ts';

/** The friction pass: the AI configuration surface, walked as a person walks it.
 *
 * Every contract here is a defect that was found by attempting real tasks rather than by reading
 * components. In order:
 *
 *  - a saved key used to be written into a throwaway session store, so nothing was stored and
 *    nothing failed;
 *  - a failed `Refresh models` used to be an unhandled rejection with an unchanged status, and a
 *    successful fetch used to *replace* manual entry with a menu, so an unlisted model id became
 *    harder to enter than a listed one;
 *  - a list fetched from one endpoint used to be offered for the next provider;
 *  - `Test connection` used to report on a configuration that was not on screen (a typed key was
 *    committed by blur, racing the press);
 *  - the protocol override and the output cap used to sit in the normal path, one of them as a
 *    native `<select>`, which is a system popup inside WebView2.
 *
 * None of these assert pixels. They assert what the person can see, type and keep.
 */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
    errors.set(page, []);
    page.on('pageerror', error => errors.get(page)?.push(error.message));
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

/** An endpoint that answers a model list, and one that is not running at all. */
const LISTING = { object: 'list', data: [{ id: 'llama3.1' }, { id: 'qwen2.5' }] };
async function endpoints(page: Page) {
    await page.route('http://127.0.0.1:11434/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LISTING) }));
    await page.route('http://127.0.0.1:1/**', route => route.abort());
}
async function openAI(page: Page) {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toBeVisible();
    await openSection(page, 'ai');
    return page.getByRole('dialog', { name: 'Field settings' }).locator('#setting-ai');
}
const stored = (page: Page, key: string) => page.evaluate(name => JSON.parse(localStorage.getItem('diffusion-settings') ?? '{}')[name], key);

test('a typed model id survives a failed model fetch, and the failure is stated', async ({ page }) => {
    await endpoints(page);
    const ai = await openAI(page);
    await choose(page, 'provider-select', 'compatible');
    await ai.getByTestId('base-url').fill('http://127.0.0.1:1/v1');
    await ai.getByTestId('model-input').fill('a-model-nobody-listed');
    await ai.getByTestId('refresh-models').click();
    // What failed, in the product's own words — not the raw status, not the endpoint's body.
    await expect(ai.getByTestId('model-summary')).toHaveText('No model list could be read from this endpoint. You can still type the model id your provider gave you.');
    // What the person can still do, and it is what they were already doing.
    await expect(ai.getByTestId('model-input')).toHaveValue('a-model-nobody-listed');
    await expect(ai.getByTestId('model-input')).toBeEnabled();
});

test('fetched models are suggestions: an unlisted id is still the model that is used', async ({ page }) => {
    await endpoints(page);
    const ai = await openAI(page);
    await choose(page, 'provider-select', 'compatible');
    await ai.getByTestId('base-url').fill('http://127.0.0.1:11434/v1');
    await ai.getByTestId('refresh-models').click();
    await expect(ai.getByTestId('model-summary')).toContainText('This provider offers 2 models');
    // The list is offered by the field itself, so the field never has to be replaced by a menu.
    await ai.getByTestId('model-input').click();
    await expect(page.locator('.ui-select-popup .ui-select-item[data-value="llama3.1"]:visible')).toBeVisible();
    await page.keyboard.press('Escape');
    // A model outside the list is kept as typed and persisted as the choice.
    await ai.getByTestId('model-input').fill('my-own-model-name');
    await expect(ai.getByTestId('model-input')).toHaveValue('my-own-model-name');
    await expect.poll(() => stored(page, 'model')).toBe('my-own-model-name');
});

test('one endpoint\'s model list is never offered for another provider', async ({ page }) => {
    await endpoints(page);
    const ai = await openAI(page);
    await choose(page, 'provider-select', 'compatible');
    await ai.getByTestId('base-url').fill('http://127.0.0.1:11434/v1');
    await ai.getByTestId('refresh-models').click();
    await expect(ai.getByTestId('model-summary')).toContainText('This provider offers 2 models');
    // A different provider has said nothing about its models, so nothing may be claimed for it.
    await choose(page, 'provider-select', 'openai');
    await expect(ai.getByTestId('model-summary')).toContainText('No model list has been fetched');
    await ai.getByTestId('model-input').click();
    await expect(page.locator('.ui-select-popup .ui-select-item[data-value="llama3.1"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
});

test('Test connection commits the key that is on screen, and reports on it', async ({ page }) => {
    await endpoints(page);
    const ai = await openAI(page);
    await choose(page, 'provider-select', 'openai');
    await ai.getByTestId('model-input').fill('gpt-4o-mini');
    // Before any key: the state says exactly what is missing.
    await expect(ai.getByTestId('ai-status')).toContainText('Add an API key.');
    // A key that is only in the field is not stored by blur — its own control is the one moment.
    await ai.getByTestId('provider-key').fill('sk-a-realistic-length-key');
    await expect(ai.getByTestId('ai-status')).toContainText('Save the key to use it.');
    await ai.getByTestId('test-connection').click();
    // The press stored it and then verified with it: the key is no longer a draft, and the status
    // is no longer asking for one.
    await expect(ai.getByTestId('provider-key-remove')).toBeVisible();
    await expect(ai.getByTestId('provider-key')).toHaveValue('');
    await expect(ai.getByTestId('ai-status')).not.toContainText('Add an API key.');
    await expect(ai.getByTestId('ai-status')).toHaveAttribute('data-tone', 'error');
    // The secret itself is nowhere in the settings record.
    expect(JSON.stringify(await page.evaluate(() => localStorage.getItem('diffusion-settings')))).not.toContain('sk-a-realistic-length-key');
});

test('the protocol override and the output cap are advanced, not the normal path', async ({ page }) => {
    const ai = await openAI(page);
    await choose(page, 'provider-select', 'compatible');
    // The normal path is address, key, model, test: nothing about protocols and nothing about how
    // many tokens a provider may write.
    await expect(ai.getByTestId('protocol-select')).toHaveCount(0);
    await expect(ai.getByTestId('depth-select')).toHaveCount(0);
    await expect(ai.getByTestId('ai-advanced')).toBeVisible();
    // The product has exactly one Select and no native `<select>`: a system popup inside WebView2
    // is not part of this control system.
    await expect(ai.locator('select')).toHaveCount(0);
    await ai.getByTestId('ai-advanced').click();
    await expect(ai.getByTestId('protocol-select')).toBeVisible();
    await expect(ai.getByTestId('depth-select')).toHaveCount(1);
    await choose(page, 'protocol-select', 'responses');
    await expect.poll(() => stored(page, 'protocol')).toBe('responses');
});

test('a provider that really reasons keeps its control; one that does not keeps it advanced', async ({ page }) => {
    const ai = await openAI(page);
    // Anthropic exposes a reasoning control, so the depth control belongs where it means something.
    await choose(page, 'provider-select', 'anthropic');
    await expect(ai.getByTestId('depth-select')).toHaveCount(1);
    await expect(ai.getByTestId('depth-note')).toContainText('exposes a reasoning control');
    await expect(ai.getByTestId('ai-advanced')).toHaveCount(0);
    // OpenAI has none, so the same control is an output cap and lives behind Advanced.
    await choose(page, 'provider-select', 'openai');
    await expect(ai.getByTestId('depth-select')).toHaveCount(0);
    await ai.getByTestId('ai-advanced').click();
    await expect(ai.getByTestId('depth-select')).toHaveCount(1);
    await expect(ai.getByTestId('depth-note')).toContainText('no reasoning control');
});

test('the first thought of a Field with no provider says what did not happen', async ({ page }) => {
    // A brand-new Field: the sentence becomes Field content either way, and the person is told that
    // no model was involved rather than left to assume one answered the button that says "Think".
    await page.goto('/?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.getByTestId('speak').click({ position: { x: 5, y: 5 } });
    await page.keyboard.type('The first thought.');
    await page.keyboard.press('Enter');
    const action = page.getByTestId('notice-action');
    await expect(action).toHaveText('Open AI settings');
    await expect(page.locator('.notice').first()).toContainText('AI is off');
    await action.click();
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toBeVisible();
    await expect(page.locator('#setting-ai')).toBeVisible();
});

test('an unsent question with AI off is kept, and answered with the control that turns it on', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.getByTestId('speak').click({ position: { x: 5, y: 5 } });
    await page.keyboard.type('A question that needs a provider.');
    await page.keyboard.press('Enter');
    const action = page.getByTestId('notice-action');
    await expect(action).toHaveText('Open AI settings');
    // The words were not thrown away, and the control leads to the section that fixes the cause.
    await expect(page.getByTestId('speak').locator('textarea')).toHaveValue('A question that needs a provider.');
    await action.click();
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toBeVisible();
    await expect(page.locator('#setting-ai')).toBeVisible();
});

test('a provider failure arrives in the product\'s words, with the control that resolves it', async ({ page }) => {
    // The endpoint answers, and refuses: the realistic "wrong key" case. What the person must see is
    // a sentence and the way back into Settings — never `authentication-failed`, which is the
    // internal token and used to be the entire message.
    await page.route('http://127.0.0.1:11434/**', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { type: 'authentication_error' } }) }));
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toBeVisible();
    await openSection(page, 'ai');
    const ai = page.getByRole('dialog', { name: 'Field settings' }).locator('#setting-ai');
    await choose(page, 'provider-select', 'compatible');
    await ai.getByTestId('base-url').fill('http://127.0.0.1:11434/v1');
    await ai.getByTestId('model-input').fill('a-model');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toHaveCount(0);
    await page.getByTestId('speak').click({ position: { x: 5, y: 5 } });
    await page.keyboard.type('What does this actually claim?');
    await page.keyboard.press('Enter');
    const notice = page.locator('.notice');
    await expect(notice).toContainText('Authentication failed. Check the API key for OpenAI compatible.');
    await expect(notice).not.toContainText('authentication-failed');
    // The words are not lost: the composer now clears at once and the person's own sentence lands as
    // canonical Field content even when the model refused. The remedy opens the section that owns
    // the cause.
    await expect(page.locator('article.thought:not(.ghost)').filter({ hasText: 'What does this actually claim?' })).toBeVisible();
    await page.getByTestId('notice-action').click();
    await expect(page.locator('#setting-ai')).toBeVisible();
});

test('Escape still dismisses the place while the model field has focus', async ({ page }) => {
    const ai = await openAI(page);
    await choose(page, 'provider-select', 'compatible');
    await ai.getByTestId('base-url').fill('http://127.0.0.1:11434/v1');
    await ai.getByTestId('model-input').fill('a-model');
    // One press, one owner: with the suggestion list closed, the key belongs to the surface.
    await page.getByTestId('model-input').focus();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toHaveCount(0);
    // The typed model survived, and the Field is back in front of the person.
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    await expect(page.locator('#setting-ai')).toBeVisible();
    await expect(page.getByTestId('model-input')).toHaveValue('a-model');
});

test('Escape closes the suggestion list first, and the place only on a second press', async ({ page }) => {
    await endpoints(page);
    const ai = await openAI(page);
    await choose(page, 'provider-select', 'compatible');
    await ai.getByTestId('base-url').fill('http://127.0.0.1:11434/v1');
    await ai.getByTestId('refresh-models').click();
    await expect(ai.getByTestId('model-summary')).toContainText('This provider offers 2 models');
    await ai.getByTestId('model-input').click();
    await expect(page.locator('.ui-select-popup .ui-select-item[data-value="llama3.1"]:visible')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.ui-select-popup .ui-select-item[data-value="llama3.1"]:visible')).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toHaveCount(0);
});

test('a search source key is committed and removed by its own controls, never by blur', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toBeVisible();
    await openSection(page, 'search');
    const search = page.getByRole('dialog', { name: 'Field settings' }).locator('#setting-search');
    await search.getByTestId('external-exploration').check();
    await search.getByTestId('source-exa').check();
    const key = search.getByTestId('source-key-exa');
    // Nothing is stored until the save control is pressed.
    await key.fill('exa-key-0123456789');
    await expect(search.getByTestId('source-key-remove-exa')).toHaveCount(0);
    await search.getByTestId('source-key-save-exa').click();
    await expect(search.getByTestId('source-key-remove-exa')).toBeVisible();
    await expect(key).toHaveValue('');
    // Focus and leave again without typing: the credential used to be *forgotten* here, because an
    // empty field next to a stored key is exactly what blur saw.
    await key.focus();
    await key.blur();
    await expect(search.getByTestId('source-key-remove-exa')).toBeVisible();
    await expect(search.getByTestId('discovery-missing-key')).toHaveCount(0);
    // Only the explicit control removes it.
    await search.getByTestId('source-key-remove-exa').click();
    await expect(search.getByTestId('source-key-save-exa')).toBeVisible();
    await expect(search.getByTestId('discovery-missing-key')).toHaveText('1 enabled source still needs a key.');
});

test('an unusable custom discovery address is never reported as available', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toBeVisible();
    await openSection(page, 'search');
    const search = page.getByRole('dialog', { name: 'Field settings' }).locator('#setting-search');
    await search.getByTestId('external-exploration').check();
    await search.getByTestId('source-exa').check();
    await search.getByTestId('discovery-advanced').click();
    await choose(page, 'discovery-backend', 'custom');
    // A remote endpoint that cannot be reached is one thing; an address that is not a usable
    // endpoint at all is another, and it must not read as a ready engine.
    await search.getByTestId('discovery-url').fill('not a url');
    await search.getByTestId('discovery-url').blur();
    // An address that is not an endpoint at all is named as such — never as a missing engine and
    // never as an available one.
    await expect(search.getByTestId('discovery-status')).toContainText('The discovery address is not usable');
    await search.getByTestId('discovery-url').fill('https://search.example.org/normalized');
    await search.getByTestId('discovery-url').blur();
    // A usable address with a source that holds no key still cannot search, and says so.
    await expect(search.getByTestId('discovery-status')).toContainText('A key is still needed');
    await expect(search.getByTestId('discovery-status')).not.toContainText('Available');
    // The whole path: address, source, key, and only then "Available".
    await search.getByTestId('source-key-exa').fill('exa-key-0123456789');
    await search.getByTestId('source-key-save-exa').click();
    await expect(search.getByTestId('discovery-status')).toContainText('Available');
});

test('Settings contains no native select at all', async ({ page }) => {
    // A system popup inside WebView2 is not part of this control system: one Select, one Combobox,
    // and nothing that opens the platform's own menu.
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    const dialog = page.getByRole('dialog', { name: 'Field settings' });
    for (const section of ['general', 'appearance', 'ai', 'search']) {
        await openSection(page, section);
        await expect(dialog.locator('select')).toHaveCount(0);
    }
    await openSection(page, 'search');
    await page.getByTestId('external-exploration').check();
    await page.getByTestId('source-exa').check();
    await page.getByTestId('discovery-advanced').click();
    await expect(dialog.locator('select')).toHaveCount(0);
    await openSection(page, 'ai');
    await choose(page, 'provider-select', 'compatible');
    await page.getByTestId('ai-advanced').click();
    await expect(dialog.locator('select')).toHaveCount(0);
});

