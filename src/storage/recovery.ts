import type { ProjectState } from '../core/model.ts';
/** Never JSON-parse an untrusted multi-megabyte project on the interaction thread. */
export async function readRecovery(blob: Blob, signal: AbortSignal): Promise<ProjectState> {
    if (blob.size > 10 * 1024 * 1024)
        throw new Error('Choose an export smaller than 10 MiB.');
    const text = await blob.text();
    if (signal.aborted)
        throw new DOMException('Cancelled', 'AbortError');
    return new Promise((resolve, reject) => {
        let worker: Worker;
        try {
            worker = new Worker(new URL('./recovery.worker.ts', import.meta.url), { type: 'module' });
        }
        catch {
            reject(new Error('The background recovery worker is unavailable. Your existing Field has not changed.'));
            return;
        }
        const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); worker.terminate(); };
        const abort = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
        const timer = setTimeout(() => { cleanup(); reject(new Error('Project validation exceeded its time budget.')); }, 12000);
        signal.addEventListener('abort', abort, { once: true });
        worker.onerror = () => { cleanup(); reject(new Error('Project recovery worker failed. No project was written.')); };
        worker.onmessage = (event: MessageEvent<{
            ok: boolean;
            project?: ProjectState;
            error?: string;
        }>) => { cleanup(); if (event.data.ok && event.data.project)
            resolve(event.data.project);
        else
            reject(new Error(event.data.error || 'Project validation failed.')); };
        try {
            worker.postMessage(text);
        }
        catch (error) {
            cleanup();
            reject(error);
        }
    });
}
