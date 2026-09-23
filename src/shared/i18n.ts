import { zh } from '../locales/zh.ts';
export type Locale = 'en' | 'zh';
export type LocalePreference = Locale | 'system';
const listeners = new Set<() => void>();
let preference: LocalePreference = 'system';
export function resolveLocale(value: LocalePreference, languages: readonly string[] = typeof navigator === 'undefined' ? ['en'] : navigator.languages): Locale {
    return value === 'system' ? (languages[0]?.toLowerCase().startsWith('zh') ? 'zh' : 'en') : value;
}
export const getLocale = (): Locale => resolveLocale(preference);
export function setLocale(value: LocalePreference): void {
    preference = value;
    if (typeof document !== 'undefined') document.documentElement.lang = getLocale() === 'zh' ? 'zh-CN' : 'en';
    for (const listener of listeners) listener();
}
export function subscribeLocale(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function t(message: string, values: Record<string, string | number> = {}): string {
    const template = getLocale() === 'zh' ? (zh[message] ?? message) : message;
    return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] === undefined ? match : String(values[key]));
}
