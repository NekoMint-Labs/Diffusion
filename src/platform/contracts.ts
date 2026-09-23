import type { SourceRecord } from '../core/model.ts';
export interface PickedFile {
    name: string;
    type: string;
    size: number;
    blob?: Blob;
    nativePath?: string;
    error?: string;
}
export interface PlatformCapabilities {
    native: boolean;
    filePicker: boolean;
    openLocalOriginal: boolean;
    nativeSave: boolean;
    /** Whether this build may talk to an AI provider directly with a credential the user holds.
     * Desktop may. A web deployment leads with the Diffusion Gateway rather than pretending that
     * browser-direct provider access is universally safe, possible, or deployable. */
    directProviders: boolean;
    /** Whether a bundled external-discovery engine exists on this platform. */
    bundledDiscovery: boolean;
    /** Whether credentials can be kept in an OS-backed store instead of only this session. */
    secureCredentials: boolean;
}
export interface PlatformAdapter {
    pickFiles(): Promise<PickedFile[]>;
    openExternal(target: string): Promise<void>;
    openOriginal(source: SourceRecord, original?: Blob): Promise<void>;
    saveExport(data: Uint8Array, name: string, mime?: string): Promise<boolean>;
    platformCapabilities(): PlatformCapabilities;
}
export function safeWebURL(value: string): string {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
        throw new Error('Only credential-free HTTP(S) links can be opened.');
    return url.href;
}
export const asPickedFile = (file: File): PickedFile => ({ name: file.name, type: file.type, size: file.size, blob: file });
