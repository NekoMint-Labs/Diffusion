import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchSend, nativeSend } from '../../src/ai/transport.ts';
import { createServer } from 'node:http';

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
            await assert.rejects(fetchSend('Test').send(request, new AbortController().signal), {
                name: 'ThinkingError',
                failure: name === 'TimeoutError' ? 'timeout' : 'provider-unreachable',
                message: name === 'TimeoutError' ? 'timeout' : 'provider-unreachable',
            });
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
            await assert.rejects(fetchSend('Test').send(request, abort.signal), error => name === 'TimeoutError' ? error.failure === 'timeout' : error === reason);
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

for (const phase of ['fetch', 'body']) {
    for (const fault of ['offline', 'timeout', 'stop']) {
        test(`${phase} ${fault} retains the combined transport classification`, async () => {
            const original = globalThis.fetch;
            const signal = new AbortController();
            const stop = new DOMException('explicit caller cancellation', 'AbortError');
            const fail = () => {
                if (fault === 'stop') signal.abort(stop);
                throw fault === 'timeout' ? new DOMException('private deadline detail', 'TimeoutError') : new TypeError('private socket detail');
            };
            try {
                globalThis.fetch = async () => {
                    if (phase === 'fetch') fail();
                    const response = new Response('{}');
                    response.text = async () => fail();
                    return response;
                };
                await assert.rejects(fetchSend('Test').send(request, signal.signal), error => fault === 'stop' ? error === stop : error.failure === (fault === 'timeout' ? 'timeout' : 'provider-unreachable'));
            } finally { globalThis.fetch = original; }
        });
    }
}

test('oversized complete or declared envelopes remain malformed rather than transport failures', async () => {
    const original = globalThis.fetch;
    try {
        for (const response of [new Response('x'.repeat(512 * 1024 + 1)), new Response('{}', { headers: { 'Content-Length': String(512 * 1024 + 1) } })]) {
            globalThis.fetch = async () => response;
            await assert.rejects(fetchSend('Test').send(request, new AbortController().signal), { failure: 'malformed-provider-response' });
        }
    } finally { globalThis.fetch = original; }
});

test('native bridge deadlines normalize at the same boundary and explicit Stop keeps its reason', async () => {
    const bridge = { request: async () => { throw new DOMException('private detail', 'TimeoutError'); }, cancel: async () => {} };
    await assert.rejects(nativeSend('Test', bridge).send(request, new AbortController().signal), { failure: 'timeout' });
    const signal = new AbortController();
    const reason = new DOMException('caller Stop', 'AbortError');
    signal.abort(reason);
    await assert.rejects(nativeSend('Test', bridge).send(request, signal.signal), error => error === reason);
});

test('a real TCP body disconnect is not malformed JSON and a manual retry succeeds', async () => {
    let calls = 0;
    const server = createServer((_request, response) => {
        if (++calls === 1) {
            response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': '1000' });
            response.write('{"partial":');
            setTimeout(() => response.destroy(), 20);
        } else response.end('{"recovered":true}');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const endpoint = { ...request, url: `http://127.0.0.1:${server.address().port}` };
        const send = fetchSend('Test');
        await assert.rejects(send.send(endpoint, AbortSignal.timeout(3000)), { failure: 'provider-unreachable' });
        assert.equal(calls, 1, 'no automatic retry after a dropped connection');
        assert.deepEqual(await send.send(endpoint, AbortSignal.timeout(3000)), { recovered: true });
        assert.equal(calls, 2);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
