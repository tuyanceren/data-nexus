import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useThemedStyles, type Theme } from '@/lib/theme';

export function FormPage({
  title,
  onSave,
  children,
  busy,
  onCancel,
  footer,
}: {
  title: string;
  onSave: () => void;
  children: ReactNode;
  busy?: boolean;
  onCancel?: () => void;
  footer?: ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onCancel ?? (() => router.back())} style={styles.side}>
          <Text style={styles.cancel}>{t('common.cancel')}</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          hitSlop={8}
          onPress={onSave}
          style={styles.sideRight}>
          <Text style={[styles.save, busy ? styles.saveOff : null]}>{t('common.save')}</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: footer ? 16 : Math.max(insets.bottom, 24) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    bar: {
      alignItems: 'center',
      flexDirection: 'row',
      marginBottom: 16,
      minHeight: 44,
    },
    side: {
      width: 78,
    },
    sideRight: {
      alignItems: 'flex-end',
      width: 78,
    },
    cancel: {
      color: theme.accent,
      fontSize: 17,
    },
    title: {
      color: theme.ink,
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      textAlign: 'center',
    },
    save: {
      color: theme.accent,
      fontSize: 17,
      fontWeight: '700',
    },
    saveOff: {
      opacity: 0.4,
    },
    body: {
      gap: 16,
    },
  });
}
