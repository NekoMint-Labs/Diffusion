import { expect } from '@playwright/test';

export async function command(page, id) {
    await page.keyboard.press('Control+k');
    const option = page.getByTestId('command-palette').locator('[data-command="' + id + '"]');
    await option.scrollIntoViewIfNeeded();
    await option.click();
}

export async function selectProvider(page, provider) {
    await page.keyboard.press('Control+,');
    await page.locator('.settings-nav [data-section="ai"]').click();
    await page.getByTestId('provider-select').click();
    await page.locator('.ui-select-item[data-value="' + provider + '"]').click();
    await expect(page.getByTestId('provider-select')).toHaveAttribute('data-value', provider);
    await page.locator('.settings-surface .surface-close').click();
}

/** Run settings has no idle command. Seed its scope/count using AI Off, which
 * cannot issue a provider request; never spend a model call on a warmup. */
export async function primeSingleDiffuse(page, provider, requestCount) {
    const before = requestCount();
    await selectProvider(page, 'off');
    await page.locator('[data-thought-id="question"]').click();
    await page.getByTestId('scope-angle').click();
    await page.getByRole('group', { name: 'Result count', exact: true }).getByRole('button', { name: '1', exact: true }).click();
    await page.getByTestId('action-preview-run').click();
    await expect(page.locator('.diffuse-indicator')).toContainText('Stopped');
    if (requestCount() !== before) throw new Error('AI-Off priming unexpectedly sent a request');
    await selectProvider(page, provider);
    await page.locator('.diffuse-indicator').getByRole('button', { name: 'Details', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Run settings', exact: true });
    await expect(settings.getByTestId('diffuse-angles')).toHaveAttribute('data-value', '1');
    for (const label of ['Use Field sources', 'Use web search']) {
        await expect(settings.getByRole('checkbox', { name: new RegExp('^' + label) })).not.toBeChecked();
    }
    if (requestCount() !== before) throw new Error('Run-settings preparation unexpectedly sent a request');
    return { setup: 'AI-Off scope/count priming; no provider warmup', setupRequests: 0, configuredSteps: 1, fieldSources: false, web: false };
}

export async function runScenario(page, name, provider, requestCount) {
    if (name === 'diffuse') {
        const setup = await primeSingleDiffuse(page, provider, requestCount);
        await page.getByRole('dialog', { name: 'Run settings', exact: true }).getByRole('button', { name: 'Run', exact: true }).click();
        return setup;
    }
    await page.locator('[data-thought-id="question"]').click();
    if (name === 'ask') {
        await command(page, 'ask');
        const input = page.getByTestId('speak').locator('textarea');
        const prompt = '在这些条件下，先做什么？请给我一个方向。';
        await input.fill(prompt); await input.press('Enter');
        return { explicitInput: prompt, configuredCandidates: 1, fieldSources: false, web: false };
    }
    await page.getByTestId(name === 'angle' ? 'scope-angle' : 'scope-continue').click();
    await page.getByRole('group', { name: 'Result count', exact: true }).getByRole('button', { name: '1', exact: true }).click();
    await page.getByTestId('action-preview-run').click();
    return { configuredCandidates: 1, ...(name === 'angle' ? { configuredSteps: 1 } : {}), fieldSources: false, web: false };
}

export async function openField(page, id) {
    await page.getByTestId('field-management').click();
    const entry = page.locator('.field-list-button[data-field="' + id + '"]');
    if (await entry.count()) await entry.click();
    else await page.getByRole('dialog', { name: 'Open Field', exact: true }).locator('.surface-close').click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('diffusion-active-project'))).toBe(id);
    await expect(page.getByTestId('field-title')).toHaveText('模型对照 · ' + id.replace('comparison-', ''));
    await expect(page.getByTestId('field')).toBeVisible();
}

export async function restoreExport(page, file) {
    const previousId = await page.evaluate(() => localStorage.getItem('diffusion-active-project'));
    await command(page, 'import');
    await page.getByRole('button', { name: 'Restore a project export...', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Choose project export', exact: true }).click();
    await (await chooser).setFiles(file);
    await page.getByRole('button', { name: 'Create restored project and enter it', exact: true }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('diffusion-active-project'))).not.toBe(previousId);
    await expect(page.getByTestId('field-title')).toContainText('(restored)');
    await expect(page.getByTestId('field')).toBeVisible();
    return page.evaluate(() => localStorage.getItem('diffusion-active-project'));
}
