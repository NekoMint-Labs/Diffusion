import { PerlinNoise } from '@paper-design/shaders-react';
import type { MaterialProps } from '../types.ts';
import { PALETTES } from '../types.ts';

/** Real Paper Shaders 0.0.81 Perlin renderer with two adjacent palette tones. */
export default function PerlinBackground({ theme, motion, detail }: MaterialProps) {
    const palette = PALETTES[theme];
    return <PerlinNoise className="material-renderer" aria-hidden="true"
        speed={motion === 0 ? 0 : .004 + motion / 5000} frame={0}
        colorBack={palette.field} colorFront={palette.surface2}
        proportion={.5} softness={.76} octaveCount={2} persistence={.42} lacunarity={1.8}
        fit="none" scale={2.6 + detail / 42} minPixelRatio={1} maxPixelCount={1280 * 720}/>;
}
