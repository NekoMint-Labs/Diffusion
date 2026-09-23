#!/usr/bin/env node
/**
 * Runs the discovery engine's Python tests.
 *
 * The engine's own suite is the gate on its behaviour, so it has to be runnable the same way on
 * every machine. It prefers the build virtualenv — `pnpm run build:discovery` already populated it
 * with exactly the dependencies the engine declares — and falls back to a system Python 3, saying
 * what is missing rather than failing obscurely.
 *
 * The tests themselves need no network and no provider credentials: the sources and readers are
 * replaced by fakes, so this is an offline check.
 *
 * Usage:  pnpm run test:discovery
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engineDir = path.join(root, 'internal', 'discovery-engine');
const venvPython = process.platform === 'win32'
    ? path.join(root, 'src-tauri', '.discovery-build', 'Scripts', 'python.exe')
    : path.join(root, 'src-tauri', '.discovery-build', 'bin', 'python');

function usable(command) {
    const probe = spawnSync(command, ['-c', 'import httpx, tenacity'], { shell: false, stdio: 'ignore' });
    return !probe.error && probe.status === 0;
}

const candidates = fs.existsSync(venvPython) ? [venvPython] : (process.platform === 'win32' ? ['py', 'python'] : ['python3', 'python']);
const command = candidates.find(usable);
if (!command) {
    console.error("The discovery engine's tests need Python 3 with httpx and tenacity installed.");
    console.error('Run: pnpm run build:discovery   (it creates the build virtualenv these tests prefer)');
    process.exit(1);
}
const result = spawnSync(command, ['-m', 'unittest', 'discover', '-s', 'tests', '-t', '.', '-p', 'test_*.py'],
    { cwd: engineDir, stdio: 'inherit', shell: false });
process.exit(result.status ?? 1);
