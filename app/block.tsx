import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormPage } from '@/components/form-page';
import { Field, Notice } from '@/components/ui';
import { WhenPicker } from '@/components/when-picker';
import { getSchedule, listSubjects, saveSchedule, type Subject } from '@/lib/db';
import { dayKey, defaultStart, timeToMinutes } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { rememberDay } from '@/lib/return-day';
import { useThemedStyles, type Theme } from '@/lib/theme';

const LESSON_COLORS = ['#E25B5B', '#E0A100', '#3CB371', '#2BB8A0', '#3B82C4', '#7C6BC4'];

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function BlockScreen() {
  const params = useLocalSearchParams<{ id?: string; day?: string; start?: string }>();
  const idText = param(params.id);
  const id = idText ? Number(idText) : null;
  const db = useSQLiteContext();
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const [title, setTitle] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [day, setDay] = useState(() => param(params.day) || dayKey(new Date()));
  const [start, setStart] = useState(() => param(params.start) || defaultStart(param(params.day) || dayKey(new Date())));
  const [end, setEnd] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(id == null);

  useEffect(() => {
    let active = true;
    listSubjects(db).then((rows) => {
      if (active) setSubjects(rows);
    });
    return () => {
      active = false;
    };
  }, [db]);

  useEffect(() => {
    if (id == null) return;
    let active = true;
    getSchedule(db, id).then((item) => {
      if (!active || !item) return;
      setTitle(item.title);
      setDay(item.day);
      setStart(item.start_time);
      setEnd(item.end_time);
      setNote(item.note);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [db, id]);

  async function save() {
    const name = title.trim();
    if (!name) {
      setError(t('calendar.needTitle'));
      return;
    }
    if (end && timeToMinutes(end) <= timeToMinutes(start)) {
      setError(t('calendar.endAfterStart'));
      return;
    }
    await saveSchedule(db, {
      id,
      day,
      title: name,
      startTime: start,
      endTime: end,
      note: note.trim(),
    });
    rememberDay(day);
    router.back();
  }

  if (!ready) return null;

  return (
    <FormPage onSave={() => void save()} title={id == null ? t('calendar.newBlock') : t('calendar.editBlock')}>
      <View style={styles.lesson}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setLessonsOpen((open) => !open)}
          style={styles.lessonRow}>
          <Text style={styles.lessonLabel}>{t('lessons.subject')}</Text>
          <Text numberOfLines={1} style={[styles.lessonValue, title.trim() ? null : styles.lessonPlaceholder]}>
            {title.trim() || t('calendar.pickLesson')}
          </Text>
          <Text style={styles.chevron}>{lessonsOpen ? '▴' : '▾'}</Text>
        </Pressable>
        {lessonsOpen ? (
          subjects.length === 0 ? (
            <Text style={styles.empty}>{t('calendar.noLessons')}</Text>
          ) : (
            subjects.map((subject) => {
              const selected = title.trim() === subject.title;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={subject.id}
                  onPress={() => {
                    setTitle(subject.title);
                    setLessonsOpen(false);
                  }}
                  style={styles.option}>
                  <View style={[styles.dot, { backgroundColor: LESSON_COLORS[subject.color % LESSON_COLORS.length] }]} />
                  <Text numberOfLines={1} style={[styles.optionText, selected ? styles.optionOn : null]}>
                    {subject.title}
                  </Text>
                </Pressable>
              );
            })
          )
        ) : null}
      </View>
      <Field label={t('common.title')} onChangeText={setTitle} placeholder={t('calendar.titlePlaceholder')} value={title} />
      <WhenPicker
        day={day}
        end={end}
        onDay={setDay}
        onEnd={setEnd}
        onTime={setStart}
        time={start}
        timeLabel={t('common.start')}
      />
      <Field label={t('common.note')} multiline onChangeText={setNote} placeholder={t('common.optional')} value={note} />
      {error ? <Notice>{error}</Notice> : null}
    </FormPage>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    lesson: {
      backgroundColor: theme.card,
      borderRadius: 16,
      overflow: 'hidden',
    },
    lessonRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    lessonLabel: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '600',
    },
    lessonValue: {
      color: theme.accent,
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'right',
    },
    lessonPlaceholder: {
      color: theme.faint,
      fontWeight: '500',
    },
    chevron: {
      color: theme.faint,
      fontSize: 12,
    },
    option: {
      alignItems: 'center',
      borderTopColor: theme.line,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    dot: {
      borderRadius: 5,
      height: 10,
      width: 10,
    },
    optionText: {
      color: theme.ink,
      flex: 1,
      fontSize: 16,
    },
    optionOn: {
      color: theme.accent,
      fontWeight: '700',
    },
    empty: {
      borderTopColor: theme.line,
      borderTopWidth: StyleSheet.hairlineWidth,
      color: theme.muted,
      fontSize: 14,
      lineHeight: 20,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
  });
}
