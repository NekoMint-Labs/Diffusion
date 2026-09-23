import type { CredentialStore } from './contracts.ts';
import { sessionCredentialStore } from './session.ts';

/** The one credential switch, next to the one platform switch and for the same reason: nothing
 * above this line decides where a secret lives.
 *
 * The session branch returns the build's *shared* store (`session.ts`), never a new one: a factory
 * of throwaways wrote a saved key into an object nothing else held, so the key was accepted,
 * reported no error, and was gone. */
export async function createCredentialStore(native: boolean): Promise<CredentialStore> {
    if (native) {
        const { NativeCredentialStore } = await import('./native.ts');
        return new NativeCredentialStore();
    }
    return sessionCredentialStore();
}
