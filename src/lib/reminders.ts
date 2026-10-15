import * as Notifications from 'expo-notifications';

import { parseReminderTime } from './focus';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Replaces any scheduled reminder with one daily check-in reminder at the given time. */
export async function scheduleDailyReminder(reminderTime: string | null | undefined) {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  const { hour, minute } = parseReminderTime(reminderTime);
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to check in',
      body: 'One minute: what got done, how you feel, and what is in the way.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
  return true;
}
