import { useSQLiteContext } from 'expo-sqlite';
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { getSetting, setSetting } from '@/lib/db';

export type Theme = {
  bg: string;
  card: string;
  ink: string;
  muted: string;
  faint: string;
  line: string;
  accent: string;
  accentSoft: string;
  teal: string;
  tealSoft: string;
  amber: string;
  amberSoft: string;
  violet: string;
  violetSoft: string;
  coral: string;
  coralSoft: string;
  danger: string;
  dangerSoft: string;
  ok: string;
  white: string;
  onAccent: string;
  bar: 'light' | 'dark';
};

export type ThemeId = 'light' | 'dark' | 'night' | 'forest' | 'forestDark' | 'ocean' | 'oceanDark' | 'blue';

export const themeOptions: { id: ThemeId }[] = [
  { id: 'light' },
  { id: 'dark' },
  { id: 'night' },
  { id: 'forest' },
  { id: 'forestDark' },
  { id: 'ocean' },
  { id: 'oceanDark' },
  { id: 'blue' },
];

const light: Theme = {
  bg: '#E7F1F8',
  card: '#FFFFFF',
  ink: '#15212B',
  muted: '#5E7282',
  faint: '#8B9DAB',
  line: '#D5E4EE',
  accent: '#1F6F9A',
  accentSoft: '#E3F2FA',
  teal: '#1F8A7A',
  tealSoft: '#E5F6F2',
  amber: '#C47A12',
  amberSoft: '#FFF4E0',
  violet: '#6A56A8',
  violetSoft: '#F3EEF8',
  coral: '#D15B6A',
  coralSoft: '#FDECEF',
  danger: '#9C4545',
  dangerSoft: '#F8EEEE',
  ok: '#246B52',
  white: '#FFFFFF',
  onAccent: '#FFFFFF',
  bar: 'dark',
};

export const themes: Record<ThemeId, Theme> = {
  light,
  dark: {
    bg: '#12161C',
    card: '#1C232C',
    ink: '#F3F7FB',
    muted: '#A8B6C2',
    faint: '#7E8C99',
    line: '#2E3946',
    accent: '#7EC4E4',
    accentSoft: '#1A3344',
    teal: '#7DCFC0',
    tealSoft: '#16332E',
    amber: '#E2B15A',
    amberSoft: '#3A2C14',
    violet: '#C4B4F0',
    violetSoft: '#2A2440',
    coral: '#F2A3AE',
    coralSoft: '#3A242A',
    danger: '#F0A8A8',
    dangerSoft: '#3A2424',
    ok: '#8ED4B8',
    white: '#FFFFFF',
    onAccent: '#081018',
    bar: 'light',
  },
  night: {
    bg: '#070B18',
    card: '#141A2E',
    ink: '#EEF2FF',
    muted: '#A3AEDA',
    faint: '#6E7A9C',
    line: '#2A3354',
    accent: '#9AA6FF',
    accentSoft: '#1C2448',
    teal: '#8EE0D4',
    tealSoft: '#12302E',
    amber: '#F0C56E',
    amberSoft: '#332816',
    violet: '#D2C4FF',
    violetSoft: '#261C42',
    coral: '#FFA8BC',
    coralSoft: '#3A2030',
    danger: '#FFB4B4',
    dangerSoft: '#3A2228',
    ok: '#9EE0C8',
    white: '#FFFFFF',
    onAccent: '#0C1024',
    bar: 'light',
  },
  forest: {
    bg: '#E6F2E8',
    card: '#FFFFFF',
    ink: '#173024',
    muted: '#4C6B58',
    faint: '#7C9886',
    line: '#D0E4D6',
    accent: '#2C7A45',
    accentSoft: '#E2F5E7',
    teal: '#1E6B52',
    tealSoft: '#E4F6EE',
    amber: '#A56B12',
    amberSoft: '#FFF3DE',
    violet: '#5A6B38',
    violetSoft: '#F1F5E4',
    coral: '#C25A48',
    coralSoft: '#FDECEA',
    danger: '#9C4545',
    dangerSoft: '#F8EEEE',
    ok: '#246B52',
    white: '#FFFFFF',
    onAccent: '#FFFFFF',
    bar: 'dark',
  },
  forestDark: {
    bg: '#0C1410',
    card: '#16211B',
    ink: '#E8F6EC',
    muted: '#A4C3AE',
    faint: '#6E8F7A',
    line: '#2A3D32',
    accent: '#8ED4A8',
    accentSoft: '#1A3324',
    teal: '#7DCFB4',
    tealSoft: '#143028',
    amber: '#E2B15A',
    amberSoft: '#332816',
    violet: '#C5D6A4',
    violetSoft: '#24301C',
    coral: '#F0A898',
    coralSoft: '#3A2822',
    danger: '#F0A8A8',
    dangerSoft: '#3A2424',
    ok: '#8ED4A8',
    white: '#FFFFFF',
    onAccent: '#0C1610',
    bar: 'light',
  },
  ocean: {
    bg: '#E3F4F8',
    card: '#FFFFFF',
    ink: '#0E2C36',
    muted: '#3E6672',
    faint: '#7A9AA4',
    line: '#C8E3EA',
    accent: '#0E7490',
    accentSoft: '#D8F4F8',
    teal: '#0F766E',
    tealSoft: '#DDF6F3',
    amber: '#C47A12',
    amberSoft: '#FFF4E0',
    violet: '#3D6F8C',
    violetSoft: '#E7F3F8',
    coral: '#D15B6A',
    coralSoft: '#FDECEF',
    danger: '#9C4545',
    dangerSoft: '#F8EEEE',
    ok: '#0F766E',
    white: '#FFFFFF',
    onAccent: '#FFFFFF',
    bar: 'dark',
  },
  oceanDark: {
    bg: '#071318',
    card: '#102028',
    ink: '#E7F6FA',
    muted: '#9BB8C4',
    faint: '#6A8A96',
    line: '#1E3642',
    accent: '#6ED0E4',
    accentSoft: '#12323C',
    teal: '#7ED4C8',
    tealSoft: '#12302E',
    amber: '#E2B15A',
    amberSoft: '#332816',
    violet: '#A9C6E8',
    violetSoft: '#1A2838',
    coral: '#F2A3AE',
    coralSoft: '#3A242A',
    danger: '#F0A8A8',
    dangerSoft: '#3A2424',
    ok: '#7ED4C8',
    white: '#FFFFFF',
    onAccent: '#06141A',
    bar: 'light',
  },
  blue: {
    bg: '#ECEEF2',
    card: '#FFFFFF',
    ink: '#1A2740',
    muted: '#4E6280',
    faint: '#8494A8',
    line: '#D5DEE8',
    accent: '#1A66E0',
    accentSoft: '#E4EEFC',
    teal: '#2E62C8',
    tealSoft: '#E6EEF9',
    amber: '#C47A12',
    amberSoft: '#FFF4E0',
    violet: '#3A5FBF',
    violetSoft: '#E7EDF8',
    coral: '#D15B6A',
    coralSoft: '#FDECEF',
    danger: '#9C4545',
    dangerSoft: '#F8EEEE',
    ok: '#2A6BB5',
    white: '#FFFFFF',
    onAccent: '#FFFFFF',
    bar: 'dark',
  },
};

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return (
    value === 'light' ||
    value === 'dark' ||
    value === 'night' ||
    value === 'forest' ||
    value === 'forestDark' ||
    value === 'ocean' ||
    value === 'oceanDark' ||
    value === 'blue'
  );
}

export function hourColor(theme: Theme, time: string) {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return theme.amber;
  if (hour < 17) return theme.teal;
  return theme.violet;
}

export function cardShadow(theme: Theme) {
  const dark = theme.bar === 'light';
  return {
    shadowColor: dark ? '#000000' : theme.ink,
    shadowOffset: { width: 0, height: 8 } as const,
    shadowOpacity: dark ? 0.35 : 0.06,
    shadowRadius: 18,
    elevation: 2,
  };
}

type ThemeContextValue = {
  id: ThemeId;
  theme: Theme;
  setTheme: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

let cachedId: ThemeId = 'light';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [id, setId] = useState<ThemeId>(cachedId);

  useEffect(() => {
    let active = true;
    getSetting(db, 'theme').then((value) => {
      if (!active || !isThemeId(value)) return;
      cachedId = value;
      setId(value);
    });
    return () => {
      active = false;
    };
  }, [db]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = themes[id].bg;
    }
  }, [id]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      id,
      theme: themes[id],
      setTheme: (next) => {
        cachedId = next;
        setId(next);
        void setSetting(db, 'theme', next);
      },
    }),
    [db, id],
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    return {
      id: 'light' as ThemeId,
      theme: light,
      setTheme: (_id: ThemeId) => {},
    };
  }
  return value;
}

export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const { theme } = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
