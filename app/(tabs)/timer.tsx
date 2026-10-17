import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Header, Screen } from '@/components/ui';
import { insertStudySession, listTopics, type Topic } from '@/lib/db';
import { dayKey, formatBreak, formatClock } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useStopwatch } from '@/lib/stopwatch';
import { cardShadow, useThemedStyles, type Theme } from '@/lib/theme';

export default function StopwatchScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const db = useSQLiteContext();
  const { phase, studyElapsed, breakElapsed, lastBreakMs, topicId, setTopicId, start, mola, finish } = useStopwatch();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listTopics(db).then((rows) => {
        if (active) setTopics(rows.filter((topic) => topic.done === 0));
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  async function bitir() {
    if (busy) return;
    const snapshot = finish();
    if (snapshot.studyMs < 1000) return;
    setBusy(true);
    try {
      await insertStudySession(db, {
        day: dayKey(new Date()),
        topicId: snapshot.topicId,
        studyMs: snapshot.studyMs,
        breakMs: snapshot.breakMs,
      });
    } finally {
      setBusy(false);
    }
  }

  const onBreak = phase === 'break';
  const clock = onBreak ? breakElapsed : studyElapsed;
  const kicker = onBreak ? t('timer.onBreak') : phase === 'study' ? t('timer.studying') : t('timer.ready');

  return (
    <Screen>
      <Header kicker={kicker} title={t('timer.title')} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topics}>
          <TopicChip active={topicId == null} label={t('timer.general')} onPress={() => setTopicId(null)} />
          {topics.map((topic) => (
            <TopicChip
              active={topicId === topic.id}
              key={topic.id}
              label={topic.title}
              onPress={() => setTopicId(topic.id)}
            />
          ))}
        </ScrollView>
        <View style={[styles.clockWrap, onBreak ? styles.clockBreakWrap : phase === 'study' ? styles.clockRunWrap : null]}>
          {onBreak ? <Text style={styles.studyAside}>{t('timer.studyAside', { time: formatClock(studyElapsed) })}</Text> : null}
          <Text style={[styles.clock, onBreak ? styles.clockBreak : phase === 'study' ? styles.clockRunning : null]}>
            {formatClock(clock)}
          </Text>
          {phase === 'study' && lastBreakMs > 0 ? (
            <Text style={styles.breakNote}>{t('timer.breakNote', { time: formatBreak(lastBreakMs) })}</Text>
          ) : (
            <Text style={styles.hint}>{onBreak ? t('timer.breakRunning') : t('timer.savedOnFinish')}</Text>
          )}
        </View>
        {phase === 'idle' ? (
          <Button label={t('timer.start')} onPress={start} />
        ) : (
          <View style={styles.actions}>
            {onBreak ? (
              <Button label={t('timer.resume')} onPress={start} />
            ) : (
              <Button kind="quiet" label={t('timer.break')} onPress={mola} />
            )}
            <Button disabled={busy} kind="quiet" label={t('timer.finish')} onPress={() => void bitir()} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function TopicChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.chip, active ? styles.chipOn : null]}>
      <Text style={[styles.chipText, active ? styles.chipTextOn : null]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  body: {
    gap: 16,
    paddingBottom: 32,
  },
  topics: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    backgroundColor: theme.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...cardShadow(theme),
  },
  chipOn: {
    backgroundColor: theme.accent,
  },
  chipText: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  chipTextOn: {
    color: theme.white,
  },
  clockWrap: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 28,
    gap: 6,
    paddingVertical: 36,
    ...cardShadow(theme),
  },
  clockRunWrap: {
    backgroundColor: theme.accentSoft,
  },
  clockBreakWrap: {
    backgroundColor: theme.amberSoft,
  },
  studyAside: {
    color: theme.muted,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  clock: {
    color: theme.ink,
    fontSize: 48,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -1.4,
  },
  clockRunning: {
    color: theme.accent,
  },
  clockBreak: {
    color: theme.amber,
  },
  breakNote: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    color: theme.faint,
    fontSize: 13,
  },
  actions: {
    gap: 10,
  },
  });
}

