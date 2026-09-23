/** Discovery: may Diffusion look outside this Field, and where?
 *
 * Diffusion's own bundled discovery engine is the thing that talks to sources, aggregates them,
 * falls back between them and normalizes what comes back. It is an implementation detail — its
 * provenance is recorded in `internal/discovery-engine/PROVENANCE.md` — and deliberately NOT one
 * of the sources below: showing a person a list containing both the engine and "Exa" would ask
 * them to choose an internal implementation. The engine is internal; the sources are the choice,
 * and the JSON envelope and the source vocabulary (Exa/Tavily/Brave) are Diffusion's contract.
 * This is a frozen product decision, so the vocabulary lives here and nowhere else.
 */
export type DiscoverySourceId = 'exa' | 'tavily' | 'brave';
export const DISCOVERY_SOURCE_IDS: DiscoverySourceId[] = ['exa', 'tavily', 'brave'];

export interface DiscoverySourceDescriptor {
    id: DiscoverySourceId;
    label: string;
    /** Where a person would get this key, shown beside the field. The variable the engine reads it
     * from, and the credential slot it is stored under, are the native layer's own vocabulary
     * (`src-tauri/src/discovery_env.rs`): a name the webview does not need to know is a name it can
     * never accidentally start filling in. */
    keyHint: string;
}
export const DISCOVERY_SOURCES: Record<DiscoverySourceId, DiscoverySourceDescriptor> = {
    exa: { id: 'exa', label: 'Exa', keyHint: 'exa.ai' },
    tavily: { id: 'tavily', label: 'Tavily', keyHint: 'tavily.com' },
    brave: { id: 'brave', label: 'Brave', keyHint: 'brave.com/search/api' },
};

/** Which engine performs discovery. `built-in` is the bundled one and is the normal desktop path;
 * `custom` posts to a normalized HTTP endpoint so self-hosting, enterprise deployment, alternate
 * engines and tests keep a replaceable boundary. */
export type DiscoveryBackend = 'built-in' | 'custom';

/** Non-secret discovery preferences. A credential never appears in this object: the settings
 * record stores selection and presence, not the secret. */
export interface DiscoverySettings {
    external: boolean;
    sources: Record<DiscoverySourceId, boolean>;
    backend: DiscoveryBackend;
    customUrl: string;
}

export const DEFAULT_DISCOVERY: DiscoverySettings = {
    external: false,
    sources: { exa: false, tavily: false, brave: false },
    backend: 'built-in',
    customUrl: '',
};

export function normalizeDiscoverySettings(value: unknown): DiscoverySettings {
    const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<DiscoverySettings> : {};
    const selected = raw.sources && typeof raw.sources === 'object' && !Array.isArray(raw.sources) ? raw.sources as Record<string, unknown> : {};
    return {
        external: raw.external === true,
        sources: Object.fromEntries(DISCOVERY_SOURCE_IDS.map(id => [id, selected[id] === true])) as Record<DiscoverySourceId, boolean>,
        backend: raw.backend === 'custom' ? 'custom' : 'built-in',
        customUrl: typeof raw.customUrl === 'string' ? raw.customUrl.slice(0, 500) : '',
    };
}

/** Which sources the user actually turned on, in a stable order. */
export function enabledSources(settings: DiscoverySettings): DiscoverySourceId[] {
    return DISCOVERY_SOURCE_IDS.filter(id => settings.sources[id]);
}

/** What a normalized discovery endpoint must look like.
 *
 * It lives here, beside the readiness model that depends on it, because `describeDiscovery` must be
 * able to say whether an endpoint is *usable*: a non-empty string once counted as a ready engine, so
 * Settings could report "Available" for an address that could never answer. The same validator is
 * the one the Advanced field applies, so what the field accepts and what the status promises are the
 * same rule. (`discovery/config.ts` re-exports it for the callers that already import it there.) */
export function customDiscoveryURL(value: string): string {
    const url = new URL(value.trim());
    if (url.username || url.password || url.search || url.hash) throw new Error('The discovery URL must not contain credentials, queries or fragments.');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) throw new Error('Use HTTPS for a remote discovery endpoint; HTTP is allowed on loopback only.');
    return url.href.replace(/\/$/, '');
}

/** Whether that address is usable at all, asked without throwing: readiness is a question the status
 * line asks, not an error a person has to see. */
export function usableCustomDiscoveryURL(value: string): boolean {
    try { customDiscoveryURL(value); return true; }
    catch { return false; }
}

/** What external discovery can really do right now.
 *
 * This exists so the Settings control can know the answer *before* a person presses Explore. The
 * audit's P1-5 was a toggle that looked available and then failed on first use; a capability the
 * UI cannot describe is a capability the UI must not offer.
 */
export interface DiscoveryStatus {
    /** The engine that would run, or null when this platform has none. */
    engine: DiscoveryBackend | null;
    /** Whether that engine is present and usable at all. */
    engineReady: boolean;
    /** Enabled sources that hold a credential. */
    ready: DiscoverySourceId[];
    /** Enabled sources still missing a credential. */
    missingKey: DiscoverySourceId[];
    /** Whether a found page can be read into a passage. The bundled engine reads anonymously, so
     * this is true whenever the engine itself is available. */
    reader: boolean;
}

export function describeDiscovery(settings: DiscoverySettings, storedKeys: Partial<Record<DiscoverySourceId, boolean>>, platform: { builtInEngine: boolean }): DiscoveryStatus {
    const chosen = enabledSources(settings);
    const keyed = chosen.filter(id => storedKeys[id] === true);
    const missing = chosen.filter(id => storedKeys[id] !== true);
    const engine: DiscoveryBackend | null = settings.backend === 'built-in' ? (platform.builtInEngine ? 'built-in' : null) : usableCustomDiscoveryURL(settings.customUrl) ? 'custom' : null;
    return {
        engine,
        engineReady: engine !== null,
        ready: keyed,
        missingKey: missing,
        reader: engine === 'built-in',
    };
}

/** Whether an Explore that asked for external material can actually look outside the Field. */
export function discoveryAvailable(status: DiscoveryStatus): boolean {
    return status.engineReady && status.ready.length > 0;
}
