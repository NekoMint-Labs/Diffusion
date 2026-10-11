import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchSend } from '../../src/ai/transport.ts';

const request = { provider: 'compatible', url: 'https://provider.example/v1', method: 'POST', headers: {}, body: {} };

test('a broken response body is a connection failure and a later request can succeed', async () => {
    const original = globalThis.fetch;
    try {
        let calls = 0;
        globalThis.fetch = async () => ++calls === 1
            ? new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('private transport detail')); } }))
            : Response.json({ recovered: true });
        const send = fetchSend('Test');
        await assert.rejects(send.send(request, new AbortController().signal), { name: 'ThinkingError', failure: 'provider-unreachable', message: 'provider-unreachable' });
        assert.deepEqual(await send.send(request, new AbortController().signal), { recovered: true });
        assert.equal(calls, 2, 'recovery is explicit; the transport must not retry silently');
    } finally { globalThis.fetch = original; }
});

for (const name of ['AbortError', 'TimeoutError']) {
    test(`a body-level ${name} keeps its classification without an aborted caller signal`, async () => {
        const original = globalThis.fetch;
        try {
            const reason = new DOMException('private transport detail', name);
            globalThis.fetch = async () => {
                const response = new Response('{}');
                response.text = async () => { throw reason; };
                return response;
            };
            await assert.rejects(fetchSend('Test').send(request, new AbortController().signal), error => error === reason);
        } finally { globalThis.fetch = original; }
    });
    test(`a ${name} while reading the response keeps the caller's reason`, async () => {
        const original = globalThis.fetch;
        try {
            const abort = new AbortController();
            const reason = new DOMException('bounded caller reason', name);
            globalThis.fetch = async () => {
                const response = new Response('{}');
                response.text = async () => { abort.abort(reason); throw reason; };
                return response;
            };
            await assert.rejects(fetchSend('Test').send(request, abort.signal), error => error === reason);
        } finally { globalThis.fetch = original; }
    });
}

test('a complete invalid JSON body still reports an unreadable provider response', async () => {
    const original = globalThis.fetch;
    try {
        globalThis.fetch = async () => new Response('{');
        await assert.rejects(fetchSend('Test').send(request, new AbortController().signal), { failure: 'malformed-provider-response' });
    } finally { globalThis.fetch = original; }
});
