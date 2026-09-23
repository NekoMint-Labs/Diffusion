import test from 'node:test';
import assert from 'node:assert/strict';
import { SourceParser } from '../../src/evidence/parser.ts';
import { boundedJSON, HTTPResponseError } from '../../src/shared/http.ts';

function installWorker(behavior = () => {}) {
    const old = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
    const workers = [];
    class FakeWorker {
        onmessage; onerror; terminated = false; posts = 0;
        constructor() { workers.push(this); }
        postMessage(message) { this.posts++; behavior(this, message); }
        terminate() { this.terminated = true; }
    }
    Object.defineProperty(globalThis, 'Worker', { configurable: true, value: FakeWorker });
    return { workers, restore() { if (old) Object.defineProperty(globalThis, 'Worker', old); else delete globalThis.Worker; } };
}
const file = blob => ({ name: 'notes.txt', type: 'text/plain', size: 5, blob });

test('worker disposal during Blob read resolves honestly without posting or waiting', async () => {
    const mock = installWorker(); const parser = new SourceParser();
    let finishRead;
    const blob = { slice: () => ({ arrayBuffer: () => new Promise(resolve => { finishRead = resolve; }) }) };
    try {
        const pending = parser.parse(file(blob));
        parser.dispose(); finishRead(new ArrayBuffer(5));
        const result = await pending;
        assert.equal(result.status, 'limited'); assert.equal(result.excerpt, '');
        assert.equal(mock.workers[0].posts, 0); assert.equal(mock.workers[0].terminated, true);
        assert.equal(parser.waiting.size, 0);
    } finally { parser.dispose(); mock.restore(); }
});
test('postMessage failure leaves no request/timer and does not claim extraction', async () => {
    const mock = installWorker(() => { throw new Error('Transfer failed'); });
    const parser = new SourceParser();
    try {
        const result = await parser.parse(file(new Blob(['notes'])));
        assert.equal(result.status, 'limited'); assert.equal(result.excerpt, '');
        assert.equal(parser.waiting.size, 0);
    } finally { parser.dispose(); mock.restore(); }
});
test('worker failure settles all queued requests and ignores late replies', async () => {
    const messages = []; const mock = installWorker((_worker, message) => messages.push(message));
    const parser = new SourceParser();
    try {
        const pending = [parser.parse(file(new Blob(['one']))), parser.parse(file(new Blob(['two'])))];
        await new Promise(resolve => setTimeout(resolve, 0));
        assert.equal(messages.length, 2); mock.workers[0].onerror();
        for (const result of await Promise.all(pending)) assert.equal(result.status, 'limited');
        assert.equal(parser.waiting.size, 0);
        mock.workers[0].onmessage({ data: { id: messages[0].id, result: { status: 'ready', excerpt: 'late' } } });
        assert.equal(parser.waiting.size, 0);
    } finally { parser.dispose(); mock.restore(); }
});
test('successful worker extraction still returns its real result', async () => {
    const expected = { status: 'ready', excerpt: 'notes', inspected: '5 bytes' };
    const mock = installWorker((worker, message) => queueMicrotask(() => worker.onmessage({ data: { id: message.id, result: expected } })));
    const parser = new SourceParser();
    try { assert.deepEqual(await parser.parse(file(new Blob(['notes']))), expected); assert.equal(parser.waiting.size, 0); }
    finally { parser.dispose(); mock.restore(); }
});

test('HTTP errors cancel untrusted bodies and only retain safe request identifiers', async () => {
    let canceled = false;
    const body = new ReadableStream({ cancel() { canceled = true; throw new Error('SECRET from transport'); } });
    await assert.rejects(boundedJSON(new Response(body, { status: 401, headers: { 'X-Request-ID': 'req-safe-42' } })), error => {
        assert.ok(error instanceof HTTPResponseError); assert.equal(error.status, 401);
        assert.equal(error.requestId, 'req-safe-42'); assert.ok(!error.message.includes('SECRET')); return true;
    });
    assert.equal(canceled, true);
    await assert.rejects(boundedJSON(new Response('private upstream body', { status: 500, headers: { 'X-Request-ID': 'secret/key?token=123' } })), error => { assert.equal(error.requestId, undefined); assert.ok(!error.message.includes('token')); return true; });
});
test('declared response overflow cancels without reading a body', async () => {
    let canceled = false; let reads = 0;
    const stream = new ReadableStream({ pull() { reads++; }, cancel() { canceled = true; } }, { highWaterMark: 0 });
    await assert.rejects(boundedJSON(new Response(stream, { headers: { 'Content-Length': '1000' } }), 20), /byte budget/);
    assert.equal(canceled, true); assert.equal(reads, 0);
});
test('streamed overflow retains a bounded diagnostic even if cancellation rejects', async () => {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(30)); }, cancel() { throw new Error('SECRET'); } });
    await assert.rejects(boundedJSON(new Response(stream), 20), /byte budget/);
    assert.equal(stream.locked, false);
    assert.deepEqual(await boundedJSON(new Response('{"ok":true}'), 20), { ok: true });
});

test('malformed successful responses preserve validation classification without quoting their body', async () => {
    await assert.rejects(boundedJSON(new Response('SENTINEL')), error => {
        assert.ok(error instanceof SyntaxError);
        assert.equal(error.message, 'Upstream returned malformed JSON.');
        assert.ok(!error.message.includes('SENTINEL'));
        assert.equal(error.cause, undefined);
        return true;
    });
});
