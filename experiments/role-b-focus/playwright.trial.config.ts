import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: '../../tests/e2e', testMatch: /(?:readingFocusTrial|answerPreview|generationUndo)\.spec\.ts/,
    outputDir: process.env.ROLE_B_BROWSER_OUTPUT || './results/field-browser', workers: 1, retries: 0, timeout: 35000,
    use: { baseURL: process.env.ROLE_B_BASE_URL || 'http://127.0.0.1:4175', browserName: 'chromium', launchOptions: { executablePath: process.env.ROLE_B_CHROMIUM } },
});
