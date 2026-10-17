import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { SwipeRow } from '@/components/swipe-row';
import { AddButton, Card, EmptyState, Header, Screen } from '@/components/ui';
import { deleteSchedule, listBusyDays, listSchedule, type ScheduleItem } from '@/lib/db';
import {
  addDays,
  addMonths,
  dayKey,
  daysInMonth,
  dayTitle,
  parseDayKey,
  defaultStart,
  pad,
  monthLabel,
  startOfMonth,
  startOfWeek,
  weekdayLong,
  weekdayShort,
  weekRangeLabel,
} from '@/lib/format';
import { mondayFirstWeekdays, useI18n } from '@/lib/i18n';
import { hourColor, useTheme, useThemedStyles, type Theme } from '@/lib/theme';
import { takePendingDay } from '@/lib/return-day';

export default function DayScreen() {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const { t } = useI18n();
  const db = useSQLiteContext();
  const [selected, setSelected] = useState(() => new Date());
  const [zoom, setZoom] = useState<'week' | 'month' | 'day'>('week');
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  const selectedKey = dayKey(selected);
  const weekStart = startOfWeek(selected);
  const monthStart = startOfMonth(selected);
  const rangeFrom = zoom === 'week' ? dayKey(weekStart) : dayKey(monthStart);
  const rangeTo =
    zoom === 'week'
      ? dayKey(addDays(weekStart, 6))
      : dayKey(new Date(selected.getFullYear(), selected.getMonth(), daysInMonth(selected)));

  const load = useCallback(async () => {
    setItems(await listSchedule(db, selectedKey));
  }, [db, selectedKey]);

  useEffect(() => {
    let active = true;
    listBusyDays(db, rangeFrom, rangeTo).then((rows) => {
      if (active) setBusy(new Set(rows.map((row) => row.day)));
    });
    return () => {
      active = false;
    };
  }, [db, rangeFrom, rangeTo, items]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const pending = takePendingDay();
      const day = pending ?? selectedKey;
      if (pending) setSelected(parseDayKey(pending));
      listSchedule(db, day).then((rows) => {
        if (active) setItems(rows);
      });
      return () => {
        active = false;
      };
    }, [db, selectedKey]),
  );

  function openNew(start?: string) {
    const time = typeof start === 'string' ? start : defaultStart(selectedKey);
    router.push(`/block?day=${selectedKey}&start=${time}` as Href);
  }

  function openItem(item: ScheduleItem) {
    router.push(`/block?id=${item.id}` as Href);
  }

  function remove(id: number) {
    void deleteSchedule(db, id).then(load);
  }

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const monthLead = (monthStart.getDay() + 6) % 7;
  const monthDays = Array.from({ length: daysInMonth(selected) }, (_, index) =>
    new Date(selected.getFullYear(), selected.getMonth(), index + 1),
  );
  const weekdayHeads = mondayFirstWeekdays();

  function shift(direction: -1 | 1) {
    setSelected((current) => {
      if (zoom === 'day') return addDays(current, direction);
      if (zoom === 'week') return addDays(current, direction * 7);
      return addMonths(current, direction);
    });
  }

  function pickDay(day: Date) {
    if (zoom === 'month') {
      setSelected(day);
      setZoom('week');
      return;
    }
    if (dayKey(day) === selectedKey) {
      setZoom('day');
      return;
    }
    setSelected(day);
  }

  function zoomOut() {
    setZoom((current) => (current === 'day' ? 'week' : 'month'));
  }

  function renderItem(item: ScheduleItem) {
    const tag =
      item.note === 'Planlandı' || item.note === 'Planned'
        ? 'planned'
        : item.note === 'Yapıldı' || item.note === 'Done'
          ? 'done'
          : '';
    return (
      <SwipeRow key={item.id} onDelete={() => remove(item.id)}>
        <Card mark markColor={hourColor(theme, item.start_time)} onPress={() => openItem(item)}>
          <Text style={[styles.time, { color: hourColor(theme, item.start_time) }]}>
            {item.start_time}
            {item.end_time ? ` – ${item.end_time}` : ''}
          </Text>
          <Text style={styles.itemTitle}>{item.title}</Text>
          {tag ? (
            <Text style={[styles.tag, tag === 'done' ? styles.tagDone : null]}>
              {t(tag === 'done' ? 'calendar.done' : 'calendar.planned')}
            </Text>
          ) : item.note ? (
            <Text style={styles.itemNote}>{item.note}</Text>
          ) : null}
        </Card>
      </SwipeRow>
    );
  }

  const hours = visibleHours(items);
  const navLabel = zoom === 'month' ? monthLabel(selected) : zoom === 'week' ? weekRangeLabel(weekStart) : weekdayShort(selected);
  const navHint = zoom === 'day' ? t('common.week') : zoom === 'week' ? t('common.month') : '';

  return (
    <Screen>
      <Header
        action={<AddButton label={t('common.add')} onPress={openNew} />}
        kicker={weekdayLong(selected)}
        title={dayTitle(selected)}
      />
      <View style={styles.weekNav}>
        <Pressable
          accessibilityLabel={zoom === 'day' ? t('common.previousDay') : zoom === 'week' ? t('common.previousWeek') : t('common.previousMonth')}
          onPress={() => shift(-1)}
          style={styles.weekButton}>
          <Text style={styles.weekButtonText}>‹</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={zoom === 'day' ? t('common.weekView') : t('common.monthView')}
          disabled={zoom === 'month'}
          onPress={zoomOut}
          style={styles.zoom}>
          <Text style={styles.weekLabel}>{navLabel}</Text>
          {navHint ? <Text style={styles.zoomHint}>{navHint}</Text> : null}
        </Pressable>
        <Pressable
          accessibilityLabel={zoom === 'day' ? t('common.nextDay') : zoom === 'week' ? t('common.nextWeek') : t('common.nextMonth')}
          onPress={() => shift(1)}
          style={styles.weekButton}>
          <Text style={styles.weekButtonText}>›</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setSelected(new Date())}
        style={[styles.todayJump, selectedKey === dayKey(new Date()) ? styles.todayJumpOn : null]}>
        <Text style={[styles.todayJumpText, selectedKey === dayKey(new Date()) ? styles.todayJumpTextOn : null]}>{t('common.today')}</Text>
      </Pressable>
      {zoom === 'week' ? (
        <View style={styles.days}>
          {days.map((day) => {
            const key = dayKey(day);
            const active = key === selectedKey;
            const today = key === dayKey(new Date());
            return (
              <Pressable
                accessibilityRole="button"
                key={key}
                onPress={() => pickDay(day)}
                style={styles.day}>
                <Text style={[styles.dayName, active ? styles.dayNameActive : null]}>{weekdayShort(day)}</Text>
                <View style={[styles.bubble, active ? styles.bubbleActive : null, !active && today ? styles.bubbleToday : null]}>
                  <Text style={[styles.dayNumber, active ? styles.dayTextActive : null]}>{day.getDate()}</Text>
                </View>
                <View style={[styles.dot, busy.has(key) ? null : styles.dotHidden, active ? styles.dotActive : null]} />
              </Pressable>
            );
          })}
        </View>
      ) : zoom === 'month' ? (
        <View style={styles.month}>
          {weekdayHeads.map((name) => (
            <Text key={name} style={styles.monthHead}>
              {name}
            </Text>
          ))}
          {Array.from({ length: monthLead }, (_, index) => (
            <View key={`lead-${index}`} style={styles.monthCell} />
          ))}
          {monthDays.map((day) => {
            const key = dayKey(day);
            const active = key === selectedKey;
            const today = key === dayKey(new Date());
            return (
              <Pressable
                accessibilityRole="button"
                key={key}
                onPress={() => pickDay(day)}
                style={styles.monthCell}>
                <View style={[styles.bubble, active ? styles.bubbleActive : null, !active && today ? styles.bubbleToday : null]}>
                  <Text style={[styles.monthNumber, active ? styles.dayTextActive : null]}>{day.getDate()}</Text>
                </View>
                <View style={[styles.dot, busy.has(key) ? null : styles.dotHidden, active ? styles.dotActive : null]} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {zoom === 'day' ? (
          hours.map((hour) => {
            const blocks = items.filter((item) => Number(item.start_time.slice(0, 2)) === hour);
            return (
              <View key={hour} style={styles.hourRow}>
                <Text style={styles.hourLabel}>{pad(hour)}:00</Text>
                <View style={styles.hourBody}>
                  {blocks.map(renderItem)}
                  <Pressable
                    accessibilityLabel={t('calendar.addAt', { time: `${pad(hour)}:00` })}
                    accessibilityRole="button"
                    onPress={() => openNew(`${pad(hour)}:00`)}
                    style={styles.hourAdd}>
                    <Text style={styles.hourAddText}>{blocks.length > 0 ? t('common.add') : '+'}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        ) : items.length === 0 ? (
          <EmptyState body={t('calendar.emptyBody')} title={t('calendar.emptyTitle')} />
        ) : (
          items.map(renderItem)
        )}
      </ScrollView>
    </Screen>
  );
}

function visibleHours(items: ScheduleItem[]) {
  let start = 7;
  let end = 22;
  for (const item of items) {
    const hour = Number(item.start_time.slice(0, 2));
    if (!Number.isFinite(hour)) continue;
    start = Math.min(start, hour);
    end = Math.max(end, hour);
  }
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  weekNav: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    padding: 6,
  },
  todayJump: {
    alignSelf: 'flex-start',
    backgroundColor: theme.card,
    borderRadius: 999,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  todayJumpOn: {
    backgroundColor: theme.accent,
  },
  todayJumpText: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  todayJumpTextOn: {
    color: theme.onAccent,
  },
  weekButton: {
    alignItems: 'center',
    backgroundColor: theme.accentSoft,
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  weekButtonText: {
    color: theme.accent,
    fontSize: 24,
    lineHeight: 26,
  },
  weekLabel: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  zoom: {
    alignItems: 'center',
    flex: 1,
    gap: 1,
  },
  zoomHint: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  days: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 8,
  },
  day: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  dayName: {
    color: theme.faint,
    fontSize: 11,
    fontWeight: '700',
  },
  dayNameActive: {
    color: theme.accent,
  },
  bubble: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1.5,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  bubbleActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  bubbleToday: {
    borderColor: theme.teal,
  },
  dayNumber: {
    color: theme.ink,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  dayTextActive: {
    color: theme.white,
  },
  dot: {
    backgroundColor: theme.coral,
    borderRadius: 99,
    height: 5,
    width: 5,
  },
  dotActive: {
    backgroundColor: theme.white,
  },
  dotHidden: {
    opacity: 0,
  },
  month: {
    backgroundColor: theme.card,
    borderRadius: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    paddingBottom: 8,
    paddingTop: 12,
  },
  monthHead: {
    color: theme.faint,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    width: '14.28%',
  },
  monthCell: {
    alignItems: 'center',
    gap: 3,
    justifyContent: 'center',
    minHeight: 46,
    width: '14.28%',
  },
  monthNumber: {
    color: theme.ink,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  list: {
    gap: 10,
    paddingBottom: 32,
    paddingTop: 8,
  },
  hourRow: {
    flexDirection: 'row',
    gap: 10,
  },
  hourLabel: {
    color: theme.faint,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    paddingTop: 2,
    width: 46,
  },
  hourBody: {
    borderTopColor: theme.line,
    borderTopWidth: 1,
    flex: 1,
    gap: 8,
    paddingTop: 8,
  },
  hourAdd: {
    justifyContent: 'center',
    minHeight: 28,
  },
  hourAddText: {
    color: theme.faint,
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    color: theme.accent,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  itemTitle: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  itemNote: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: theme.accentSoft,
    borderRadius: 999,
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagDone: {
    backgroundColor: '#E5F4EC',
    color: theme.ok,
  },
  });
}

