/** Credentials have their own identity, and it is disjoint from the thing they belong to.
 *
 * A stored secret is addressed by a stable id and never by a value. That is what lets the Settings
 * record say "a key is present for Anthropic" without ever containing one, lets a provider be
 * switched without leaking the previous provider's key into the new one, and lets the intent that
 * a failed request should be retryable survive a visit to Settings. */
export type CredentialId = string;
export const aiCredential = (providerId: string): CredentialId => `ai.${providerId}`;
export const searchCredential = (sourceId: string): CredentialId => `search.${sourceId}`;
const CREDENTIAL_ID = /^(ai|search)\.[a-z][a-z0-9-]{0,23}$/;
export function isCredentialId(value: string): value is CredentialId { return CREDENTIAL_ID.test(value); }

/** Where a secret lives.
 *
 * `secure` means an operating-system credential store that survives a restart and is not readable
 * as a file in the application's own storage. `session` means memory only — the honest answer for
 * a browser deployment, where Diffusion keeps no third-party provider secret on disk at all.
 */
export interface CredentialStore {
    readonly kind: 'secure' | 'session';
    has(id: CredentialId): Promise<boolean>;
    /** Reads one secret for one request. Callers must not retain, log or display the result. */
    reveal(id: CredentialId): Promise<string>;
    store(id: CredentialId, secret: string): Promise<void>;
    forget(id: CredentialId): Promise<void>;
}
