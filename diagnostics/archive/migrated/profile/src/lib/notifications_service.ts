import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export async function initializePushNotifications(): Promise<string | null> {
  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;

  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }

  if (!granted) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data ?? null;
  } catch {
    return null;
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleLocalNotification(
  title: string,
  body: string
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
