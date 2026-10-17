import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DayPick } from '@/components/day-pick';
import { Button, Card, Field, Header, Screen } from '@/components/ui';
import { deleteExam, insertExam, listExams, type Exam } from '@/lib/db';
import { addDays, dayKey, dayTitle, daysLeftLabel, parseDayKey, spanProgress } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { cancelScheduled, scheduleAt } from '@/lib/notify';
import { useThemedStyles, type Theme } from '@/lib/theme';

export default function ExamScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const db = useSQLiteContext();
  const [exams, setExams] = useState<Exam[]>([]);
  const [name, setName] = useState('');
  const [day, setDay] = useState(() => dayKey(addDays(new Date(), 14)));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setExams(await listExams(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listExams(db).then((rows) => {
        if (active) setExams(rows);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  async function add() {
    if (busy) return;
    setBusy(true);
    try {
      const title = name.trim() || t('exam.fallback', { day: dayTitle(parseDayKey(day)) });
      const at = parseDayKey(day);
      at.setHours(9, 0, 0, 0);
      const scheduled = await scheduleAt(t('exam.notification'), title, at.getTime());
      await insertExam(db, { title, examOn: day, notificationId: scheduled.notificationId });
      setName('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  function remove(exam: Exam) {
    void cancelScheduled(exam.notification_id).then(() => deleteExam(db, exam.id).then(load));
  }

  return (
    <Screen>
      <Header kicker={t('exam.pickDate')} title={t('exam.title')} />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {exams.map((exam) => {
          const progress = spanProgress(exam.created_at, exam.exam_on);
          const percent = Math.round(progress * 100);
          return (
            <Card key={exam.id}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.title}>{exam.title}</Text>
                  <Text style={styles.when}>
                    {dayTitle(parseDayKey(exam.exam_on))} · {daysLeftLabel(exam.exam_on)}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => remove(exam)} style={styles.remove}>
                  <Text style={styles.removeText}>{t('common.delete')}</Text>
                </Pressable>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${percent}%` }]} />
              </View>
              <Text style={styles.percent}>{t('exam.progress', { percent })}</Text>
            </Card>
          );
        })}
        <Field label={t('exam.name')} onChangeText={setName} placeholder={t('exam.namePlaceholder')} value={name} />
        <Text style={styles.pickLabel}>{t('exam.date')}</Text>
        <DayPick onChange={setDay} value={day} />
        <Button disabled={busy} label={t('exam.add')} onPress={() => void add()} />
      </ScrollView>
    </Screen>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  list: {
    gap: 12,
    paddingBottom: 32,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  when: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  remove: {
    backgroundColor: theme.dangerSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeText: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  track: {
    backgroundColor: theme.bg,
    borderRadius: 999,
    height: 8,
    marginTop: 12,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: theme.accent,
    height: 8,
  },
  percent: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  pickLabel: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  });
}

