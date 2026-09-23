export class HTTPResponseError extends Error {
    readonly status: number; readonly requestId?: string;
    constructor(status: number, requestId?: string) { super(`Upstream responded ${status}.${requestId ? ' Request ' + requestId + '.' : ''}`); this.name = 'HTTPResponseError'; this.status = status; this.requestId = requestId; }
}
/** Reject promptly while releasing unwanted response streams. Do not let a
 * transport cleanup failure replace a redacted diagnostic with upstream text.
 */
function discardBody(response: Response): void {
    void response.body?.cancel().catch(() => { /* The transport may already be closed. */ });
}
/** Bounded JSON transport used on both sides of the gateway boundary. */
export async function boundedJSON(response: Response, maxBytes = 512 * 1024): Promise<unknown> {
    if (!response.ok)
        { discardBody(response); const ref = response.headers.get('X-Request-ID') || ''; throw new HTTPResponseError(response.status, /^[a-zA-Z0-9-]{1,100}$/.test(ref) ? ref : undefined); }
    if (Number(response.headers.get('Content-Length') || 0) > maxBytes) {
        discardBody(response);
        throw new Error('Upstream response exceeds its byte budget.');
    }
    const reader = response.body?.getReader();
    if (!reader)
        throw new Error('Upstream returned an empty body.');
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.byteLength;
            if (size > maxBytes) {
                void reader.cancel().catch(() => { /* Keep the budget diagnostic. */ });
                throw new Error('Upstream response exceeds its byte budget.');
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.length;
    }
    // Native SyntaxError messages can quote the provider body. Keep its error
    // class (gateway classification), but do not retain the raw message/cause.
    try { return JSON.parse(new TextDecoder().decode(bytes)); }
    catch { throw new SyntaxError('Upstream returned malformed JSON.'); }
}
