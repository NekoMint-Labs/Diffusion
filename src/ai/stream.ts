import type { AIProvider, StructuredRequest, StructuredResponse } from './contracts.ts';

export type StructuredStreamEvent =
    | { type: 'activity' }
    | { type: 'complete'; response: StructuredResponse };

/** Provider-neutral semantic seam. Providers may eventually yield real structured events; providers
 * that only validate a complete object use the atomic fallback. Half a JSON string is never meaning. */
export async function* streamStructuredTask(provider: AIProvider, request: StructuredRequest, signal?: AbortSignal): AsyncGenerator<StructuredStreamEvent> {
    if (provider.streamStructured) {
        yield* provider.streamStructured(request, signal);
        return;
    }
    yield { type: 'activity' };
    yield { type: 'complete', response: await provider.structured(request, signal) };
}

export async function completeStructuredTask(provider: AIProvider, request: StructuredRequest, signal?: AbortSignal): Promise<StructuredResponse> {
    let complete: StructuredResponse | null = null;
    for await (const event of streamStructuredTask(provider, request, signal)) {
        if (event.type === 'complete') complete = event.response;
    }
    if (!complete) throw new Error('Structured provider stream ended without a complete result.');
    return complete;
}

/** Minimal SSE reader for providers that expose streaming later.
 * Architecture follows the MIT-licensed reader patterns in Graphologue and tldraw's Agent starter:
 * persistent buffer, complete-event parsing, AbortSignal ownership, and reader lock release.
 * It deliberately returns transport payloads only; product code decides when a payload is complete
 * enough to become a semantic event. */
export async function* readSSEData(response: Response, signal?: AbortSignal): AsyncGenerator<string> {
    if (!response.body) throw new Error('Streaming response has no body.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const abort = () => { void reader.cancel().catch(() => undefined); };
    signal?.addEventListener('abort', abort, { once: true });
    try {
        while (true) {
            if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
            const { done, value } = await reader.read();
            if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let boundary = /\r?\n\r?\n/.exec(buffer);
            while (boundary?.index !== undefined) {
                const event = buffer.slice(0, boundary.index).replace(/\r/g, '');
                buffer = buffer.slice(boundary.index + boundary[0].length);
                const data = event.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
                if (data) yield data;
                boundary = /\r?\n\r?\n/.exec(buffer);
            }
        }
        buffer += decoder.decode();
        // No blank-line delimiter means the tail is not a complete SSE event. Never promote it.
    }
    finally {
        signal?.removeEventListener('abort', abort);
        reader.releaseLock();
    }
}
