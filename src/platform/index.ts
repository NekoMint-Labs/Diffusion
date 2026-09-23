import type { PlatformAdapter } from './contracts.ts';
import { BrowserPlatformAdapter } from './browser.ts';
export async function createPlatform(): Promise<PlatformAdapter> {
    // This is the only runtime platform switch. UI and Core use the adapter contract.
    if ('__TAURI_INTERNALS__' in window) {
        const { TauriPlatformAdapter } = await import('./tauri.ts');
        return new TauriPlatformAdapter();
    }
    return new BrowserPlatformAdapter();
}
