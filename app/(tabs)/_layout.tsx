import "../global.css";

import { Ionicons } from "@expo/vector-icons";
import { Tabs, router, useSegments } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AssistantFab from "../../src/features/ai/AssistantFab";

type TabIconName = keyof typeof Ionicons.glyphMap;

function iconForRoute(name: string, focused: boolean): TabIconName {
  switch (name) {
    case "foreman":
      return focused ? "construct" : "construct-outline";
    case "director":
      return focused ? "briefcase" : "briefcase-outline";
    case "buyer":
      return focused ? "bag-handle" : "bag-handle-outline";
    case "accountant":
      return focused ? "wallet" : "wallet-outline";
    case "warehouse":
      return focused ? "cube" : "cube-outline";
    case "security":
      return focused ? "shield-checkmark" : "shield-checkmark-outline";
    case "market":
      return focused ? "storefront" : "storefront-outline";
    case "supplierMap":
      return focused ? "map" : "map-outline";
    case "profile":
      return focused ? "person-circle" : "person-circle-outline";
    case "reports":
      return focused ? "bar-chart" : "bar-chart-outline";
    case "contractor":
      return focused ? "hammer" : "hammer-outline";
    default:
      return focused ? "ellipse" : "ellipse-outline";
  }
}

function resolveAssistantContext(segments: string[]): string {
  const leaf = segments[segments.length - 1] || "";
  if (leaf === "[id]" && segments.length >= 2) {
    return segments[segments.length - 2] || "unknown";
  }
  return leaf || "unknown";
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const isWeb = Platform.OS === "web";

  const tabHeight = 56;
  const bottomInset = isWeb ? 0 : (insets.bottom || 0);
  const leafSegment = segments[segments.length - 1];
  const assistantContext = resolveAssistantContext(segments);
  const showAssistantFab = leafSegment !== "ai" && leafSegment !== "chat";

  return (
    <View style={styles.shell}>
      <Tabs
        screenOptions={{
          headerShown: false,
          headerTitle: "",
          tabBarActiveTintColor: "#2563EB",
          tabBarInactiveTintColor: "#64748B",
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
          tabBarStyle: {
            height: tabHeight + bottomInset,
            paddingBottom: bottomInset,
            borderTopColor: "#E2E8F0",
            backgroundColor: "#FFFFFF",
          },
          tabBarItemStyle: { height: tabHeight },
        }}
      >
        <Tabs.Screen
          name="foreman"
          options={{
            title: "Прораб",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("foreman", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="director"
          options={{
            title: "Директор",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("director", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="buyer"
          options={{
            title: "Снабженец",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("buyer", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="accountant"
          options={{
            title: "Бухгалтер",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("accountant", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="warehouse"
          options={{
            title: "Склад",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("warehouse", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="security"
          options={{
            title: "Безопасность",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("security", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="market"
          options={{
            title: "Маркет",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("market", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="supplierMap"
          options={{
            title: "Карта",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("supplierMap", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Профиль",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("profile", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: "Отчеты",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("reports", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="contractor"
          options={{
            title: "Подрядчик",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("contractor", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen name="suppliers-map" options={{ href: null }} />
        <Tabs.Screen name="auctions" options={{ href: null }} />
        <Tabs.Screen name="request/[id]" options={{ href: null }} />
        <Tabs.Screen name="ai" options={{ href: null }} />
        <Tabs.Screen name="chat" options={{ href: null }} />
      </Tabs>

      {showAssistantFab ? (
        <AssistantFab
          bottomOffset={tabHeight + bottomInset + 14}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/ai",
              params: { context: assistantContext },
            } as any)
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
