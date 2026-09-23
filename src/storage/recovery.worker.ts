import { parseProjectExport, recoveredProject } from '../core/validation.ts';
self.onmessage = (event: MessageEvent<string>) => {
    try {
        const project = recoveredProject(parseProjectExport(event.data));
        self.postMessage({ ok: true, project });
    }
    catch (error) {
        self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
};
