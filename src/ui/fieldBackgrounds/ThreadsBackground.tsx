import Threads from './vendor/Threads.tsx';
import type { FieldBackgroundRendererProps } from './types.ts';

function normalized(hex: string): [number, number, number] {
    const value = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
    return value ? [parseInt(value[1], 16) / 255, parseInt(value[2], 16) / 255, parseInt(value[3], 16) / 255] : [.5, .5, .5];
}

export default function ThreadsBackground({ palette, motion, detail }: FieldBackgroundRendererProps) {
    return <Threads className="field-background-renderer" color={normalized(palette.secondary)}
        speed={motion === 0 ? 0 : motion / 280} amplitude={.12 + detail / 420}
        distance={.56 + detail / 300} enableMouseInteraction={false}/>;
}
