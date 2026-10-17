import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { FormPage } from '@/components/form-page';
import { Field, Notice } from '@/components/ui';
import { WhenPicker } from '@/components/when-picker';
import { getReminder, insertReminder, updateReminder } from '@/lib/db';
import { dayKey, dayTitle, defaultStart, formatWhen, pad, parseDayKey } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { cancelScheduled, scheduleAt } from '@/lib/notify';
import { useThemedStyles, type Theme } from '@/lib/theme';

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function atFrom(day: string, time: string) {
  const date = parseDayKey(day);
  const [hour, minute] = time.split(':').map(Number);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

export default function ReminderForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const idText = param(params.id);
  const id = idText ? Number(idText) : null;
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const db = useSQLiteContext();
  const today = dayKey(new Date());
  const [title, setTitle] = useState('');
  const [day, setDay] = useState(today);
  const [time, setTime] = useState(defaultStart(today));
  const [notificationId, setNotificationId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(id == null);

  useEffect(() => {
    if (id == null) return;
    let active = true;
    getReminder(db, id).then((item) => {
      if (!active || !item) return;
      const date = new Date(item.at);
      setTitle(item.title);
      setDay(dayKey(date));
      setTime(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
      setNotificationId(item.notification_id);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [db, id]);

  async function save() {
    const name = title.trim();
    if (!name || busy) {
      if (!name) setError(t('reminders.needTitle'));
      return;
    }
    const at = atFrom(day, time);
    if (at <= Date.now()) {
      setError(t('reminders.futureTime'));
      return;
    }
    setBusy(true);
    try {
      await cancelScheduled(notificationId);
      const scheduled = await scheduleAt(name, formatWhen(at), at);
      if (id == null) {
        await insertReminder(db, { title: name, at, notificationId: scheduled.notificationId });
      } else {
        await updateReminder(db, {
          id,
          title: name,
          at,
          done: 0,
          notificationId: scheduled.notificationId,
        });
      }
      router.back();
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <FormPage busy={busy} onSave={() => void save()} title={id == null ? t('reminders.new') : t('reminders.details')}>
      <Field onChangeText={setTitle} placeholder={t('reminders.titlePlaceholder')} value={title} />
      <WhenPicker day={day} onDay={setDay} onTime={setTime} time={time} />
      <Text style={styles.fireAt}>
        {t('reminders.firesAt', { day: dayTitle(parseDayKey(day)), time })}
      </Text>
      {error ? <Notice>{error}</Notice> : null}
    </FormPage>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    fireAt: {
      color: theme.accent,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
