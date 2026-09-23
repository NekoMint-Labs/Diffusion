import type { AccentId, StyleProfileId } from './appearance.ts';

const ACCENT_COLORS: Record<Exclude<AccentId, 'custom'>, string> = {
    oxide: '#a45e4c', amber: '#b18545', moss: '#72806a', slate: '#687f91', plum: '#806b82',
};

export interface AccentTokens {
    attention: string;
    attentionSoft: string;
    selection: string;
    focus: string;
    activeControl: string;
}

interface Oklch { l: number; c: number; h: number }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const linear = (value: number) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;

function hexToOklch(value: string): Oklch {
    const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : ACCENT_COLORS.oxide;
    const r = linear(parseInt(hex.slice(1, 3), 16) / 255);
    const g = linear(parseInt(hex.slice(3, 5), 16) / 255);
    const b = linear(parseInt(hex.slice(5, 7), 16) / 255);
    const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
    const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
    const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    const lightness = .2104542553 * l + .793617785 * m - .0040720468 * s;
    const a = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s;
    const yellow = .0259040371 * l + .7827717662 * m - .808675766 * s;
    return { l: lightness, c: Math.hypot(a, yellow), h: (Math.atan2(yellow, a) * 180 / Math.PI + 360) % 360 };
}

const css = ({ l, c, h }: Oklch, alpha?: number) =>
    `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)}${alpha === undefined ? '' : ` / ${alpha}`})`;

/** Preserve hue identity while Theme bounds the color's visual force. */
export function deriveAccent(profile: StyleProfileId, accent: AccentId, customAccent: string): AccentTokens {
    const source = hexToOklch(accent === 'custom' ? customAccent : ACCENT_COLORS[accent]);
    const dark = profile !== 'editorial-warm';
    const base: Oklch = {
        l: clamp(source.l, dark ? .68 : .48, dark ? .76 : .60),
        c: clamp(source.c, .045, dark ? .14 : .13),
        h: source.h,
    };
    return {
        attention: css(base),
        attentionSoft: css({ ...base, c: base.c * .7 }, .14),
        selection: css({ ...base, l: clamp(base.l + (dark ? .035 : -.025), 0, 1), c: base.c * .92 }),
        focus: css({ ...base, c: Math.min(.15, base.c * 1.06) }),
        activeControl: css({ ...base, l: clamp(base.l + (dark ? -.035 : .035), 0, 1), c: base.c * .78 }),
    };
}
