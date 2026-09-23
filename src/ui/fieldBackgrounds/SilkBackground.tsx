import Silk from './vendor/Silk.tsx';
import type { FieldBackgroundRendererProps } from './types.ts';

export default function SilkBackground({ palette, motion, detail }: FieldBackgroundRendererProps) {
    return <Silk color={palette.surface} speed={motion === 0 ? 0 : motion / 180}
        scale={1.15 + detail / 135} noiseIntensity={.12 + detail / 500}
        rotation={.12} lightMode={palette.light}/>;
}
