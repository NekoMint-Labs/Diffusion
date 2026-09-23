import type { CSSProperties } from 'react';
import './atmosphere.css';
import type { AtmosphereRole } from './atmosphere.ts';
import { imageAtmospherePresentation, type AppearanceSettings } from './appearance.ts';

export { atmosphereRole, type AtmosphereRole } from './atmosphere.ts';

/** The Field's material layer. It is presentation-only and owns no input. Field Style and
 * image treatment come from device appearance settings; the image never enters canonical data. */
export function Atmosphere({ role, appearance }: { role: AtmosphereRole; appearance?: AppearanceSettings }) {
    const image = appearance?.image;
    const activeImage = image?.source;
    const presentation = image ? imageAtmospherePresentation(image) : null;
    const imageStyle: CSSProperties | undefined = activeImage && presentation ? {
        backgroundImage: `url(${JSON.stringify(image.source)})`,
        opacity: presentation.opacity,
        filter: presentation.filter,
        transform: `scale(${presentation.scale})`,
    } : undefined;
    const toneStyle: CSSProperties | undefined = activeImage && presentation ? { opacity: presentation.toneOpacity } : undefined;
    return <div className="atmosphere" data-atmosphere={role} aria-hidden="true">
        {activeImage && <><span className="atmosphere-image" style={imageStyle}/><span className="atmosphere-image-tone" style={toneStyle}/></>}
        <span className="atmosphere-grain"/>
    </div>;
}
