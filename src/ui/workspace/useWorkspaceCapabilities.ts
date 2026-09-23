import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DISCOVERY_SOURCE_IDS, describeDiscovery, type DiscoverySourceId, type DiscoveryStatus } from '../../discovery/contracts.ts';
import { discoveryInvocation } from '../../discovery/config.ts';
import type { EngineRunner } from '../../discovery/runtime.ts';
import type { CredentialStore } from '../../credentials/contracts.ts';
import { aiCredential, searchCredential } from '../../credentials/contracts.ts';
import { sessionCredentialStore } from '../../credentials/session.ts';
import { DIRECT_PROVIDER_IDS } from '../../ai/providers.ts';
import type { PlatformCapabilities } from '../../platform/contracts.ts';
import type { Settings } from '../settings.ts';

/** Where secrets live, and whether this build has a discovery engine at all.
 *
 * Both are properties of the build, so they are resolved once here rather than re-decided by
 * whatever surface happens to need them. Nothing above this hook knows whether a credential is in
 * an operating-system keychain or in memory, and nothing above it knows whether the discovery
 * engine is a bundled executable or an address.
 */
export function useWorkspaceCapabilities({ settings, settingsRef, platform }: {
    settings: Settings;
    settingsRef: { current: Settings };
    platform: PlatformCapabilities;
}) {
    // Seeded with the build's one session store so a provider can always be built; on Desktop the
    // native store replaces it before any credential could have been entered. Seeding the *shared*
    // session store rather than a private instance is what keeps a written key and a read key the
    // same map even if the resolution below never completes.
    const [credentials, setCredentials] = useState<CredentialStore>(sessionCredentialStore);
    const [storedAIKeys, setStoredAIKeys] = useState<Record<string, boolean>>({});
    const [storedSourceKeys, setStoredSourceKeys] = useState<Partial<Record<DiscoverySourceId, boolean>>>({});
    const [builtIn, setBuiltIn] = useState<EngineRunner | null>(null);
    const [engineVersion, setEngineVersion] = useState<string | null>(null);
    /** The store the *current* build resolved. A ref, not state, because the engine runner is built
     * once and must read the real store at request time rather than the session placeholder that
     * happened to exist on the first render. */
    const store = useRef<CredentialStore>(credentials);
    const started = useRef(false);

    /** Presence only. A value is never read here, so no secret enters React state. */
    const refreshPresence = useCallback(async () => {
        const active = store.current;
        const [search, ai] = await Promise.all([
            Promise.all(DISCOVERY_SOURCE_IDS.map(async id => [id, await active.has(searchCredential(id))] as const)),
            Promise.all(DIRECT_PROVIDER_IDS.map(async id => [id, await active.has(aiCredential(id))] as const)),
        ]);
        setStoredSourceKeys(Object.fromEntries(search) as Partial<Record<DiscoverySourceId, boolean>>);
        setStoredAIKeys(Object.fromEntries(ai));
    }, []);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        void (async () => {
            const { createCredentialStore } = await import('../../credentials/index.ts');
            const active = await createCredentialStore(platform.secureCredentials);
            store.current = active;
            setCredentials(active);
            await refreshPresence();
            if (!platform.bundledDiscovery) return;
            // The bundled engine is a resource of this application. Availability is asked of the
            // native layer rather than assumed from the build flag, so a development run without a
            // packaged resource reports "not available" instead of promising a search that fails.
            const { invoke } = await import('@tauri-apps/api/core');
            const available = await invoke<boolean>('discovery_available').catch(() => false);
            if (!available) return;
            void invoke<string | null>('discovery_version').then(setEngineVersion).catch(() => { /* Version is a nicety, not a capability. */ });
            setBuiltIn(() => async (args: string[], signal: AbortSignal): Promise<string> => {
                if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
                const current = settingsRef.current.discovery;
                // The webview names the enabled sources and nothing more: the native layer resolves
                // each one's credential from the operating system's store and builds the child
                // process environment itself, so no discovery secret is read here, held in React
                // state, or sent over IPC. Credentials still never appear in an argument list.
                return await invoke<string>('discovery_run', discoveryInvocation(current, args));
            });
        })();
    }, [platform.secureCredentials, platform.bundledDiscovery, refreshPresence, settingsRef]);

    const status = useMemo<DiscoveryStatus>(() => describeDiscovery(settings.discovery, storedSourceKeys, { builtInEngine: builtIn !== null }), [settings.discovery, storedSourceKeys, builtIn]);
    return { credentials, status, builtIn, engineVersion, storedAIKeys, storedSourceKeys, refreshPresence };
}
