import { Suspense, useEffect } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { migrate } from '@/lib/db';
import { configureNotifications, ensureMorningMotivation } from '@/lib/notify';
import { StopwatchProvider } from '@/lib/stopwatch';
import { LanguageProvider, useI18n } from '@/lib/i18n';
import { ThemeProvider, themes, useTheme } from '@/lib/theme';

export { ErrorBoundary } from 'expo-router';

configureNotifications();

export default function RootLayout() {
  useEffect(() => {
    configureNotifications();
    void ensureMorningMotivation();
  }, []);

  return (
    <StopwatchProvider>
      <Suspense fallback={<Boot />}>
        <SQLiteProvider databaseName="ajanda.db" onInit={migrate} useSuspense>
          <LanguageProvider>
            <ThemeProvider>
              <Shell />
            </ThemeProvider>
          </LanguageProvider>
        </SQLiteProvider>
      </Suspense>
    </StopwatchProvider>
  );
}

function Shell() {
  const { theme } = useTheme();
  const { language } = useI18n();
  useEffect(() => {
    void ensureMorningMotivation();
  }, [language]);
  return (
    <>
      <StatusBar style={theme.bar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

function Boot() {
  return (
    <View style={styles.boot}>
      <Text style={styles.bootText}>Ajanda</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    alignItems: 'center',
    backgroundColor: themes.light.bg,
    flex: 1,
    justifyContent: 'center',
  },
  bootText: {
    color: themes.light.accent,
    fontSize: 22,
    fontWeight: '700',
  },
});
