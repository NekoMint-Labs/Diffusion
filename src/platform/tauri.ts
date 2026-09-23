import type { SourceRecord } from '../core/model.ts';
import { safeWebURL, type PlatformAdapter, type PickedFile } from './contracts.ts';
const ORIGINAL_LIMIT = 32 * 1024 * 1024;
export class TauriPlatformAdapter implements PlatformAdapter {
    /** Desktop is the product where a person's own account is the normal way to have AI: a direct
     * provider connection needs no separately running gateway, and the bundled discovery engine is
     * present because it ships with the application rather than being installed alongside it. */
    platformCapabilities() { return { native: true, filePicker: true, openLocalOriginal: false, nativeSave: true, directProviders: true, bundledDiscovery: true, secureCredentials: true }; }
    async pickFiles(): Promise<PickedFile[]> {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const { readFile, stat } = await import('@tauri-apps/plugin-fs');
        const chosen = await open({ multiple: true, directory: false });
        if (!chosen)
            return [];
        const results: PickedFile[] = [];
        for (const path of Array.isArray(chosen) ? chosen : [chosen]) {
            const name = path.split(/[\\/]/).pop() || 'Source';
            try {
                const info = await stat(path);
                const blob = info.size <= ORIGINAL_LIMIT ? new Blob([Uint8Array.from(await readFile(path)).buffer]) : undefined;
                results.push({ name, type: '', size: info.size, blob, nativePath: path });
            }
            catch (error) {
                results.push({ name, type: '', size: 0, nativePath: path, error: String(error) });
            }
        }
        return results;
    }
    async openExternal(target: string) { const { openUrl } = await import('@tauri-apps/plugin-opener'); await openUrl(safeWebURL(target)); }
    async openOriginal(source: SourceRecord, original?: Blob) { if (source.url)
        return this.openExternal(source.url); if (!original)
        throw new Error('This original is not retained locally. Use the original file location; unrestricted native path opening is not enabled.'); const saved = await this.saveExport(new Uint8Array(await original.arrayBuffer()), source.title); if (!saved)
        throw new Error('Saving the original copy was cancelled.'); }
    async saveExport(data: Uint8Array, name: string) { const { save } = await import('@tauri-apps/plugin-dialog'); const { writeFile } = await import('@tauri-apps/plugin-fs'); const path = await save({ defaultPath: name }); if (!path)
        return false; await writeFile(path, data); return true; }
}
