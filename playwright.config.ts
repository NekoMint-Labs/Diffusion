import { defineConfig } from '@playwright/test';

const realBackgroundTests = /(?:fieldBackgrounds|visual)\.spec\.ts/;
const lightweightStorage = {
    cookies: [],
    origins: [{
        origin: 'http://127.0.0.1:4173',
        localStorage: [{ name: 'diffusion-e2e-background', value: 'lightweight' }],
    }],
};

// This suite drives one spatial canvas with gesture timings, camera commits and exact
// bounding-box comparisons. Running files in parallel on a shared machine produced
// harness-only flakes (a different retrying assertion each run), so the gate is serial
// and every assertion keeps its full strength. General interaction coverage keeps the
// production background host/layer but skips renderer work; the dedicated background
// project loads every real renderer and owns its pixel, switching and motion assertions.
export default defineConfig({
    testDir: './tests/e2e',
    workers: 1,
    retries: 0,
    expect: { timeout: 10_000 },
    use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 960 }, browserName: 'chromium' },
    projects: [
        { name: 'interaction', testIgnore: realBackgroundTests, use: { storageState: lightweightStorage } },
        { name: 'production-backgrounds', testMatch: realBackgroundTests },
    ],
    webServer: {
        command: 'VITE_E2E_LIGHTWEIGHT_BACKGROUND=1 pnpm run build && pnpm run preview',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
