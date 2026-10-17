import { useSQLiteContext } from 'expo-sqlite';
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { getSetting, setSetting } from '@/lib/db';
import { languageOptions, translations, type Dictionary, type LanguageId } from '@/lib/translations';

type LeafKeys<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends readonly unknown[]
      ? never
      : LeafKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = LeafKeys<Dictionary>;

type Vars = Record<string, string | number>;

let activeLanguage: LanguageId = 'tr';

export function isLanguageId(value: string | null | undefined): value is LanguageId {
  return value === 'tr' || value === 'en';
}

export function languageNow() {
  return activeLanguage;
}

function read(pack: Dictionary, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((node, part) => {
    if (!node || typeof node !== 'object') return undefined;
    return (node as Record<string, unknown>)[part];
  }, pack);
  return typeof value === 'string' ? value : undefined;
}

export function text(key: TranslationKey, vars?: Vars) {
  const template = read(translations[activeLanguage], key) ?? read(translations.tr, key) ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
}

export function monthName(index: number) {
  return translations[activeLanguage].months[index] ?? translations.tr.months[index];
}

export function weekdayShortName(index: number) {
  return translations[activeLanguage].weekdaysShort[index] ?? translations.tr.weekdaysShort[index];
}

export function weekdayLongName(index: number) {
  return translations[activeLanguage].weekdaysLong[index] ?? translations.tr.weekdaysLong[index];
}

export function mondayFirstWeekdays() {
  const days = translations[activeLanguage].weekdaysShort;
  return [...days.slice(1), days[0]];
}

type LanguageContextValue = {
  language: LanguageId;
  setLanguage: (language: LanguageId) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [language, setLanguageState] = useState<LanguageId>(activeLanguage);

  useEffect(() => {
    let active = true;
    getSetting(db, 'language').then((value) => {
      if (!active || !isLanguageId(value)) return;
      activeLanguage = value;
      setLanguageState(value);
    });
    return () => {
      active = false;
    };
  }, [db]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (next) => {
        activeLanguage = next;
        setLanguageState(next);
        void setSetting(db, 'language', next);
      },
    }),
    [db, language],
  );

  return createElement(LanguageContext.Provider, { value }, children);
}

export function useI18n() {
  const value = useContext(LanguageContext);
  return {
    language: value?.language ?? activeLanguage,
    setLanguage: value?.setLanguage ?? ((_: LanguageId) => {}),
    t: text,
  };
}

export { languageOptions };
