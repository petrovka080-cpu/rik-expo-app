import "../global.css";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const TAB_H = 56;
  const bottom = isWeb ? 0 : (insets.bottom || 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerTitle: "",

        // ✅ tabbar как в топовых: высота + safe-area снизу
        tabBarStyle: { height: TAB_H + bottom, paddingBottom: bottom },
        tabBarItemStyle: { height: TAB_H },

        detachInactiveScreens: Platform.OS !== "web",
        unmountOnBlur: Platform.OS === "web",
      }}
    >
      <Tabs.Screen name="foreman" options={{ title: "Прораб" }} />
      <Tabs.Screen name="director" options={{ title: "Директор" }} />
      <Tabs.Screen name="buyer" options={{ title: "Снабженец" }} />
      <Tabs.Screen name="accountant" options={{ title: "Бухгалтер" }} />
      <Tabs.Screen name="warehouse" options={{ title: "Склад" }} />
      <Tabs.Screen name="security" options={{ title: "Безопасность" }} />
      <Tabs.Screen name="supplierMap" options={{ title: "Карта", headerShown: false }} />
    </Tabs>
  );
}

