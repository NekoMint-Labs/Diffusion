import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

// Exercise optional input handling without a browser or image renderer. The stub records the
// settings passed to each isolated capture; it makes no claim about the resulting pixels.
function capture(t, environment = {}, image) {
    const root = mkdtempSync(path.join(tmpdir(), 'diffusion-capture-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(path.join(root, 'scripts'));
    copyFileSync(new URL('../../scripts/capture-appearance.mjs', import.meta.url), path.join(root, 'scripts/capture-appearance.mjs'));
    const module = path.join(root, 'node_modules/@playwright/test');
    mkdirSync(module, { recursive: true });
    writeFileSync(path.join(module, 'package.json'), JSON.stringify({ type: 'module', exports: './index.js' }));
    writeFileSync(path.join(module, 'index.js'), `
        export const chromium = { launch: async () => ({
            newContext: async () => ({
                addInitScript: async (_, settings) => console.log('SETTINGS ' + JSON.stringify(settings)),
                newPage: async () => ({
                    goto: async () => {}, getByTestId: () => ({ waitFor: async () => {} }),
                    evaluate: async () => {}, waitForTimeout: async () => {}, screenshot: async () => {},
                }),
                close: async () => {},
            }),
            close: async () => {},
        }) };
    `);
    if (image) writeFileSync(path.join(root, 'fixture.png'), image);
    const env = { ...process.env };
    delete env.CAPTURE_IMAGE;
    delete env.CAPTURE_FILTER;
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/capture-appearance.mjs')], {
        cwd: root, env: { ...env, ...environment }, encoding: 'utf8', timeout: 15000,
    });
    assert.ifError(result.error);
    return { ...result, settings: result.stdout.split('\n').filter(line => line.startsWith('SETTINGS ')).map(line => JSON.parse(line.slice(9))) };
}

test('ordinary appearance captures run in a fresh checkout without a prior image', t => {
    const result = capture(t, { CAPTURE_FILTER: 'paper-texture' });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.settings.length > 0);
    assert.ok(result.settings.every(settings => settings.appearance.image.source === ''));
});

test('a non-image filter never reads an unused CAPTURE_IMAGE path', t => {
    const result = capture(t, { CAPTURE_FILTER: 'paper-texture', CAPTURE_IMAGE: 'absent.png' });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.settings.every(settings => settings.appearance.image.source === ''));
});

test('selected image captures use the explicit root-relative file', t => {
    const image = Buffer.from('capture input bytes');
    const result = capture(t, { CAPTURE_FILTER: 'topography-image', CAPTURE_IMAGE: 'fixture.png' }, image);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.settings.length, 1);
    assert.equal(result.settings[0].appearance.image.source, `data:image/png;base64,${image.toString('base64')}`);
});

test('an image-only filter explains the missing input before launching a browser', t => {
    const result = capture(t, { CAPTURE_FILTER: '-image' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Image captures require CAPTURE_IMAGE/);
    assert.equal(result.settings.length, 0);
});
