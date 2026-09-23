import { id } from '../core/model.ts';
import type { PickedFile } from '../platform/contracts.ts';
import { extractBytes, isTextSource, TEXT_READ_LIMIT, type ExtractInput, type Extraction } from './extract.ts';
export class SourceParser {
    private worker: Worker | null = null;
    private waiting = new Map<string, {
        resolve: (r: Extraction) => void;
        timer: ReturnType<typeof setTimeout>;
    }>();
    constructor() { try {
        this.worker = new Worker(new URL('./source.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (event: MessageEvent<{
            id: string;
            result: Extraction;
        }>) => { const pending = this.waiting.get(event.data.id); if (pending) {
            clearTimeout(pending.timer);
            this.waiting.delete(event.data.id);
            pending.resolve(event.data.result);
        } };
        this.worker.onerror = () => this.dispose();
    }
    catch { /* Metadata-only degradation below, not a renderer-thread parser. */ } }
    async parse(file: PickedFile): Promise<Extraction> {
        const input: ExtractInput = { name: file.name, mime: file.type, size: file.size, error: file.error };
        if (!isTextSource(file.name, file.type) || file.error)
            return extractBytes(input);
        const worker = this.worker;
        if (!worker)
            return { status: 'limited', excerpt: '', inspected: 'Metadata only; the background extraction worker is unavailable.' };
        try {
            if (file.blob)
                input.bytes = await file.blob.slice(0, TEXT_READ_LIMIT).arrayBuffer();
        }
        catch (error) {
            input.error = String(error);
        }
        // dispose/error may happen while the browser is reading the Blob.
        if (this.worker !== worker)
            return { status: 'limited', excerpt: '', inspected: 'Metadata only; extraction worker stopped.' };
        const key = id('parse');
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                this.waiting.delete(key);
                resolve({ status: 'unavailable', excerpt: '', inspected: 'Extraction exceeded its time budget.' });
            }, 10000);
            this.waiting.set(key, { resolve, timer });
            try { worker.postMessage({ id: key, input }, input.bytes ? [input.bytes] : []); }
            catch {
                // A failed transfer must not leak a timer or an unresolved request.
                clearTimeout(timer);
                this.waiting.delete(key);
                resolve({ status: 'limited', excerpt: '', inspected: 'Metadata only; background extraction could not start.' });
            }
        });
    }
    dispose() { this.worker?.terminate(); this.worker = null; for (const { resolve, timer } of this.waiting.values()) {
        clearTimeout(timer);
        resolve({ status: 'limited', excerpt: '', inspected: 'Metadata only; extraction worker stopped.' });
    } this.waiting.clear(); }
}
