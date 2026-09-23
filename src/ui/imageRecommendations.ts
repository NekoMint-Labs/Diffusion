import { getAppearancePreset, type AppearanceSettings, type FieldStyleId, type ImageAppearanceStats, type StyleProfileId } from './appearance.ts';

export type RecommendedImageSettings = ReturnType<typeof getAppearancePreset>['image'];
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const luma = (r: number, g: number, b: number) => .2126 * r + .7152 * g + .0722 * b;

/** Analyze already-downsampled pixels. Values are normalized to 0..1. */
export function analyzeImagePixels(data: Uint8ClampedArray, width: number, height: number): ImageAppearanceStats {
    const count = Math.max(1, width * height);
    const luminances = new Float32Array(count);
    let luminance = 0, saturation = 0, detail = 0;
    for (let index = 0; index < count; index++) {
        const offset = index * 4;
        const r = (data[offset] ?? 0) / 255, g = (data[offset + 1] ?? 0) / 255, b = (data[offset + 2] ?? 0) / 255;
        const value = luma(r, g, b);
        luminances[index] = value;
        luminance += value;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        saturation += max === 0 ? 0 : (max - min) / max;
        if (index % width) detail += Math.abs(value - luminances[index - 1]);
        if (index >= width) detail += Math.abs(value - luminances[index - width]);
    }
    luminance /= count;
    let variance = 0;
    for (const value of luminances) variance += (value - luminance) ** 2;
    const edgeCount = Math.max(1, (width - 1) * height + (height - 1) * width);
    return {
        luminance: clamp(luminance, 0, 1),
        contrast: clamp(Math.sqrt(variance / count) * 2, 0, 1),
        saturation: clamp(saturation / count, 0, 1),
        detailDensity: clamp(detail / edgeCount * 3, 0, 1),
    };
}

/** Local 48×48 canvas analysis; no source pixels or statistics leave the device. */
export function analyzeImageAppearance(image: CanvasImageSource): ImageAppearanceStats {
    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas image analysis is unavailable.');
    context.drawImage(image, 0, 0, size, size);
    return analyzeImagePixels(context.getImageData(0, 0, size, size).data, size, size);
}

export function analyzeImageSource(source: string): Promise<ImageAppearanceStats> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => { try { resolve(analyzeImageAppearance(image)); } catch (error) { reject(error); } };
        image.onerror = () => reject(new Error('Image analysis failed.'));
        image.src = source;
    });
}

/** Image statistics may nudge, never redesign, the selected Theme × Field Style preset. */
export function getRecommendedImageSettings(profile: StyleProfileId, fieldStyle: FieldStyleId, stats: ImageAppearanceStats | null): RecommendedImageSettings {
    const base = getAppearancePreset(profile, fieldStyle).image;
    if (!stats) return { ...base };
    const bright = clamp((stats.luminance - .5) * 2, -1, 1);
    const colorful = clamp((stats.saturation - .42) * 2, -1, 1);
    const busy = clamp((stats.detailDensity + stats.contrast - .62) * 1.4, -1, 1);
    return {
        presence: clamp(base.presence - bright * 8 - busy * 6),
        saturation: clamp(base.saturation - Math.max(0, colorful) * 16 + Math.max(0, -colorful) * 4),
        brightness: clamp(base.brightness - bright * 10),
        softness: clamp(base.softness + busy * 12),
        themeBlend: clamp(base.themeBlend + bright * 8 + Math.max(0, colorful) * 5),
    };
}

export function changeAppearanceContext(appearance: AppearanceSettings, profile: StyleProfileId, fieldStyle: FieldStyleId): { appearance: AppearanceSettings; recommendedAvailable: boolean } {
    const preset = getAppearancePreset(profile, fieldStyle);
    const currentPreset = getAppearancePreset(appearance.profile, appearance.fieldStyle);
    const fieldPresenceOffset = appearance.fieldPresence - currentPreset.fieldPresence;
    const preserveImage = !!appearance.image.source && appearance.image.dirty;
    return {
        recommendedAvailable: preserveImage,
        appearance: {
            ...appearance,
            profile,
            fieldStyle,
            // Keep the person's slider adjustment as a delta from the designer recommendation.
            fieldPresence: clamp(preset.fieldPresence + fieldPresenceOffset),
            image: preserveImage ? appearance.image : applyRecommendedImageSettings(appearance.image, profile, fieldStyle),
        },
    };
}

export function applyRecommendedImageSettings(image: AppearanceSettings['image'], profile: StyleProfileId, fieldStyle: FieldStyleId): AppearanceSettings['image'] {
    return { ...image, ...getRecommendedImageSettings(profile, fieldStyle, image.stats), dirty: false };
}
