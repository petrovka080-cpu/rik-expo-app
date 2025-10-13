// C:\dev\rik-expo-app\App.tsx
import { ExpoRoot } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect } from 'react';

// показывать баннер даже когда вкладка активна
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// --- ЖЁСТКИЙ ФОЛБЭК ДЛЯ WEB, если expo-notifications не показал баннер ---
async function fireBrowserNotificationFallback() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  let perm = Notification.permission;
  if (perm !== 'granted') {
    perm = await Notification.requestPermission();
  }
  if (perm === 'granted') {
    new Notification('Тест (web)', { body: 'Браузерные уведомления работают ✅' });
    return true;
  }
  console.log('[web notif] not granted:', perm);
  return false;
}

export default function App() {
  useEffect(() => {
    (async () => {
      // 1) права
      const { status } = await Notifications.getPermissionsAsync();
      let granted = status === 'granted';
      if (!granted) {
        const ask = await Notifications.requestPermissionsAsync();
        granted = ask.status === 'granted';
      }

      // 2) Android канал
      if (Device.osName === 'Android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      // 3) сначала пробуем expo-локалку через 2 сек
      let fired = false;
      if (granted) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: { title: 'Тест уведомлений', body: 'Если видишь это — всё работает ✅', sound: 'default' },
            trigger: { seconds: 2, channelId: 'default' },
          });
          fired = true; // если дошли до сюда — триггер поставлен
        } catch (e) {
          console.log('[expo-notifications] schedule error:', (e as any)?.message || e);
        }
      }

      // 4) через 3.5 сек — браузерный фолбэк, если баннер так и не появился
      //    (даже если пункт 3 не сработал)
      setTimeout(() => { fireBrowserNotificationFallback(); }, 3500);
    })();
  }, []);

  // обычный expo-router
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

