import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import {
  addMinutesToTime,
  addMonths,
  dayKey,
  dayTitle,
  daysInMonth,
  monthLabel,
  pad,
  parseDayKey,
  startOfMonth,
  timeToMinutes,
} from '@/lib/format';
import { mondayFirstWeekdays, text, useI18n } from '@/lib/i18n';
import { useTheme, useThemedStyles, type Theme } from '@/lib/theme';

const ROW = 34;
const VISIBLE = 7;
const HEIGHT = ROW * VISIBLE;
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const HOURS = Array.from({ length: 24 }, (_, hour) => pad(hour));
const MINUTE_LABELS = MINUTES.map((minute) => pad(minute));
const IOS_BLUE_LIGHT = '#007AFF';
const IOS_BLUE_DARK = '#0A84FF';
const IOS_RED = '#FF3B30';
const IOS_GREEN = '#34C759';

function wrap(value: number, count: number) {
  return ((value % count) + count) % count;
}

function circularDelta(index: number, position: number, count: number) {
  let delta = index - position;
  delta -= Math.round(delta / count) * count;
  return delta;
}

function fade(distance: number) {
  if (distance < 0.4) return 1;
  return Math.max(0.22, 1 - distance * 0.26);
}

function splitTime(value: string) {
  const safe = typeof value === 'string' && value.includes(':') ? value : '09:00';
  const [hourText, minuteText] = safe.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  return {
    hour: Number.isFinite(hour) ? wrap(hour, 24) : 9,
    minute: Number.isFinite(minute) ? wrap(minute, 60) : 0,
  };
}

function nearestMinute(minute: number) {
  let best = 0;
  let distance = 99;
  MINUTES.forEach((step, index) => {
    const next = Math.abs(step - minute);
    if (next < distance) {
      distance = next;
      best = index;
    }
  });
  return best;
}

function dayLabel(day: string) {
  const today = dayKey(new Date());
  if (day === today) return text('common.today');
  if (day === dayKey(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1))) return text('common.tomorrow');
  return dayTitle(parseDayKey(day));
}

function WheelColumn({
  items,
  index,
  onChange,
  kind,
}: {
  items: string[];
  index: number;
  onChange: (index: number) => void;
  kind: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const indexRef = useRef(index);
  const onChangeRef = useRef(onChange);
  const grantIndex = useRef(index);
  const nodeRef = useRef<any>(null);
  const [shift, setShift] = useState(0);
  indexRef.current = index;
  onChangeRef.current = onChange;

  useEffect(() => {
    const node = nodeRef.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    node.style.touchAction = 'none';
    let pending = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      pending += event.deltaY;
      if (Math.abs(pending) < 28) return;
      const direction = pending > 0 ? 1 : -1;
      pending = 0;
      onChangeRef.current(wrap(indexRef.current + direction, items.length));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [items.length]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
      onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dy) > 6,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        grantIndex.current = indexRef.current;
        setShift(0);
      },
      onPanResponderMove: (_, gesture) => {
        setShift(-gesture.dy / ROW);
      },
      onPanResponderRelease: (_, gesture) => {
        const inertia = Math.max(-6, Math.min(6, (-gesture.vy * 0.16) / ROW));
        const moved = Math.round(-gesture.dy / ROW + inertia);
        setShift(0);
        onChangeRef.current(wrap(grantIndex.current + moved, items.length));
      },
    }),
  ).current;

  const position = index + shift;

  return (
    <View ref={nodeRef} style={styles.column} {...pan.panHandlers}>
      {items.map((label, itemIndex) => {
        const delta = circularDelta(itemIndex, position, items.length);
        const distance = Math.abs(delta);
        if (distance > 3.35) return null;
        const selected = distance < 0.45;
        return (
          <Pressable
            accessibilityLabel={`${kind} ${label}`}
            accessibilityRole="adjustable"
            accessibilityState={{ selected }}
            key={itemIndex}
            onPress={() => onChange(itemIndex)}
            style={[styles.cell, { top: HEIGHT / 2 + delta * ROW - ROW / 2, opacity: fade(distance) }]}>
            <Text style={[styles.cellText, selected ? styles.cellTextOn : null]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TimeWheel({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { hour, minute } = splitTime(value);
  const minuteIndex = MINUTES.indexOf(minute);
  const shownMinute = minuteIndex >= 0 ? minuteIndex : nearestMinute(minute);

  return (
    <View style={styles.wheel}>
      <View pointerEvents="none" style={styles.highlight} />
      <View style={styles.wheels}>
        <WheelColumn
          index={hour}
          items={HOURS}
          kind={t('common.hour')}
          onChange={(next) => onChange(`${HOURS[next]}:${pad(minute)}`)}
        />
        <WheelColumn
          index={shownMinute}
          items={MINUTE_LABELS}
          kind={t('common.minute')}
          onChange={(next) => onChange(`${pad(hour)}:${MINUTE_LABELS[next]}`)}
        />
      </View>
    </View>
  );
}

function MonthGrid({ value, onChange }: { value: string; onChange: (day: string) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const heads = mondayFirstWeekdays();
  const [cursor, setCursor] = useState(() => parseDayKey(value));
  const today = dayKey(new Date());

  useEffect(() => {
    setCursor(parseDayKey(value));
  }, [value]);

  const monthStart = startOfMonth(cursor);
  const lead = (monthStart.getDay() + 6) % 7;
  const days = Array.from({ length: daysInMonth(cursor) }, (_, index) =>
    new Date(cursor.getFullYear(), cursor.getMonth(), index + 1),
  );

  return (
    <View style={styles.month}>
      <View style={styles.monthNav}>
        <Pressable accessibilityLabel={t('common.previousMonth')} onPress={() => setCursor((current) => addMonths(current, -1))} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel(cursor)}</Text>
        <Pressable accessibilityLabel={t('common.nextMonth')} onPress={() => setCursor((current) => addMonths(current, 1))} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>›</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={() => onChange(today)} style={styles.todayButton}>
        <Text style={styles.todayButtonText}>{t('common.today')}</Text>
      </Pressable>
      <View style={styles.monthGrid}>
        {heads.map((name) => (
          <Text key={name} style={styles.monthHead}>
            {name}
          </Text>
        ))}
        {Array.from({ length: lead }, (_, index) => (
          <View key={`lead-${index}`} style={styles.monthCell} />
        ))}
        {days.map((date) => {
          const key = dayKey(date);
          const selected = key === value;
          const isToday = key === today;
          return (
            <Pressable accessibilityRole="button" key={key} onPress={() => onChange(key)} style={styles.monthCell}>
              <View style={[styles.monthBubble, selected ? styles.monthBubbleOn : null, !selected && isToday ? styles.monthBubbleToday : null]}>
                <Text style={[styles.monthNumber, selected ? styles.monthNumberOn : null, !selected && isToday ? styles.monthNumberToday : null]}>
                  {date.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Badge({ color, children }: { color: string; children: ReactNode }) {
  return <View style={[glyph.badge, { backgroundColor: color }]}>{children}</View>;
}

function CalendarGlyph() {
  const day = new Date().getDate();
  return (
    <View style={glyph.cal}>
      <View style={glyph.pegs}>
        <View style={glyph.peg} />
        <View style={glyph.peg} />
      </View>
      <Text style={glyph.calDay}>{day}</Text>
    </View>
  );
}

function ClockGlyph() {
  return (
    <View style={glyph.clock}>
      <View style={glyph.handM} />
      <View style={glyph.handH} />
    </View>
  );
}

export function WhenPicker({
  day,
  onDay,
  time,
  onTime,
  timeLabel,
  end,
  onEnd,
}: {
  day: string;
  onDay: (day: string) => void;
  time: string;
  onTime: (time: string) => void;
  timeLabel?: string;
  end?: string | null;
  onEnd?: (end: string | null) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const { t } = useI18n();
  const clockLabel = timeLabel ?? t('common.time');
  const blue = theme.bar === 'light' ? IOS_BLUE_DARK : IOS_BLUE_LIGHT;
  const today = dayKey(new Date());
  const [open, setOpen] = useState<'day' | 'time' | 'end' | null>('time');
  const showEnd = onEnd != null;

  function toggle(next: 'day' | 'time' | 'end') {
    setOpen((current) => (current === next ? null : next));
  }

  function enableEnd(enabled: boolean) {
    if (!onEnd) return;
    if (!enabled) {
      onEnd(null);
      setOpen((current) => (current === 'end' ? 'time' : current));
      return;
    }
    const later = addMinutesToTime(time, 60);
    onEnd(timeToMinutes(later) > timeToMinutes(time) ? later : '23:55');
    setOpen('end');
  }

  return (
    <View style={styles.group}>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={() => toggle('day')} style={styles.rowMain}>
          <Badge color={IOS_RED}>
            <CalendarGlyph />
          </Badge>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{t('common.date')}</Text>
            <Text style={[styles.rowValue, { color: blue }]}>{dayLabel(day)}</Text>
          </View>
        </Pressable>
        {day !== today ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onDay(today)}>
            <Text style={[styles.todayLink, { color: blue }]}>{t('common.today')}</Text>
          </Pressable>
        ) : null}
      </View>
      {open === 'day' ? <MonthGrid onChange={onDay} value={day} /> : null}

      <View style={styles.divider} />
      <Pressable accessibilityRole="button" onPress={() => toggle('time')} style={styles.row}>
        <Badge color={blue}>
          <ClockGlyph />
        </Badge>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>{clockLabel}</Text>
          <Text style={[styles.rowValue, { color: blue }]}>{time}</Text>
        </View>
      </Pressable>
      {open === 'time' ? <TimeWheel onChange={onTime} value={time} /> : null}

      {showEnd ? (
        <>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              disabled={end == null}
              onPress={() => toggle('end')}
              style={styles.rowMain}>
              <Badge color={end == null ? theme.faint : blue}>
                <ClockGlyph />
              </Badge>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{t('common.end')}</Text>
                <Text style={[styles.rowValue, { color: end == null ? theme.faint : blue }]}>{end ?? t('common.none')}</Text>
              </View>
            </Pressable>
            <Switch
              ios_backgroundColor={theme.line}
              onValueChange={enableEnd}
              thumbColor="#FFFFFF"
              trackColor={{ false: theme.line, true: IOS_GREEN }}
              value={end != null}
            />
          </View>
          {open === 'end' && end != null ? <TimeWheel onChange={onEnd} value={end} /> : null}
        </>
      ) : null}
    </View>
  );
}

const glyph = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 7,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  cal: {
    alignItems: 'center',
    height: 18,
    width: 16,
  },
  pegs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 10,
  },
  peg: {
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    height: 3,
    width: 1.6,
  },
  calDay: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
    marginTop: 1,
  },
  clock: {
    borderColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.4,
    height: 15,
    width: 15,
  },
  handM: {
    backgroundColor: '#FFFFFF',
    height: 5,
    left: 6.2,
    position: 'absolute',
    top: 2.5,
    width: 1.4,
  },
  handH: {
    backgroundColor: '#FFFFFF',
    height: 1.4,
    left: 6.2,
    position: 'absolute',
    top: 6.4,
    width: 4,
  },
});

function makeStyles(theme: Theme) {
  const highlight = theme.bar === 'light' ? 'rgba(255,255,255,0.14)' : 'rgba(120,120,128,0.18)';
  return StyleSheet.create({
    group: {
      backgroundColor: theme.bg,
      borderRadius: 14,
      overflow: 'hidden',
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      minHeight: 58,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    rowMain: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: 12,
    },
    rowCopy: {
      flex: 1,
    },
    rowTitle: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '500',
    },
    rowValue: {
      fontSize: 15,
      fontVariant: ['tabular-nums'],
      marginTop: 1,
    },
    todayLink: {
      fontSize: 16,
      fontWeight: '600',
    },
    divider: {
      backgroundColor: theme.line,
      height: StyleSheet.hairlineWidth,
      marginLeft: 54,
    },
    wheel: {
      height: HEIGHT,
      marginBottom: 6,
    },
    highlight: {
      backgroundColor: highlight,
      borderRadius: 10,
      height: ROW,
      left: 10,
      position: 'absolute',
      right: 10,
      top: (HEIGHT - ROW) / 2,
    },
    wheels: {
      alignSelf: 'center',
      flexDirection: 'row',
      height: HEIGHT,
      width: 188,
    },
    column: {
      flex: 1,
      height: HEIGHT,
      overflow: 'hidden',
      position: 'relative',
    },
    cell: {
      alignItems: 'center',
      height: ROW,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
    },
    cellText: {
      color: theme.ink,
      fontSize: 20,
      fontVariant: ['tabular-nums'],
      fontWeight: '400',
    },
    cellTextOn: {
      fontSize: 22,
      fontWeight: '600',
    },
    month: {
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
    monthNav: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    monthArrow: {
      alignItems: 'center',
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    monthArrowText: {
      color: theme.accent,
      fontSize: 24,
    },
    monthLabel: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '600',
    },
    todayButton: {
      alignItems: 'center',
      paddingBottom: 4,
    },
    todayButtonText: {
      color: theme.accent,
      fontSize: 16,
      fontWeight: '600',
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    monthHead: {
      color: theme.faint,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      width: '14.28%',
    },
    monthCell: {
      alignItems: 'center',
      height: 36,
      justifyContent: 'center',
      width: '14.28%',
    },
    monthBubble: {
      alignItems: 'center',
      borderRadius: 15,
      height: 30,
      justifyContent: 'center',
      width: 30,
    },
    monthBubbleOn: {
      backgroundColor: theme.accent,
    },
    monthBubbleToday: {
      borderColor: theme.accent,
      borderWidth: 1,
    },
    monthNumber: {
      color: theme.ink,
      fontSize: 15,
      fontWeight: '500',
    },
    monthNumberOn: {
      color: theme.onAccent,
      fontWeight: '600',
    },
    monthNumberToday: {
      color: theme.accent,
      fontWeight: '700',
    },
  });
}
