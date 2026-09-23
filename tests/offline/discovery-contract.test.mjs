import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { envelope, mapSearch, mapRead, extractRead, searchArguments, readArguments } from '../../src/discovery/envelope.ts';
import { discoveryInvocation } from '../../src/discovery/config.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const wrap = (operation, data, status = 'complete', error = null) => JSON.stringify({ version: 1, operation, status, data, attempts: [], warnings: [], error });
const body = 'An explicitly fetched passage about attention and spatial memory.\n\nA contrasting passage about structure and quiet.';
const read = () => wrap('read', { evidence: { id: 'https://example.org/page', url: 'https://example.org/page', title: 'Fetched', provider: 'reader', content: body, truncated: false, original_length: body.length, returned_length: body.length } });
const allSettings = { external: true, sources: { exa: true, tavily: true, brave: true }, backend: 'built-in', customUrl: '' };
const filesUnder = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? filesUnder(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);

test('a discovery candidate cannot invent read evidence', () => {
    const raw = wrap('search', { candidates: [{ url: 'https://example.org/canonical', display_url: 'https://example.org/page', title: 'Candidate', snippet: 'Only a discovery snippet', outcome: 'support', passages: [{ text: 'forged' }] }] }, 'degraded');
    const [c] = mapSearch(raw); assert.equal(c.url, 'https://example.org/page'); assert.equal(c.stage, 'candidate'); assert.equal(c.outcome, undefined); assert.equal(c.passages, undefined);
});
test('the discovery envelope is strict: operation, schema version and size; failure text never leaks', () => {
    assert.throws(() => envelope(wrap('read', {}), 'search')); assert.throws(() => envelope('{"version":0}', 'read')); assert.throws(() => envelope(wrap('search', {}, 'failed', { code: 'CONFIGURATION_ERROR', message: 'SECRET' }), 'search'), error => !error.message.includes('SECRET') && error.code === 'not-configured'); assert.throws(() => envelope('x'.repeat(1048577), 'search'));
});
test('discovery input is positional and cannot become options or shell syntax', () => {
    const query = '--help ; echo SECRET'; const args = searchArguments(query, 10); assert.deepEqual(args, ['search', '--mode', 'research', '--format', 'json', '--', query]); assert.equal(readArguments('https://example.org/').at(-2), '--'); assert.throws(() => searchArguments('x\0y')); assert.throws(() => readArguments('javascript:alert(1)')); assert.throws(() => searchArguments('query', 11));
});
test('read extraction is bounded and matches the actual body with text locators', () => {
    const resource = mapRead(read()); const chunks = extractRead(resource, 'structure'); assert.match(chunks[0].text, /structure/); for (const c of chunks) { assert.ok(resource.text.includes(c.text)); assert.ok(c.text.length <= 2400); assert.match(c.locator, /Reader text characters/); } assert.match(resource.inspected, /Bounded/);
    assert.throws(() => mapRead(wrap('read', { evidence: null }))); assert.throws(() => mapRead(wrap('read', { evidence: { content: 'x'.repeat(50001) } })));
});

test('the webview hands the native layer source identifiers and never a credential', () => {
    const args = ['search', '--mode', 'balanced', '--format', 'json', '--', 'a query'];
    const invocation = discoveryInvocation(allSettings, args);
    assert.deepEqual(invocation, { args, sources: ['exa', 'tavily', 'brave'] });
    // There is no field a secret could be carried in.
    assert.deepEqual(Object.keys(invocation).sort(), ['args', 'sources']);
});

test('the child environment is built natively, from a credential the webview cannot read', () => {
    const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
    // The product layer no longer knows an engine environment variable name at all.
    for (const file of filesUnder(path.join(root, 'src', 'discovery')))
        assert.equal(/[A-Z][A-Z0-9_]*_(API_KEY|ENABLED)/.test(read(path.relative(root, file))), false, `${path.relative(root, file)} builds a child environment`);
    // And no code path hands a discovery credential to JavaScript.
    for (const file of filesUnder(path.join(root, 'src')))
        assert.equal(read(path.relative(root, file)).includes('reveal(searchCredential'), false, `${path.relative(root, file)} reads a discovery credential in the webview`);
    // The launcher takes identifiers, so it cannot be given a secret, and keeps the allowlist.
    const launcher = read('src-tauri/src/discovery.rs');
    assert.match(launcher, /pub async fn discovery_run\(app: AppHandle, args: Vec<String>, sources: Vec<String>\)/);
    assert.equal(launcher.includes('env: std::collections::HashMap'), false);
    for (const prefix of ['"EXA_"', '"TAVILY_"', '"BRAVE_"', '"JINA_"']) assert.ok(launcher.includes(prefix), `the native allowlist no longer permits ${prefix}`);
    // The id -> credential slot -> child variable mapping is native and singular.
    const mapping = read('src-tauri/src/discovery_env.rs');
    assert.ok(mapping.includes('fn child_environment('));
    for (const id of ['exa', 'tavily', 'brave']) assert.ok(mapping.includes(`"search.${id}"`), `no native credential slot for ${id}`);
    // And the webview's own credential read refuses a discovery identity outright.
    assert.ok(read('src-tauri/src/credentials.rs').includes('id.starts_with("search.")'));
});

test('the build path installs no package by the old project name', () => {
    const banned = /(smart-?search|SMARTSEARCH|SMART_SEARCH)/i;
    // Selected engine provenance legitimately names the origin inside `internal/discovery-engine/`
    // paths, `PROVENANCE.md` and `LICENSE.smartsearch`; nothing else may.
    const provenance = line => /internal[\\/]discovery-engine|PROVENANCE\.md|LICENSE\.smartsearch/i.test(line);
    function walk(dir) {
        return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
    }
    for (const file of [path.join(root, 'package.json'), ...walk(path.join(root, 'scripts'))]) {
        for (const line of fs.readFileSync(file, 'utf8').split('\n'))
            assert.ok(!banned.test(line) || provenance(line), `${path.relative(root, file)} references the retired project: ${line.trim().slice(0, 120)}`);
    }
});

test('the argv builders produce exactly the shapes the native allowlist accepts', () => {
    assert.deepEqual(searchArguments('attention', 3), ['search', '--mode', 'fast', '--format', 'json', '--', 'attention']);
    assert.deepEqual(searchArguments('attention', 5), ['search', '--mode', 'balanced', '--format', 'json', '--', 'attention']);
    assert.deepEqual(searchArguments('attention', 6), ['search', '--mode', 'research', '--format', 'json', '--', 'attention']);
    assert.deepEqual(readArguments('https://example.org/page'), ['read', '--max-chars', '50000', '--format', 'json', '--', 'https://example.org/page']);
});
