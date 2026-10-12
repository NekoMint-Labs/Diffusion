import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchSend, nativeSend } from '../../src/ai/transport.ts';
import { ThinkingError } from '../../src/ai/errors.ts';

const request = { provider: 'compatible', url: 'https://provider.example/v1', method: 'POST', headers: {}, body: {} };

async function interrupted(path, fault, abort) {
    const original = globalThis.fetch;
    const caller = new AbortController();
    const fail = () => { if (abort !== undefined) caller.abort(abort); throw fault; };
    globalThis.fetch = async () => {
        if (path === 'fetch') return fail();
        const response = new Response('{}');
        response.text = async () => fail();
        return response;
    };
    const send = path === 'native'
        ? nativeSend('Fixture', { request: async () => fail(), cancel: async () => {} })
        : fetchSend('Fixture');
    try { return await send.send(request, caller.signal).catch(error => error); }
    finally { globalThis.fetch = original; }
}

for (const path of ['fetch', 'body', 'native']) {
    for (const name of ['AbortError', 'TimeoutError', 'TypeError']) {
        test('PATH: independent NAME is a normalized failure'.replace('PATH', path).replace('NAME', name), async () => {
            const fault = name === 'TypeError' ? new TypeError('private transport details') : new DOMException('private transport details', name);
            const error = await interrupted(path, fault);
            assert.ok(error instanceof ThinkingError);
            assert.equal(error.failure, name === 'TimeoutError' ? 'timeout' : 'provider-unreachable');
            assert.equal(error.message, error.failure);
        });
    }
    test('PATH: explicit caller cancellation keeps its identity'.replace('PATH', path), async () => {
        const reason = new DOMException('Explicit Stop', 'AbortError');
        assert.equal(await interrupted(path, new TypeError('private transport details'), reason), reason);
    });
    for (const reason of ['timeout', new DOMException('Expired', 'TimeoutError')]) {
        test('PATH: caller deadline TYPE is normalized'.replace('PATH', path).replace('TYPE', typeof reason), async () => {
            const error = await interrupted(path, new DOMException('private detail', 'AbortError'), reason);
            assert.ok(error instanceof ThinkingError);
            assert.equal(error.failure, 'timeout');
            assert.equal(error.message, 'timeout');
        });
    }
}

test('a broken response stream fails once; only an explicit later request recovers', async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => ++calls === 1
        ? new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('private body details')); } }))
        : Response.json({ recovered: true });
    try {
        const send = fetchSend('Fixture');
        await assert.rejects(send.send(request, new AbortController().signal), { failure: 'provider-unreachable', message: 'provider-unreachable' });
        assert.equal(calls, 1);
        assert.deepEqual(await send.send(request, new AbortController().signal), { recovered: true });
        assert.equal(calls, 2);
    } finally { globalThis.fetch = original; }
});

test('a completely received invalid JSON body remains a provider format failure', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => new Response('{');
    try {
        await assert.rejects(fetchSend('Fixture').send(request, new AbortController().signal), { failure: 'malformed-provider-response' });
    } finally { globalThis.fetch = original; }
});
