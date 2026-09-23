import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { t as msg } from '../../shared/i18n.ts';
import {
    ACCENT_IDS, FIELD_STYLE_IDS, IMAGE_ATMOSPHERE_FILE_LIMIT, STYLE_PROFILE_IDS,
    type AccentId, type AppearanceSettings, type FieldStyleId, type ImageAtmosphereSettings, type StyleProfileId,
} from '../appearance.ts';
import { analyzeImageSource, applyRecommendedImageSettings, changeAppearanceContext, getRecommendedImageSettings } from '../imageRecommendations.ts';
import type { Settings } from '../settings.ts';
import { Button } from '../primitives/Button.tsx';
import { Select } from '../primitives/Select.tsx';
import { SettingRow } from '../primitives/SettingRow.tsx';
import { SurfaceGroup } from '../primitives/SurfaceGroup.tsx';

const profileLabels: Record<StyleProfileId, string> = {
    'editorial-warm': 'Editorial Warm', 'studio-slate': 'Studio Slate',
    'quiet-forest': 'Quiet Forest', 'graphite-night': 'Graphite Night',
};
const fieldLabels: Record<FieldStyleId, string> = {
    'paper-texture': 'Paper Texture', topography: 'Topography', threads: 'Threads', waves: 'Waves', silk: 'Silk',
};
const accentLabels: Record<AccentId, string> = {
    oxide: 'Oxide', amber: 'Amber', moss: 'Moss', slate: 'Slate', plum: 'Plum', custom: 'Custom',
};

type ImageControl = keyof Pick<ImageAtmosphereSettings, 'presence' | 'saturation' | 'brightness' | 'softness' | 'themeBlend'>;

export function AppearanceSettings({ settings, onChange }: { settings: Settings; onChange: (next: Settings) => void }) {
    const [imageError, setImageError] = useState('');
    const [recommendedAvailable, setRecommendedAvailable] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const appearance = settings.appearance;
    const setAppearance = (patch: Partial<AppearanceSettings>) => onChange({ ...settings, appearance: { ...appearance, ...patch } });
    const setImage = (patch: Partial<ImageAtmosphereSettings>) => setAppearance({ image: { ...appearance.image, ...patch } });
    const setImageControl = (key: ImageControl, value: number) => setImage({ [key]: value, dirty: true });

    function changeContext(profile: StyleProfileId, fieldStyle: FieldStyleId) {
        const next = changeAppearanceContext(appearance, profile, fieldStyle);
        setRecommendedAvailable(next.recommendedAvailable);
        onChange({ ...settings, appearance: next.appearance });
    }

    async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
            setImageError(msg('Choose a PNG, JPEG, or WebP image.'));
            return;
        }
        if (file.size > IMAGE_ATMOSPHERE_FILE_LIMIT) {
            setImageError(msg('Choose an image smaller than 1.5 MB so this device can persist it reliably.'));
            return;
        }
        const source = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        }).catch(() => '');
        if (!source) {
            setImageError(msg('This image could not be read.'));
            return;
        }
        const stats = await analyzeImageSource(source).catch(() => null);
        const recommended = getRecommendedImageSettings(appearance.profile, appearance.fieldStyle, stats);
        setImageError('');
        setRecommendedAvailable(false);
        setAppearance({ image: { source, ...recommended, dirty: false, stats } });
    }

    const applyRecommended = () => {
        setImage(applyRecommendedImageSettings(appearance.image, appearance.profile, appearance.fieldStyle));
        setRecommendedAvailable(false);
    };
    const previewStyle: CSSProperties | undefined = appearance.image.source
        ? { backgroundImage: `url(${JSON.stringify(appearance.image.source)})` } : undefined;

    return <>
        <SurfaceGroup title={msg('Theme')} description={msg('A Theme changes the mood, never the meaning of anything in the Field.')}>
            <SettingRow label={msg('Theme')} setting="style-profile">
                <Select testId="style-profile-select" ariaLabel={msg('Theme')} value={appearance.profile}
                    onChange={value => changeContext(value as StyleProfileId, appearance.fieldStyle)}
                    options={STYLE_PROFILE_IDS.map(value => ({ value, label: msg(profileLabels[value]) }))}/>
            </SettingRow>
        </SurfaceGroup>

        <SurfaceGroup title={msg('Field')} description={msg('Presentation-only material for the whole thinking space.') }>
            <SettingRow label={msg('Field Style')} setting="field-style">
                <Select testId="field-style-select" ariaLabel={msg('Field Style')} value={appearance.fieldStyle}
                    onChange={value => changeContext(appearance.profile, value as FieldStyleId)}
                    options={FIELD_STYLE_IDS.map(value => ({ value, label: msg(fieldLabels[value]) }))}/>
            </SettingRow>
            <SettingRow label={msg('Field Presence')} setting="field-presence">
                <input data-testid="field-presence" aria-label={msg('Field Presence')} type="range" min="0" max="100" step="1" value={appearance.fieldPresence} onChange={event => setAppearance({ fieldPresence: Number(event.target.value) })}/>
            </SettingRow>
            <SettingRow label={msg('Ambient Motion')} setting="ambient-motion">
                <input data-testid="ambient-motion" aria-label={msg('Ambient Motion')} type="range" min="0" max="100" step="1" value={appearance.ambientMotion} onChange={event => setAppearance({ ambientMotion: Number(event.target.value) })}/>
            </SettingRow>
        </SurfaceGroup>

        <SurfaceGroup title={msg('Accent')} description={msg('Accent guides attention without recoloring semantic states.') }>
            <div className="appearance-accents" role="radiogroup" aria-label={msg('Accent')}>
                {ACCENT_IDS.map(value => <button type="button" role="radio" aria-checked={appearance.accent === value} data-accent={value} key={value}
                    style={value === 'custom' ? { '--accent-swatch': appearance.customAccent } as CSSProperties : undefined} onClick={() => setAppearance({ accent: value })}>
                    <span className="appearance-accent-swatch" aria-hidden="true"/><span>{msg(accentLabels[value])}</span>
                </button>)}
            </div>
            {appearance.accent === 'custom' && <SettingRow label={msg('Custom accent')} setting="custom-accent">
                <input data-testid="custom-accent" aria-label={msg('Custom accent')} type="color" value={appearance.customAccent} onChange={event => setAppearance({ customAccent: event.target.value })}/>
            </SettingRow>}
        </SurfaceGroup>

        <SurfaceGroup title={msg('Image Atmosphere')} description={msg('An optional local image layer that can coexist with every Theme and Field Style.') }>
            <div className="appearance-image-row">
                <div className="appearance-image-preview" data-empty={!appearance.image.source || undefined} style={previewStyle} aria-hidden="true"/>
                <div className="appearance-inline-actions">
                    <input ref={fileRef} className="appearance-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage}/>
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>{appearance.image.source ? msg('Change') : msg('Choose image')}</Button>
                    {appearance.image.source && <Button variant="ghost" size="sm" onClick={() => { setRecommendedAvailable(false); setImage({ source: '', dirty: false, stats: null }); }}>{msg('Remove')}</Button>}
                </div>
            </div>
            {imageError && <p className="settings-error ui-setting-inset" role="alert">{imageError}</p>}
            {appearance.image.source && <>
                <SettingRow label={msg('Presence')} setting="image-presence"><input data-testid="image-presence" aria-label={msg('Presence')} type="range" min="0" max="100" value={appearance.image.presence} onChange={event => setImageControl('presence', Number(event.target.value))}/></SettingRow>
                <SettingRow label={msg('Saturation')} setting="image-saturation"><input data-testid="image-saturation" aria-label={msg('Saturation')} type="range" min="0" max="100" value={appearance.image.saturation} onChange={event => setImageControl('saturation', Number(event.target.value))}/></SettingRow>
                <details className="appearance-more">
                    <summary>{msg('More adjustments')}</summary>
                    <SettingRow label={msg('Brightness')} setting="image-brightness"><input aria-label={msg('Brightness')} type="range" min="0" max="100" value={appearance.image.brightness} onChange={event => setImageControl('brightness', Number(event.target.value))}/></SettingRow>
                    <SettingRow label={msg('Softness')} setting="image-softness"><input aria-label={msg('Softness')} type="range" min="0" max="100" value={appearance.image.softness} onChange={event => setImageControl('softness', Number(event.target.value))}/></SettingRow>
                    <SettingRow label={msg('Theme Blend')} setting="image-theme-blend"><input aria-label={msg('Theme Blend')} type="range" min="0" max="100" value={appearance.image.themeBlend} onChange={event => setImageControl('themeBlend', Number(event.target.value))}/></SettingRow>
                </details>
                {recommendedAvailable && <div className="appearance-recommended" role="status"><span>{msg('Recommended settings available')}</span><div className="appearance-inline-actions"><Button variant="outline" size="sm" onClick={applyRecommended}>{msg('Apply Recommended')}</Button><Button variant="ghost" size="sm" onClick={() => setRecommendedAvailable(false)}>{msg('Keep Mine')}</Button></div></div>}
                <div className="appearance-recommendation"><Button variant="ghost" size="sm" onClick={applyRecommended}>{msg('Reset to Recommended')}</Button></div>
            </>}
        </SurfaceGroup>
    </>;
}
