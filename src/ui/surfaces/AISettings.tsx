import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { t as msg } from '../../shared/i18n.ts';
import type { Settings } from '../settings.ts';
import { type ConnectionCheck, type ThinkingCapabilities } from '../../ai/contracts.ts';
import { DIRECT_PROVIDER_IDS, DIRECT_PROVIDERS, WIRE_PROTOCOLS, type DirectProviderId, type ProviderId, type WireProtocol } from '../../ai/providers.ts';
import { failureText, type ThinkingFailure } from '../../ai/errors.ts';
import { aiCredential, type CredentialId } from '../../credentials/contracts.ts';
import { Select } from '../primitives/Select.tsx';
import { StatusLine, type StatusTone } from '../primitives/Status.tsx';
import { Button } from '../primitives/Button.tsx';
import { ApiKeyLink } from '../primitives/ApiKeyLink.tsx';
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
export function AISettings({ settings, capabilities, check, gatewayReachable = false, modelList, modelFailure, verifying, configurationChanged, storedKeys, secureStore, onChange, onVerify, onRefreshModels, onCredentialChange }: {
    settings: Settings;
    capabilities: ThinkingCapabilities | null;
    check: ConnectionCheck | null;
    gatewayReachable?: boolean;
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
    onCredentialChange: () => void | Promise<void>;
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
    const currentProvider = useRef(provider);
    currentProvider.current = provider;
    useEffect(() => { setKeyDraft(''); setKeyError(''); setModelOpen(false); }, [provider]);
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
            await onCredentialChange();
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
            await onCredentialChange();
        }
        catch { setKeyError(msg('The credential store refused the change.')); }
    }
    /** A deliberate check acts on what the person can see: a key still sitting in the field is
     * committed first, so Test connection never reports on a configuration that is not on screen. */
    const latestActions = useRef({ onVerify, onRefreshModels });
    latestActions.current = { onVerify, onRefreshModels };
    async function withTypedKey(action: 'connection' | 'models'): Promise<void> {
        const requestedProvider = provider;
        if (keyDraft.trim() && !await saveKey())
            return;
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        if (requestedProvider !== currentProvider.current) return;
        if (action === 'connection') latestActions.current.onVerify();
        else latestActions.current.onRefreshModels();
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
        if (configurationChanged || keyDraft.trim()) return { tone: 'limited', label: msg('Configuration changed'), detail: msg('Test again to confirm this provider answers.') };
        if (gatewayReachable) return { tone: 'limited', label: msg('settings.ai.gatewayReachable'), detail: msg(capabilities?.configured ? 'settings.ai.gatewayUnverified' : 'settings.ai.gatewayUnconfigured') };
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

    const depthRow = (reasoning: boolean) => <SettingRow label={msg(reasoning ? 'Thinking depth' : 'settings.ai.outputLimit')} setting={reasoning ? 'thinking-depth' : 'output-limit'}>
        <Select testId="depth-select" ariaLabel={msg(reasoning ? 'Thinking depth' : 'settings.ai.outputLimit')} value={settings.thinkingDepth}
            onChange={value => set('thinkingDepth', value as Settings['thinkingDepth'])}
            options={DEPTHS.map(level => ({ value: level, label: msg(reasoning || level === 'auto' ? depthLabel[level] : ({ light: 'settings.ai.short', standard: 'settings.ai.standard', deep: 'settings.ai.long' } as const)[level]) }))}/>
    </SettingRow>;
    return <>
        <h3>{msg('AI')}</h3>
        <SurfaceGroup>
            <SettingRow label={msg('Provider')} setting="thinking-service">
                <Select testId="provider-select" ariaLabel={msg('Provider')} value={provider} onChange={value => set('provider', value as ProviderId)}
                    options={(['off', 'demo', ...DIRECT_PROVIDER_IDS, 'gateway'] as ProviderId[]).map(id => ({ value: id, label: msg(PROVIDER_LABEL[id]) }))}/>
            </SettingRow>
            {direct && <p className="settings-note" data-testid="provider-hint">{provider === 'compatible' ? msg('settings.ai.compatible') : msg('settings.ai.direct', { provider: direct.label })}</p>}
            {(provider === 'off' || provider === 'demo') && <StatusLine {...status} testId="ai-status"/>}
        </SurfaceGroup>
        {direct && <SurfaceGroup>
            {direct.editableBaseUrl && <SettingRow label={msg('Base URL')} setting="base-url">
                <input aria-label={msg('Base URL')} data-testid="base-url" value={settings.baseUrl} placeholder="https://host/v1" onChange={event => set('baseUrl', event.target.value)}/>
            </SettingRow>}
            <SettingRow label={msg('settings.ai.apiKey')} setting="api-key" description={<ApiKeyLink url={direct.keyUrl}/>}>
                <span className="settings-key-row">
                    <input aria-label={msg('settings.ai.apiKey')} id={`provider-key-field-${provider}`} type="password" autoComplete="off" data-testid="provider-key" value={keyDraft} placeholder={keyPresent ? msg('Stored securely') : msg('settings.ai.keyPrompt')} onChange={event => setKeyDraft(event.target.value)}/>
                    {keyPresent && !keyDraft.trim()
                        ? <Button variant="outline" size="sm" data-testid="provider-key-remove" onClick={() => void removeKey()}>{msg('Remove')}</Button>
                        : <Button variant="solid" size="sm" data-testid="provider-key-save" disabled={!keyDraft.trim()} onClick={() => void saveKey()}>{msg('Save')}</Button>}
                </span>
            </SettingRow>
            {keyPresent && <p className="settings-note">{msg(secureStore ? 'settings.ai.keyStored' : 'settings.ai.keySession')}</p>}
            {keyError && <p className="settings-error" role="alert" data-testid="provider-key-error">{keyError}</p>}
            <SettingRow label={msg('Model')} setting="model">
                <span className="settings-key-row settings-model-row">{modelField}<Button variant="outline" size="sm" data-testid="refresh-models" disabled={verifying !== null} onClick={() => void withTypedKey('models')}>{msg('Refresh models')}</Button></span>
            </SettingRow>
            <p className="settings-note" data-testid="model-summary">{modelFailure ? failureText(modelFailure, direct.label) : modelList === null ? msg('settings.ai.modelsUnfetched') : modelList.length ? msg('settings.ai.modelsCount', { count: modelList.length }) : msg('settings.ai.modelsEmpty')}</p>
            <div className="ui-group-footer"><StatusLine {...status} testId="ai-status"/><Button variant="solid" size="sm" data-testid="test-connection" disabled={verifying !== null} onClick={() => void withTypedKey('connection')}>{msg('Test connection')}</Button></div>
            <p className="settings-note">{msg('settings.ai.testCost')}</p>
            {reasons && depthRow(true)}
            {(direct.editableProtocol || !reasons) && <>
                <Button variant="ghost" size="sm" data-testid="ai-advanced" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}>{advanced ? msg('Hide advanced') : msg('Advanced')}</Button>
                {advanced && <div className="ui-disclosure-content">
                    {direct.editableProtocol && <SettingRow label={msg('Protocol')} setting="protocol"><Select testId="protocol-select" ariaLabel={msg('Protocol')} value={settings.protocol} onChange={value => set('protocol', value as WireProtocol)} options={WIRE_PROTOCOLS.filter(id => id === 'chat-completions' || id === 'responses').map(id => ({ value: id, label: msg(id === 'responses' ? 'Responses' : 'Chat completions') }))}/></SettingRow>}
                    {!reasons && depthRow(false)}
                </div>}
            </>}
        </SurfaceGroup>}
        {provider === 'gateway' && <SurfaceGroup>
            <p className="settings-note">{msg('settings.ai.gateway')}</p>
            <SettingRow label={msg('Gateway address')} setting="gateway-url"><input aria-label={msg('Gateway address')} data-testid="gateway-url" value={settings.gateway} placeholder={msg('Blank = same-origin /api')} onChange={event => set('gateway', event.target.value)}/></SettingRow>
            <SettingRow label={msg('Session token')} setting="gateway-token"><input aria-label={msg('Session token')} type="password" autoComplete="off" data-testid="gateway-token" value={settings.token} onChange={event => set('token', event.target.value)}/></SettingRow>
            <SettingRow label={msg('Model')} setting="model">
                {capabilities?.models.length ? <Select testId="model-select" ariaLabel={msg('Model')} value={settings.model} onChange={value => set('model', value)} options={[{ value: '', label: msg('Gateway default') }, ...capabilities.models.map(name => ({ value: name, label: name }))]}/> : <input data-testid="model-input" aria-label={msg('Model')} value={settings.model} maxLength={200} placeholder={msg('Gateway default')} onChange={event => set('model', event.target.value)}/>}
            </SettingRow>
            <div className="ui-group-footer"><StatusLine {...status} testId="ai-status"/><Button variant="solid" size="sm" data-testid="test-connection" disabled={verifying !== null} onClick={onVerify}>{msg('Test connection')}</Button></div>
            {capabilities?.depth.supported && <><Button variant="ghost" size="sm" data-testid="ai-advanced" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}>{msg('Advanced')}</Button>{advanced && depthRow(false)}</>}
        </SurfaceGroup>}
    </>;
}
