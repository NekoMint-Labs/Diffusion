import Topography from './vendor/Topography.tsx';
import type { FieldBackgroundRendererProps } from './types.ts';

export default function TopographyBackground({ palette, motion, detail }: FieldBackgroundRendererProps) {
    return <Topography className="field-background-renderer" lowColor={palette.secondary} midColor={palette.secondary} highColor={palette.secondary}
        speed={motion === 0 ? 0 : motion / 850} morphAmount={2.25} morphSpeed={.035}
        bands={1.15 + detail / 70} thickness={.0045} scale={.68 + detail / 280}
        pixelSize={1} glow={.002} colorMode="uniform" contrast={1.15} brightness={1}
        fillBands={false} opacity={.3} grain={false} mouseInteraction={false}/>;
}
