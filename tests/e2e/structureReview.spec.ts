import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';

async function state(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => { const db = opening.result;
            const read = db.transaction('projects').objectStore('projects').get('main');
            read.onsuccess = () => { db.close(); resolve(read.result); };
            read.onerror = () => { db.close(); reject(read.error); };
        };
    }));
}
async function seedField(page: Page) {
    await page.goto('/?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    const project = createProject('main', 'Structure review regression');
    for (const [id, wording, x, y] of [
        ['attention', 'A position-deviation metric could help compare repeated observations.', 180, 180],
        ['structure', 'Does the metric compare overall movement or local variation?', 630, 180],
        ['quiet', 'Could movement of the equipment affect this interpretation?', 400, 500],
    ] as const) project.thoughts[id] = makeThought(wording, { x, y }, 1, id);
    await page.evaluate(project => new Promise<void>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => { const db = opening.result, tx = db.transaction('projects', 'readwrite');
            tx.objectStore('projects').put(project);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        };
    }), project);
    await page.reload();
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
}
const proposedRelations = [
    { a: 'attention', b: 'structure', kind: 'gap', label: 'Definition still to clarify', explanation: 'One thought proposes a criterion; the other asks what it measures.' },
    { a: 'attention', b: 'quiet', kind: 'gap', label: 'Interpretation still to check', explanation: 'One thought proposes a criterion; the other questions a possible confound.' },
];
async function boot(page: Page, relations = proposedRelations, interfaceSize = 100) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(interfaceSize => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'gateway', locale: 'en', interfaceSize }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    }, interfaceSize);
    await page.route('**/api/respond', route => route.fulfill({ json: {
        providerLabel: 'Structure UI fixture / not live', mock: true,
        intents: [{ type: 'surface_structure', groups: [{ label: 'Method and unresolved conditions', thoughtIds: ['attention', 'structure', 'quiet'] }], relations, note: 'The interpretation is still a question.' }],
    } }));
    await seedField(page);
    for (const [index, id] of ['attention', 'structure', 'quiet'].entries()) {
        await page.locator(`[data-thought-id="${id}"]`).click({ modifiers: index ? ['Shift'] : [] });
    }
    const before = await state(page);
    await page.getByTestId('scope-organize').click();
    const surface = page.getByRole('dialog', { name: 'Organize thoughts', exact: true });
    await expect(surface.getByTestId('structure-proposal')).toBeVisible();
    return { surface, before };
}

test('review can omit one relation, apply only the other, reopen it and undo without rewriting cards', async ({ page }, info) => {
    const { surface, before } = await boot(page);
    await expect(surface.getByTestId('structure-apply-summary')).toContainText('keep 2 relations');
    await expect(surface).toContainText('not saved as containers');
    const first = surface.locator('.structure-relation-summary').filter({ hasText: 'Definition still to clarify' });
    await first.getByText('Compare the original cards', { exact: true }).click();
    await expect(first.locator('li')).toHaveText([before.thoughts.attention.text, before.thoughts.structure.text]);
    await surface.locator('.structure-relation-summary').filter({ hasText: 'Interpretation still to check' }).getByRole('button', { name: 'Leave out this relation', exact: true }).click();
    await expect(surface.getByTestId('structure-apply-summary')).toContainText('keep 1 relation');
    expect((await state(page)).relations).toEqual(before.relations);
    await page.screenshot({ path: info.outputPath('review-one-relation.png') });
    await surface.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(surface).toHaveCount(0);
    await expect.poll(async () => Object.keys((await state(page)).relations).length).toBe(Object.keys(before.relations).length + 1);
    const after = await state(page);
    expect(after.thoughts).toEqual(before.thoughts);
    const kept = page.getByRole('button', { name: 'Confirmed relation: Definition still to clarify', exact: true });
    await expect(kept).toBeVisible();
    await expect(kept).toContainText('Kept — view relation');
    await expect.poll(() => page.evaluate(() => {
        const token = document.querySelector('.relation-label-overlay[data-status="confirmed"]')!.getBoundingClientRect();
        return [...document.querySelectorAll('.thought-local-actions')].every(element => {
            const actions = element.getBoundingClientRect();
            return token.right <= actions.left || actions.right <= token.left || token.bottom <= actions.top || actions.bottom <= token.top;
        });
    })).toBe(true);
    await page.screenshot({ path: info.outputPath('kept-relation-visible.png') });
    await kept.click();
    await expect(page.getByRole('dialog', { name: 'Confirmed relation', exact: true })).toContainText(proposedRelations[0].explanation);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+z');
    await expect.poll(async () => (await state(page)).relations).toEqual(before.relations);
    expect((await state(page)).thoughts).toEqual(before.thoughts);
    await page.keyboard.press('Control+Shift+z');
    await expect.poll(async () => (await state(page)).relations).toEqual(after.relations);
    await page.reload();
    await expect(kept).toBeVisible();
    expect((await state(page)).thoughts).toEqual(before.thoughts);
});

test('a reading with no relations cannot offer an empty Apply', async ({ page }) => {
    const { surface, before } = await boot(page, []);
    await expect(surface).toContainText('There are no new relations to keep');
    await expect(surface.getByRole('button', { name: 'Apply', exact: true })).toBeDisabled();
    await surface.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await state(page)).relations).toEqual(before.relations);
    expect((await state(page)).thoughts).toEqual(before.thoughts);
    await expect(page.locator('[data-structure-id]')).toHaveCount(0);
});

test('a candidate explanation can be corrected before Keep and persists after reload', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'gateway' })); localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' })); });
    await page.route('**/api/respond', route => route.fulfill({ json: { providerLabel: 'Relation UI fixture / not live', mock: true, intents: [{ type: 'surface_relation', ...proposedRelations[0] }] } }));
    await seedField(page);
    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    await expect.poll(async () => Math.min((await state(page)).thoughts.attention.touchedAt, (await state(page)).thoughts.structure.touchedAt)).toBeGreaterThan(1);
    const before = await state(page);
    await page.getByTestId('scope-find-relation').click();
    const candidate = page.getByRole('button', { name: 'Candidate relation: Definition still to clarify', exact: true });
    await expect(candidate).toContainText('To review — view relation');
    await candidate.click();
    const surface = page.getByRole('dialog', { name: 'Candidate relation', exact: true });
    await surface.getByRole('button', { name: 'Modify', exact: true }).click();
    await expect(surface.getByRole('button', { name: 'Keep', exact: true })).toHaveCount(0);
    await surface.getByRole('textbox', { name: 'Relation explanation', exact: true }).fill('An unsaved correction');
    await surface.getByRole('textbox', { name: 'Relation explanation', exact: true }).press('Escape');
    await expect(surface).toContainText(proposedRelations[0].explanation);
    await surface.getByRole('button', { name: 'Modify', exact: true }).click();
    await expect(surface.getByRole('textbox', { name: 'Relation explanation', exact: true })).toHaveValue(proposedRelations[0].explanation);
    const explanation = 'The second thought asks for a distinction; it does not establish a result.';
    await surface.getByRole('textbox', { name: 'Relation explanation', exact: true }).fill(explanation);
    await surface.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(surface).toContainText(explanation);
    expect((await state(page)).relations).toEqual(before.relations);
    await surface.getByRole('button', { name: 'Keep', exact: true }).click();
    await expect.poll(async () => Object.values((await state(page)).relations).some(relation => relation.explanation === explanation)).toBe(true);
    await page.reload();
    await page.getByRole('button', { name: 'Confirmed relation: Definition still to clarify', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Confirmed relation', exact: true })).toContainText(explanation);
    expect((await state(page)).thoughts).toEqual(before.thoughts);
});

test('a larger interface keeps the full review cue inside its reserved token box', async ({ page }) => {
    const { surface } = await boot(page, proposedRelations, 120);
    await surface.getByRole('button', { name: 'Apply', exact: true }).click();
    const token = page.getByRole('button', { name: 'Confirmed relation: Definition still to clarify', exact: true });
    await expect(token).toBeVisible();
    await expect.poll(() => token.evaluate(element => {
        const box = element.parentElement!.getBoundingClientRect();
        const hint = element.querySelector('.relation-token-hint')!.getBoundingClientRect();
        return hint.left >= box.left && hint.right <= box.right && hint.top >= box.top && hint.bottom <= box.bottom;
    })).toBe(true);
    await page.getByTestId('field').click({ position: { x: 1200, y: 700 } });
    await expect(token).toBeVisible();
    await token.click();
    await expect(page.getByRole('dialog', { name: 'Confirmed relation', exact: true })).toBeVisible();
});
