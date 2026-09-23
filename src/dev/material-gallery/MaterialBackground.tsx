import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import type { FieldBackgroundRendererProps } from '../../ui/fieldBackgrounds/types.ts';
import { PALETTES, type MaterialId, type MaterialProps } from './types.ts';
import '../../ui/fieldBackgrounds/fieldBackgrounds.css';

function shared(load: () => Promise<{ default: ComponentType<FieldBackgroundRendererProps> }>): LazyExoticComponent<ComponentType<MaterialProps>> {
    return lazy(async () => {
        const { default: Background } = await load();
        return { default: ({ theme, motion, detail }: MaterialProps) => <Background palette={PALETTES[theme]} motion={motion} detail={detail}/> };
    });
}

const BACKGROUNDS: Record<MaterialId, LazyExoticComponent<ComponentType<MaterialProps>>> = {
    paper: shared(() => import('../../ui/fieldBackgrounds/PaperTextureBackground.tsx')),
    topography: shared(() => import('../../ui/fieldBackgrounds/TopographyBackground.tsx')),
    threads: shared(() => import('../../ui/fieldBackgrounds/ThreadsBackground.tsx')),
    waves: shared(() => import('../../ui/fieldBackgrounds/WavesBackground.tsx')),
    perlin: lazy(() => import('./backgrounds/PerlinBackground.tsx')),
    silk: shared(() => import('../../ui/fieldBackgrounds/SilkBackground.tsx')),
};

export function MaterialBackground({ id, ...props }: MaterialProps & { id: MaterialId }) {
    const Background = BACKGROUNDS[id];
    return <Suspense fallback={null}><Background key={id} {...props}/></Suspense>;
}
