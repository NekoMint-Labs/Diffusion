import { useState } from 'react';
import { t } from '../shared/i18n.ts';
import { createCredentialStore } from '../credentials/index.ts';
import { aiCredential } from '../credentials/contracts.ts';
import { createThinkingProvider, type ThinkingSelection } from '../ai/registry.ts';
import { demoDecider, modelDecider, type DecideStep } from './decision.ts';

export interface TrialConnection {
    selection: ThinkingSelection;
    secret: string;
}
export const defaultConnection = (): TrialConnection => ({
    selection: { provider: 'demo', model: '', thinkingDepth: 'standard', gateway: '', token: '', baseUrl: '', protocol: 'chat-completions' }, secret: '',
});
export function connectionDecider(connection: TrialConnection): DecideStep {
    if (connection.selection.provider === 'demo') return demoDecider;
    return modelDecider(async () => {
        const credentials = await createCredentialStore('__TAURI_INTERNALS__' in window);
        if (connection.secret && connection.selection.provider !== 'gateway')
            await credentials.store(aiCredential(connection.selection.provider), connection.secret);
        return createThinkingProvider(connection.selection, credentials);
    });
}
export function Connection({ value, onChange }: { value: TrialConnection; onChange: (value: TrialConnection) => void }) {
    const [open, setOpen] = useState(false);
    const selected = value.selection;
    const change = (patch: Partial<ThinkingSelection>) => onChange({ ...value, selection: { ...selected, ...patch } });
    return <section className="next-connection">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{t('Thinking connection')}{' · '}{selected.provider === 'demo' ? t('Authored demo') : selected.provider}</button>
        {open && <div className="next-connection-fields">
            <label>{t('Provider')}<select data-testid="next-provider" value={selected.provider} onChange={e => onChange({ selection: { ...defaultConnection().selection, provider: e.target.value as ThinkingSelection['provider'] }, secret: '' })}>
                <option value="demo">{t('Authored demo')}</option><option value="deepseek">{'DeepSeek'}</option>
                <option value="openai">{'OpenAI'}</option><option value="anthropic">{'Anthropic'}</option><option value="gemini">{'Google Gemini'}</option>
                <option value="compatible">{t('OpenAI compatible')}</option><option value="gateway">{t('Diffusion Gateway')}</option>
            </select></label>
            {selected.provider !== 'demo' && <>
                <label>{t('Model')}<input data-testid="next-model" maxLength={200} value={selected.model} onChange={e => change({ model: e.target.value })} /></label>
                {selected.provider === 'compatible' && <label>{t('Base URL')}<input data-testid="next-base-url" type="url" maxLength={500} value={selected.baseUrl} onChange={e => change({ baseUrl: e.target.value })} /></label>}
                {selected.provider === 'gateway' ? <>
                    <label>{t('Gateway URL')}<input type="url" maxLength={500} value={selected.gateway} onChange={e => change({ gateway: e.target.value })} /></label>
                    <label>{t('Session token')}<input type="password" autoComplete="off" value={selected.token} onChange={e => change({ token: e.target.value })} /></label>
                </> : <label>{t('API key')}<input data-testid="next-api-key" type="password" autoComplete="off" value={value.secret} onChange={e => onChange({ ...value, secret: e.target.value })} /></label>}
                <p>{t('Run sends this brief, this branch and its selected source texts to your chosen provider. Browser keys stay in memory; desktop keys use the existing OS store. Keys are excluded from notebook exports.')}</p>
                <p>{t('Browser connections depend on provider CORS and network access. This trial does not bypass those restrictions.')}</p>
            </>}
        </div>}
    </section>;
}
