/** Device-only presentation preferences. They never enter ProjectState or geometry. */
export const STYLE_PROFILE_IDS = ['editorial-warm', 'studio-slate', 'quiet-forest', 'graphite-night'] as const;
export type StyleProfileId = typeof STYLE_PROFILE_IDS[number];

export const FIELD_STYLE_IDS = ['paper-texture', 'topography', 'threads', 'waves', 'silk'] as const;
export type FieldStyleId = typeof FIELD_STYLE_IDS[number];

export const ACCENT_IDS = ['oxide', 'amber', 'moss', 'slate', 'plum', 'custom'] as const;
export type AccentId = typeof ACCENT_IDS[number];

export interface ImageAppearanceStats {
    luminance: number;
    contrast: number;
    saturation: number;
    detailDensity: number;
}

export interface ImageAtmosphereSettings {
    /** Bounded device-local data URL. Never serialized into project data. */
    source: string;
    presence: number;
    saturation: number;
    brightness: number;
    softness: number;
    themeBlend: number;
    /** Manual ownership survives reloads and image-context changes. */
    dirty: boolean;
    /** Small visual-only measurements, never image content. */
    stats: ImageAppearanceStats | null;
}

export interface AppearanceSettings {
    profile: StyleProfileId;
    fieldStyle: FieldStyleId;
    fieldPresence: number;
    ambientMotion: number;
    accent: AccentId;
    customAccent: string;
    image: ImageAtmosphereSettings;
}

export interface AppearancePreset {
    fieldPresence: number;
    image: Pick<ImageAtmosphereSettings, 'presence' | 'saturation' | 'brightness' | 'softness' | 'themeBlend'>;
}

const STYLE_PRESETS: Record<FieldStyleId, AppearancePreset> = {
    'paper-texture': { fieldPresence: 48, image: { presence: 34, saturation: 60, brightness: 98, softness: 32, themeBlend: 42 } },
    topography: { fieldPresence: 24, image: { presence: 34, saturation: 62, brightness: 90, softness: 42, themeBlend: 52 } },
    threads: { fieldPresence: 34, image: { presence: 38, saturation: 66, brightness: 93, softness: 38, themeBlend: 46 } },
    waves: { fieldPresence: 40, image: { presence: 38, saturation: 66, brightness: 93, softness: 38, themeBlend: 46 } },
    silk: { fieldPresence: 36, image: { presence: 34, saturation: 60, brightness: 98, softness: 32, themeBlend: 42 } },
};

const THEME_PRESET_ADJUSTMENTS: Record<StyleProfileId, { fieldPresence: number; presence: number; saturation: number; brightness: number; softness: number; blend: number }> = {
    'editorial-warm': { fieldPresence: 0, presence: 0, saturation: 4, brightness: 2, softness: 0, blend: -4 },
    'studio-slate': { fieldPresence: -1, presence: 1, saturation: -2, brightness: 0, softness: 2, blend: 2 },
    'quiet-forest': { fieldPresence: -2, presence: -1, saturation: 2, brightness: -1, softness: 1, blend: 4 },
    'graphite-night': { fieldPresence: 2, presence: 4, saturation: -6, brightness: -8, softness: 3, blend: 8 },
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const bounded = (value: unknown, fallback: number) => clamp(typeof value === 'number' && Number.isFinite(value) ? value : fallback);

/** One centralized designer recommendation for every Theme × Field Style combination. */
export function getAppearancePreset(profile: StyleProfileId, fieldStyle: FieldStyleId): AppearancePreset {
    const base = STYLE_PRESETS[fieldStyle];
    const adjust = THEME_PRESET_ADJUSTMENTS[profile];
    return {
        fieldPresence: clamp(base.fieldPresence + adjust.fieldPresence),
        image: {
            presence: clamp(base.image.presence + adjust.presence),
            saturation: clamp(base.image.saturation + adjust.saturation),
            brightness: clamp(base.image.brightness + adjust.brightness),
            softness: clamp(base.image.softness + adjust.softness),
            themeBlend: clamp(base.image.themeBlend + adjust.blend),
        },
    };
}

export const IMAGE_ATMOSPHERE_FILE_LIMIT = 1_500_000;
const IMAGE_SOURCE_LIMIT = 2_100_000;
const IMAGE_DATA = /^data:image\/(?:png|jpeg|webp);base64,/i;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const isImageAtmosphereSource = (value: unknown): value is string =>
    typeof value === 'string' && value.length <= IMAGE_SOURCE_LIMIT && IMAGE_DATA.test(value);

const DEFAULT_PRESET = getAppearancePreset('editorial-warm', 'paper-texture');
export const DEFAULT_IMAGE_ATMOSPHERE: ImageAtmosphereSettings = {
    source: '', ...DEFAULT_PRESET.image, dirty: false, stats: null,
};
export const DEFAULT_APPEARANCE: AppearanceSettings = {
    profile: 'editorial-warm',
    fieldStyle: 'paper-texture',
    fieldPresence: DEFAULT_PRESET.fieldPresence,
    ambientMotion: 50,
    accent: 'oxide',
    customAccent: '#a45e4c',
    image: { ...DEFAULT_IMAGE_ATMOSPHERE },
};

function normalizeStats(value: unknown): ImageAppearanceStats | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const raw = value as Partial<ImageAppearanceStats>;
    const values = [raw.luminance, raw.contrast, raw.saturation, raw.detailDensity];
    if (!values.every(item => typeof item === 'number' && Number.isFinite(item) && item >= 0 && item <= 1)) return null;
    return raw as ImageAppearanceStats;
}

/** Shape-based migration keeps prior local preferences without creating a second source of truth. */
export function normalizeAppearanceSettings(value: unknown): AppearanceSettings {
    const raw = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Partial<AppearanceSettings> : {};
    const profile = STYLE_PROFILE_IDS.includes(raw.profile as StyleProfileId) ? raw.profile as StyleProfileId : DEFAULT_APPEARANCE.profile;
    const fieldStyle = FIELD_STYLE_IDS.includes(raw.fieldStyle as FieldStyleId) ? raw.fieldStyle as FieldStyleId : DEFAULT_APPEARANCE.fieldStyle;
    const preset = getAppearancePreset(profile, fieldStyle);
    const imageRaw = raw.image && typeof raw.image === 'object' && !Array.isArray(raw.image)
        ? raw.image as Partial<ImageAtmosphereSettings> & { strength?: unknown; intensity?: unknown; desaturation?: unknown; overlay?: unknown } : {};
    const legacyStrength = typeof imageRaw.strength === 'number' ? imageRaw.strength
        : typeof imageRaw.intensity === 'number' ? imageRaw.intensity / 45 * 100 : undefined;
    return {
        profile,
        fieldStyle,
        fieldPresence: bounded(raw.fieldPresence, preset.fieldPresence),
        ambientMotion: bounded(raw.ambientMotion, DEFAULT_APPEARANCE.ambientMotion),
        accent: ACCENT_IDS.includes(raw.accent as AccentId) ? raw.accent as AccentId : DEFAULT_APPEARANCE.accent,
        customAccent: typeof raw.customAccent === 'string' && HEX_COLOR.test(raw.customAccent) ? raw.customAccent : DEFAULT_APPEARANCE.customAccent,
        image: {
            source: isImageAtmosphereSource(imageRaw.source) ? imageRaw.source : '',
            presence: bounded(imageRaw.presence, bounded(legacyStrength, preset.image.presence)),
            saturation: bounded(imageRaw.saturation, typeof imageRaw.desaturation === 'number' ? 100 - imageRaw.desaturation : preset.image.saturation),
            brightness: bounded(imageRaw.brightness, typeof imageRaw.overlay === 'number' ? 100 + imageRaw.overlay : preset.image.brightness),
            softness: bounded(imageRaw.softness, preset.image.softness),
            themeBlend: bounded(imageRaw.themeBlend, preset.image.themeBlend),
            dirty: imageRaw.dirty === true,
            stats: normalizeStats(imageRaw.stats),
        },
    };
}

/** Maps product controls to one bounded CSS presentation recipe. */
export function imageAtmospherePresentation(image: ImageAtmosphereSettings): {
    opacity: number; filter: string; scale: number; toneOpacity: number;
} {
    const softness = clamp(image.softness);
    return {
        opacity: clamp(image.presence) / 100,
        filter: `saturate(${clamp(image.saturation) / 100}) brightness(${clamp(image.brightness) / 100}) blur(${(softness / 12).toFixed(2)}px)`,
        scale: 1 + softness / 2500,
        toneOpacity: clamp(image.themeBlend) / 100 * .68,
    };
}

/** Theme profiles own their base polarity; the retired lighting preference is migration-only. */
export const profileColorScheme = (profile: StyleProfileId): 'light' | 'dark' =>
    profile === 'editorial-warm' ? 'light' : 'dark';
