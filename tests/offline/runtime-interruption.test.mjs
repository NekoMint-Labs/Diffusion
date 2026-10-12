import test from 'node:test';
import assert from 'node:assert/strict';
import { AIRuntime } from '../../src/ai/runtime.ts';
import { fetchSend, nativeSend } from '../../src/ai/transport.ts';
import { UNKNOWN_CAPABILITIES } from '../../src/ai/contracts.ts';
import { createProject, makeThought } from '../../src/core/model.ts';
import { ProjectController } from '../../src/core/controller.ts';

function fixture(respond) {
    const project = createProject('interruptions', 'Interruptions', 1);
    project.thoughts.a = makeThought('Keep this original thought', { x: 0, y: 0 }, 1, 'a');
    const controller = new ProjectController(project, async () => {});
    const operations = [], failures = [], notices = [];
    const provider = { label: 'Fixture', mock: false, capabilities: async () => UNKNOWN_CAPABILITIES, respond, structured: respond };
    const runtime = new AIRuntime(controller, async () => provider, {
        pending: () => {}, operation: value => operations.push(value), failure: value => failures.push(value),
        notice: value => notices.push(value), route: () => {}, anchor: () => ({ x: 0, y: 0 }),
    });
    return { controller, runtime, operations, failures, notices };
}
const request = { provider: 'compatible', url: 'https://provider.example/v1', method: 'POST', headers: {}, body: {} };

for (const path of ['fetch', 'body', 'native']) {
    test(`Continue: independent ${path} abort is a connection failure, retained data and explicit recovery`, async () => {
        const original = globalThis.fetch;
        let calls = 0;
        const interrupted = new DOMException('private transport detail', 'AbortError');
        globalThis.fetch = async () => {
            if (path === 'fetch') throw interrupted;
            const response = new Response('{}');
            response.text = async () => { throw interrupted; };
            return response;
        };
        const send = path === 'native'
            ? nativeSend('Fixture', { request: async () => { throw interrupted; }, cancel: async () => {} })
            : fetchSend('Fixture');
        const f = fixture(async (_packet, _intent, signal) => {
            calls++;
            if (calls === 1) await send.send(request, signal);
            return { intents: [], providerLabel: 'Fixture', mock: false };
        });
        try {
            assert.equal((await f.runtime.run('continue', 'Continue', ['a'])).status, 'failed');
            assert.equal(f.operations.at(-1).phase, 'failed');
            assert.deepEqual(f.failures, ['provider-unreachable']);
            assert.equal(calls, 1, 'no automatic retry');
            assert.equal(f.controller.getSnapshot().project.thoughts.a.text, 'Keep this original thought');
            assert.ok(!f.notices.some(text => /stopped|private transport detail/i.test(text)));
            assert.equal((await f.runtime.run('continue', 'Continue', ['a'])).status, 'completed');
            assert.equal(calls, 2);
        } finally { globalThis.fetch = original; }
    });
}

test('Continue: explicit Stop still cancels without a connection error', async () => {
    const f = fixture(async (_packet, _intent, signal) => {
        f.runtime.cancel();
        throw signal.reason;
    });
    assert.equal((await f.runtime.run('continue', 'Continue', ['a'])).status, 'cancelled');
    assert.equal(f.operations.at(-1).phase, 'cancelled');
    assert.deepEqual(f.failures, []);
});

for (const action of ['continue', 'ingest']) {
    for (const name of ['AbortError', 'TimeoutError']) {
        test(`${action}: independent ${name} fails rather than claiming user cancellation`, async () => {
            const f = fixture(async () => { throw new DOMException('private detail', name); });
            const result = action === 'ingest' ? await f.runtime.ingest('Original input', 'input') : await f.runtime.run('continue', 'Continue', ['a']);
            assert.equal(result.status, 'failed');
            assert.equal(f.operations.at(-1).phase, 'failed');
            assert.deepEqual(f.failures, [name === 'AbortError' ? 'provider-unreachable' : 'timeout']);
        });
    }
    test(`${action}: parent deadline is a failure even when already expired`, async () => {
        const f = fixture(async () => { throw new Error('must not request'); });
        const abort = new AbortController(); abort.abort(new DOMException('Expired', 'TimeoutError'));
        const result = action === 'ingest' ? await f.runtime.ingest('Original input', 'input', { signal: abort.signal }) : await f.runtime.run('continue', 'Continue', ['a'], { signal: abort.signal });
        assert.equal(result.status, 'failed');
        assert.deepEqual(f.failures, ['timeout']);
        assert.equal(f.runtime.requestCount, 0);
    });
}
