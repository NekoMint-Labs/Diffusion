import { ThinkingError } from '../../ai/errors.ts';

/** An unresponsive reader/engine cannot hold the UI after Stop, offline or the deadline. */
export function evidenceRequest<T>(run: () => Promise<T>, signal: AbortSignal): Promise<T> {
    const reason = () => signal.reason === 'timeout' || signal.reason === 'network-unavailable'
        ? new ThinkingError(signal.reason) : signal.reason ?? new DOMException('Cancelled', 'AbortError');
    if (signal.aborted) return Promise.reject(reason());
    let aborted: () => void;
    return new Promise<T>((resolve, reject) => {
        aborted = () => reject(reason());
        signal.addEventListener('abort', aborted, { once: true });
        Promise.resolve().then(() => { if (signal.aborted) throw reason(); return run(); }).then(resolve, reject);
    }).finally(() => signal.removeEventListener('abort', aborted));
}
