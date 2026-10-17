import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { cardShadow, useTheme, useThemedStyles, type Theme } from '@/lib/theme';

export function Screen({ children, background }: { children: ReactNode; background?: string }) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, background ? { backgroundColor: background } : null, { paddingTop: Math.max(insets.top, 12) }]}>
      {children}
    </View>
  );
}

export function Header({
  kicker,
  title,
  action,
}: {
  kicker?: string;
  title: string;
  action?: ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.addButton}>
      <Text style={styles.addPlus}>+</Text>
      <Text style={styles.addButtonText}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function Card({
  children,
  onPress,
  mark,
  markColor,
}: {
  children: ReactNode;
  onPress?: () => void;
  mark?: boolean;
  markColor?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const cardStyle = [styles.card, mark ? styles.cardMark : null, mark && markColor ? { borderLeftColor: markColor } : null];
  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [...cardStyle, pressed ? styles.pressed : null]}>
      {children}
    </Pressable>
  );
}

export function Field({ label, surface, ...props }: { label?: string; surface?: boolean } & TextInputProps) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.muted}
        style={[styles.input, surface ? styles.inputSurface : null, props.multiline ? styles.inputMultiline : null]}
        {...props}
      />
    </View>
  );
}

export function Notice({ children }: { children: string }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.notice}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'quiet' | 'danger';
  disabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        kind === 'primary' ? styles.buttonPrimary : null,
        kind === 'quiet' ? styles.buttonQuiet : null,
        kind === 'danger' ? styles.buttonDanger : null,
        disabled ? styles.buttonDisabled : null,
      ]}>
      <Text
        style={[
          styles.buttonText,
          kind === 'primary' ? styles.buttonTextPrimary : null,
          kind === 'danger' ? styles.buttonTextDanger : null,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.sheetRoot}>
        <Pressable accessibilityLabel={t('common.close')} onPress={onClose} style={styles.sheetBackdropFill} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetAvoid}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{title}</Text>
            <ScrollView
              contentContainerStyle={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.sheetScroll}>
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const CHOICE_TONES = [
  { bg: '#E3F2FA', fg: '#1F6F9A' },
  { bg: '#E5F6F2', fg: '#1F8A7A' },
  { bg: '#FFF4E0', fg: '#C47A12' },
  { bg: '#F3EEF8', fg: '#6A56A8' },
  { bg: '#FDECEF', fg: '#D15B6A' },
  { bg: '#E8F6EA', fg: '#246B52' },
];

export function QuickChoices({
  options,
  onPick,
  disabled,
}: {
  options: readonly string[];
  onPick: (label: string) => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.choiceGrid}>
      {options.map((label, index) => {
        const tone = CHOICE_TONES[index % CHOICE_TONES.length];
        return (
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            key={label}
            onPress={() => onPick(label)}
            style={[
              styles.choice,
              { backgroundColor: tone.bg },
              options.length > 4 ? styles.choiceThird : null,
              disabled ? styles.buttonDisabled : null,
            ]}>
            <Text style={[styles.choiceText, { color: tone.fg }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  screen: {
    backgroundColor: theme.bg,
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 18,
    marginTop: 6,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.ink,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: theme.accent,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addPlus: {
    color: theme.onAccent,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  addButtonText: {
    color: theme.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 36,
  },
  emptyTitle: {
    color: theme.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyBody: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 18,
    gap: 4,
    padding: 16,
    ...cardShadow(theme),
  },
  cardMark: {
    borderLeftColor: theme.accent,
    borderLeftWidth: 3,
  },
  pressed: {
    opacity: 0.82,
  },
  field: {
    gap: 6,
  },
  label: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.bg,
    borderRadius: 14,
    color: theme.ink,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputSurface: {
    backgroundColor: theme.card,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  notice: {
    color: theme.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 50,
    paddingVertical: 14,
  },
  buttonPrimary: {
    backgroundColor: theme.accent,
  },
  buttonQuiet: {
    backgroundColor: theme.accentSoft,
  },
  buttonDanger: {
    backgroundColor: theme.dangerSoft,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonTextPrimary: {
    color: theme.onAccent,
  },
  buttonTextDanger: {
    color: theme.danger,
  },
  sheetRoot: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheetBackdropFill: {
    backgroundColor: 'rgba(16, 26, 36, 0.42)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheetAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 2,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: theme.line,
    borderRadius: 999,
    height: 5,
    marginBottom: 14,
    width: 40,
  },
  sheetTitle: {
    color: theme.ink,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  sheetScroll: {
    flexGrow: 0,
    maxHeight: 520,
  },
  sheetBody: {
    gap: 16,
    paddingBottom: 8,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choice: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 64,
    paddingHorizontal: 8,
    ...cardShadow(theme),
  },
  choiceThird: {
    flexBasis: '30%',
  },
  choiceText: {
    color: theme.accent,
    fontSize: 17,
    fontWeight: '700',
  },
  });
}

