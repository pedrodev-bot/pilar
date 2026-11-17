import i18n from '../locales/i18n';

let Notifications: typeof import('expo-notifications') | null = null;

try {
  Notifications = require('expo-notifications');
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // O Expo Go não traz o módulo nativo; sem ele, os lembretes ficam indisponíveis.
}

export type ReminderResult = 'enabled' | 'denied' | 'unavailable';

export async function enableDailyReminder(): Promise<ReminderResult> {
  if (!Notifications) return 'unavailable';

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return 'denied';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('settings.sections.notifications.reminder.notificationTitle'),
      body: i18n.t('settings.sections.notifications.reminder.notificationBody'),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
  return 'enabled';
}

export async function disableReminders() {
  await Notifications?.cancelAllScheduledNotificationsAsync();
}
