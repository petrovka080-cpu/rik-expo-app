import "../global.css";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import LogoutButton from "../../src/components/LogoutButton";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: "",
        headerRight: () => <LogoutButton />,

        // ❗ НЕ display:none
        tabBarStyle: { height: 56 },
        tabBarItemStyle: { height: 56 },

        // ✅ на web НЕ отсоединяем экраны (ломает скролл/ивенты)
        detachInactiveScreens: Platform.OS !== "web",

        // ✅ на web можно оставить true, чтобы убирались хвосты
        unmountOnBlur: Platform.OS === "web",
      }}
    >
      <Tabs.Screen name="foreman" options={{ title: "Прораб" }} />
      <Tabs.Screen name="director" options={{ title: "Директор" }} />
      <Tabs.Screen name="buyer" options={{ title: "Снабженец" }} />
      <Tabs.Screen name="accountant" options={{ title: "Бухгалтер" }} />
      <Tabs.Screen name="warehouse" options={{ title: "Склад" }} />
      <Tabs.Screen name="security" options={{ title: "Безопасность" }} />
    </Tabs>
  );
}
