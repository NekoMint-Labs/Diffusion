import { test, expect, type Page } from '@playwright/test';
import { choose, openSection } from './selects.ts';

async function boot(page: Page, native = false, initialPresenceFailure = false) {
    await page.addInitScript(({ native, initialPresenceFailure }) => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'deepseek' }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        if (!native) return;
        const fixture = { present: {} as Record<string, boolean>, failWrite: false, failPresence: initialPresenceFailure, requests: 0 };
        Object.assign(window, { credentialFixture: fixture, __TAURI_INTERNALS__: { invoke: async (command: string, args: { id: string }) => {
            if (command === 'credential_has') {
                if (fixture.failPresence) throw new Error('Fixture presence unavailable');
                return fixture.present[args.id] === true;
            }
            if (command === 'credential_set' || command === 'credential_delete') {
                if (fixture.failWrite) throw new Error('Fixture write refused');
                fixture.present[args.id] = command === 'credential_set';
            }
            if (command === 'native_ai_request') fixture.requests++;
            return false;
        } } });
    }, { native, initialPresenceFailure });
    await page.goto('/?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+,');
    await openSection(page, 'ai');
}

async function failures(page: Page, flags: { failPresence?: boolean; failWrite?: boolean }) {
    await page.evaluate(flags => Object.assign((window as any).credentialFixture, flags), flags);
}

test('browser AI and search keys save and remove after further asset requests fail', async ({ page }) => {
    await boot(page);
    let assetRequests = 0;
    await page.route('**/assets/*.js', route => { assetRequests++; return route.abort('failed'); });
    await page.getByTestId('provider-key').fill('fixture-key-never-real');
    await page.getByTestId('provider-key-save').click();
    await expect(page.getByTestId('provider-key-remove')).toBeVisible();
    await expect(page.getByTestId('provider-key-error')).toHaveCount(0);
    await page.getByTestId('provider-key-remove').click();
    await expect(page.getByTestId('provider-key-save')).toBeVisible();
    await openSection(page, 'search');
    await page.getByTestId('external-exploration').check();
    await choose(page, 'search-provider', 'exa');
    await page.getByTestId('source-key-exa').fill('fixture-search-never-real');
    await page.getByTestId('source-key-save-exa').click();
    await expect(page.getByTestId('source-key-remove-exa')).toBeVisible();
    await page.getByTestId('source-key-remove-exa').click();
    await expect(page.getByTestId('source-key-save-exa')).toBeVisible();
    await expect(page.getByTestId('discovery-key-error')).toHaveCount(0);
    expect(assetRequests).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem('diffusion-settings'))).not.toContain('fixture-key');
    expect(await page.evaluate(() => localStorage.getItem('diffusion-settings'))).not.toContain('fixture-search');
});

test('native write refusal retains the draft and prevents an AI request', async ({ page }) => {
    await boot(page, true);
    await failures(page, { failWrite: true });
    await page.getByTestId('provider-key').fill('fixture-key-never-real');
    await page.getByTestId('test-connection').click();
    await expect(page.getByTestId('provider-key-error')).toHaveText('The credential store refused the change.');
    await expect(page.getByTestId('provider-key')).toHaveValue('fixture-key-never-real');
    expect(await page.evaluate(() => (window as any).credentialFixture.requests)).toBe(0);
});

test('native credential presence can recover after startup fails', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await boot(page, true, true);
    await page.getByTestId('provider-key').fill('fixture-key-never-real');
    await page.getByTestId('provider-key-save').click();
    await expect(page.getByTestId('provider-key-error')).toContainText('The key was saved, but its status could not refresh.');
    await failures(page, { failPresence: false });
    await page.getByTestId('provider-key-refresh').click();
    await expect(page.getByTestId('provider-key-error')).toHaveCount(0);
    await expect(page.getByTestId('provider-key-remove')).toBeVisible();
    expect(errors).toEqual([]);
});

for (const section of ['ai', 'search'] as const) {
    test(`a successful ${section} write is not reported as refused when presence refresh fails`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await boot(page, true);
        if (section === 'search') {
            await openSection(page, 'search');
            await page.getByTestId('external-exploration').check();
            await choose(page, 'search-provider', 'exa');
        }
        const prefix = section === 'ai' ? 'provider-key' : 'source-key-exa';
        const error = page.getByTestId(section === 'ai' ? 'provider-key-error' : 'discovery-key-error');
        await failures(page, { failPresence: true });
        await page.getByTestId(prefix).fill('fixture-key-never-real');
        await page.getByTestId(section === 'ai' ? 'provider-key-save' : 'source-key-save-exa').click();
        await expect(error).toContainText('The key was saved, but its status could not refresh.');
        await expect(page.getByTestId(prefix)).toHaveValue('');
        expect(await page.evaluate(section => (window as any).credentialFixture.present[section === 'ai' ? 'ai.deepseek' : 'search.exa'], section)).toBe(true);
        expect(errors).toEqual([]);
        await failures(page, { failPresence: false });
        await page.getByTestId(section === 'ai' ? 'provider-key-refresh' : 'source-key-refresh').click();
        await expect(error).toHaveCount(0);
        await expect(page.getByTestId(section === 'ai' ? 'provider-key-remove' : 'source-key-remove-exa')).toBeVisible();
        await failures(page, { failPresence: true });
        await page.getByTestId(section === 'ai' ? 'provider-key-remove' : 'source-key-remove-exa').click();
        await expect(error).toContainText('The key was removed, but its status could not refresh.');
        expect(await page.evaluate(section => (window as any).credentialFixture.present[section === 'ai' ? 'ai.deepseek' : 'search.exa'], section)).toBe(false);
        await failures(page, { failPresence: false });
        await page.getByTestId(section === 'ai' ? 'provider-key-refresh' : 'source-key-refresh').click();
        await expect(error).toHaveCount(0);
        await expect(page.getByTestId(section === 'ai' ? 'provider-key-save' : 'source-key-save-exa')).toBeVisible();
        expect(errors).toEqual([]);
    });
}

test('a missing native credential module reports readiness rather than storage refusal', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/assets/native-*.js', route => route.abort('failed'));
    await boot(page, true);
    await page.getByTestId('provider-key').fill('fixture-key-never-real');
    await page.getByTestId('test-connection').click();
    await expect(page.getByTestId('provider-key-error')).toHaveText('The credential service could not load. Reload the app and try again.');
    await expect(page.getByTestId('provider-key')).toHaveValue('fixture-key-never-real');
    expect(await page.evaluate(() => (window as any).credentialFixture.requests)).toBe(0);
    expect(errors).toEqual([]);
});
