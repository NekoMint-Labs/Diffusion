import type { FieldBackgroundPalette } from '../../ui/fieldBackgrounds/types.ts';

export const MATERIAL_IDS = ['paper', 'topography', 'threads', 'waves', 'perlin', 'silk'] as const;
export type MaterialId = typeof MATERIAL_IDS[number];
export type GalleryTheme = 'paper' | 'graphite';

export interface MaterialProps {
    theme: GalleryTheme;
    motion: number;
    detail: number;
}

export interface GalleryPalette extends FieldBackgroundPalette {
    surface1: string;
    surface2: string;
    ink: string;
}

export const PALETTES: Record<GalleryTheme, GalleryPalette> = {
    paper: { field: '#F0EFEB', surface: '#F8F6F2', surface1: '#F8F6F2', surface2: '#E7E5E1', boundary: '#C8C5C0', ink: '#292825', secondary: '#68645D', light: true },
    graphite: { field: '#171819', surface: '#202124', surface1: '#202124', surface2: '#27292B', boundary: '#383A3E', ink: '#E7E3DC', secondary: '#B4B0AA', light: false },
};

export const MATERIALS: Record<MaterialId, { label: string; source: string; renderer: string; cost: string }> = {
    paper: { label: 'Paper Texture', source: 'Paper Shaders', renderer: 'WebGL2', cost: 'Static · low idle cost' },
    topography: { label: 'Topography', source: 'React Bits', renderer: 'WebGL2 / OGL', cost: 'High GPU while moving' },
    threads: { label: 'Threads', source: 'React Bits', renderer: 'WebGL / OGL', cost: 'Highest GPU while moving' },
    waves: { label: 'Waves', source: 'React Bits', renderer: 'Canvas 2D', cost: 'Moderate CPU while moving' },
    perlin: { label: 'Perlin Noise', source: 'Paper Shaders', renderer: 'WebGL2', cost: 'High GPU while moving' },
    silk: { label: 'Silk', source: 'React Bits', renderer: 'Three / R3F', cost: 'High GPU · lazy chunk' },
};
