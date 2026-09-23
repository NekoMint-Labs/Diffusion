import { PaperTexture } from '@paper-design/shaders-react';
import type { FieldBackgroundRendererProps } from './types.ts';

/** Real Paper Shaders 0.0.81 renderer; static because this shader does not consume time. */
export default function PaperTextureBackground({ palette, detail }: FieldBackgroundRendererProps) {
    const amount = detail / 100;
    return <PaperTexture className="field-background-renderer" aria-hidden="true"
        speed={0} colorBack={palette.field} colorPaper={palette.surface} colorShadow={palette.boundary}
        distortion={0} clip={false} angle={300} seed={4}
        roughness={.08 + amount * .1} roughnessSize={.58} roughnessRows={.05 + amount * .08}
        fiber={.05 + amount * .08} fiberSize={.68} folds={.01 + amount * .025}
        wrinkles={.01 + amount * .025} wrinkleSize={.7} crumples={0} drops={.01}
        fit="cover" scale={.9 + amount * .2} minPixelRatio={1} maxPixelCount={1920 * 1080}/>;
}
