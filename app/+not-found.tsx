import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { useThemedStyles, type Theme } from '@/lib/theme';

export default function NotFoundScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title'), headerShown: true }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('notFound.missing')}</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('notFound.home')}</Text>
        </Link>
      </View>
    </>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.bg,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: theme.ink,
    fontSize: 20,
    fontWeight: '700',
  },
  link: {
    paddingVertical: 8,
  },
  linkText: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  });
}

