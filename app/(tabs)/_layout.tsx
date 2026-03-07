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
        tabBarStyle: { height: TAB_H + bottom, paddingBottom: bottom },
        tabBarItemStyle: { height: TAB_H },
      }}
    >
      <Tabs.Screen name="foreman" options={{ title: "\u041F\u0440\u043E\u0440\u0430\u0431" }} />
      <Tabs.Screen name="director" options={{ title: "\u0414\u0438\u0440\u0435\u043A\u0442\u043E\u0440" }} />
      <Tabs.Screen name="buyer" options={{ title: "\u0421\u043D\u0430\u0431\u0436\u0435\u043D\u0435\u0446" }} />
      <Tabs.Screen name="accountant" options={{ title: "\u0411\u0443\u0445\u0433\u0430\u043B\u0442\u0435\u0440" }} />
      <Tabs.Screen name="warehouse" options={{ title: "\u0421\u043A\u043B\u0430\u0434" }} />
      <Tabs.Screen name="security" options={{ title: "\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u044C" }} />
      <Tabs.Screen name="supplierMap" options={{ title: "\u041A\u0430\u0440\u0442\u0430", headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: "profile" }} />
      <Tabs.Screen name="reports" options={{ title: "reports" }} />
      <Tabs.Screen name="contractor" options={{ title: "contractor" }} />
      <Tabs.Screen name="request/[id]" options={{ title: "request/[id]" }} />
    </Tabs>
  );
}
