// Локальные уведомления-напоминания для списков покупок
import * as Notifications from 'expo-notifications';

// Показывать уведомление даже когда приложение открыто
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Запросить разрешение на уведомления
export const requestNotificationPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// Запланировать напоминание для списка, вернуть notificationId
export const scheduleListReminder = async (listId, listName, date) => {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🛒 Время за покупками!',
        body: `Список "${listName}" ждёт вас`,
        data: { listId },
      },
      trigger: { type: 'date', date },
    });
    return id;
  } catch (e) {
    console.log('scheduleListReminder error:', e);
    return null;
  }
};

// Отменить запланированное напоминание
export const cancelListReminder = async (notificationId) => {
  try {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  } catch (e) {
    console.log('cancelListReminder error:', e);
  }
};
