import { useState, type KeyboardEvent } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { t as msg } from '../../shared/i18n.ts';
import type { Settings } from '../settings.ts';
import { UNKNOWN_CAPABILITIES, type ConnectionCheck, type ThinkingCapabilities } from '../../ai/contracts.ts';
import { DIRECT_PROVIDER_IDS, DIRECT_PROVIDERS, WIRE_PROTOCOLS, type DirectProviderId, type ProviderId, type WireProtocol } from '../../ai/providers.ts';
import { failureText, type ThinkingFailure } from '../../ai/errors.ts';
import { aiCredential, type CredentialId } from '../../credentials/contracts.ts';
import { Select } from '../primitives/Select.tsx';
import { StatusLine, type StatusTone } from '../primitives/Status.tsx';
import { Button } from '../primitives/Button.tsx';
import { SettingRow } from '../primitives/SettingRow.tsx';
import { SurfaceGroup } from '../primitives/SurfaceGroup.tsx';

const DEPTHS = ['auto', 'light', 'standard', 'deep'] as const;
const depthLabel: Record<typeof DEPTHS[number], string> = { auto: 'Auto', light: 'Light', standard: 'Standard', deep: 'Deep' };
const PROVIDER_LABEL: Record<ProviderId, string> = {
    off: 'Off / manual Field only',
    demo: 'Demo / deterministic, not a model',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Google Gemini',
    deepseek: 'DeepSeek',
    compatible: 'OpenAI compatible',
    gateway: 'Diffusion Gateway',
};
const PROVIDER_HINT: Record<ProviderId, string> = {
    off: 'Thinking is off. The Field stays manual: nothing is sent anywhere.',
    demo: 'Demo mode answers with authored example text. It is not a model and does not search the web.',
    openai: 'Uses your OpenAI account directly. No gateway or build configuration is needed.',
    anthropic: 'Uses your Anthropic account directly. No gateway or build configuration is needed.',
    gemini: 'Uses your Google AI account directly. No gateway or build configuration is needed.',
    deepseek: 'Uses your DeepSeek account directly through the OpenAI-compatible interface.',
    compatible: 'Any OpenAI-compatible endpoint, including a local server you run yourself.',
    gateway: 'A Diffusion Gateway you or your team operates. Useful for shared secrets, policy and browser deployments.',
};

/** Escape belongs to the product, not to a closed suggestion list.
 *
 * Base UI's combobox consumes the Escape key even while its list is closed (its dismiss handler is
 * only allowed to bubble in inline mode), so the key that dismisses every surface in Diffusion did
 * nothing at all while the model field had focus — a regression the previous pass would have called
 * a broken dismissal contract. With no list open there is nothing for the field to close, so the
 * field hands the key back: the event is stopped before the combobox sees it and re-sent as a fresh
 * Escape on the window, which is where the product's one dismissal router listens. One press still
 * dismisses exactly one owner.
 *
 * The guards are the router's own: while an IME is composing, Escape cancels the composition and
 * belongs to the input method — never to a surface (Chinese is a supported locale, so this is the
 * common case, not a corner) — and a held key must not dismiss once per repeat. */
function escapeFromAClosedList(open: boolean) {
    return (event: KeyboardEvent<HTMLInputElement>): void => {
        if (event.key !== 'Escape' || open || event.nativeEvent.isComposing || event.repeat)
            return;
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    };
}

/** The AI section: who helps Diffusion think?
 *
 * Replaces an engineer-facing form (mode, gateway URL, session token) with the question a person
 * actually has. Every real provider is reachable from here with an account and a key, and the
 * gateway is one choice among several rather than the only way to have AI at all — which was the
 * audit's P0-1.
 *
 * The normal path is the account a person holds and nothing else: an address where one is theirs to
 * give, a key, a model and a deliberate Test connection. Three things were removed from it because
 * they asked a person to understand Diffusion's transport rather than their own provider:
 *
 *  - the model was either a list *or* a text field, and fetching models replaced manual entry with
 *    a menu row. It is now one editable combobox: suggestions when a provider offered them, free
 *    typing always, and a failed fetch that costs nothing;
 *  - the protocol override is a compatibility fact about the endpoint, not a preference, so it
 *    lives under Advanced with the output cap — the one depth control that, for a provider without
 *    a reasoning control, changes nothing but length. A provider that really reasons (Anthropic)
 *    keeps its control in the normal path, where it means something.
 */
export function AISettings({ settings, capabilities, check, modelList, modelFailure, verifying, configurationChanged, storedKeys, secureStore, onChange, onVerify, onRefreshModels, onCredentialChange }: {
    settings: Settings;
    capabilities: ThinkingCapabilities | null;
    check: ConnectionCheck | null;
    modelList: string[] | null;
    /** Why the last model listing failed, when it did. Never a reason to block manual entry. */
    modelFailure: ThinkingFailure | null;
    verifying: 'models' | 'connection' | null;
    configurationChanged: boolean;
    storedKeys: Record<string, boolean>;
    secureStore: boolean;
    onChange: (settings: Settings) => void;
    onVerify: () => void;
    onRefreshModels: () => void;
    onCredentialChange: () => void;
}) {
    const [keyDraft, setKeyDraft] = useState('');
    const [keyError, setKeyError] = useState('');
    const [advanced, setAdvanced] = useState(false);
    /** The model suggestion list. It opens only when there is something to suggest: an empty
     * list that appeared on focus would be a floating box saying nothing, and it would take the
     * first Escape with it — the field is a text field until a provider has offered it a list. */
    const [modelOpen, setModelOpen] = useState(false);
    const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value });
    const provider = settings.provider;
    const direct = (DIRECT_PROVIDER_IDS as string[]).includes(provider) ? DIRECT_PROVIDERS[provider as DirectProviderId] : null;
    const keyPresent = storedKeys[provider] === true;
    const credentialId: CredentialId | null = direct ? aiCredential(direct.id) : null;
    /** The models this endpoint was actually seen to offer. Never inferred, never remembered across
     * endpoints, and never a requirement: an empty list means a text field. */
    const offered = modelList ?? [];
    const suggestionsOpen = modelOpen && offered.length > 0;
    /** Whether this provider has a reasoning control of its own, rather than only an output cap. */
    const reasons = direct?.capabilities.thinking.supported === true;

    /** The one moment a key is stored: its own control. Blur used to store it too, which is how a
     * typed key could be committed by a press that was meant to test something else. */
    async function saveKey(): Promise<boolean> {
        if (!credentialId) return false;
        setKeyError('');
        const draft = keyDraft.trim();
        if (!draft) return false;
        try {
            const { createCredentialStore } = await import('../../credentials/index.ts');
            const store = await createCredentialStore(secureStore);
            if (draft.length < 8) { setKeyError(msg('That key looks too short. Check it and try again.')); return false; }
            await store.store(credentialId, draft);
            setKeyDraft('');
            onCredentialChange();
            return true;
        }
        catch { setKeyError(msg('The credential store refused the change.')); return false; }
    }
    async function removeKey(): Promise<void> {
        if (!credentialId) return;
        try {
            const { createCredentialStore } = await import('../../credentials/index.ts');
            const store = await createCredentialStore(secureStore);
            await store.forget(credentialId);
            setKeyDraft('');
            onCredentialChange();
        }
        catch { setKeyError(msg('The credential store refused the change.')); }
    }
    /** A deliberate check acts on what the person can see: a key still sitting in the field is
     * committed first, so Test connection never reports on a configuration that is not on screen. */
    async function withTypedKey(run: () => void): Promise<void> {
        if (keyDraft.trim() && !await saveKey())
            return;
        run();
    }

    /** The honest state vocabulary. "Ready" is only ever shown after a real request succeeded; a
     * reachable endpoint is reported as reachable, not as ready, and an edited configuration is
     * reported as changed rather than being silently re-probed. */
    const status: { tone: StatusTone; label: string; detail?: string } = (() => {
        if (provider === 'off') return { tone: 'unconfigured', label: msg('Not configured') };
        if (provider === 'demo') return { tone: 'limited', label: msg('Limited'), detail: msg('Demo, not a model.') };
        if (provider === 'gateway' && !settings.gateway.trim()) return { tone: 'unconfigured', label: msg('Not configured'), detail: msg('Enter the gateway address.') };
        if (provider === 'compatible' && !settings.baseUrl.trim()) return { tone: 'unconfigured', label: msg('Not configured'), detail: msg('Enter the base URL.') };
        if (direct && direct.requiresKey && !keyPresent) return { tone: 'unconfigured', label: msg('Not configured'), detail: keyDraft.trim() ? msg('Save the key to use it.') : msg('Add an API key.') };
        if (verifying) return { tone: 'checking', label: msg('Checking...') };
        if (configurationChanged) return { tone: 'limited', label: msg('Configuration changed'), detail: msg('Test again to confirm this provider answers.') };
        if (check?.ok) return { tone: 'connected', label: msg('Ready'), detail: check.effectiveModel ? msg('Verified with {model}.', { model: check.effectiveModel }) : settings.model || undefined };
        if (check && !check.ok) return { tone: 'error', label: msg('Failed'), detail: failureText(check.failure as ThinkingFailure, direct?.label ?? msg('The provider')) };
        if (!settings.model.trim() && direct) return { tone: 'limited', label: msg('Model not chosen'), detail: msg('Choose a model, or type one.') };
        return { tone: 'limited', label: msg('Not yet verified'), detail: msg('Test the connection to be sure this answers.') };
    })();

    /** One editable model field. Typing is the primary path and a suggestion is a convenience: a
     * provider that cannot be listed, a listing that failed and a list that came back empty are all
     * the same to the person, who types what they were given either way. */
    const modelField = <Combobox.Root items={offered} open={suggestionsOpen} onOpenChange={next => setModelOpen(next && offered.length > 0)} inputValue={settings.model} onInputValueChange={value => set('model', value)} value={settings.model || null} onValueChange={value => set('model', value ? String(value) : '')}>
        <Combobox.Input data-testid="model-input" className="ui-combobox-input" aria-label={msg('Model')} maxLength={200} placeholder={msg('Model id')} onKeyDownCapture={escapeFromAClosedList(suggestionsOpen)}/>
        <Combobox.Portal>
            <Combobox.Positioner sideOffset={5} className="ui-select-positioner">
                <Combobox.Popup className="ui-select-popup" data-width="trigger">
                    <Combobox.Empty className="ui-combobox-empty">{msg('Nothing in the list matches. What you type is used as typed.')}</Combobox.Empty>
                    <Combobox.List className="ui-select-list">
                        {offered.map(name => <Combobox.Item key={name} value={name} className="ui-select-item" data-value={name}>{name}</Combobox.Item>)}
                    </Combobox.List>
                </Combobox.Popup>
            </Combobox.Positioner>
        </Combobox.Portal>
    </Combobox.Root>;

    const depthRow = (description: string) => <SettingRow label={msg('Thinking depth')} description={description} setting="thinking-depth">
        <Select testId="depth-select" ariaLabel={msg('Thinking depth')} value={settings.thinkingDepth}
            onChange={value => set('thinkingDepth', value as Settings['thinkingDepth'])}
            options={DEPTHS.map(level => ({ value: level, label: msg(depthLabel[level]) }))}/>
    </SettingRow>;

    return <>
        <h3>{msg('AI')}</h3>
        <p className="settings-note">{msg('Who helps Diffusion think? A possibility is only ever a possibility: nothing here can move, delete or confirm what you wrote.')}</p>
        <SurfaceGroup>
            <SettingRow label={msg('Provider')} description={<span data-testid="provider-hint">{msg(PROVIDER_HINT[provider])}</span>} setting="thinking-service">
                <Select testId="provider-select" ariaLabel={msg('Provider')} value={provider}
                    onChange={value => set('provider', value as ProviderId)}
                    options={(['off', 'demo', ...DIRECT_PROVIDER_IDS, 'gateway'] as ProviderId[]).map(id => ({ value: id, label: msg(PROVIDER_LABEL[id]) }))}/>
            </SettingRow>
            {(provider === 'off' || provider === 'demo') && <div className="ui-group-status"><StatusLine {...status} testId="ai-status"/></div>}
        </SurfaceGroup>
        {direct && <>
            <SurfaceGroup>
                {direct.editableBaseUrl && <SettingRow label={msg('Base URL')} setting="base-url">
                    <input aria-label={msg('Base URL')} data-testid="base-url" value={settings.baseUrl} placeholder="https://host/v1" onChange={event => set('baseUrl', event.target.value)}/>
                </SettingRow>}
                <SettingRow label={msg('API key')} description={keyPresent ? msg('The key is held in this device\u2019s secure store, never in Settings, an export or a log.') : direct.requiresKey ? msg(direct.keyHint) : msg('Leave blank when the endpoint needs no key.')} setting="api-key">
                    <span className="settings-key-row">
                        <input aria-label={msg('API key')} id={`provider-key-field-${provider}`} type="password" autoComplete="off" data-testid="provider-key" value={keyDraft} placeholder={keyPresent ? msg('Stored securely') : direct.requiresKey ? msg('Not set') : msg('Optional')}
                            onChange={event => setKeyDraft(event.target.value)}/>
                        {keyPresent && !keyDraft.trim()
                            ? <Button variant="outline" size="sm" data-testid="provider-key-remove" onClick={() => void removeKey()}>{msg('Remove')}</Button>
                            : <Button variant="solid" size="sm" data-testid="provider-key-save" disabled={!keyDraft.trim()} onClick={() => void saveKey()}>{msg('Save')}</Button>}
                    </span>
                </SettingRow>
                {!secureStore && <div className="ui-setting-inset"><p className="settings-note">{msg('This build keeps the key for this session only.')}</p></div>}
                {keyError && <div className="ui-setting-inset"><p className="settings-error" data-testid="provider-key-error">{keyError}</p></div>}
            </SurfaceGroup>
            <SurfaceGroup>
                <SettingRow label={msg('Model')} description={<span data-testid="model-summary">{modelFailure
                    ? msg('No model list could be read from this endpoint. You can still type the model id your provider gave you.')
                    : offered.length
                        ? msg('This provider offers {count} models. You can also type any model id.', { count: offered.length })
                        : msg('No model list has been fetched. Type the model id your provider gave you; nothing is guessed for you.')}</span>} setting="model">
                    <span className="settings-key-row settings-model-row">
                        {modelField}
                        <Button variant="outline" size="sm" data-testid="refresh-models" disabled={verifying !== null} onClick={() => void withTypedKey(onRefreshModels)}>{msg('Refresh models')}</Button>
                    </span>
                </SettingRow>
                {modelFailure && <div className="ui-setting-inset"><p className="settings-note">{failureText(modelFailure, direct.label)}</p></div>}
                <div className="ui-group-footer">
                    <StatusLine {...status} testId="ai-status"/>
                    <Button variant="solid" size="sm" data-testid="test-connection" disabled={verifying !== null} onClick={() => void withTypedKey(onVerify)}>{msg('Test connection')}</Button>
                </div>
                <div className="ui-setting-inset"><p className="settings-note">{msg('Testing sends one small real request to your provider and may count toward your usage. It never changes the Field.')}</p></div>
            </SurfaceGroup>
            {reasons && <SurfaceGroup>
                {depthRow(msg('{provider} exposes a reasoning control, so depth sets both how much it thinks and how much it may write.', { provider: direct.label }))}
                <span className="sr-only" data-testid="depth-note">{msg('{provider} exposes a reasoning control, so depth sets both how much it thinks and how much it may write.', { provider: direct.label })}</span>
            </SurfaceGroup>}
            {(direct.editableProtocol || !reasons) && <SurfaceGroup>
                <div className="ui-disclosure-row">
                    <Button variant="ghost" size="sm" data-testid="ai-advanced" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}>{advanced ? msg('Hide advanced') : msg('Advanced')}</Button>
                </div>
                {advanced && <div className="ui-disclosure-content">
                    {direct.editableProtocol && <SettingRow label={msg('Protocol')} description={msg('Only change this if your endpoint speaks the other protocol.')} setting="protocol">
                        <Select testId="protocol-select" ariaLabel={msg('Protocol')} value={settings.protocol}
                            onChange={value => set('protocol', value as WireProtocol)}
                            options={WIRE_PROTOCOLS.filter(id => id === 'chat-completions' || id === 'responses').map(id => ({ value: id, label: msg(id === 'responses' ? 'Responses' : 'Chat completions') }))}/>
                    </SettingRow>}
                    {!reasons && <>
                        {depthRow(msg('{provider} has no reasoning control Diffusion asks for. Depth sets only how much output the provider may write.', { provider: direct.label }))}
                        <span className="sr-only" data-testid="depth-note">{msg('{provider} has no reasoning control Diffusion asks for. Depth sets only how much output the provider may write.', { provider: direct.label })}</span>
                    </>}
                </div>}
            </SurfaceGroup>}
        </>}
        {provider === 'gateway' && <>
            <SurfaceGroup>
                <SettingRow label={msg('Gateway address')} setting="gateway-url">
                    <input aria-label={msg('Gateway address')} data-testid="gateway-url" value={settings.gateway} placeholder={msg('Blank = same-origin /api')} onChange={event => set('gateway', event.target.value)}/>
                </SettingRow>
                <SettingRow label={msg('Session token')} setting="gateway-token">
                    <input aria-label={msg('Session token')} type="password" autoComplete="off" data-testid="gateway-token" value={settings.token} onChange={event => set('token', event.target.value)}/>
                </SettingRow>
                <div className="ui-group-footer">
                    <StatusLine {...status} testId="ai-status"/>
                    <Button variant="solid" size="sm" data-testid="test-connection" disabled={verifying !== null} onClick={onVerify}>{msg('Test connection')}</Button>
                </div>
                <div className="ui-setting-inset"><p className="settings-note">{msg('A gateway holds the upstream keys for you, which is how a shared or browser deployment is meant to work. On this device you can also connect a provider directly above.')}</p></div>
            </SurfaceGroup>
            {capabilities && capabilities !== UNKNOWN_CAPABILITIES && <SurfaceGroup>
                <SettingRow label={msg('Model')} description={<span data-testid="gateway-capability">{msg('This gateway reported {count} declared models.', { count: capabilities.models.length })}</span>} setting="model">
                    {capabilities.models.length
                        ? <Select testId="model-select" ariaLabel={msg('Model')} value={settings.model} onChange={value => set('model', value)} options={[{ value: '', label: msg('Gateway default') }, ...capabilities.models.map(name => ({ value: name, label: name }))]}/>
                        : <input data-testid="model-input" aria-label={msg('Model')} value={settings.model} maxLength={200} placeholder={msg('Gateway default')} onChange={event => set('model', event.target.value)}/>}
                </SettingRow>
            </SurfaceGroup>}
            <SurfaceGroup>
                {depthRow(capabilities?.depth.supported ? msg('Depth sets how much output the gateway asks the provider for.') : msg('This gateway reports no depth control.'))}
            </SurfaceGroup>
        </>}
    </>;
}
