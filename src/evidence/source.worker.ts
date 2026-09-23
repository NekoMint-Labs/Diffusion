/// <reference lib="webworker" />
import { extractBytes, type ExtractInput } from './extract.ts';
self.onmessage = (event: MessageEvent<{
    id: string;
    input: ExtractInput;
}>) => { const { id, input } = event.data; try {
    self.postMessage({ id, result: extractBytes(input) });
}
catch (error) {
    self.postMessage({ id, result: { status: 'unavailable', excerpt: '', inspected: 'Extraction failed.', error: String(error) } });
} };
