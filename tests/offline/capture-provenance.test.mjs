import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseCaptureOptions, capturePlan, assertNativeExecutionAllowed,
    createRunDirectory, verifyCheckoutSource } from '../../experiments/role-a-audit/capture-options.mjs';

const source = '0123456789abcdef0123456789abcdef01234567';
const nativeScript = fileURLToPath(new URL('../../experiments/role-a-audit/native-comparison.ts', import.meta.url));
const args = output => ['--source', source, '--role', 'candidate', '--flags', 'readingTrial=1,propositionTrial=1', '--out', output];

function temporaryDirectory(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'diffusion-capture-'));
    t.after(() => {
        assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
        assert.ok(path.basename(root).startsWith('diffusion-capture-'));
        fs.rmSync(root, { recursive: true, force: true });
    });
    return root;
}

test('explicit provenance and flags are required, independently of role', () => {
    const input = args('unused');
    for (const key of ['--source', '--role', '--flags', '--out']) {
        const missing = [...input];
        missing.splice(missing.indexOf(key), 2);
        assert.throws(() => parseCaptureOptions(missing, 'native'), /required/);
    }
    for (const [key, value] of [['--source', '86b072b'], ['--role', 'test'], ['--flags', 'other=1'], ['--flags', 'readingTrial=1,readingTrial=1'], ['--flags', 'propositionTrial=1']]) {
        const invalid = [...input];
        invalid[invalid.indexOf(key) + 1] = value;
        assert.throws(() => parseCaptureOptions(invalid, 'native'));
    }
    assert.throws(() => parseCaptureOptions([...input, '--port', '0'], 'native'), /port/);
    assert.throws(() => parseCaptureOptions([...input, '--port', '9e3'], 'native'), /port/);
    assert.throws(() => parseCaptureOptions([...input, '--scenarios', 'ask,ask'], 'native'), /scenario/);
    assert.throws(() => parseCaptureOptions([...input, '--scenarios', 'missing'], 'native'), /scenario/);
    const baseline = parseCaptureOptions(['--source', source, '--role', 'baseline', '--flags', 'readingTrial=1', '--out', 'unused'], 'native');
    assert.equal(capturePlan(baseline).url, 'http://tauri.localhost/?readingTrial=1');
    assert.equal(capturePlan(parseCaptureOptions(input, 'native')).url, 'http://tauri.localhost/?readingTrial=1&propositionTrial=1');
    assert.equal(baseline.execute, false);
    assert.match(capturePlan(baseline).sourceVerification, /NOT verified/);
    assert.equal(capturePlan(baseline).singleStepVerified, false);
});

test('native default preflight runs without application dependencies or CDP and creates no output', t => {
    const root = temporaryDirectory(t);
    const output = path.join(root, 'not-created');
    const result = spawnSync(process.execPath, ['--experimental-strip-types', nativeScript, ...args(output), '--port', '1'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(result.stdout);
    assert.equal(plan.declaredSource, source);
    assert.equal(plan.port, 1);
    assert.equal(plan.execute, false);
    assert.equal(fs.existsSync(output), false);
});

test('unadapted Angle and Diffuse execution fails before imports or output creation', t => {
    const root = temporaryDirectory(t);
    for (const name of ['angle', 'diffuse']) {
        const output = path.join(root, name);
        const options = parseCaptureOptions([...args(output), '--scenarios', name], 'native');
        assert.throws(() => assertNativeExecutionAllowed(options), /legacy capture/);
        const result = spawnSync(process.execPath, ['--experimental-strip-types', nativeScript, ...args(output), '--execute', '--scenarios', name], { encoding: 'utf8' });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Execution blocked/);
        assert.equal(fs.existsSync(output), false);
    }
    assert.doesNotThrow(() => assertNativeExecutionAllowed(parseCaptureOptions([...args('unused'), '--scenarios', 'ask,continue,correction,uncertainty'], 'native')));
});

test('output directories are exclusively created and prior results are never replaced', t => {
    const root = temporaryDirectory(t);
    const output = path.join(root, 'run');
    const plan = capturePlan(parseCaptureOptions(args(output), 'native'));
    createRunDirectory(output, plan);
    const sentinel = path.join(output, 'candidate-ask.json');
    fs.writeFileSync(sentinel, 'historical bytes');
    assert.throws(() => createRunDirectory(output, { changed: true }), { code: 'EEXIST' });
    const result = spawnSync(process.execPath, ['--experimental-strip-types', nativeScript, ...args(output), '--execute', '--scenarios', 'ask'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /EEXIST/);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'historical bytes');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, 'preflight.json'), 'utf8')), plan);
});

test('SSR rejects mismatched source and dirty checkout before application imports', t => {
    const root = temporaryDirectory(t);
    const git = command => execFileSync('git', command, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git(['init']);
    fs.writeFileSync(path.join(root, 'fixture.txt'), 'clean');
    git(['add', 'fixture.txt']);
    git(['-c', 'user.name=Capture fixture', '-c', 'user.email=capture@example.invalid', 'commit', '-m', 'fixture']);
    const head = git(['rev-parse', 'HEAD']).trim();
    assert.equal(verifyCheckoutSource(head, root), head);
    assert.throws(() => verifyCheckoutSource(source, root), /does not match/);
    fs.writeFileSync(path.join(root, 'fixture.txt'), 'changed');
    assert.throws(() => verifyCheckoutSource(head, root), /clean checkout/);
    fs.writeFileSync(path.join(root, 'fixture.txt'), 'clean');
    fs.writeFileSync(path.join(root, 'extra.txt'), 'untracked');
    assert.throws(() => verifyCheckoutSource(head, root), /clean checkout/);
});
