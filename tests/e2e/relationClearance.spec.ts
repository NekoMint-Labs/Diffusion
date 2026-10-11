import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';

async function stored(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
            const db = opening.result;
            const read = db.transaction('projects').objectStore('projects').get('main');
            read.onsuccess = () => { db.close(); resolve(read.result); };
            read.onerror = () => { db.close(); reject(read.error); };
        };
    }));
}

test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });

for (const [profile, locale, interfaceSize, zoom] of [
    ['editorial-warm', 'en', 100, 1],
    ['graphite-night', 'en', 100, 1],
    ['editorial-warm', 'zh', 120, .75],
    ['graphite-night', 'zh', 120, 1.5],
] as const) {
    test(`candidate controls clear another relation in ${profile}/${locale} at ${zoom}`, async ({ page }, info) => {
        await page.addInitScript(settings => {
            localStorage.setItem('diffusion-settings', JSON.stringify(settings));
            localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        }, { locale, interfaceSize, provider: 'gateway', appearance: { profile } });
        await page.route('**/api/respond', route => route.fulfill({ json: {
            providerLabel: 'Relation clearance fixture / not live', mock: true,
            intents: [{ type: 'surface_relation', a: 'a', b: 'b', kind: 'gap', label: 'A condition to revisit', explanation: 'The second thought leaves the measurement condition unresolved.' }],
        } }));
        await page.goto('/?locale=' + locale);
        await expect(page.getByTestId('field')).toBeVisible();
        const project = createProject('main', 'Relation action clearance');
        project.camera = { x: 0, y: 0, zoom };
        project.thoughts.a = makeThought('Compare observations using a consistent metric.', { x: 140 / zoom, y: 200 / zoom }, 1, 'a');
        project.thoughts.b = makeThought('The measurement conditions still need clarification.', { x: 850 / zoom, y: 200 / zoom }, 1, 'b');
        project.relations.existing = { id: 'existing', a: 'a', b: 'b', kind: 'support', label: 'An established reference', status: 'confirmed', createdAt: 1 };
        await page.evaluate(project => new Promise<void>((resolve, reject) => {
            const opening = indexedDB.open('diffusion-explorer-v1');
            opening.onerror = () => reject(opening.error);
            opening.onsuccess = () => {
                const db = opening.result, tx = db.transaction('projects', 'readwrite');
                tx.objectStore('projects').put(project);
                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = () => { db.close(); reject(tx.error); };
            };
        }), project);
        await page.reload();
        await page.locator('[data-thought-id="a"]').click();
        await page.locator('[data-thought-id="b"]').click({ modifiers: ['Shift'] });
        await page.getByTestId('scope-find-relation').click();
        const candidate = page.locator('.relation-token-overlay[data-status="tentative"]');
        await expect(candidate).toBeVisible();
        await page.getByTestId('field').focus();
        await page.keyboard.press('Escape');
        const before = await stored(page);
        await candidate.hover();
        const actions = candidate.locator('.relation-token-actions');
        await expect(actions).toBeVisible();
        await page.screenshot({ path: info.outputPath('candidate-action-clearance.png') });
        await expect.poll(() => actions.evaluate(element => {
            const actions = element.getBoundingClientRect();
            return [...document.querySelectorAll('[data-thought-id], [data-relation-token="existing"]')].every(other => {
                const box = other.getBoundingClientRect();
                return actions.right <= box.left || box.right <= actions.left || actions.bottom <= box.top || box.bottom <= actions.top;
            });
        })).toBe(true);
        expect((await stored(page)).thoughts).toEqual(before.thoughts);
        expect((await stored(page)).camera).toEqual(before.camera);
        expect((await stored(page)).relations).toEqual(before.relations);
        const keep = actions.getByRole('button').first();
        await keep.click();
        await expect(candidate).toHaveCount(0);
        await expect.poll(async () => Object.keys((await stored(page)).relations).length).toBe(2);
        expect((await stored(page)).thoughts).toEqual(before.thoughts);
        await page.reload();
        await expect(page.locator('.relation-token-overlay[data-status="confirmed"]')).toHaveCount(2);
    });
}
