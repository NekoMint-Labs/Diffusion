import Waves from './vendor/Waves.tsx';
import type { FieldBackgroundRendererProps } from './types.ts';

function withAlpha(color: string, alpha: number): string {
    const hex = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
    return hex ? `rgba(${parseInt(hex[1], 16)}, ${parseInt(hex[2], 16)}, ${parseInt(hex[3], 16)}, ${alpha})` : color;
}

export default function WavesBackground({ palette, motion, detail }: FieldBackgroundRendererProps) {
    const line = withAlpha(palette.secondary, .18 + detail / 700);
    return <Waves className="field-background-renderer" lineColor={line} backgroundColor="transparent"
        waveSpeedX={.004} waveSpeedY={.0015} waveAmpX={7 + detail / 10}
        waveAmpY={4 + detail / 18} xGap={32} yGap={54} motion={motion / 100}/>;
}
