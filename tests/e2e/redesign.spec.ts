import { test, expect } from '@playwright/test';
import { choose } from './selects.ts';

test('first open is empty, compact and free of permanent diagnostic copy', async ({ page }) => {
    await page.goto('/?locale=en');await expect(page.getByTestId('field')).toBeVisible();
    await expect(page.locator('[data-thought-id]')).toHaveCount(0);
    await expect(page.locator('.identity h1')).toHaveText('Untitled');
    await expect(page.locator('.app')).not.toContainText(/Saved locally|Demo \/ not a live model|Double-click to write/);
    const input=page.getByRole('textbox',{name:'Speak',exact:true});expect((await input.boundingBox())!.height).toBeLessThanOrEqual(30);
    expect(await page.locator('.speak').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    await input.fill('Something is still unclear');await input.press('Enter');await expect(page.locator('.thought p')).toHaveText('Something is still unclear');
    await page.reload();await expect(page.locator('.thought p')).toHaveText('Something is still unclear');
});
test('global More has five global operations, not the internal capability inventory', async ({ page }) => {
    await page.goto('/demo?locale=en');await page.getByTestId('global-more').click();
    const menu=page.getByTestId('global-menu');await expect(menu.getByRole('menuitem')).toHaveCount(5);
    await expect(menu).not.toContainText(/Diffuse|Crystal|Thread|Carry|Fork/);
    await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);await expect(page.getByTestId('global-more')).toBeFocused();
});
test('Thought gains quiet material presence without changing geometry and Focus retains spatial context', async ({ page }) => {
    await page.goto('/demo?locale=en');const thought=page.locator('[data-thought-id="attention"]');await expect(thought).toBeVisible();const before=await thought.boundingBox();
    await thought.hover();expect(await thought.boundingBox()).toEqual(before);await expect(page.locator('.relation-label-overlay')).toHaveCount(0);
    await thought.click();const proof=page.locator('[data-thought-id="proof"]');const proofInk=proof.locator('.thought-preview');
    await expect.poll(()=>proofInk.evaluate(e=>Number(getComputedStyle(e).opacity))).toBeLessThanOrEqual(.85);expect(await thought.boundingBox()).toEqual(before);
    expect(await thought.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    expect(await thought.evaluate(e=>getComputedStyle(e).boxShadow)).not.toBe('none');
    expect(await proof.evaluate(e=>Number(getComputedStyle(e).opacity))).toBe(1);const inkOpacity=await proofInk.evaluate(e=>Number(getComputedStyle(e).opacity));expect(inkOpacity).toBeGreaterThanOrEqual(.55);expect(inkOpacity).toBeLessThanOrEqual(.85);
    await expect(page.getByTestId('thought-more')).toBeVisible();await expect(page.locator('.modal-backdrop')).toHaveCount(0);
});
test('Chinese UI is selectable and the command hierarchy remains the same', async ({ page }) => {
    await page.goto('/?locale=zh');await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');
    await page.getByTestId('global-more').click();const labels=await page.getByTestId('global-menu').getByRole('menuitem').allTextContents();expect(labels).toHaveLength(5);expect(labels.join(' ')).not.toContain('Settings');
    await page.getByTestId('global-menu').locator('[data-command="settings"]').click();await choose(page, 'locale-select', 'en');
    await expect(page.getByRole('dialog',{name:'Field settings'})).toBeVisible();await expect(page.locator('html')).toHaveAttribute('lang','en');
});
test('The focused Thread has relevant-context manuscript architecture and returns without traveling', async ({ page }) => {
    await page.goto('/demo?locale=en');await page.locator('[data-thought-id="attention"]').click();
    // The Thread place is its own entry: Continue thinking opens the local execution preview.
    await page.getByTestId('thought-more').click();await page.getByTestId('thought-menu').locator('[data-command="thread"]').click();
    // Field manipulation in Thread must be captured at Deep Dive entry, not Thread creation.
    await page.mouse.move(80,700);await page.mouse.down({button:'middle'});await page.mouse.move(150,730,{steps:6});await page.mouse.up({button:'middle'});
    const before=await page.locator('.world').evaluate(e=>(e as HTMLElement).style.transform);
    await page.getByRole('button',{name:'Go deeper',exact:true}).click();await expect(page.locator('.thread-focus-layout')).toBeVisible();await expect(page.locator('.thread-focus-context')).toBeVisible();
    await expect(page.locator('.field')).toBeHidden();await expect(page.locator('.speak')).toHaveCount(0);
    await page.getByRole('button',{name:'Return to Field',exact:true}).click();await expect(page.locator('.field')).toBeVisible();
    expect(await page.locator('.world').evaluate(e=>(e as HTMLElement).style.transform)).toBe(before);
});
test('long closed downtime preserves ordinary Thoughts and original coordinates', async ({ page }) => {
    await page.goto('/demo?locale=en');await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
    await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const request=indexedDB.open('diffusion-explorer-v1');request.onsuccess=()=>{const db=request.result;const tx=db.transaction('projects','readwrite');const store=tx.objectStore('projects');const read=store.get('demo');read.onsuccess=()=>{const p=read.result;for(const thought of Object.values(p.thoughts) as Array<{touchedAt:number}>)thought.touchedAt=1;store.put(p);};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};request.onerror=()=>reject(request.error);}));
    const before=await page.locator('[data-thought-id="attention"]').boundingBox();await page.reload();const thought=page.locator('[data-thought-id="attention"]');await expect(thought).toHaveAttribute('data-life','active');expect(await thought.boundingBox()).toEqual(before);
});
