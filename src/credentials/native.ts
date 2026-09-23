import { isCredentialId, type CredentialId, type CredentialStore } from './contracts.ts';

/** The desktop store, backed by the operating system's own credential mechanism.
 *
 * The webview never learns where a secret is kept: it asks the native layer whether one exists, asks
 * for it to be stored or removed, and nothing more. `reveal` is part of the shared credential
 * interface because a browser build implements it, but on Desktop no surface has a legitimate use for
 * a stored value — discovery resolves its own key and the provider transport resolves the other — so
 * the native layer refuses every identity rather than returning one. Nothing here touches IndexedDB,
 * localStorage, the Settings record, an export, a log or a screenshot. */
export class NativeCredentialStore implements CredentialStore {
    readonly kind = 'secure' as const;
    private async call<T>(command: string, args: Record<string, unknown>): Promise<T> {
        const { invoke } = await import('@tauri-apps/api/core');
        return invoke<T>(command, args);
    }
    /** Presence only. Called to render Settings, so it must never return a value.
     *
     * There is deliberately no enumeration: an OS credential store is not portably listable, and
     * Diffusion does not need one. Identities come from a closed vocabulary (`ai.<provider>`,
     * `search.<source>`), so asking about the ones that exist is both sufficient and the only
     * version of this question that cannot expose unrelated entries the user has stored. */
    async has(id: CredentialId): Promise<boolean> {
        if (!isCredentialId(id)) return false;
        return await this.call<boolean>('credential_has', { id }) === true;
    }
    /** Refused by the native layer. Kept because it is part of the credential interface a browser
     * build implements; a Desktop caller gets a failure instead of a secret, which is the honest
     * answer for a request that should never have been made. */
    async reveal(id: CredentialId): Promise<string> {
        if (!isCredentialId(id)) return '';
        const value = await this.call<unknown>('credential_get', { id });
        return typeof value === 'string' ? value : '';
    }
    async store(id: CredentialId, secret: string): Promise<void> {
        if (!isCredentialId(id)) throw new Error('Unusable credential identity.');
        if (secret) await this.call('credential_set', { id, secret });
        else await this.call('credential_delete', { id });
    }
    async forget(id: CredentialId): Promise<void> {
        if (!isCredentialId(id)) return;
        await this.call('credential_delete', { id });
    }
}
