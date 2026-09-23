#!/usr/bin/env node
/**
 * Freezes Diffusion's own discovery-engine source into the executable that ships inside the app.
 *
 * Python lives on the BUILD machine only. Asking a desktop user to install Python, then install an
 * engine, then point a variable at it is not "built in" by any honest reading, so the engine is
 * frozen into a single self-contained executable that Tauri copies into the installer.
 *
 * This is a build-time step, not a runtime one. The engine is built from Diffusion-owned source in
 * `internal/discovery-engine/`; nothing is cloned, downloaded or resolved from a package index by
 * name. The shipped artifact's provenance is recorded in `internal/discovery-engine/PROVENANCE.md`.
 *
 * Why a frozen executable rather than a bundled interpreter: one artifact, no import path to get
 * wrong, no partial Python environment to half-install, and a startup cost that can be measured.
 * The whole point is that the production target has NO Python prerequisite, so the build must not
 * create one on the user's side either.
 *
 * Usage:  node scripts/build-discovery-sidecar.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { computeSourceHash } from './lib/discovery-source-hash.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engineDir = path.join(root, 'internal', 'discovery-engine');
const venvDir = path.join(root, 'src-tauri', '.discovery-build');
const outDir = path.join(root, 'src-tauri', 'resources', 'discovery');
const target = process.platform === 'win32' ? 'diffusion-discovery.exe' : 'diffusion-discovery';

function run(command, args) {
    const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited ${result.status}`);
}
function python() {
    // The BUILD machine needs a Python. The user's machine is exactly what this script exists so
    // that they do not need one.
    const candidates = process.platform === 'win32' ? [['py', ['-3']], ['python', []]] : [['python3', []], ['python', []]];
    for (const [command, prefix] of candidates) {
        const probe = spawnSync(command, [...prefix, '--version'], { encoding: 'utf8', shell: false });
        if (!probe.error && probe.status === 0) return { command, prefix, version: probe.stdout.trim() || probe.stderr.trim() };
    }
    throw new Error('Building the bundled discovery engine requires Python 3.10+ on the BUILD machine only.');
}

const { command, prefix, version } = python();
console.log(`Building Diffusion's bundled discovery engine (${version}).`);
fs.rmSync(venvDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
run(command, [...prefix, '-m', 'venv', venvDir]);
const venvPython = process.platform === 'win32' ? path.join(venvDir, 'Scripts', 'python.exe') : path.join(venvDir, 'bin', 'python');
run(venvPython, ['-m', 'pip', 'install', '--quiet', '--upgrade', 'pip']);
run(venvPython, ['-m', 'pip', 'install', '--quiet', engineDir]);
run(venvPython, ['-m', 'pip', 'install', '--quiet', 'pyinstaller']);
run(venvPython, ['-m', 'PyInstaller', '--onefile', '--clean', '--noconfirm', '--name', 'diffusion-discovery',
    '--distpath', outDir, '--workpath', path.join(venvDir, 'work'), '--specpath', venvDir,
    '--collect-all', 'diffusion_discovery', '--hidden-import', 'diffusion_discovery.cli', path.join(engineDir, 'entrypoint.py')]);
// pip builds the local package in place, leaving `build/`, `*.egg-info` and `__pycache__` beside the
// source. They are byproducts, not source: remove them so the tree the hash describes stays clean.
fs.rmSync(path.join(engineDir, 'build'), { recursive: true, force: true });
for (const entry of fs.readdirSync(engineDir)) {
    if (entry.endsWith('.egg-info')) fs.rmSync(path.join(engineDir, entry), { recursive: true, force: true });
}
const artifact = path.join(outDir, target);
if (!fs.existsSync(artifact)) throw new Error(`Expected the engine at ${artifact}.`);
if (process.platform !== 'win32') fs.chmodSync(artifact, 0o755);
const reported = spawnSync(venvPython, ['-c', 'import diffusion_discovery; print(diffusion_discovery.__version__)'], { encoding: 'utf8', shell: false });
if (reported.error) throw reported.error;
if (reported.status !== 0) throw new Error(`Could not read the engine version from the build virtualenv (exit ${reported.status}).`);
const engineVersion = reported.stdout.trim();
const sourceHash = computeSourceHash(root);
const bytes = fs.statSync(artifact).size;
// VERSION carries the engine version plus a short source fingerprint, so an installed artifact can
// be traced to the exact source it was frozen from.
fs.writeFileSync(path.join(outDir, 'VERSION'), `${engineVersion}+${sourceHash.slice(0, 8)}\n`);
fs.writeFileSync(path.join(outDir, 'SOURCE.sha256'), `${sourceHash}\n`);
console.log(`Bundled discovery engine: ${path.relative(root, artifact)} (${(bytes / 1048576).toFixed(1)} MiB).`);
console.log('This artifact is the ONLY discovery runtime. No Python and no separate install is required on the user\u2019s machine.');
