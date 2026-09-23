import type { SourceRecord } from '../core/model.ts';
import { safeWebURL, asPickedFile, type PlatformAdapter, type PickedFile } from './contracts.ts';
function download(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name.replace(/[\\/\x00-\x1f]/g, '_');
    a.rel = 'noopener';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export class BrowserPlatformAdapter implements PlatformAdapter {
    /** A web deployment leads with the Diffusion Gateway. Diffusion does not pretend that
     * browser-direct provider access is universally safe, possible or deployable, so this build
     * reports it as unavailable and keeps any provider secret session-only when it is used. */
    platformCapabilities() { return { native: false, filePicker: true, openLocalOriginal: false, nativeSave: false, directProviders: false, bundledDiscovery: false, secureCredentials: false }; }
    pickFiles(): Promise<PickedFile[]> { return new Promise(resolve => { const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.style.display = 'none'; document.body.append(input); const finish = (files: PickedFile[]) => { input.remove(); resolve(files); }; input.onchange = () => finish(Array.from(input.files ?? []).map(asPickedFile)); input.addEventListener('cancel', () => finish([]), { once: true }); input.click(); }); }
    async openExternal(target: string) { const opened = window.open(safeWebURL(target), '_blank', 'noopener,noreferrer'); if (opened)
        opened.opener = null; }
    async openOriginal(source: SourceRecord, original?: Blob) {
        if (source.url) {
            await this.openExternal(source.url);
            return;
        }
        if (!original)
            throw new Error('Original bytes are not available in this browser.');
        // Do not navigate to an untrusted HTML/SVG blob on the application's origin.
        download(original, source.title);
    }
    async saveExport(data: Uint8Array, name: string, mime = 'application/octet-stream') { download(new Blob([Uint8Array.from(data).buffer], { type: mime }), name); return true; }
}
