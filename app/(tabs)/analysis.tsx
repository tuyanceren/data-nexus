import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DayPick } from '@/components/day-pick';
import { Button, Field, Header, Screen, Sheet } from '@/components/ui';
import { listExams, listStudySessions, listTopics, saveSingleExam, type Exam, type StudySession, type Topic } from '@/lib/db';
import {
  addDays,
  dayKey,
  dayTitle,
  daysUntil,
  daysInMonth,
  formatStudy,
  parseDayKey,
  startOfWeek,
  weekdayShort,
} from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { cancelScheduled, scheduleAt } from '@/lib/notify';
import { useStopwatch } from '@/lib/stopwatch';
import { useTheme, useThemedStyles, type Theme } from '@/lib/theme';

const COLORS = ['#E25B5B', '#3B82C4', '#3C9D6E', '#D4A017', '#7C6BC4', '#24597A'];
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function studyAxis(peakMs: number) {
  const hours = peakMs / HOUR_MS;
  if (hours > 8) return { max: 12, step: 3, unitMs: HOUR_MS };
  if (hours > 4) return { max: 8, step: 2, unitMs: HOUR_MS };
  return { max: 4, step: 1, unitMs: HOUR_MS };
}

function breakAxis(peakMs: number) {
  const minutes = peakMs / MINUTE_MS;
  if (minutes > 240) return { max: 360, step: 60, unitMs: MINUTE_MS };
  if (minutes > 120) return { max: 240, step: 30, unitMs: MINUTE_MS };
  return { max: 120, step: 30, unitMs: MINUTE_MS };
}

export default function AnalysisScreen() {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const { t } = useI18n();
  const db = useSQLiteContext();
  const { phase, studyElapsed, breakElapsed, topicId } = useStopwatch();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [metric, setMetric] = useState<'study' | 'break'>('study');
  const [sheet, setSheet] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examDay, setExamDay] = useState(() => dayKey(addDays(new Date(), 30)));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [nextTopics, nextSessions, nextExams] = await Promise.all([
      listTopics(db),
      listStudySessions(db),
      listExams(db),
    ]);
    setTopics(nextTopics);
    setSessions(nextSessions);
    setExam(nextExams[0] ?? null);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([listTopics(db), listStudySessions(db), listExams(db)]).then(([nextTopics, nextSessions, nextExams]) => {
        if (!active) return;
        setTopics(nextTopics);
        setSessions(nextSessions);
        setExam(nextExams[0] ?? null);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  function openExam() {
    setExamTitle(exam?.title ?? '');
    setExamDay(exam?.exam_on ?? dayKey(addDays(new Date(), 30)));
    setSheet(true);
  }

  async function saveExam() {
    const title = examTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const rows = await listExams(db);
      await Promise.all(rows.map((row) => cancelScheduled(row.notification_id)));
      const at = parseDayKey(examDay);
      at.setHours(9, 0, 0, 0);
      const scheduled = await scheduleAt(t('exam.notification'), title, at.getTime());
      await saveSingleExam(db, { title, examOn: examDay, notificationId: scheduled.notificationId });
      setSheet(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const days = exam ? daysUntil(exam.exam_on) : null;

  const liveMs = phase === 'idle' ? 0 : studyElapsed;
  const liveBreakMs = phase === 'idle' ? 0 : breakElapsed;
  const savedMs = sessions.reduce((sum, session) => sum + session.study_ms, 0);
  const savedBreakMs = sessions.reduce((sum, session) => sum + session.break_ms, 0);
  const done = topics.filter((topic) => topic.done === 1).length;
  const completion = topics.length === 0 ? 0 : Math.round((done / topics.length) * 100);

  const today = new Date();
  const weekStart = startOfWeek(today);
  const buckets =
    range === 'week'
      ? Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
      : Array.from({ length: daysInMonth(today) }, (_, index) => new Date(today.getFullYear(), today.getMonth(), index + 1));
  const studyTotals = new Map<string, number>();
  const breakTotals = new Map<string, number>();
  for (const session of sessions) {
    studyTotals.set(session.day, (studyTotals.get(session.day) ?? 0) + session.study_ms);
    breakTotals.set(session.day, (breakTotals.get(session.day) ?? 0) + session.break_ms);
  }
  const todayKey = dayKey(today);
  if (liveMs > 0) studyTotals.set(todayKey, (studyTotals.get(todayKey) ?? 0) + liveMs);
  if (liveBreakMs > 0) breakTotals.set(todayKey, (breakTotals.get(todayKey) ?? 0) + liveBreakMs);
  const totals = metric === 'break' ? breakTotals : studyTotals;
  const values = buckets.map((day) => totals.get(dayKey(day)) ?? 0);
  const labels = buckets.map((day, index) => {
    if (range === 'week') return weekdayShort(day);
    if (index % 5 === 0 || index === buckets.length - 1) return String(day.getDate());
    return '';
  });
  const peak = Math.max(...values, 0);
  const axis = metric === 'break' ? breakAxis(peak) : studyAxis(peak);
  const ticks = Array.from({ length: axis.max / axis.step }, (_, index) => axis.max - index * axis.step);
  const axisMs = axis.max * axis.unitMs;
  function axisLabel(tick: number) {
    if (metric === 'study') return t('analysis.hourMark', { count: tick });
    if (tick >= 60 && tick % 60 === 0) return t('analysis.hourMark', { count: tick / 60 });
    return t('analysis.minuteMark', { count: tick });
  }

  const byTopic = new Map<number, number>();
  let general = 0;
  for (const session of sessions) {
    general += session.study_ms;
    if (session.topic_id != null) {
      byTopic.set(session.topic_id, (byTopic.get(session.topic_id) ?? 0) + session.study_ms);
    }
  }
  if (liveMs > 0) {
    general += liveMs;
    if (topicId != null) byTopic.set(topicId, (byTopic.get(topicId) ?? 0) + liveMs);
  }
  const rows = [
    ...topics.map((topic, index) => ({
      key: `topic-${topic.id}`,
      title: topic.title,
      ms: byTopic.get(topic.id) ?? 0,
      color: COLORS[index % COLORS.length],
    })),
    ...(general > 0 ? [{ key: 'general', title: t('analysis.general'), ms: general, color: theme.accent }] : []),
  ];
  const rowMax = Math.max(...rows.map((row) => row.ms), 1);

  return (
    <Screen>
      <Header kicker={t('analysis.kicker')} title={t('analysis.title')} />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={openExam} style={styles.countdown}>
          <View style={styles.countdownCopy}>
            <Text style={styles.countdownKicker}>{t('analysis.examLeft')}</Text>
            <Text numberOfLines={1} style={styles.countdownTitle}>
              {exam ? exam.title : t('analysis.pickTitleDate')}
            </Text>
            {exam ? <Text style={styles.countdownDate}>{dayTitle(parseDayKey(exam.exam_on))}</Text> : null}
          </View>
          <View style={styles.countdownBadge}>
            {days == null ? (
              <Text style={styles.countdownPick}>{t('analysis.choose')}</Text>
            ) : days > 0 ? (
              <>
                <Text style={styles.countdownValue}>{days}</Text>
                <Text style={styles.countdownUnit}>{t('analysis.dayUnit')}</Text>
              </>
            ) : days === 0 ? (
              <Text style={styles.countdownPick}>{t('common.today')}</Text>
            ) : (
              <Text style={styles.countdownPick}>{t('home.passed')}</Text>
            )}
          </View>
        </Pressable>

        <View style={styles.stats}>
          <View style={[styles.stat, styles.statTeal]}>
            <Text style={[styles.statLabel, { color: theme.teal }]}>{t('analysis.completed')}</Text>
            <Text style={styles.statValue}>{completion}%</Text>
            <Text style={styles.statHint}>
              {topics.length === 0 ? t('analysis.noTopics') : t('analysis.topicRatio', { done, total: topics.length })}
            </Text>
          </View>
          <View style={[styles.stat, styles.statViolet]}>
            <Text style={[styles.statLabel, { color: theme.violet }]}>{t('analysis.studyTime')}</Text>
            <Text style={styles.statValue}>{formatStudy(savedMs + liveMs)}</Text>
            <Text style={styles.statHint}>{t('analysis.allDays')}</Text>
            <Text style={styles.statHint}>{t('analysis.breakTotal', { time: formatStudy(savedBreakMs + liveBreakMs) })}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.chartHead}>
            <View style={styles.toggle}>
              <Pressable accessibilityRole="button" onPress={() => setMetric('study')} style={[styles.pill, metric === 'study' ? styles.pillOn : null]}>
                <Text style={[styles.pillText, metric === 'study' ? styles.pillTextOn : null]}>{t('analysis.chart')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setMetric('break')} style={[styles.pill, metric === 'break' ? styles.pillOn : null]}>
                <Text style={[styles.pillText, metric === 'break' ? styles.pillTextOn : null]}>{t('analysis.breakChart')}</Text>
              </Pressable>
            </View>
            <View style={styles.toggle}>
              <Pressable accessibilityRole="button" onPress={() => setRange('week')} style={[styles.pill, range === 'week' ? styles.pillOn : null]}>
                <Text style={[styles.pillText, range === 'week' ? styles.pillTextOn : null]}>{t('common.week')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setRange('month')} style={[styles.pill, range === 'month' ? styles.pillOn : null]}>
                <Text style={[styles.pillText, range === 'month' ? styles.pillTextOn : null]}>{t('common.month')}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.peak}>{peak === 0 ? t('analysis.zeroMinutes') : formatStudy(peak)}</Text>
          <View style={styles.chartRow}>
            <View style={styles.yAxis}>
              {ticks.map((hour) => (
                <View key={hour} style={[styles.yTick, { bottom: `${(hour / axis.max) * 100}%` }]}>
                  <Text style={styles.yLabel}>{axisLabel(hour)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.chartMain}>
              <View style={styles.plot}>
                {ticks.map((hour) => (
                  <View key={hour} style={[styles.gridLine, { bottom: `${(hour / axis.max) * 100}%` }]} />
                ))}
                <View style={styles.bars}>
                  {values.map((value, index) => {
                    const ratio = Math.min(1, value / axisMs);
                    return (
                      <View key={`${range}-${dayKey(buckets[index])}`} style={styles.barCol}>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height: value === 0 ? 0 : `${Math.max(ratio * 100, 2)}%`,
                                backgroundColor: metric === 'break' ? theme.coral : theme.violet,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
              <View style={styles.xRow}>
                {labels.map((label, index) => (
                  <Text key={`${range}-label-${index}`} style={styles.barLabel}>
                    {label}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('analysis.byTopic')}</Text>
          {rows.length === 0 ? (
            <Text style={styles.statHint}>{t('analysis.emptyTopics')}</Text>
          ) : (
            rows.map((row) => (
              <View key={row.key} style={styles.subject}>
                <View style={styles.subjectTop}>
                  <View style={[styles.subjectPill, { backgroundColor: `${row.color}22` }]}>
                    <Text style={[styles.subjectName, { color: row.color }]}>{row.title}</Text>
                  </View>
                  <Text style={styles.subjectTime}>{formatStudy(row.ms)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round((row.ms / rowMax) * 100)}%`, backgroundColor: row.color }]} />
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Sheet onClose={() => setSheet(false)} title={t('exam.sheetTitle')} visible={sheet}>
        <Field label={t('common.title')} onChangeText={setExamTitle} placeholder="DUS" value={examTitle} />
        <Text style={styles.pickLabel}>{t('common.date')}</Text>
        <DayPick onChange={setExamDay} value={examDay} />
        <Button disabled={examTitle.trim().length === 0 || busy} label={t('common.save')} onPress={() => void saveExam()} />
      </Sheet>
    </Screen>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  list: {
    gap: 12,
    paddingBottom: 32,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 14,
  },
  statTeal: {
    backgroundColor: theme.tealSoft,
    borderColor: '#B7E4DA',
  },
  statViolet: {
    backgroundColor: theme.violetSoft,
    borderColor: '#DDD4F0',
  },
  statLabel: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  statValue: {
    color: theme.ink,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  statHint: {
    color: theme.faint,
    fontSize: 13,
  },
  card: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  cardTitle: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  countdown: {
    alignItems: 'center',
    backgroundColor: theme.coralSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  countdownCopy: {
    flex: 1,
    gap: 2,
  },
  countdownKicker: {
    color: theme.coral,
    fontSize: 13,
    fontWeight: '800',
  },
  countdownTitle: {
    color: theme.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  countdownDate: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  countdownBadge: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countdownValue: {
    color: theme.coral,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  countdownUnit: {
    color: theme.coral,
    fontSize: 12,
    fontWeight: '700',
  },
  countdownPick: {
    color: theme.coral,
    fontSize: 16,
    fontWeight: '800',
  },
  pickLabel: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  track: {
    backgroundColor: theme.bg,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: theme.accent,
    height: 8,
  },
  chartHead: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  toggle: {
    backgroundColor: theme.bg,
    borderRadius: 999,
    flexDirection: 'row',
    padding: 3,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillOn: {
    backgroundColor: theme.accentSoft,
  },
  pillText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  pillTextOn: {
    color: theme.accent,
  },
  peak: {
    color: theme.faint,
    fontSize: 12,
    fontWeight: '700',
  },
  chartRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  yAxis: {
    height: 132,
    marginRight: 6,
    position: 'relative',
    width: 46,
  },
  yTick: {
    height: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
  },
  yLabel: {
    color: theme.faint,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    textAlign: 'right',
    transform: [{ translateY: -6 }],
  },
  chartMain: {
    flex: 1,
  },
  plot: {
    height: 132,
    position: 'relative',
  },
  gridLine: {
    backgroundColor: theme.line,
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  bars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    height: '100%',
  },
  barCol: {
    flex: 1,
    height: '100%',
  },
  barTrack: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  bar: {
    alignSelf: 'center',
    backgroundColor: theme.violet,
    borderRadius: 6,
    width: '70%',
  },
  xRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  barLabel: {
    color: theme.faint,
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    height: 14,
    textAlign: 'center',
  },
  subject: {
    gap: 6,
  },
  subjectTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subjectPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '700',
  },
  subjectTime: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  });
}

