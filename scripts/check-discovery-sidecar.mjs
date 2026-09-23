#!/usr/bin/env node
/**
 * The cheap "is the bundled discovery engine present and current?" gate for `tauri dev`.
 *
 * It never rebuilds and never invokes Python: it hashes the engine source in the working tree and
 * compares that with the hash recorded next to the built artifact. If the executable, its `VERSION`
 * or its `SOURCE.sha256` is absent, or the recorded hash no longer matches the source, `tauri dev`
 * is stopped with an explicit instruction instead of running against a missing or out-of-date engine.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeSourceHash } from './lib/discovery-source-hash.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src-tauri', 'resources', 'discovery');
const target = process.platform === 'win32' ? 'diffusion-discovery.exe' : 'diffusion-discovery';
const artifact = path.join(outDir, target);
const versionFile = path.join(outDir, 'VERSION');
const hashFile = path.join(outDir, 'SOURCE.sha256');

function fail(line1, line2) {
    console.error(line1);
    console.error(line2);
    process.exit(1);
}

if (!fs.existsSync(artifact) || !fs.existsSync(versionFile) || !fs.existsSync(hashFile)) {
    fail("Diffusion's bundled discovery engine is missing.", 'Run: pnpm run build:discovery');
}
const recorded = fs.readFileSync(hashFile, 'utf8').trim();
if (recorded !== computeSourceHash(root)) {
    fail("Diffusion's bundled discovery engine is stale.", 'Run: pnpm run build:discovery');
}
console.log("Diffusion's bundled discovery engine is present and current.");
