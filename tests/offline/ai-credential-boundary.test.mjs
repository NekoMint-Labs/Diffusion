import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The desktop credential boundary, asserted from the side the offline gate can see.
 *
 * The behaviour itself has real tests in two places: `tests/unit/aiCredentialBoundary.test.ts` proves
 * that no desktop code path reads a stored key and that the native payload carries a scheme rather
 * than a value, and `src-tauri/src/ai_request.rs` carries its own Rust tests for host pinning,
 * header allowlisting, body bounding and cancellation. What this file adds is the part a Node-only
 * gate otherwise cannot observe: that the native side is wired up, that it pins the hosts a provider
 * key belongs to, and that neither the refusal nor the TLS choice can be quietly undone.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const filesUnder = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? filesUnder(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);

test('no stored credential can be read from the webview, for either identity', () => {
    const credentials = read('src-tauri/src/credentials.rs');
    // Presence is still answerable; the value is refused for both vocabularies, so the guarantee does
    // not depend on which surfaces happen to exist today.
    assert.match(credentials, /id\.starts_with\("search\."\) \|\| id\.starts_with\("ai\."\)/);
    assert.match(credentials, /pub async fn credential_has/);
});

test('the desktop provider request is a registered native command that reads the key itself', () => {
    const lib = read('src-tauri/src/lib.rs');
    assert.match(lib, /mod native_ai;/);
    assert.match(lib, /native_ai::native_ai_request/);
    assert.match(lib, /native_ai::native_ai_cancel/);
    const command = read('src-tauri/src/native_ai.rs');
    assert.match(command, /pub async fn native_ai_request\(/);
    // The credential is read in this process and handed to the request module, never returned.
    assert.match(command, /read_secret/);
    assert.match(command, /ai_request::perform\(/);
});

test('the native request pins each provider host and refuses a caller-supplied credential header', () => {
    const module = read('src-tauri/src/ai_request.rs');
    for (const host of ['api.openai.com', 'api.anthropic.com', 'generativelanguage.googleapis.com', 'api.deepseek.com'])
        assert.ok(module.includes(`"${host}"`), `the native request does not pin ${host}`);
    for (const header of ['authorization', 'x-api-key', 'x-goog-api-key'])
        assert.ok(module.includes(`"${header}"`), `the credential header allowlist is missing ${header}`);
    assert.match(module, /MAX_BODY_BYTES/);
    assert.match(module, /REQUEST_TIMEOUT/);
    // Redirects must not carry a credential to a host the table did not authorise.
    assert.match(module, /redirect/);
});

test('the desktop transport adds no system TLS build requirement', () => {
    const cargo = read('src-tauri/Cargo.toml');
    // `default-tls` links the platform OpenSSL on Linux; reqwest's default rustls path pulls
    // `aws-lc-rs`, which needs cmake and NASM on Windows. The chosen pair is pure Rust, so the build
    // requirements stay the ones Tauri already has — the same rule the credential store follows.
    assert.match(cargo, /reqwest = \{[^}]*default-features = false[^}]*rustls-no-provider/);
    assert.match(cargo, /rustls = \{[^}]*"ring"/);
    assert.equal(/"default-tls"/.test(cargo), false);
});

test('only a browser session store reveals an AI credential, and registry is the only reader', () => {
    const registry = read('src/ai/registry.ts');
    // The value is read exactly when the store is not OS-backed; an OS-backed store means the native
    // layer resolves it, and this side names the provider and nothing else.
    assert.match(registry, /const native = credentials\.kind === 'secure'/);
    assert.match(registry, /native \? '' : await credentials\.reveal\(credential\)/);
    // And no other module asks a credential store for a value at all.
    const askers = filesUnder(path.join(root, 'src'))
        .filter(file => /\.tsx?$/.test(file))
        .filter(file => /(credentials|store|active)\.reveal\(/.test(fs.readFileSync(file, 'utf8')))
        .map(file => path.relative(root, file).split(path.sep).join('/'));
    assert.deepEqual(askers, ['src/ai/registry.ts']);
});
