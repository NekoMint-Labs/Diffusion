import { useEffect, useRef, useState } from 'react';
import { setLocale, t } from '../../shared/i18n.ts';
import { useUI } from '../store.ts';
import { loadSettings, saveSettings, THOUGHT_SIZE, type Settings } from '../settings.ts';
import { profileColorScheme } from '../appearance.ts';
import { deriveAccent } from '../accent.ts';
import { useMotionReduced } from '../motion/signature.ts';

/** User preferences and the appearance they drive.
 *
 * Preferences are independent of canonical Field state, camera and persistence: nothing here is
 * written into a project, and a secret is never restored. This module owns the settings value,
 * its device persistence, and exactly the two things a preference visibly controls — locale
 * and appearance. Applying a preference is presentation only; it never dispatches a command.
 */
export function useWorkspaceSettings() {
    const [settings, setSettings] = useState(loadSettings);
    /** Construction that happens outside render (provider selection) reads this handle. */
    const settingsRef = useRef(settings);
    settingsRef.current = settings;
    const reducedMotion = useMotionReduced();

    /** One write path: apply, remember, and report honestly if the device refused. */
    function apply(next: Settings) {
        setSettings(next);
        setLocale(next.locale);
        useUI.getState().patch({ theme: next.theme });
        if (!saveSettings(next))
            useUI.getState().patch({ notice: t('Preferences could not be saved on this device. They remain active for this session.') });
    }
    useEffect(() => { useUI.getState().patch({ theme: settingsRef.current.theme }); }, []);
    useEffect(() => { document.documentElement.dataset.thoughtTypography = settings.thoughtTypography; }, [settings.thoughtTypography]);
    /** Appearance is presentation-only root state. Theme, Field Style, Accent and Image Atmosphere
     * remain independent attributes; no ProjectState command observes them. */
    useEffect(() => {
        const root = document.documentElement;
        const appearance = settings.appearance;
        root.dataset.styleProfile = appearance.profile;
        root.dataset.fieldStyle = appearance.fieldStyle;
        root.dataset.imageAtmosphere = appearance.image.source ? 'true' : 'false';
        root.style.setProperty('--field-presence', String(appearance.fieldPresence / 100));
        const accent = deriveAccent(appearance.profile, appearance.accent, appearance.customAccent);
        root.style.setProperty('--attention', accent.attention);
        root.style.setProperty('--attention-soft', accent.attentionSoft);
        root.style.setProperty('--selection-accent', accent.selection);
        root.style.setProperty('--focus-accent', accent.focus);
        root.style.setProperty('--active-control', accent.activeControl);
        const effectiveMotion = reducedMotion ? 0 : appearance.ambientMotion;
        root.dataset.ambientMotion = String(appearance.ambientMotion);
        root.dataset.fieldMotion = effectiveMotion > 0 ? 'on' : 'off';
        root.style.setProperty('--ambient-motion', String(effectiveMotion / 100));
    }, [settings.appearance, reducedMotion]);
    /** The two size axes, applied as presentation on the document root.
     *
     * `--ui-scale` scales the chrome and `--thought-size` scales what the person wrote; both are
     * read by the editorial role tokens in `theme.css`. `--thought-scale` is the same Thought size
     * as a unitless ratio, so a semantic-zoom rule can keep the user's chosen size while still
     * counter-scaling the camera. Nothing here touches the camera, geometry or selection: the
     * Field re-measures because the elements it measures actually resized. */
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--ui-scale', String(settings.interfaceSize / 100));
        root.style.setProperty('--thought-size', `${settings.thoughtSize}px`);
        root.style.setProperty('--thought-scale', String(settings.thoughtSize / THOUGHT_SIZE.default));
        root.dataset.interfaceSize = String(settings.interfaceSize);
        root.dataset.thoughtSize = String(settings.thoughtSize);
    }, [settings.interfaceSize, settings.thoughtSize]);
    useEffect(() => {
        document.documentElement.dataset.theme = profileColorScheme(settings.appearance.profile);
    }, [settings.appearance.profile]);
    return { settings, settingsRef, apply };
}
