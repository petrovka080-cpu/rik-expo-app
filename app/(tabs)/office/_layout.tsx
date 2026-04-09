import React, { useEffect, useMemo, useRef } from "react";
import { HeaderBackButton } from "@react-navigation/elements";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, router, usePathname, useSegments } from "expo-router";

import {
  markPendingOfficeRouteReplaceReceipt,
  recordOfficeRouteOwnerIdentity,
  recordOfficeRouteOwnerMount,
  recordOfficeRouteOwnerUnmount,
  recordWarehouseReturnToOfficeDone,
  recordWarehouseReturnToOfficeStart,
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";
import { recordPlatformObservability } from "../../../src/lib/observability/platformObservability";
import { recordWarehouseBackBreadcrumbs, recordWarehouseBackBreadcrumbsAsync } from "../../../src/lib/navigation/warehouseBackBreadcrumbs";
import { hasSafeBackHistory, safeBack, type SafeBackRouterLike } from "../../../src/lib/navigation/safeBack";

export const OFFICE_SAFE_BACK_ROUTE = "/office";
export const OFFICE_BACK_LABEL = "\u041e\u0444\u0438\u0441";
const DEFAULT_HEADER_TINT = "#0F172A";

function useOfficeStackOwnerAudit() {
  const pathname = usePathname();
  const segments = useSegments();
  const identityRef = useRef(
    `office_stack_layout:${Math.random().toString(36).slice(2, 10)}`,
  );
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const segmentsLabel = useMemo(() => segments.join("/") || "none", [segments]);
  const segmentsRef = useRef(segmentsLabel);
  segmentsRef.current = segmentsLabel;
  const initialSnapshotRef = useRef({
    pathname,
    segments: segmentsLabel,
  });

  useEffect(() => {
    const identity = identityRef.current;
    recordOfficeRouteOwnerMount({
      owner: "office_stack_layout",
      route: "/office/_layout",
      pathname: initialSnapshotRef.current.pathname,
      segments: initialSnapshotRef.current.segments,
      identity,
      routeWrapper: "office_stack_layout_entry",
    });

    return () => {
      recordOfficeRouteOwnerUnmount({
        owner: "office_stack_layout",
        route: "/office/_layout",
        pathname: pathnameRef.current,
        segments: segmentsRef.current,
        identity,
        routeWrapper: "office_stack_layout_entry",
      });
    };
  }, []);

  useEffect(() => {
    recordOfficeRouteOwnerIdentity({
      owner: "office_stack_layout",
      route: "/office/_layout",
      pathname,
      segments: segmentsLabel,
      identity: identityRef.current,
      routeWrapper: "office_stack_layout_entry",
    });
  }, [pathname, segmentsLabel]);
}

export function renderSafeOfficeBackButton(props: Record<string, unknown>) {
  return (
    <HeaderBackButton
      {...props}
      label={OFFICE_BACK_LABEL}
      onPress={() => safeBack(router, OFFICE_SAFE_BACK_ROUTE)}
      testID="office-safe-back"
    />
  );
}

export function performWarehouseBackNavigation(
  warehouseRouter: SafeBackRouterLike,
  recordEvent: typeof recordPlatformObservability = recordPlatformObservability,
  persistBreadcrumbs: typeof recordWarehouseBackBreadcrumbsAsync = recordWarehouseBackBreadcrumbsAsync,
) {
  const pendingBreadcrumbs: Parameters<typeof recordWarehouseBackBreadcrumbsAsync>[0] = [];
  const queueBreadcrumb = (entry: Parameters<typeof recordWarehouseBackBreadcrumbsAsync>[0][number]) => {
    pendingBreadcrumbs.push(entry);
  };

  recordEvent({
    screen: "warehouse",
    surface: "warehouse_back",
    category: "ui",
    event: "warehouse_back_tap",
    result: "success",
    extra: {
      route: "/office/warehouse",
      owner: "office_stack",
    },
  });
  queueBreadcrumb({
    marker: "warehouse_back_tap",
    result: "success",
    extra: {
      route: "/office/warehouse",
      owner: "office_stack",
    },
  });
  recordEvent({
    screen: "warehouse",
    surface: "warehouse_back",
    category: "ui",
    event: "warehouse_back_handler_enter",
    result: "success",
    extra: {
      handler: "office_header_left_explicit",
      route: "/office/warehouse",
    },
  });
  queueBreadcrumb({
    marker: "warehouse_back_handler_enter",
    result: "success",
    extra: {
      handler: "office_header_left_explicit",
      route: "/office/warehouse",
    },
  });
  recordEvent({
    screen: "warehouse",
    surface: "warehouse_back",
    category: "ui",
    event: "warehouse_back_handler_selected",
    result: "success",
    extra: {
      handler: "office_header_left_explicit",
      route: "/office/warehouse",
    },
  });
  queueBreadcrumb({
    marker: "warehouse_back_handler_selected",
    result: "success",
    extra: {
      handler: "office_header_left_explicit",
      route: "/office/warehouse",
    },
  });

  const canGoBack = hasSafeBackHistory(warehouseRouter);
  recordEvent({
    screen: "warehouse",
    surface: "warehouse_back",
    category: "ui",
    event: "warehouse_back_native_auto_back_blocked",
    result: "success",
    extra: {
      route: "/office/warehouse",
      fallbackRoute: OFFICE_SAFE_BACK_ROUTE,
      blockedHandler: "native_auto_back",
      activeHandler: "office_header_left_explicit",
    },
  });
  queueBreadcrumb({
    marker: "warehouse_back_native_auto_back_blocked",
    result: "success",
    extra: {
      route: "/office/warehouse",
      fallbackRoute: OFFICE_SAFE_BACK_ROUTE,
      blockedHandler: "native_auto_back",
      activeHandler: "office_header_left_explicit",
    },
  });
  recordEvent({
    screen: "warehouse",
    surface: "warehouse_back",
    category: "ui",
    event: canGoBack ? "warehouse_back_can_go_back_true" : "warehouse_back_can_go_back_false",
    result: "success",
    extra: {
      route: "/office/warehouse",
      fallbackRoute: OFFICE_SAFE_BACK_ROUTE,
    },
  });
  queueBreadcrumb({
    marker: canGoBack ? "warehouse_back_can_go_back_true" : "warehouse_back_can_go_back_false",
    result: "success",
    extra: {
      route: "/office/warehouse",
      fallbackRoute: OFFICE_SAFE_BACK_ROUTE,
    },
  });
  recordEvent({
    screen: "warehouse",
    surface: "warehouse_back",
    category: "ui",
    event: "warehouse_back_use_router_back",
    result: "skipped",
    extra: {
      route: "/office/warehouse",
      reason: "warehouse_explicit_office_return",
      selectedMethod: "replace",
    },
  });
  queueBreadcrumb({
    marker: "warehouse_back_use_router_back",
    result: "skipped",
    extra: {
      route: "/office/warehouse",
      reason: "warehouse_explicit_office_return",
      selectedMethod: "replace",
    },
  });
  recordEvent({
    screen: "warehouse",
    surface: "warehouse_back",
    category: "ui",
    event: "warehouse_back_use_office_push",
    result: "skipped",
    extra: {
      route: "/office/warehouse",
      reason: "replace_selected_for_stability",
      selectedMethod: "replace",
    },
  });
  queueBreadcrumb({
    marker: "warehouse_back_use_office_push",
    result: "skipped",
    extra: {
      route: "/office/warehouse",
      reason: "replace_selected_for_stability",
      selectedMethod: "replace",
    },
  });
  recordEvent({
    screen: "warehouse",
    surface: "warehouse_back",
    category: "ui",
    event: "warehouse_back_use_office_replace",
    result: "success",
    extra: {
      route: "/office/warehouse",
      fallbackRoute: OFFICE_SAFE_BACK_ROUTE,
      reason: "warehouse_explicit_office_return",
    },
  });
  queueBreadcrumb({
    marker: "warehouse_back_use_office_replace",
    result: "success",
    extra: {
      route: "/office/warehouse",
      fallbackRoute: OFFICE_SAFE_BACK_ROUTE,
      reason: "warehouse_explicit_office_return",
    },
  });
  recordEvent({
    screen: "warehouse",
    surface: "warehouse_back",
    category: "ui",
    event: "warehouse_back_navigation_call",
    result: "success",
    extra: {
      route: "/office/warehouse",
      method: "replace",
      target: OFFICE_SAFE_BACK_ROUTE,
    },
  });
  queueBreadcrumb({
    marker: "warehouse_back_navigation_call",
    result: "success",
    extra: {
      route: "/office/warehouse",
      method: "replace",
      target: OFFICE_SAFE_BACK_ROUTE,
    },
  });
  recordEvent({
    screen: "warehouse",
    surface: "warehouse_back",
    category: "ui",
    event: "warehouse_back_fallback_selected",
    result: "success",
    extra: {
      route: "/office/warehouse",
      fallbackRoute: OFFICE_SAFE_BACK_ROUTE,
      method: "replace",
    },
  });
  queueBreadcrumb({
    marker: "warehouse_back_fallback_selected",
    result: "success",
    extra: {
      route: "/office/warehouse",
      fallbackRoute: OFFICE_SAFE_BACK_ROUTE,
      method: "replace",
    },
  });

  try {
    const persistAttempt = persistBreadcrumbs(pendingBreadcrumbs).catch(() => undefined);
    void persistAttempt;
    recordWarehouseReturnToOfficeStart({
      owner: "office_stack_layout",
      route: "/office/warehouse",
      sourceRoute: "/office/warehouse",
      target: OFFICE_SAFE_BACK_ROUTE,
      method: "replace",
    });
    markPendingOfficeRouteReplaceReceipt({
      owner: "office_stack_layout",
      route: OFFICE_SAFE_BACK_ROUTE,
      sourceRoute: "/office/warehouse",
      target: OFFICE_SAFE_BACK_ROUTE,
      method: "replace",
      reason: "warehouse_explicit_office_return",
    });
    warehouseRouter.replace(OFFICE_SAFE_BACK_ROUTE);
    recordWarehouseReturnToOfficeDone({
      owner: "office_stack_layout",
      route: "/office/warehouse",
      sourceRoute: "/office/warehouse",
      target: OFFICE_SAFE_BACK_ROUTE,
      method: "replace",
    });

    recordEvent({
      screen: "warehouse",
      surface: "warehouse_back",
      category: "ui",
      event: "warehouse_back_navigation_done",
      result: "success",
      extra: {
        route: "/office/warehouse",
        method: "replace",
        target: OFFICE_SAFE_BACK_ROUTE,
      },
    });
    recordWarehouseBackBreadcrumbs([
      {
        marker: "warehouse_back_navigation_done",
        result: "success",
        extra: {
          route: "/office/warehouse",
          method: "replace",
          target: OFFICE_SAFE_BACK_ROUTE,
        },
      },
    ]);
  } catch (error) {
    recordEvent({
      screen: "warehouse",
      surface: "warehouse_back",
      category: "ui",
      event: "warehouse_back_navigation_failed",
      result: "error",
      errorStage: "navigation_call",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error ?? "warehouse_back_failed"),
      extra: {
        route: "/office/warehouse",
        method: "replace",
        target: OFFICE_SAFE_BACK_ROUTE,
      },
    });
    void persistBreadcrumbs([
      ...pendingBreadcrumbs,
      {
        marker: "warehouse_back_navigation_failed",
        result: "error",
        errorStage: "navigation_call",
        errorClass: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error ?? "warehouse_back_failed"),
        extra: {
          route: "/office/warehouse",
          method: "replace",
          target: OFFICE_SAFE_BACK_ROUTE,
        },
      },
    ]).catch(() => undefined);
    throw error;
  }
}

export function renderWarehouseOfficeBackButton(props: Record<string, unknown>) {
  const tintColor = typeof props.tintColor === "string" ? props.tintColor : DEFAULT_HEADER_TINT;

  return (
    <Pressable
      accessibilityHint="Вернуться в Офис"
      accessibilityLabel="Офис"
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => {
        void performWarehouseBackNavigation(router);
      }}
      style={styles.warehouseBackButton}
      testID="warehouse-office-safe-back"
    >
      <View style={styles.warehouseBackButtonContent}>
        <Text style={[styles.warehouseBackChevron, { color: tintColor }]}>{"‹"}</Text>
        <Text style={[styles.warehouseBackLabel, { color: tintColor }]}>{OFFICE_BACK_LABEL}</Text>
      </View>
    </Pressable>
  );
}

export default function OfficeStackLayout() {
  useOfficeStackOwnerAudit();

  return (
    <Stack
      screenOptions={{
        headerTintColor: "#0F172A",
        headerTitleStyle: { fontWeight: "800" },
        headerBackTitle: OFFICE_BACK_LABEL,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#FFFFFF" },
        contentStyle: { backgroundColor: "#F8FAFC" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="foreman"
        options={{
          title: "Прораб",
          headerLeft: renderSafeOfficeBackButton,
        }}
      />
      <Stack.Screen name="buyer" options={{ title: "Снабженец" }} />
      <Stack.Screen name="director" options={{ title: "Директор" }} />
      <Stack.Screen name="accountant" options={{ title: "Бухгалтер" }} />
      <Stack.Screen
        name="warehouse"
        options={{
          title: "Склад",
          headerBackVisible: false,
          headerBackButtonMenuEnabled: false,
          headerBackTitle: "",
          gestureEnabled: false,
          headerLeft: renderWarehouseOfficeBackButton,
        }}
      />
      <Stack.Screen name="contractor" options={{ title: "Подрядчик" }} />
      <Stack.Screen name="reports" options={{ title: "Отчёты" }} />
      <Stack.Screen name="security" options={{ title: "Безопасность" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  warehouseBackButton: {
    marginLeft: 0,
    paddingVertical: 6,
    paddingRight: 10,
  },
  warehouseBackButtonContent: {
    alignItems: "center",
    flexDirection: "row",
  },
  warehouseBackChevron: {
    fontSize: 28,
    fontWeight: "400",
    lineHeight: 28,
    marginRight: 2,
    marginTop: -2,
  },
  warehouseBackLabel: {
    fontSize: 17,
    fontWeight: "500",
  },
});
