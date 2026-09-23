import type { LocalePreference } from '../shared/i18n.ts';
import type { ThinkingDepth } from '../ai/contracts.ts';
import { PROVIDER_IDS, WIRE_PROTOCOLS, type ProviderId, type WireProtocol } from '../ai/providers.ts';
import { DEFAULT_DISCOVERY, normalizeDiscoverySettings, type DiscoverySettings } from '../discovery/contracts.ts';
import { normalizeAppearanceSettings, type AppearanceSettings } from './appearance.ts';

/** A bounded vocabulary, not a font-size picker. Interface size scales the chrome; Thought size
 * scales what the user wrote. They are deliberately two controls, because they are two materials. */
export const INTERFACE_SIZES = [90, 100, 110, 120] as const;
export const THOUGHT_SIZE = { min: 16, max: 24, step: 1, default: 18 } as const;

export interface Settings {
    locale: LocalePreference;
    /** Who helps Diffusion think. `off` and `demo` are local; every other value is a real
     * connection, and the direct ones use a credential the user holds on this device. */
    provider: ProviderId;
    /** Diffusion Gateway address. Kept first-class: it remains the right answer for a browser
     * deployment, a team, a policy boundary, or centralized secrets. */
    gateway: string;
    /** Gateway session token. Memory only, never persisted. */
    token: string;
    /** Base URL for the OpenAI-compatible provider only. */
    baseUrl: string;
    protocol: WireProtocol;
    theme: 'system' | 'light' | 'dark';
    /** Curated visual presentation for this device only; never canonical Field state. */
    appearance: AppearanceSettings;
    thoughtTypography: 'serif' | 'sans';
    /** Chrome scale in percent. Bounded by `INTERFACE_SIZES`. */
    interfaceSize: number;
    /** What the user wrote, in px. Bounded by `THOUGHT_SIZE`. */
    thoughtSize: number;
    /** The model to ask for. Empty means "whatever the provider is configured with". Never invented
     * locally, and never a dead end: manual entry is always available. */
    model: string;
    /** How much thinking the user is asking for. A product word, mapped by the adapter to the
     * provider's own parameter; the product never hardcodes a vendor's reasoning option. */
    thinkingDepth: ThinkingDepth;
    /** May Diffusion look outside this Field, and where. Contains no credential: only which sources
     * are enabled. Secrets live in the platform credential store. */
    discovery: DiscoverySettings;
}

/** Preferences are independent of canonical project storage and camera state.
 * Old settings need no project/database migration. Secrets are never restored.
 *
 * Migration of the previous AI model is deliberately conservative: the three legacy values already
 * exist in the new vocabulary (`off`, `demo`, `gateway`), so nothing is translated, guessed or
 * erased. A legacy gateway URL is never re-read as a third-party provider address, because a
 * gateway is not a provider: that distinction is exactly what the old model got wrong.
 *
 * Legacy `thinkingDefaults` and `shortcutOverrides` are dropped deliberately: thinking runs now use
 * fixed product defaults plus their own per-run controls, and shortcuts have one effective source,
 * the canonical registry. Neither is re-read or migrated.
 */
export function normalizeSettings(value: unknown, gateway = ''): Settings {
    const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<Settings> : {};
    return {
        locale: ['en', 'zh', 'system'].includes(raw.locale ?? '') ? raw.locale! : 'system',
        provider: PROVIDER_IDS.includes(raw.provider as ProviderId) ? raw.provider as ProviderId : 'off',
        gateway: typeof raw.gateway === 'string' ? raw.gateway.slice(0, 500) : gateway,
        token: '',
        baseUrl: typeof raw.baseUrl === 'string' ? raw.baseUrl.slice(0, 500) : '',
        protocol: WIRE_PROTOCOLS.includes(raw.protocol as WireProtocol) ? raw.protocol as WireProtocol : 'chat-completions',
        theme: ['system', 'light', 'dark'].includes(raw.theme ?? '') ? raw.theme! : 'system',
        appearance: normalizeAppearanceSettings(raw.appearance),
        thoughtTypography: raw.thoughtTypography === 'sans' ? 'sans' : 'serif',
        interfaceSize: INTERFACE_SIZES.includes(raw.interfaceSize as typeof INTERFACE_SIZES[number]) ? raw.interfaceSize! : 100,
        thoughtSize: Number.isInteger(raw.thoughtSize) && raw.thoughtSize! >= THOUGHT_SIZE.min && raw.thoughtSize! <= THOUGHT_SIZE.max
            ? raw.thoughtSize! : THOUGHT_SIZE.default,
        model: typeof raw.model === 'string' ? raw.model.slice(0, 200) : '',
        thinkingDepth: ['auto', 'light', 'standard', 'deep'].includes(raw.thinkingDepth ?? '') ? raw.thinkingDepth! : 'auto',
        discovery: raw.discovery === undefined ? { ...DEFAULT_DISCOVERY, sources: { ...DEFAULT_DISCOVERY.sources } } : normalizeDiscoverySettings(raw.discovery),
    };
}

export function loadSettings(): Settings {
    const gateway = import.meta.env?.VITE_GATEWAY_URL ?? '';
    try { return normalizeSettings(JSON.parse(localStorage.getItem('diffusion-settings') ?? '{}'), gateway); }
    catch { return normalizeSettings({}, gateway); }
}

/** Only non-secret preferences are written. The gateway session token is dropped, and no provider
 * or discovery credential is ever part of this record to begin with. */
export function saveSettings(settings: Settings): boolean {
    try {
        const { token: _token, ...publicSettings } = settings;
        localStorage.setItem('diffusion-settings', JSON.stringify(publicSettings));
        return true;
    } catch { return false; }
}

export function thinkingServiceChanged(previous: Settings, next: Settings): boolean {
    return previous.provider !== next.provider || previous.gateway !== next.gateway || previous.token !== next.token
        || previous.baseUrl !== next.baseUrl || previous.protocol !== next.protocol
        || previous.model !== next.model || previous.thinkingDepth !== next.thinkingDepth;
}

/** Whether the interface scale or Thought size changed, so geometry can be re-measured once. */
export function typeScaleChanged(previous: Settings, next: Settings): boolean {
    return previous.interfaceSize !== next.interfaceSize || previous.thoughtSize !== next.thoughtSize;
}

/** Whether external discovery settings changed, so the evidence engine can be rebuilt. */
export function discoveryChanged(previous: Settings, next: Settings): boolean {
    const a = JSON.stringify(previous.discovery), b = JSON.stringify(next.discovery);
    return a !== b;
}
