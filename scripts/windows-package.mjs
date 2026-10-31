/** Fixed Windows package profiles; no user-supplied config paths or commands. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const profiles = {
    stable: { config: '', identifier: 'app.diffusion.explorer', productName: 'Diffusion Explorer', entryPoint: 'index.html' },
    preview: { config: 'src-tauri/tauri.preview.conf.json', identifier: 'app.diffusion.explorer.preview', productName: 'Diffusion Preview', entryPoint: 'next/explore?locale=zh' },
    field: { config: 'src-tauri/tauri.field-preview.conf.json', identifier: 'app.diffusion.explorer.preview', productName: 'Diffusion Preview', entryPoint: 'index.html?locale=zh&readingTrial=1&propositionTrial=1' },
    'free-links': { config: 'src-tauri/tauri.free-links.conf.json', identifier: 'app.diffusion.explorer.freelinks', productName: 'Diffusion Free Links', entryPoint: 'index.html?locale=zh&readingTrial=1&propositionTrial=1&freeLinksTrial=1' },
};
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

export function selectProfile(root, eventName, requestedProfile = 'stable') {
    let profile = requestedProfile || 'stable';
    if (eventName === 'pull_request') {
        const manifest = path.join(root, 'src-tauri/windows-preview-profile.json');
        profile = fs.existsSync(manifest) ? readJson(manifest).profile : 'preview';
    } else if (eventName !== 'workflow_dispatch') {
        throw new Error('Expected pull_request or workflow_dispatch');
    }
    if (typeof profile !== 'string' || !Object.hasOwn(profiles, profile)) throw new Error('Unknown Windows package profile');
    if (eventName === 'pull_request' && profile === 'stable') throw new Error('PR packages must use an isolated preview profile');
    return profile;
}

export function resolveProfile(root, profile) {
    if (typeof profile !== 'string' || !Object.hasOwn(profiles, profile)) throw new Error('Unknown Windows package profile');
    const fixed = profiles[profile];
    const basePath = 'src-tauri/tauri.conf.json';
    const base = readJson(path.join(root, basePath));
    const override = fixed.config ? readJson(path.join(root, fixed.config)) : {};
    const config = { ...base, ...override };
    const entryPoint = config.app?.windows?.[0]?.url ?? 'index.html';
    if (config.identifier !== fixed.identifier || config.productName !== fixed.productName || entryPoint !== fixed.entryPoint) {
        throw new Error('Package identity or entry point does not match the selected profile');
    }
    if (profile !== 'stable') {
        const binary = profile === 'free-links' ? 'diffusion-free-links' : 'diffusion-preview';
        if (config.mainBinaryName !== binary || config.bundle?.windows?.nsis?.installMode !== 'currentUser') {
            throw new Error('Preview executable or install mode does not match the selected profile');
        }
    }
    return {
        profile, configPath: fixed.config || basePath, overrideConfig: fixed.config,
        appIdentifier: config.identifier, productName: config.productName, entryPoint,
        configs: [basePath, ...(fixed.config ? [fixed.config] : [])].map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(root, file))) })),
    };
}

export function verifySource(root, expectedSource) {
    const source = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    if (!/^[a-f0-9]{40}$/.test(expectedSource ?? '') || source !== expectedSource) throw new Error('Checkout SHA does not match PACKAGE_SOURCE');
    const changed = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' }).trim();
    if (changed) throw new Error(`Tracked source files changed during packaging:\n${changed}`);
    return source;
}

export function recordPackage(root, plan, sourceCommit, run = null) {
    const bundle = path.join(root, 'src-tauri/target/release/bundle/nsis');
    const names = fs.readdirSync(bundle).filter(name => name.endsWith('.exe'));
    if (names.length !== 1) throw new Error('Expected exactly one NSIS installer in a fresh bundle directory');
    const installers = names.map(name => {
        const bytes = fs.readFileSync(path.join(bundle, name));
        if (!bytes.length) throw new Error('NSIS installer is empty');
        return { name, bytes: bytes.length, sha256: sha256(bytes) };
    });
    const receipt = {
        sourceCommit, ...plan, preview: plan.profile !== 'stable', run, platform: process.platform, architecture: process.arch, installers,
        acceptance: { packaging: 'passed', installedWindows: 'not-run', feature: 'not-run', liveModel: 'not-run' },
    };
    fs.writeFileSync(path.join(bundle, 'SHA256SUMS.txt'), installers.map(item => `${item.sha256}  ${item.name}\n`).join(''));
    fs.writeFileSync(path.join(bundle, 'source.json'), JSON.stringify(receipt, null, 2) + '\n');
    fs.copyFileSync(path.join(root, 'docs/experiments/WINDOWS_PREVIEW.md'), path.join(bundle, 'INSTALL.md'));
    return receipt;
}

function main() {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const command = process.argv[2];
    if (!['plan', 'record'].includes(command) || process.argv.length !== 3) throw new Error('Usage: node scripts/windows-package.mjs plan|record');
    const source = verifySource(root, process.env.PACKAGE_SOURCE);
    const profile = selectProfile(root, process.env.GITHUB_EVENT_NAME, process.env.INPUT_PROFILE);
    const plan = resolveProfile(root, profile);
    if (command === 'plan') {
        const bundle = path.join(root, 'src-tauri/target/release/bundle/nsis');
        if (fs.existsSync(bundle) && fs.readdirSync(bundle).some(name => name.endsWith('.exe'))) throw new Error('Refuse to reuse a bundle directory containing an installer');
        if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `profile=${profile}\nconfig=${plan.overrideConfig}\n`);
        console.log(JSON.stringify({ sourceCommit: source, ...plan }, null, 2));
    } else {
        const run = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null;
        console.log(JSON.stringify(recordPackage(root, plan, source, run), null, 2));
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
