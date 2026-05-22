import "../global.css";

import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Link, Tabs, router, usePathname, useSegments } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APP_LAYOUT } from "../../src/components/layout/appLayout";
import AssistantFab from "../../src/features/ai/AssistantFab";
import { ADD_LISTING_ROUTE } from "../../src/lib/navigation/coreRoutes";
import {
  recordOfficeTabOwnerBlur,
  recordOfficeTabOwnerFocus,
  recordOfficeTabOwnerUnmount,
} from "../../src/lib/navigation/officeReentryBreadcrumbs";

type TabIconName = keyof typeof Ionicons.glyphMap;

type BottomNavItem = {
  routeName: "office" | "request/index" | "market" | "chat" | "profile";
  label: string;
  testID: string;
  legacyTestID: string;
  icon: (focused: boolean) => TabIconName;
};

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  {
    routeName: "office",
    label: "Офис",
    testID: "bottom-tab-office",
    legacyTestID: "tabs.office",
    icon: (focused) => (focused ? "briefcase" : "briefcase-outline"),
  },
  {
    routeName: "request/index",
    label: "Смета",
    testID: "bottom-tab-request",
    legacyTestID: "tabs.request",
    icon: (focused) => (focused ? "document-text" : "document-text-outline"),
  },
  {
    routeName: "market",
    label: "Маркет",
    testID: "bottom-tab-market",
    legacyTestID: "tabs.market",
    icon: (focused) => (focused ? "storefront" : "storefront-outline"),
  },
  {
    routeName: "chat",
    label: "Чат",
    testID: "bottom-tab-chat",
    legacyTestID: "tabs.chat",
    icon: (focused) => (focused ? "chatbubbles" : "chatbubbles-outline"),
  },
  {
    routeName: "profile",
    label: "Профиль",
    testID: "bottom-tab-profile",
    legacyTestID: "tabs.profile",
    icon: (focused) => (focused ? "person-circle" : "person-circle-outline"),
  },
];

function resolveAssistantContext(segments: string[]): string {
  const leaf = segments[segments.length - 1] || "";
  if (leaf === "[id]" && segments.length >= 2) {
    return segments[segments.length - 2] || "unknown";
  }
  return leaf || "unknown";
}

function isOfficeTabPath(pathname: string | null | undefined) {
  return pathname === "/office" || String(pathname ?? "").startsWith("/office/");
}

function AppBottomNav({
  state,
  descriptors,
  navigation,
  bottomInset,
  tabHeight,
}: BottomTabBarProps & { bottomInset: number; tabHeight: number }) {
  const routeByName = new Map(
    state.routes.map((route, index) => [route.name, { route, index }]),
  );

  const renderTab = (item: BottomNavItem) => {
    const match = routeByName.get(item.routeName);
    if (!match) return null;

    const { route, index } = match;
    const focused = state.index === index;
    const descriptor = descriptors[route.key];
    const color = focused
      ? (descriptor?.options.tabBarActiveTintColor ?? "#2563EB")
      : (descriptor?.options.tabBarInactiveTintColor ?? "#64748B");

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    return (
      <View key={item.routeName} testID={item.testID} style={styles.navSlot}>
        <Pressable
          testID={item.legacyTestID}
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: focused }}
          onPress={onPress}
          style={({ pressed }) => [
            styles.navTabButton,
            pressed ? styles.navPressed : null,
          ]}
        >
          <Ionicons name={item.icon(focused)} size={22} color={color} />
          <Text style={[styles.navTabLabel, { color }]} numberOfLines={1}>
            {item.label}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View
      testID="app-bottom-nav"
      style={[
        styles.navShell,
        { height: tabHeight + bottomInset, paddingBottom: bottomInset },
      ]}
    >
      <View style={styles.navRow}>
        {renderTab(BOTTOM_NAV_ITEMS[0])}
        {renderTab(BOTTOM_NAV_ITEMS[1])}
        {renderTab(BOTTOM_NAV_ITEMS[2])}
        <View testID="bottom-nav-marketplace-add-slot" style={styles.navSlot}>
          <Link
            href={ADD_LISTING_ROUTE}
            testID="bottom-nav-marketplace-add"
            accessibilityRole="button"
            accessibilityLabel="Добавить товар в маркет"
            style={styles.navAddButton}
          >
            <Text style={styles.navAddText} numberOfLines={1}>
              ＋
            </Text>
          </Link>
        </View>
        {renderTab(BOTTOM_NAV_ITEMS[3])}
        {renderTab(BOTTOM_NAV_ITEMS[4])}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();
  const isWeb = Platform.OS === "web";
  const segmentsLabel = useMemo(() => segments.join("/") || "none", [segments]);
  const identityRef = useRef(
    `office_tab_owner:${Math.random().toString(36).slice(2, 10)}`,
  );
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const segmentsRef = useRef(segmentsLabel);
  segmentsRef.current = segmentsLabel;
  const wasOfficePathRef = useRef(isOfficeTabPath(pathname));

  const tabHeight = APP_LAYOUT.bottomNavHeightPx;
  const bottomInset = isWeb ? 0 : insets.bottom || 0;
  const leafSegment = segments[segments.length - 1];
  const assistantContext = resolveAssistantContext(segments);
  const showAssistantFab = leafSegment !== "ai" && leafSegment !== "chat";
  const routeOftenHasStickyAction =
    pathname === "/add" ||
    pathname === "/request" ||
    String(pathname ?? "").startsWith("/office/");
  const assistantBottomOffset =
    (routeOftenHasStickyAction
      ? APP_LAYOUT.floatingAiButtonWithStickyActionOffsetPx
      : APP_LAYOUT.floatingAiButtonOffsetPx) + bottomInset;
  const officeTabExtra = useMemo(
    () => ({
      owner: "office_tab_owner",
      route: "/(tabs)",
      pathname,
      segments: segmentsLabel,
      identity: identityRef.current,
      routeWrapper: "tabs_root_entry",
      target: "/office",
    }),
    [pathname, segmentsLabel],
  );

  useEffect(() => {
    const isOfficePath = isOfficeTabPath(pathname);
    const wasOfficePath = wasOfficePathRef.current;

    if (!wasOfficePath && isOfficePath) {
      recordOfficeTabOwnerFocus(officeTabExtra);
    } else if (wasOfficePath && !isOfficePath) {
      recordOfficeTabOwnerBlur({
        ...officeTabExtra,
        reason: `left_office_subtree:${pathname ?? "unknown"}`,
      });
    }

    wasOfficePathRef.current = isOfficePath;
  }, [officeTabExtra, pathname]);

  useEffect(() => {
    const identity = identityRef.current;
    return () => {
      recordOfficeTabOwnerUnmount({
        owner: "office_tab_owner",
        route: "/(tabs)",
        pathname: pathnameRef.current,
        segments: segmentsRef.current,
        identity,
        routeWrapper: "tabs_root_entry",
        target: "/office",
      });
    };
  }, []);

  return (
    <View style={styles.shell}>
      <Tabs
        initialRouteName="market"
        tabBar={(props) => (
          <AppBottomNav
            {...props}
            bottomInset={bottomInset}
            tabHeight={tabHeight}
          />
        )}
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
          name="office"
          options={{
            title: "Офис",
            tabBarLabel: "Офис",
            tabBarAccessibilityLabel: "Офис",
            tabBarButtonTestID: "tabs.office",
          }}
        />
        <Tabs.Screen
          name="request/index"
          options={{
            title: "Смета",
            tabBarLabel: "Смета",
            tabBarAccessibilityLabel: "Смета",
            tabBarButtonTestID: "tabs.request",
          }}
        />
        <Tabs.Screen
          name="market"
          options={{
            title: "Маркет",
            tabBarLabel: "Маркет",
            tabBarAccessibilityLabel: "Маркет",
            tabBarButtonTestID: "tabs.market",
          }}
        />
        <Tabs.Screen name="add" options={{ href: null }} />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Чат",
            tabBarLabel: "Чат",
            tabBarAccessibilityLabel: "Чат",
            tabBarButtonTestID: "tabs.chat",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Профиль",
            tabBarLabel: "Профиль",
            tabBarAccessibilityLabel: "Профиль",
            tabBarButtonTestID: "tabs.profile",
          }}
        />

        {/* NAV-LAZY: Role screens live under office/ child routes only.
            Dead duplicate tabs removed: foreman, director, buyer,
            accountant, security, reports, contractor. */}
        <Tabs.Screen name="supplierMap" options={{ href: null }} />
        <Tabs.Screen name="suppliers-map" options={{ href: null }} />
        <Tabs.Screen name="auctions" options={{ href: null }} />
        <Tabs.Screen name="request/[id]" options={{ href: null }} />
        <Tabs.Screen name="ai" options={{ href: null }} />
      </Tabs>

      {showAssistantFab ? (
        <AssistantFab
          bottomOffset={assistantBottomOffset}
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
  navShell: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  navRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  navSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  navTabButton: {
    width: "100%",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 2,
  },
  navTabLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  navAddButton: {
    width: 48,
    height: 48,
    minWidth: 48,
    minHeight: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  navAddText: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "900",
  },
  navPressed: {
    opacity: 0.72,
  },
});
