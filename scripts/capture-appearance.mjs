import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'verification/appearance');
const BASE = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:4173';
const FILTER = process.env.CAPTURE_FILTER;
const IMAGE = process.env.CAPTURE_IMAGE;
const baseImage = { source: '', presence: 44, saturation: 52, brightness: 78, softness: 46, themeBlend: 58, dirty: false, stats: null };
const fieldStyles = ['paper-texture', 'topography', 'threads', 'waves', 'silk'];
const styleCapture = (profile, fieldStyle, extra = {}) => ({
    name: `${profile}-${fieldStyle}`, profile, fieldStyle, fieldPresence: 42, ...extra,
});
const captures = [
    ...fieldStyles.map(style => styleCapture('graphite-night', style)),
    styleCapture('editorial-warm', 'paper-texture'),
    styleCapture('editorial-warm', 'silk'),
    styleCapture('graphite-night', 'topography', { name: 'graphite-night-topography-image', image: true }),
    styleCapture('graphite-night', 'waves', { name: 'graphite-night-waves-image', image: true }),
    ...['topography', 'threads', 'waves'].flatMap(fieldStyle => [20, 50, 80].map(fieldPresence => ({
        name: `graphite-night-${fieldStyle}-presence-${fieldPresence}`, profile: 'graphite-night', fieldStyle, fieldPresence,
    }))),
    ...['studio-slate', 'quiet-forest'].flatMap(profile => fieldStyles.map(style => styleCapture(profile, style, { name: `review-${profile}-${style}` }))),
].filter(capture => (!FILTER || capture.name.includes(FILTER)) && (IMAGE || !capture.image));

if (!captures.length) throw new Error('No captures selected. Image captures require CAPTURE_IMAGE pointing to a PNG, JPEG, or WebP file.');
let imageSettings;
if (captures.some(capture => capture.image)) {
    const file = path.resolve(ROOT, IMAGE);
    const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[path.extname(file).toLowerCase()];
    if (!mime) throw new Error('CAPTURE_IMAGE must be a PNG, JPEG, or WebP file.');
    const bytes = await readFile(file);
    if (bytes.length > 1_500_000) throw new Error('CAPTURE_IMAGE exceeds the 1.5 MB Image Atmosphere limit.');
    imageSettings = { ...baseImage, source: `data:${mime};base64,${bytes.toString('base64')}`, dirty: true };
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
    for (const capture of captures) {
        const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        await context.addInitScript(settings => localStorage.setItem('diffusion-settings', JSON.stringify(settings)), {
            locale: 'en', appearance: {
                profile: capture.profile,
                fieldStyle: capture.fieldStyle,
                fieldPresence: capture.fieldPresence,
                ambientMotion: 50,
                accent: 'oxide', customAccent: '#a45e4c', image: capture.image ? imageSettings : baseImage,
            },
        });
        const page = await context.newPage();
        await page.goto(`${BASE}/demo`);
        await page.getByTestId('field').waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(250);
        const file = path.join(OUT, `${capture.name}-1600x900.png`);
        await page.screenshot({ path: file });
        console.log(path.relative(ROOT, file));
        await context.close();
    }
} finally {
    await browser.close();
}
