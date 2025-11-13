// app/(tabs)/_layout.tsx

import "./_webStyleGuard"; // подключаем web-стаб сразу

import React from "react";
import { Platform, LogBox } from "react-native";
import { Slot } from "expo-router";

// Тихо глушим шумные web-предупреждения (только в браузере)
if (Platform.OS === "web") {
  LogBox.ignoreLogs([
    'props.pointerEvents is deprecated. Use style.pointerEvents',
    '"shadow*" style props are deprecated. Use "boxShadow".',
  ]);

  // fallback, если LogBox не перехватил
  const originalWarn = console.warn;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.warn = (...args: any[]) => {
    const msg = String(args?.[0] ?? "");
    if (
      msg.includes("props.pointerEvents is deprecated") ||
      msg.includes('"shadow*" style props are deprecated')
    ) {
      return;
    }
    originalWarn.apply(console, args as unknown as []);
  };
}

export default function RootLayout() {
  return <Slot />;
}

