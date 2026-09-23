#!/usr/bin/env node
/**
 * `pnpm tauri:dev` — picks a free localhost port, then hands the same port to
 * Vite (through DIFFUSION_DEV_PORT) and to Tauri (through an inline --config
 * devUrl override), so the two can never diverge. No temporary config file.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { DEFAULT_DEV_PORT, DEV_PORT_WINDOW, fallbackPort, parseDevPort, pickDevPort } from './lib/dev-port.mjs';

const requested = process.env.DIFFUSION_DEV_PORT;
const preferred = parseDevPort(requested);
if (requested !== undefined && preferred === null) {
  console.warn(`Diffusion dev: ignoring unusable DIFFUSION_DEV_PORT=${requested}`);
}
const start = preferred ?? DEFAULT_DEV_PORT;
const port = (await pickDevPort({ start })) ?? (await fallbackPort());
const devUrl = `http://127.0.0.1:${port}`;

console.log(`Diffusion dev\n→ frontend: ${devUrl}`);
if (port !== start) console.log(`→ ${start} unavailable, probed ${start}..${start + DEV_PORT_WINDOW}`);

const tauriCli = createRequire(import.meta.url).resolve('@tauri-apps/cli/tauri.js');
const override = JSON.stringify({ build: { devUrl } });
const child = spawn(process.execPath, [tauriCli, 'dev', ...process.argv.slice(2), '--config', override], {
  stdio: 'inherit',
  env: { ...process.env, DIFFUSION_DEV_PORT: String(port) },
});

child.on('error', error => {
  console.error(`Diffusion dev: failed to start tauri dev: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
