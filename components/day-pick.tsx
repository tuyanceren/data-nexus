import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addMonths, dayKey, daysInMonth, monthLabel, parseDayKey, startOfMonth } from '@/lib/format';
import { mondayFirstWeekdays, useI18n } from '@/lib/i18n';
import { useThemedStyles, type Theme } from '@/lib/theme';

export function DayPick({ value, onChange }: { value: string; onChange: (day: string) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const heads = mondayFirstWeekdays();
  const selected = parseDayKey(value);
  const [cursor, setCursor] = useState(selected);
  const monthStart = startOfMonth(cursor);
  const lead = (monthStart.getDay() + 6) % 7;
  const days = Array.from({ length: daysInMonth(cursor) }, (_, index) =>
    new Date(cursor.getFullYear(), cursor.getMonth(), index + 1),
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.nav}>
        <Pressable accessibilityLabel={t('common.previousMonth')} onPress={() => setCursor((current) => addMonths(current, -1))} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.label}>{monthLabel(cursor)}</Text>
        <Pressable accessibilityLabel={t('common.nextMonth')} onPress={() => setCursor((current) => addMonths(current, 1))} style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {heads.map((name) => (
          <Text key={name} style={styles.head}>
            {name}
          </Text>
        ))}
        {Array.from({ length: lead }, (_, index) => (
          <View key={`lead-${index}`} style={styles.cell} />
        ))}
        {days.map((day) => {
          const key = dayKey(day);
          const active = key === value;
          return (
            <Pressable accessibilityRole="button" key={key} onPress={() => onChange(key)} style={styles.cell}>
              <View style={[styles.bubble, active ? styles.bubbleOn : null]}>
                <Text style={[styles.number, active ? styles.numberOn : null]}>{day.getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  wrap: {
    backgroundColor: theme.bg,
    borderRadius: 16,
    padding: 8,
  },
  nav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  arrow: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  arrowText: {
    color: theme.accent,
    fontSize: 22,
  },
  label: {
    color: theme.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  head: {
    color: theme.faint,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    width: '14.28%',
  },
  cell: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: '14.28%',
  },
  bubble: {
    alignItems: 'center',
    borderRadius: 14,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  bubbleOn: {
    backgroundColor: theme.accent,
  },
  number: {
    color: theme.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  numberOn: {
    color: theme.onAccent,
  },
  });
}

