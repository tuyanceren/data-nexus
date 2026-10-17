import { useI18n } from '@/lib/i18n';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

const REVEAL = 92;
const BUTTON = 84;

export function SwipeRow({
  children,
  onDelete,
  rounded = true,
  enabled = true,
  style,
}: {
  children: ReactNode;
  onDelete: () => void;
  rounded?: boolean;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reveal = useRef(new Animated.Value(0)).current;
  const offset = useRef(0);
  const enabledRef = useRef(enabled);
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  enabledRef.current = enabled;

  function settle(openNext: boolean) {
    const to = openNext ? REVEAL : 0;
    offset.current = to;
    setOpen(openNext);
    Animated.spring(reveal, { toValue: to, useNativeDriver: false, bounciness: 0, speed: 20 }).start();
  }

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        enabledRef.current && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        reveal.stopAnimation((value) => {
          offset.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const next = Math.min(REVEAL, Math.max(0, offset.current - gesture.dx));
        reveal.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const next = offset.current - gesture.dx;
        settle(next > REVEAL / 2 || gesture.vx < -0.5);
      },
    }),
  ).current;

  useEffect(() => {
    if (!enabled && open) settle(false);
  }, [enabled, open]);

  return (
    <View style={[styles.row, style]}>
      <Animated.View style={styles.content} {...pan.panHandlers}>
        {children}
        {open ? (
          <Pressable accessibilityLabel={t('common.close')} onPress={() => settle(false)} style={styles.closer} />
        ) : null}
      </Animated.View>
      <Animated.View style={[styles.slot, { width: reveal }]}>
        <Pressable
          accessibilityLabel={t('common.delete')}
          accessibilityRole="button"
          onPress={onDelete}
          style={[styles.delete, rounded ? styles.deleteRounded : null]}>
          <Text style={styles.deleteText}>{t('common.delete')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  slot: {
    overflow: 'hidden',
  },
  delete: {
    backgroundColor: '#FF3B30',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    width: BUTTON,
  },
  deleteRounded: {
    borderRadius: 18,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
