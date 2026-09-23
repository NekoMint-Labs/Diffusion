import { useCallback, useEffect, useRef, useState } from 'react';
import { UNKNOWN_CAPABILITIES, type ConnectionCheck, type ThinkingCapabilities } from '../../ai/contracts.ts';
import { createThinkingProvider, probeProvider, type ThinkingSelection } from '../../ai/registry.ts';
import { isDirectProvider } from '../../ai/providers.ts';
import { classifyFailure, type ThinkingFailure } from '../../ai/errors.ts';
import type { CredentialStore } from '../../credentials/contracts.ts';
import { aiCredential } from '../../credentials/contracts.ts';

/** What is known about the selected provider, and the two deliberate actions that change it.
 *
 * The audit found capability probing tied to configuration changes, which put a network round trip
 * on every keystroke typed into a URL or key field. That is gone. There are now exactly two
 * moments when Diffusion talks to a provider about the provider:
 *
 *   - once at startup, for a configuration that was already stored (the status of what you had);
 *   - when the person presses Test connection or Refresh models.
 *
 * Everything else reads the inspected provider table, which needs no network. Editing anything
 * makes the state "configuration changed" rather than silently re-probing, so the control never
 * claims more than the last deliberate check established.
 */
export function useThinkingCapabilities({ selection, credentials, keyPresent }: {
    selection: ThinkingSelection;
    credentials: CredentialStore;
    keyPresent: boolean;
}) {
    const [capabilities, setCapabilities] = useState<ThinkingCapabilities | null>(null);
    const [check, setCheck] = useState<ConnectionCheck | null>(null);
    /** The last deliberate model listing *together with the endpoint that produced it*. One value,
     * so a list can never be offered against a configuration that did not answer it: a list fetched
     * from one endpoint used to stay on screen for the next provider the person selected. */
    const [listing, setListing] = useState<{ endpoint: string; models: string[] | null; failure: ThinkingFailure | null } | null>(null);
    const [busy, setBusy] = useState<'models' | 'connection' | null>(null);
    /** The configuration a successful verification belongs to. Anything else is unverified. */
    const [verified, setVerified] = useState<string | null>(null);
    const signature = `${selection.provider}\u0000${selection.gateway}\u0000${selection.token}\u0000${selection.baseUrl}\u0000${selection.protocol}\u0000${selection.model}\u0000${keyPresent ? 'key' : 'none'}`;
    const current = useRef(signature);
    current.current = signature;
    /** What a model listing belongs to: the provider and the address it was read from — deliberately
     * not the chosen model and deliberately not the credential. Typing a model id must not discard
     * the list it was chosen from, and committing a key must not discard a list that was read from
     * the same endpoint microseconds earlier. */
    const endpoint = `${selection.provider}\u0000${selection.gateway}\u0000${selection.baseUrl}`;

    const probe = useCallback(async (action: 'models' | 'connection') => {
        if (selection.provider === 'off') return;
        setBusy(action);
        try {
            // The gateway reports itself through its own capability answer; a direct provider is
            // asked for a real model list and a real bounded request. Both build the provider the
            // way a live request would, so a pass is evidence about the path that actually runs.
            if (selection.provider === 'gateway') {
                const provider = await createThinkingProvider(selection, credentials);
                const answer = await provider.capabilities(AbortSignal.timeout(20000));
                setCapabilities(answer);
                setCheck(answer === UNKNOWN_CAPABILITIES ? { ok: false, effectiveModel: null, failure: 'provider-unreachable' } : { ok: answer.configured, effectiveModel: answer.defaultModel });
                setVerified(current.current);
                return;
            }
            if (action === 'models') {
                const { models: listed } = await probeProvider(selection, credentials, 'models');
                setListing({ endpoint, models: listed ?? null, failure: null });
                return;
            }
            const provider = await createThinkingProvider(selection, credentials);
            setCapabilities(await provider.capabilities());
            const result = await probeProvider(selection, credentials, 'connection');
            setCheck(result.check ?? { ok: false, effectiveModel: null, failure: 'unsupported-capability' });
            setVerified(current.current);
        }
        catch (error) {
            // A deliberate action that failed has to say so. These two were unhandled rejections:
            // pressing Refresh models against an endpoint that is not answering produced a browser
            // error, an unchanged status and no sentence at all — visible effort with no answer.
            const failure = classifyFailure(error);
            if (action === 'models') setListing({ endpoint, models: null, failure });
            else setCheck({ ok: false, effectiveModel: null, failure });
        }
        finally {
            setBusy(null);
        }
    }, [selection, credentials, endpoint]);

    /** The one automatic check: the configuration that was already stored when the app started.
     * A stored configuration is stable, so this is not the per-keystroke behaviour the audit
     * rejected — but it runs exactly once, and only for a provider that needs a network to answer. */
    useEffect(() => {
        void (async () => {
            if (selection.provider === 'gateway' && selection.gateway.trim()) await probe('connection');
            else if (isDirectProvider(selection.provider)) {
                // Local only: reports what the provider table knows. No request is sent.
                const provider = await createThinkingProvider(selection, credentials);
                setCapabilities(await provider.capabilities());
            }
        })();
        // Deliberately runs once per credential store: later changes are owned by the two actions.
    }, [credentials]);

    /** Direct providers can report capabilities without any network, so the table stays current as
     * the model changes. Nothing here reaches the network. */
    useEffect(() => {
        if (!isDirectProvider(selection.provider)) return;
        if (signature === verified) return;
        let cancelled = false;
        void (async () => {
            const provider = await createThinkingProvider(selection, credentials);
            const answer = await provider.capabilities();
            if (!cancelled) setCapabilities(answer);
        })();
        return () => { cancelled = true; };
    }, [selection.provider, selection.model, selection.baseUrl, credentials, signature, verified]);

    return {
        capabilities, check, busy,
        /** The list only while it belongs to the configuration on screen. */
        models: listing?.endpoint === endpoint ? listing.models : null,
        /** Why the last listing attempt failed, when it did. Manual entry is never blocked by it. */
        modelFailure: listing?.endpoint === endpoint ? listing.failure : null,
        /** True when what is configured now is not what was last verified. */
        dirty: verified !== null && verified !== signature,
        verify: () => { void probe('connection'); },
        refreshModels: () => { void probe('models'); },
        /** A failure the last deliberate check reported, classified for the UI. */
        failure: check && !check.ok ? (check.failure ?? classifyFailure(null)) : undefined,
        credentialId: isDirectProvider(selection.provider) ? aiCredential(selection.provider) : null,
    };
}
