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
    case "market":
      return focused ? "storefront" : "storefront-outline";
    case "office":
      return focused ? "briefcase" : "briefcase-outline";
    case "add":
      return focused ? "add-circle" : "add-circle-outline";
    case "chat":
      return focused ? "chatbubbles" : "chatbubbles-outline";
    case "profile":
      return focused ? "person-circle" : "person-circle-outline";
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
        initialRouteName="market"
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
          name="market"
          options={{
            title: "Главная",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("market", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="office"
          options={{
            title: "Офис",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("office", focused)} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: "+",
            tabBarLabel: "+",
            tabBarLabelStyle: { fontSize: 18, fontWeight: "900" },
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("add", focused)} color={color} size={size + 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Чаты",
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={iconForRoute("chat", focused)} color={color} size={size} />
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

        <Tabs.Screen name="foreman" options={{ href: null }} />
        <Tabs.Screen name="director" options={{ href: null }} />
        <Tabs.Screen name="buyer" options={{ href: null }} />
        <Tabs.Screen name="accountant" options={{ href: null }} />
        <Tabs.Screen name="warehouse" options={{ href: null }} />
        <Tabs.Screen name="security" options={{ href: null }} />
        <Tabs.Screen name="reports" options={{ href: null }} />
        <Tabs.Screen name="contractor" options={{ href: null }} />
        <Tabs.Screen name="supplierMap" options={{ href: null }} />
        <Tabs.Screen name="suppliers-map" options={{ href: null }} />
        <Tabs.Screen name="auctions" options={{ href: null }} />
        <Tabs.Screen name="request/[id]" options={{ href: null }} />
        <Tabs.Screen name="ai" options={{ href: null }} />
      </Tabs>

      {showAssistantFab ? (
        <AssistantFab
          bottomOffset={tabHeight + bottomInset + 14}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/ai",
              params: { context: assistantContext },
            })
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
