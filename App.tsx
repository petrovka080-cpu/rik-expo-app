// C:\dev\rik-expo-app\App.tsx
import { ExpoRoot } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect } from 'react';

// РїРѕРєР°Р·С‹РІР°С‚СЊ Р±Р°РЅРЅРµСЂ РґР°Р¶Рµ РєРѕРіРґР° РІРєР»Р°РґРєР° Р°РєС‚РёРІРЅР°
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// --- Р–РЃРЎРўРљРР™ Р¤РћР›Р‘Р­Рљ Р”Р›РЇ WEB, РµСЃР»Рё expo-notifications РЅРµ РїРѕРєР°Р·Р°Р» Р±Р°РЅРЅРµСЂ ---
async function fireBrowserNotificationFallback() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  let perm = Notification.permission;
  if (perm !== 'granted') {
    perm = await Notification.requestPermission();
  }
  if (perm === 'granted') {
    new Notification('РўРµСЃС‚ (web)', { body: 'Р‘СЂР°СѓР·РµСЂРЅС‹Рµ СѓРІРµРґРѕРјР»РµРЅРёСЏ СЂР°Р±РѕС‚Р°СЋС‚ вњ…' });
    return true;
  }
  console.log('[web notif] not granted:', perm);
  return false;
}

export default function App() {
  useEffect(() => {
    (async () => {
      // 1) РїСЂР°РІР°
      const { status } = await Notifications.getPermissionsAsync();
      let granted = status === 'granted';
      if (!granted) {
        const ask = await Notifications.requestPermissionsAsync();
        granted = ask.status === 'granted';
      }

      // 2) Android РєР°РЅР°Р»
      if (Device.osName === 'Android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      // 3) СЃРЅР°С‡Р°Р»Р° РїСЂРѕР±СѓРµРј expo-Р»РѕРєР°Р»РєСѓ С‡РµСЂРµР· 2 СЃРµРє
      let fired = false;
      if (granted) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: { title: 'РўРµСЃС‚ СѓРІРµРґРѕРјР»РµРЅРёР№', body: 'Р•СЃР»Рё РІРёРґРёС€СЊ СЌС‚Рѕ вЂ” РІСЃС‘ СЂР°Р±РѕС‚Р°РµС‚ вњ…', sound: 'default' },
            trigger: { seconds: 2, channelId: 'default' },
          });
          fired = true; // РµСЃР»Рё РґРѕС€Р»Рё РґРѕ СЃСЋРґР° вЂ” С‚СЂРёРіРіРµСЂ РїРѕСЃС‚Р°РІР»РµРЅ
        } catch (e) {
          console.log('[expo-notifications] schedule error:', (e as any)?.message || e);
        }
      }

      // 4) С‡РµСЂРµР· 3.5 СЃРµРє вЂ” Р±СЂР°СѓР·РµСЂРЅС‹Р№ С„РѕР»Р±СЌРє, РµСЃР»Рё Р±Р°РЅРЅРµСЂ С‚Р°Рє Рё РЅРµ РїРѕСЏРІРёР»СЃСЏ
      //    (РґР°Р¶Рµ РµСЃР»Рё РїСѓРЅРєС‚ 3 РЅРµ СЃСЂР°Р±РѕС‚Р°Р»)
      setTimeout(() => { fireBrowserNotificationFallback(); }, 3500);
    })();
  }, []);

  // РѕР±С‹С‡РЅС‹Р№ expo-router
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

