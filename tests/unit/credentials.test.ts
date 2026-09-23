import { describe, expect, it } from 'vitest';
import { createCredentialStore } from '../../src/credentials/index.ts';
import { sessionCredentialStore } from '../../src/credentials/session.ts';
import { aiCredential, searchCredential } from '../../src/credentials/contracts.ts';

/** The credential factory is a *shared* store, not a factory of throwaways.
 *
 * The defect this pins: `createCredentialStore(false)` returned a new `SessionCredentialStore` per
 * call, so a Settings surface wrote the key a person typed into an object nothing else held. The
 * field cleared, no error appeared, and the request that followed had no key — the web build's
 * primary configuration path was silently broken. Any future change that makes this factory
 * per-call again fails here. */
describe('the session credential store is one store for the whole build', () => {
    it('hands every caller the same map', async () => {
        const writer = await createCredentialStore(false);
        const reader = await createCredentialStore(false);
        expect(reader).toBe(writer);
        await writer.store(aiCredential('openai'), 'sk-a-realistic-key');
        expect(await reader.has(aiCredential('openai'))).toBe(true);
        expect(await reader.reveal(aiCredential('openai'))).toBe('sk-a-realistic-key');
        await writer.forget(aiCredential('openai'));
        expect(await reader.has(aiCredential('openai'))).toBe(false);
    });

    it('gives the synchronous seed the same store the factory resolves', async () => {
        // `useWorkspaceCapabilities` seeds React state before the asynchronous platform resolution
        // completes; a private instance there would put the writer and the reader on two maps again.
        expect(sessionCredentialStore()).toBe(await createCredentialStore(false));
    });

    it('holds AI and search identities in the same store without confusing them', async () => {
        const store = await createCredentialStore(false);
        await store.store(searchCredential('exa'), 'exa-key-0123456789');
        expect(await store.has(searchCredential('exa'))).toBe(true);
        expect(await store.has(aiCredential('openai'))).toBe(false);
        expect(await store.has(aiCredential('anthropic'))).toBe(false);
    });

    it('refuses an identity outside the closed vocabulary', async () => {
        const store = await createCredentialStore(false);
        await expect(store.store('secret.thing' as never, 'value-0123456789')).rejects.toThrow();
    });
});
