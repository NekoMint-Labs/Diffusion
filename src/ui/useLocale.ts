import { useSyncExternalStore } from 'react';
import { getLocale, subscribeLocale } from '../shared/i18n.ts';
export function useLocale() { return useSyncExternalStore(subscribeLocale, getLocale, () => 'en' as const); }
