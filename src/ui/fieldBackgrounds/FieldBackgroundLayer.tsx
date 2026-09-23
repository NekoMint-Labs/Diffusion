import { lazy, Suspense, useEffect, useState, type ComponentType, type LazyExoticComponent } from 'react';
import type { FieldStyleId, StyleProfileId } from '../appearance.ts';
import { useMotionReduced } from '../motion/signature.ts';
import type { FieldBackgroundPalette, FieldBackgroundRendererProps } from './types.ts';
import './fieldBackgrounds.css';

const RENDERERS: Record<FieldStyleId, LazyExoticComponent<ComponentType<FieldBackgroundRendererProps>>> = {
    'paper-texture': lazy(() => import('./PaperTextureBackground.tsx')),
    topography: lazy(() => import('./TopographyBackground.tsx')),
    threads: lazy(() => import('./ThreadsBackground.tsx')),
    waves: lazy(() => import('./WavesBackground.tsx')),
    silk: lazy(() => import('./SilkBackground.tsx')),
};

const FALLBACK: Record<'light' | 'dark', FieldBackgroundPalette> = {
    light: { field: '#f0efeb', surface: '#f8f6f2', boundary: '#c8c5c0', secondary: '#68645d', light: true },
    dark: { field: '#171819', surface: '#202124', boundary: '#383a3e', secondary: '#b4b0aa', light: false },
};

function readPresentation(): { palette: FieldBackgroundPalette; presence: number; motion: number; profile: StyleProfileId } {
    const root = document.documentElement;
    const css = getComputedStyle(root);
    const light = root.dataset.theme !== 'dark';
    const fallback = FALLBACK[light ? 'light' : 'dark'];
    const token = (name: string, value: string) => css.getPropertyValue(name).trim() || value;
    const presenceValue = css.getPropertyValue('--field-presence').trim();
    const presence = presenceValue === '' ? .5 : Number(presenceValue);
    return {
        palette: {
            field: token('--field-bg', fallback.field),
            surface: token('--surface-1', fallback.surface),
            boundary: token('--boundary', fallback.boundary),
            secondary: token('--ink-secondary', fallback.secondary),
            light,
        },
        presence: Math.max(0, Math.min(1, Number.isFinite(presence) ? presence : .5)),
        motion: Math.max(0, Math.min(100, Number(root.dataset.ambientMotion) || 0)),
        profile: (root.dataset.styleProfile || 'editorial-warm') as StyleProfileId,
    };
}

export function FieldBackgroundLayer({ style }: { style: FieldStyleId }) {
    const reduced = useMotionReduced();
    const [presentation, setPresentation] = useState(readPresentation);
    useEffect(() => {
        const read = () => setPresentation(readPresentation());
        const observer = new MutationObserver(read);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style-profile', 'data-theme', 'data-ambient-motion', 'style'] });
        const frame = requestAnimationFrame(read);
        return () => { observer.disconnect(); cancelAnimationFrame(frame); };
    }, []);
    const Renderer = RENDERERS[style];
    const lightweight = import.meta.env.VITE_E2E_LIGHTWEIGHT_BACKGROUND === '1'
        && localStorage.getItem('diffusion-e2e-background') === 'lightweight';
    const effectiveMotion = reduced ? 0 : presentation.motion;
    return <div className="field-background-layer" data-testid="field-background" data-background-id={style}
        data-camera-attachment="screen" data-profile={presentation.profile} data-motion={effectiveMotion} aria-hidden="true"
        style={{ opacity: presentation.presence }}>
        <Suspense fallback={null}>{lightweight ? <div className="field-background-renderer"/> : <Renderer palette={presentation.palette} motion={effectiveMotion} detail={42}/>}</Suspense>
    </div>;
}
