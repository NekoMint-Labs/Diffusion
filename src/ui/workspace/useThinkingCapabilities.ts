import { useCallback, useEffect, useRef, useState } from 'react';
import { UNKNOWN_CAPABILITIES, type ConnectionCheck, type ThinkingCapabilities } from '../../ai/contracts.ts';
import { createThinkingProvider, probeProvider, type ThinkingSelection } from '../../ai/registry.ts';
import { isDirectProvider } from '../../ai/providers.ts';
import { classifyFailure, type ThinkingFailure } from '../../ai/errors.ts';
import type { CredentialStore } from '../../credentials/contracts.ts';
import { aiCredential } from '../../credentials/contracts.ts';

/** Local metadata is passive. Only Test connection and Refresh models contact a provider.
 * Every answer belongs to the configuration and credential revision that started its request. */
export function useThinkingCapabilities({ selection, credentials, keyPresent, credentialRevision = 0 }: {
    selection: ThinkingSelection;
    credentials: CredentialStore;
    keyPresent: boolean;
    credentialRevision?: number;
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
    const signature = `${selection.provider}\u0000${selection.gateway}\u0000${selection.token}\u0000${selection.baseUrl}\u0000${selection.protocol}\u0000${selection.model}\u0000${keyPresent ? 'key' : 'none'}\u0000${credentialRevision}`;
    const requestEpoch = useRef(0);
    const current = useRef(signature);
    current.current = signature;
    // Editing the chosen model retains its list; endpoint, protocol or credential changes do not.
    const endpoint = `${selection.provider}\u0000${selection.gateway}\u0000${selection.baseUrl}\u0000${selection.protocol}\u0000${credentialRevision}`;

    useEffect(() => {
        requestEpoch.current++; setBusy(null); setCheck(null);
        if (!isDirectProvider(selection.provider)) setCapabilities(null);
        return () => { requestEpoch.current++; };
    }, [signature]);
    const probe = useCallback(async (action: 'models' | 'connection') => {
        if (selection.provider === 'off') return;
        const epoch = ++requestEpoch.current, requested = signature;
        const isCurrent = () => epoch === requestEpoch.current && requested === current.current;
        setBusy(action);
        try {
            // The gateway reports itself through its own capability answer; a direct provider is
            // asked for a real model list and a real bounded request. Both build the provider the
            // way a live request would, so a pass is evidence about the path that actually runs.
            if (selection.provider === 'gateway') {
                const provider = await createThinkingProvider(selection, credentials);
                const answer = await provider.capabilities(AbortSignal.timeout(20000));
                if (!isCurrent()) return;
                setCapabilities(answer);
                // A capability response proves reachability, not a successful model request.
                setCheck(answer === UNKNOWN_CAPABILITIES ? { ok: false, effectiveModel: null, failure: 'provider-unreachable' } : null);
                setVerified(requested);
                return;
            }
            if (action === 'models') {
                const { models: listed } = await probeProvider(selection, credentials, 'models');
                if (!isCurrent()) return;
                setListing({ endpoint, models: listed ?? null, failure: null });
                return;
            }
            const provider = await createThinkingProvider(selection, credentials);
            const answer = await provider.capabilities();
            if (!isCurrent()) return;
            setCapabilities(answer);
            const result = await probeProvider(selection, credentials, 'connection');
            if (!isCurrent()) return;
            setCheck(result.check ?? { ok: false, effectiveModel: null, failure: 'unsupported-capability' });
            setVerified(requested);
        }
        catch (error) {
            // A deliberate action that failed has to say so. These two were unhandled rejections:
            // pressing Refresh models against an endpoint that is not answering produced a browser
            // error, an unchanged status and no sentence at all — visible effort with no answer.
            if (!isCurrent()) return;
            const failure = classifyFailure(error);
            if (action === 'models') setListing({ endpoint, models: null, failure });
            else setCheck({ ok: false, effectiveModel: null, failure });
        }
        finally {
            if (isCurrent()) setBusy(null);
        }
    }, [selection, credentials, endpoint, signature]);

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
        gatewayReachable: selection.provider === 'gateway' && verified === signature && capabilities !== null && capabilities !== UNKNOWN_CAPABILITIES,
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
