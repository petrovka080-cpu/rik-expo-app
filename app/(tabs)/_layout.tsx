import "../global.css";
import "../_webStyleGuard";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="foreman"    options={{ title: "Прораб" }} />
      <Tabs.Screen name="director"   options={{ title: "Директор" }} />
      <Tabs.Screen name="buyer"      options={{ title: "Снабженец" }} />
      <Tabs.Screen name="accountant" options={{ title: "Бухгалтер" }} />
      <Tabs.Screen name="warehouse"  options={{ title: "Склад" }} />
      <Tabs.Screen name="security"   options={{ title: "Безопасность" }} />
    </Tabs>
  );
}




