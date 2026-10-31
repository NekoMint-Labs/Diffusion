import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { selectProfile, resolveProfile, verifySource, recordPackage } from '../../scripts/windows-package.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = path.join(root, 'scripts/windows-package.mjs');
const configFiles = ['tauri.conf.json', 'tauri.preview.conf.json', 'tauri.field-preview.conf.json'];
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'diffusion-windows-package-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, 'src-tauri'), { recursive: true });
  for (const file of configFiles) {
    fs.copyFileSync(path.join(root, 'src-tauri', file), path.join(directory, 'src-tauri', file));
  }
  return directory;
}

function writeJson(directory, file, value) {
  fs.writeFileSync(path.join(directory, 'src-tauri', file), JSON.stringify(value));
}

function installerFixture(t) {
  const directory = fixture(t);
  const bundle = path.join(directory, 'src-tauri/target/release/bundle/nsis');
  fs.mkdirSync(bundle, { recursive: true });
  const docs = path.join(directory, 'docs/experiments');
  fs.mkdirSync(docs, { recursive: true });
  fs.writeFileSync(path.join(docs, 'WINDOWS_PREVIEW.md'), 'Install the selected preview.\n');
  return { directory, bundle, plan: resolveProfile(directory, 'field') };
}

test('manual dispatch selects each named profile and defaults to stable', t => {
  const directory = fixture(t);
  for (const profile of ['stable', 'preview', 'field', 'free-links']) {
    assert.equal(selectProfile(directory, 'workflow_dispatch', profile), profile);
  }
  assert.equal(selectProfile(directory, 'workflow_dispatch'), 'stable');
});

test('PR packaging defaults to preview and uses the committed Field manifest', t => {
  const directory = fixture(t);
  assert.equal(selectProfile(directory, 'pull_request'), 'preview');
  writeJson(directory, 'windows-preview-profile.json', { profile: 'field' });
  assert.equal(selectProfile(directory, 'pull_request', 'stable'), 'field');
  assert.equal(selectProfile(root, 'pull_request'), 'field');
});

test('a PR manifest cannot select the stable application', t => {
  const directory = fixture(t);
  writeJson(directory, 'windows-preview-profile.json', { profile: 'stable' });
  assert.throws(() => selectProfile(directory, 'pull_request'), /isolated preview/);
});

test('profile selection rejects unknown values, paths, commands and non-string names', t => {
  const directory = fixture(t);
  for (const profile of ['unknown', '../tauri.conf.json', 'src-tauri/tauri.preview.conf.json', 'field; echo injected', '$(whoami)', '__proto__', 'constructor', ['field'], { toString: () => 'field' }]) {
    assert.throws(() => selectProfile(directory, 'workflow_dispatch', profile), /Unknown Windows package profile/);
    assert.throws(() => resolveProfile(directory, profile), /Unknown Windows package profile/);
  }
  for (const profile of [null, 1, true, {}, ['field']]) {
    writeJson(directory, 'windows-preview-profile.json', { profile });
    assert.throws(() => selectProfile(directory, 'pull_request'), /Unknown Windows package profile/);
  }
  assert.throws(() => selectProfile(directory, 'push', 'field'), /Expected pull_request or workflow_dispatch/);
});

test('CLI rejects arbitrary commands and additional arguments before packaging', () => {
  for (const args of [['build'], ['plan; echo injected'], ['plan', '--config', '../other.json'], ['record', 'extra']]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage: node scripts\/windows-package\.mjs plan\|record/);
    assert.equal(result.stdout, '');
  }
});

test('free-links fails when its own config is absent rather than falling back', t => {
  const directory = fixture(t);
  assert.throws(() => resolveProfile(directory, 'free-links'), /ENOENT.*tauri\.free-links\.conf\.json/);
});

test('Field enables reading and proposition trials while ordinary Preview and stable retain their entries', () => {
  const stable = resolveProfile(root, 'stable');
  const preview = resolveProfile(root, 'preview');
  const field = resolveProfile(root, 'field');
  assert.equal(stable.entryPoint, 'index.html');
  assert.equal(preview.entryPoint, 'next/explore?locale=zh');
  const entry = new URL(field.entryPoint, 'https://example.invalid/');
  assert.equal(entry.pathname, '/index.html');
  assert.deepEqual([...entry.searchParams], [['locale', 'zh'], ['readingTrial', '1'], ['propositionTrial', '1']]);
  assert.equal(preview.appIdentifier, 'app.diffusion.explorer.preview');
  assert.equal(field.appIdentifier, preview.appIdentifier);
  assert.notEqual(field.appIdentifier, stable.appIdentifier);
  assert.equal(field.overrideConfig, 'src-tauri/tauri.field-preview.conf.json');
  assert.equal(stable.overrideConfig, '');
});

test('profile resolution rejects identity, entry, executable and install-mode drift', t => {
  const directory = fixture(t);
  const file = path.join(directory, 'src-tauri/tauri.field-preview.conf.json');
  const original = JSON.parse(fs.readFileSync(file, 'utf8'));
  const mutations = [
    config => { config.identifier = 'app.diffusion.explorer'; },
    config => { config.productName = 'Diffusion Explorer'; },
    config => { config.app.windows[0].url += '&plainAnswerTrial=1'; },
    config => { config.mainBinaryName = 'diffusion-explorer'; },
    config => { config.bundle.windows.nsis.installMode = 'perMachine'; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(original);
    mutate(changed);
    fs.writeFileSync(file, JSON.stringify(changed));
    assert.throws(() => resolveProfile(directory, 'field'), /does not match/);
  }
});

test('resolved config hashes describe the actual bytes of both selected config files', t => {
  const directory = fixture(t);
  const plan = resolveProfile(directory, 'field');
  assert.deepEqual(plan.configs.map(item => item.path), ['src-tauri/tauri.conf.json', 'src-tauri/tauri.field-preview.conf.json']);
  for (const config of plan.configs) {
    assert.equal(config.sha256, digest(fs.readFileSync(path.join(directory, config.path))));
  }
});

test('recording fails when the installer directory or installer is missing', t => {
  const directory = fixture(t);
  const plan = resolveProfile(directory, 'field');
  assert.throws(() => recordPackage(directory, plan, 'a'.repeat(40)), /ENOENT/);
  const bundle = path.join(directory, 'src-tauri/target/release/bundle/nsis');
  fs.mkdirSync(bundle, { recursive: true });
  fs.writeFileSync(path.join(bundle, 'README.txt'), 'not an installer');
  assert.throws(() => recordPackage(directory, plan, 'a'.repeat(40)), /exactly one NSIS installer/);
  assert.equal(fs.existsSync(path.join(bundle, 'source.json')), false);
});

test('recording rejects multiple installers and an empty installer', t => {
  const { directory, bundle, plan } = installerFixture(t);
  fs.writeFileSync(path.join(bundle, 'one.exe'), 'one');
  fs.writeFileSync(path.join(bundle, 'two.exe'), 'two');
  assert.throws(() => recordPackage(directory, plan, 'a'.repeat(40)), /exactly one NSIS installer/);
  fs.unlinkSync(path.join(bundle, 'two.exe'));
  fs.writeFileSync(path.join(bundle, 'one.exe'), Buffer.alloc(0));
  assert.throws(() => recordPackage(directory, plan, 'a'.repeat(40)), /installer is empty/);
  assert.equal(fs.existsSync(path.join(bundle, 'source.json')), false);
});

test('receipt, checksum list and install note describe the actual artifact without claiming feature acceptance', t => {
  const { directory, bundle, plan } = installerFixture(t);
  const name = 'Diffusion Preview_0.3.16_x64-setup.exe';
  const bytes = Buffer.from([0x4d, 0x5a, 0, 255, 10, 13, 42]);
  fs.writeFileSync(path.join(bundle, name), bytes);
  const source = 'a'.repeat(40);
  const run = 'https://github.com/example/repo/actions/runs/123';
  const receipt = recordPackage(directory, plan, source, run);
  assert.deepEqual(receipt.installers, [{ name, bytes: bytes.length, sha256: digest(bytes) }]);
  assert.equal(receipt.sourceCommit, source);
  assert.equal(receipt.run, run);
  assert.equal(receipt.preview, true);
  assert.deepEqual(receipt.acceptance, { packaging: 'passed', installedWindows: 'not-run', feature: 'not-run', liveModel: 'not-run' });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(bundle, 'source.json'), 'utf8')), receipt);
  assert.equal(fs.readFileSync(path.join(bundle, 'SHA256SUMS.txt'), 'utf8'), `${digest(bytes)}  ${name}\n`);
  assert.equal(fs.readFileSync(path.join(bundle, 'INSTALL.md'), 'utf8'), 'Install the selected preview.\n');
});

test('source verification requires the exact full SHA and rejects tracked changes while permitting generated files', t => {
  const directory = fixture(t);
  const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '--quiet');
  fs.writeFileSync(path.join(directory, 'tracked.txt'), 'committed source\n');
  git('add', 'tracked.txt');
  git('-c', 'user.name=Package Test', '-c', 'user.email=package-test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'fixture');
  const source = git('rev-parse', 'HEAD');
  assert.equal(verifySource(directory, source), source);
  for (const expected of [undefined, source.slice(0, 7), `${source}\n`, '0'.repeat(40)]) {
    assert.throws(() => verifySource(directory, expected), /Checkout SHA does not match PACKAGE_SOURCE/);
  }
  fs.writeFileSync(path.join(directory, 'generated.txt'), 'untracked packaging output');
  assert.equal(verifySource(directory, source), source);
  fs.appendFileSync(path.join(directory, 'tracked.txt'), 'changed while building\n');
  assert.throws(() => verifySource(directory, source), /Tracked source files changed during packaging/);
});

test('Windows checkout keeps Cargo.toml clean after Tauri newline rewriting only with its LF attribute', t => {
  const attributes = fs.readFileSync(path.join(root, '.gitattributes'), 'utf8');
  const cargoText = '[package]\nname = "package-fixture"\nversion = "0.1.0"\n';
  for (const pinned of [false, true]) {
    const directory = fixture(t);
    const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git('init', '--quiet');
    git('config', 'core.autocrlf', 'true');
    fs.writeFileSync(path.join(directory, '.gitattributes'), pinned ? attributes : attributes.split(/\r?\n/).filter(line => !/^\/src-tauri\/Cargo\.toml\s/.test(line)).join('\n'));
    const cargo = path.join(directory, 'src-tauri/Cargo.toml');
    fs.writeFileSync(cargo, cargoText);
    git('add', '.gitattributes', 'src-tauri/Cargo.toml');
    git('-c', 'user.name=Package Test', '-c', 'user.email=package-test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Windows checkout fixture');
    const source = git('rev-parse', 'HEAD');
    // Force Git to materialize its Windows checkout bytes, rather than inspect
    // the original file written by this test before adding it to the index.
    fs.unlinkSync(cargo);
    git('checkout', '--', 'src-tauri/Cargo.toml');
    const checkedOut = fs.readFileSync(cargo, 'utf8');
    assert.equal(checkedOut, pinned ? cargoText : cargoText.replaceAll('\n', '\r\n'));
    assert.equal(verifySource(directory, source), source);
    fs.writeFileSync(cargo, checkedOut.replaceAll('\r\n', '\n'));
    if (pinned) {
      assert.equal(verifySource(directory, source), source);
    } else {
      assert.throws(() => verifySource(directory, source), /Tracked source files changed during packaging/);
    }
  }
});
