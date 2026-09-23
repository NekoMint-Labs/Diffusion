import { isCredentialId, type CredentialId, type CredentialStore } from './contracts.ts';

/** The browser's store. A session-only credential is deliberately not persistent: Diffusion keeps
 * no third-party provider secret on disk in a web build, and says so in Settings rather than
 * quietly writing one into browser storage. */
export class SessionCredentialStore implements CredentialStore {
    readonly kind = 'session' as const;
    private values = new Map<CredentialId, string>();
    async has(id: CredentialId): Promise<boolean> { return this.values.has(id); }
    async reveal(id: CredentialId): Promise<string> { return this.values.get(id) ?? ''; }
    async store(id: CredentialId, secret: string): Promise<void> {
        if (!isCredentialId(id)) throw new Error('Unusable credential identity.');
        if (secret) this.values.set(id, secret);
        else this.values.delete(id);
    }
    async forget(id: CredentialId): Promise<void> { this.values.delete(id); }
}

/** The one session store of this build, not one per caller.
 *
 * That is the whole difference between a key that works and a key that silently disappears: a
 * surface that stores a secret must be writing into the same map the request path reads from. A
 * fresh instance per call accepted a key, reported no error, and handed the transport an empty
 * one — the blocker a build without an operating-system keychain hit on its primary configuration
 * path. Declared here, next to the store itself, so the invariant cannot be lost by a caller that
 * resolves it a second way (the synchronous seed in `useWorkspaceCapabilities` included). */
let shared: CredentialStore | null = null;
export function sessionCredentialStore(): CredentialStore {
    return shared ??= new SessionCredentialStore();
}
