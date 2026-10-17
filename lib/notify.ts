import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { text, type TranslationKey } from '@/lib/i18n';

const CHANNEL_ID = 'reminders';
const MORNING_CHANNEL_ID = 'morning';

const MORNING_KEYS = [
  'notify.morning0',
  'notify.morning1',
  'notify.morning2',
  'notify.morning3',
  'notify.morning4',
  'notify.morning5',
  'notify.morning6',
] as const satisfies readonly TranslationKey[];

export function configureNotifications() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Web and unsupported hosts can skip the foreground handler.
  }
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: text('reminders.channel'),
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync(MORNING_CHANNEL_ID, {
    name: text('notify.morningChannel'),
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function ensureMorningMotivation() {
  if (Platform.OS === 'web') return;
  try {
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return;

    await ensureChannel();
    await Promise.all(
      MORNING_KEYS.map(async (key, index) => {
        const weekday = index + 1;
        const identifier = `ajanda-morning-${weekday}`;
        try {
          await Notifications.cancelScheduledNotificationAsync(identifier);
        } catch {
          // The first launch has nothing to replace.
        }
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: { title: text('notify.goodMorning'), body: text(key), sound: true },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour: 8,
            minute: 30,
            channelId: MORNING_CHANNEL_ID,
          },
        });
      }),
    );
  } catch {
    // A missing permission or an unsupported host should not block the app.
  }
}

export async function scheduleAt(title: string, body: string, at: number) {
  if (at <= Date.now()) {
    return { notificationId: null as string | null, notice: text('notify.futureTime') };
  }
  if (Platform.OS === 'web') {
    return {
      notificationId: null as string | null,
      notice: text('notify.webNotice'),
    };
  }

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) {
    return {
      notificationId: null as string | null,
      notice: text('notify.missingPermission'),
    };
  }

  await ensureChannel();
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(at),
      channelId: CHANNEL_ID,
    },
  });
  return { notificationId, notice: null as string | null };
}

export async function cancelScheduled(id: string | null) {
  if (!id || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // The notification may already have fired.
  }
}
