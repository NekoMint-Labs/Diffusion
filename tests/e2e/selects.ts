import { expect, type Page } from '@playwright/test';
/** The product has exactly one Select, so the suite has exactly one way to use it: open the
 * trigger, then choose the option by *value*. Choosing by value rather than by label keeps the
 * helper locale-independent, which is what the preference matrix needs.
 *
 * Settings is a tablist, so a control can legitimately be off-screen until its own section is
 * active. Choosing a preference therefore starts where a person would: navigate to the section
 * that owns the control, then use it. */
const SECTION_OF: Record<string, string> = {
    // General now owns Language and the type/interface controls (Typography, Interface size, Thought size).
    'locale-select': 'general', 'typography-select': 'general', 'interface-size-select': 'general', 'thought-size-select': 'general',
    // Appearance owns the curated Theme and Field Style.
    'style-profile-select': 'appearance', 'field-style-select': 'appearance',
    // Phase 2.8B split AI and Search & Evidence into two sections, so the controls each section owns
    // are mapped to the section that must be opened first.
    'provider-select': 'ai', 'provider-hint': 'ai', 'ai-status': 'ai', 'model-select': 'ai', 'model-input': 'ai', 'model-summary': 'ai',
    'refresh-models': 'ai', 'test-connection': 'ai', 'depth-select': 'ai', 'depth-note': 'ai', 'base-url': 'ai', 'provider-key': 'ai',
    'provider-key-save': 'ai', 'provider-key-remove': 'ai', 'provider-key-error': 'ai', 'protocol-select': 'ai', 'gateway-url': 'ai',
    'gateway-token': 'ai', 'gateway-capability': 'ai',
    'external-exploration': 'search', 'discovery-status': 'search', 'source-exa': 'search', 'source-tavily': 'search', 'source-brave': 'search',
    'source-key-exa': 'search', 'source-key-tavily': 'search', 'source-key-brave': 'search', 'discovery-empty': 'search',
    'discovery-missing-key': 'search', 'discovery-advanced': 'search', 'discovery-backend': 'search', 'discovery-url': 'search',
};
export async function openSection(page: Page, section: string) {
    await page.locator(`.settings-nav button[data-section="${section}"]`).click();
    await expect(page.locator(`.settings-nav button[data-section="${section}"]`)).toHaveAttribute('aria-selected', 'true');
}
export async function choose(page: Page, testId: string, value: string) {
    const section = SECTION_OF[testId];
    if (section)
        await openSection(page, section);
    await page.getByTestId(testId).click();
    await page.locator(`.ui-select-item[data-value="${value}"]`).click();
    await expect(page.getByTestId(testId)).toHaveAttribute('data-value', value);
}
export async function expectChoice(page: Page, testId: string, value: string) {
    const section = SECTION_OF[testId];
    if (section)
        await openSection(page, section);
    await expect(page.getByTestId(testId)).toHaveAttribute('data-value', value);
}
