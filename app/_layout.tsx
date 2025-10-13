// 🔇 Глушим шумные web-предупреждения от RNW/Expo
import { Platform, LogBox } from 'react-native';

// Попытка через LogBox (может не сработать в web, но пробуем)
if (Platform.OS === 'web') {
  LogBox.ignoreLogs([
    'props.pointerEvents is deprecated. Use style.pointerEvents',
    '"shadow*" style props are deprecated. Use "boxShadow".',
  ]);

  // Надёжный способ: перехват console.warn ТОЛЬКО для этих двух сообщений
  const _warn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = String(args?.[0] ?? '');
    if (
      msg.includes('props.pointerEvents is deprecated') ||
      msg.includes('"shadow*" style props are deprecated')
    ) {
      return; // не логируем эти два
    }
    _warn.apply(console, args);
  };
}
import { Slot } from "expo-router";
export default function RootLayout() {
  return <Slot />;
}
