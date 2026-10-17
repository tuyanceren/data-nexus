import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SwipeRow } from '@/components/swipe-row';
import { Header, Screen } from '@/components/ui';
import { deleteReminder, listReminders, updateReminder, type Reminder } from '@/lib/db';
import { formatWhen } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { cancelScheduled, scheduleAt } from '@/lib/notify';
import { useTheme, useThemedStyles, type Theme } from '@/lib/theme';

export default function ReminderScreen() {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  const { t } = useI18n();
  const db = useSQLiteContext();
  const [items, setItems] = useState<Reminder[]>([]);

  const load = useCallback(async () => {
    setItems(await listReminders(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listReminders(db).then((rows) => {
        if (active) setItems(rows);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  function openNew() {
    router.push('/reminder' as Href);
  }

  function openItem(item: Reminder) {
    router.push(`/reminder?id=${item.id}` as Href);
  }

  async function remove(item: Reminder) {
    await cancelScheduled(item.notification_id);
    await deleteReminder(db, item.id);
    await load();
  }

  async function toggle(item: Reminder) {
    const done = item.done === 0;
    let notificationId = item.notification_id;
    if (done) {
      await cancelScheduled(notificationId);
      notificationId = null;
    } else if (item.at > Date.now()) {
      const scheduled = await scheduleAt(item.title, formatWhen(item.at), item.at);
      notificationId = scheduled.notificationId;
    }
    await updateReminder(db, {
      id: item.id,
      title: item.title,
      at: item.at,
      done: done ? 1 : 0,
      notificationId,
    });
    await load();
  }

  const open = items.filter((item) => item.done === 0);
  const done = items.filter((item) => item.done === 1);

  return (
    <Screen background={theme.bg}>
      <Header title={t('reminders.title')} />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.group}>
          {open.map((item, index) => (
            <SwipeRow key={item.id} onDelete={() => void remove(item)} rounded={false}>
              <ReminderRow divided={index > 0} item={item} onOpen={() => openItem(item)} onToggle={() => void toggle(item)} />
            </SwipeRow>
          ))}
          <Pressable accessibilityRole="button" onPress={openNew} style={[styles.row, open.length > 0 ? styles.divided : null]}>
            <View style={styles.circle}>
              <Text style={styles.plus}>+</Text>
            </View>
            <Text style={styles.addText}>{t('reminders.newRow')}</Text>
          </Pressable>
        </View>
        {done.length > 0 ? (
          <>
            <Text style={styles.section}>{t('reminders.completed')}</Text>
            <View style={styles.group}>
              {done.map((item, index) => (
                <SwipeRow key={item.id} onDelete={() => void remove(item)} rounded={false}>
                  <ReminderRow
                    divided={index > 0}
                    item={item}
                    onOpen={() => openItem(item)}
                    onToggle={() => void toggle(item)}
                  />
                </SwipeRow>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ReminderRow({
  item,
  divided,
  onOpen,
  onToggle,
}: {
  item: Reminder;
  divided: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const complete = item.done === 1;
  const overdue = !complete && item.at < Date.now();
  return (
    <View style={[styles.row, divided ? styles.divided : null]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: complete }}
        onPress={onToggle}
        style={[styles.circle, complete ? styles.circleOn : null, overdue ? styles.circleLate : null]}>
        {complete ? <Text style={styles.check}>✓</Text> : null}
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.copy}>
        <Text style={[styles.title, complete ? styles.titleDone : null]}>{item.title}</Text>
        <Text style={[styles.when, overdue ? styles.whenLate : null, complete ? styles.whenDone : null]}>{formatWhen(item.at)}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  list: {
    gap: 18,
    paddingBottom: 36,
  },
  group: {
    backgroundColor: theme.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    backgroundColor: theme.white,
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  divided: {
    borderTopColor: '#E5E5EA',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  circle: {
    alignItems: 'center',
    borderColor: theme.accent,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  circleOn: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  circleLate: {
    borderColor: theme.coral,
  },
  check: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '700',
  },
  plus: {
    color: theme.accent,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: theme.ink,
    fontSize: 17,
  },
  titleDone: {
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  when: {
    color: theme.accent,
    fontSize: 13,
  },
  whenLate: {
    color: theme.coral,
  },
  whenDone: {
    color: '#8E8E93',
  },
  addText: {
    color: theme.accent,
    fontSize: 17,
  },
  section: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: -8,
    marginLeft: 16,
    textTransform: 'uppercase',
  },
  });
}

