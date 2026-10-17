import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import {
  listExams,
  listReminders,
  listSchedule,
  listStudySessions,
  listTopics,
  type Exam,
  type ScheduleItem,
  type StudySession,
  type Topic,
} from '@/lib/db';
import { dayKey, daysUntil, formatStudy } from '@/lib/format';
import { languageOptions, useI18n, type TranslationKey } from '@/lib/i18n';
import { useStopwatch } from '@/lib/stopwatch';
import { themeOptions, themes, useTheme, useThemedStyles, type Theme } from '@/lib/theme';

export default function WelcomeScreen() {
  const styles = useThemedStyles(makeStyles);
  const { theme, id, setTheme } = useTheme();
  const { t, language, setLanguage } = useI18n();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('home.morning') : hour < 18 ? t('home.afternoon') : t('home.evening');
  const db = useSQLiteContext();
  const { phase, studyElapsed } = useStopwatch();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [todayItems, setTodayItems] = useState<ScheduleItem[]>([]);
  const [openReminders, setOpenReminders] = useState(0);

  const today = dayKey(new Date());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        listTopics(db),
        listStudySessions(db),
        listExams(db),
        listSchedule(db, today),
        listReminders(db),
      ]).then(([nextTopics, nextSessions, nextExams, nextItems, nextReminders]) => {
        if (!active) return;
        setTopics(nextTopics);
        setSessions(nextSessions);
        setExam(nextExams[0] ?? null);
        setTodayItems(nextItems);
        setOpenReminders(nextReminders.filter((item) => item.done === 0).length);
      });
      return () => {
        active = false;
      };
    }, [db, today]),
  );

  const done = topics.filter((topic) => topic.done === 1).length;
  const liveMs = phase === 'idle' ? 0 : studyElapsed;
  const todayMs = sessions.filter((session) => session.day === today).reduce((sum, session) => sum + session.study_ms, 0) + liveMs;
  const days = exam ? daysUntil(exam.exam_on) : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View style={styles.mark}>
            <SymbolView name={{ ios: 'sun.max.fill', android: 'wb_sunny', web: 'wb_sunny' }} size={22} tintColor={theme.accent} />
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/reminders')} style={styles.bell}>
            <SymbolView name={{ ios: 'bell', android: 'notifications', web: 'notifications' }} size={20} tintColor={theme.ink} />
            {openReminders > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>

        <Text style={styles.hello}>{greeting}</Text>
        <Text style={styles.headline}>{t('home.headline')}</Text>

        <Text style={styles.section}>{t('home.summary')}</Text>
        <View style={styles.progress}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/analysis')} style={styles.feature}>
            <Text style={styles.featureKicker}>{t('home.examLeft')}</Text>
            {days == null ? (
              <Text style={styles.featureTitle}>{t('home.pickDate')}</Text>
            ) : days > 0 ? (
              <Text style={styles.featureValue}>{t('home.days', { count: days })}</Text>
            ) : days === 0 ? (
              <Text style={styles.featureValue}>{t('common.today')}</Text>
            ) : (
              <Text style={styles.featureValue}>{t('home.passed')}</Text>
            )}
            <Text numberOfLines={1} style={styles.featureMeta}>
              {exam ? exam.title : t('home.setInAnalysis')}
            </Text>
          </Pressable>
          <View style={styles.side}>
            <View style={styles.sideCard}>
              <Text style={styles.sideLabel}>{t('home.completed')}</Text>
              <Text style={styles.sideValue}>
                {topics.length === 0 ? '—' : `${done}/${topics.length}`}
              </Text>
              <Text style={styles.sideHint}>{t('home.topic')}</Text>
            </View>
            <View style={[styles.sideCard, styles.sideMuted]}>
              <Text style={styles.sideLabel}>{t('common.today')}</Text>
              <Text style={styles.sideValue}>{formatStudy(todayMs)}</Text>
              <Text style={styles.sideHint}>{t('home.study')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionInline}>{t('common.today')}</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/calendar')}>
            <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={18} tintColor={theme.ink} />
          </Pressable>
        </View>
        {todayItems.length === 0 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/calendar')} style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('home.calendarEmpty')}</Text>
            <Text style={styles.emptyBody}>{t('home.calendarEmptyBody')}</Text>
          </Pressable>
        ) : (
          todayItems.map((item) => (
            <Pressable accessibilityRole="button" key={item.id} onPress={() => router.push('/calendar')} style={styles.task}>
              <Text style={styles.taskTime}>
                {item.start_time}
                {item.end_time ? ` – ${item.end_time}` : ''}
              </Text>
              <Text style={styles.taskTitle}>{item.title}</Text>
              {item.note ? <Text style={styles.taskNote}>{item.note}</Text> : null}
            </Pressable>
          ))
        )}

        <Text style={styles.section}>{t('home.appearance')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
          {themeOptions.map((option) => {
            const selected = id === option.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.id}
                onPress={() => setTheme(option.id)}
                style={[styles.themeChip, selected ? styles.themeChipOn : null]}>
                <View style={[styles.themeDot, { backgroundColor: themes[option.id].accent }]} />
                <Text style={[styles.themeChipText, selected ? styles.themeChipTextOn : null]}>
                  {t(`theme.${option.id}` as TranslationKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.section}>{t('home.language')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
          {languageOptions.map((option) => {
            const selected = language === option.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.id}
                onPress={() => setLanguage(option.id)}
                style={[styles.themeChip, selected ? styles.themeChipOn : null]}>
                <Text style={[styles.themeChipText, selected ? styles.themeChipTextOn : null]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      gap: 12,
      paddingBottom: 28,
    },
    top: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    mark: {
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 24,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    bell: {
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 22,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    bellDot: {
      backgroundColor: theme.coral,
      borderColor: theme.card,
      borderRadius: 5,
      borderWidth: 2,
      height: 10,
      position: 'absolute',
      right: 10,
      top: 10,
      width: 10,
    },
    hello: {
      color: theme.muted,
      fontSize: 16,
      fontWeight: '600',
      marginTop: 8,
    },
    headline: {
      color: theme.ink,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -1,
      lineHeight: 40,
    },
    section: {
      color: theme.ink,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.3,
      marginTop: 10,
    },
    sectionInline: {
      color: theme.ink,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    sectionRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    progress: {
      flexDirection: 'row',
      gap: 10,
    },
    feature: {
      backgroundColor: theme.accent,
      borderRadius: 22,
      flex: 1.15,
      gap: 6,
      justifyContent: 'space-between',
      minHeight: 168,
      padding: 16,
    },
    featureKicker: {
      color: theme.onAccent,
      fontSize: 14,
      fontWeight: '700',
      opacity: 0.85,
    },
    featureValue: {
      color: theme.onAccent,
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -0.8,
    },
    featureTitle: {
      color: theme.onAccent,
      fontSize: 24,
      fontWeight: '800',
    },
    featureMeta: {
      color: theme.onAccent,
      fontSize: 14,
      fontWeight: '600',
    },
    side: {
      flex: 0.9,
      gap: 10,
    },
    sideCard: {
      backgroundColor: theme.accentSoft,
      borderRadius: 22,
      flex: 1,
      justifyContent: 'center',
      padding: 14,
    },
    sideMuted: {
      backgroundColor: theme.card,
    },
    sideLabel: {
      color: theme.muted,
      fontSize: 13,
      fontWeight: '700',
    },
    sideValue: {
      color: theme.ink,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.4,
      marginTop: 4,
    },
    sideHint: {
      color: theme.faint,
      fontSize: 12,
      fontWeight: '600',
    },
    task: {
      backgroundColor: theme.card,
      borderRadius: 18,
      gap: 2,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    taskTime: {
      color: theme.muted,
      fontSize: 13,
      fontWeight: '700',
    },
    taskTitle: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '700',
    },
    taskNote: {
      color: theme.faint,
      fontSize: 13,
    },
    empty: {
      backgroundColor: theme.card,
      borderRadius: 18,
      gap: 2,
      padding: 16,
    },
    emptyTitle: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '700',
    },
    emptyBody: {
      color: theme.muted,
      fontSize: 13,
    },
    themeRow: {
      gap: 8,
      paddingBottom: 4,
    },
    themeChip: {
      alignItems: 'center',
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    themeChipOn: {
      backgroundColor: theme.accentSoft,
      borderColor: theme.accent,
    },
    themeDot: {
      borderRadius: 7,
      height: 14,
      width: 14,
    },
    themeChipText: {
      color: theme.ink,
      fontSize: 14,
      fontWeight: '700',
    },
    themeChipTextOn: {
      color: theme.accent,
    },
  });
}
