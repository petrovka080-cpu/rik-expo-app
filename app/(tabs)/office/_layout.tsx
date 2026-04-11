import React, { useEffect, useMemo, useRef } from "react";
import { HeaderBackButton } from "@react-navigation/elements";
import { Stack, router, useNavigation, usePathname, useSegments } from "expo-router";

import {
  markPendingOfficeRouteReplaceReceipt,
  markPendingOfficeRouteReturnReceipt,
  recordOfficeBackPathFailure,
  recordOfficeLayoutBeforeRemove,
  recordOfficeRouteOwnerIdentity,
  recordOfficeRouteOwnerMount,
  recordOfficeRouteOwnerUnmount,
  recordOfficeWarehouseBackPressDone,
  recordOfficeWarehouseBackPressStart,
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";
import { hasSafeBackHistory, safeBack } from "../../../src/lib/navigation/safeBack";

export const OFFICE_SAFE_BACK_ROUTE = "/office";
export const OFFICE_BACK_LABEL = "\u041e\u0444\u0438\u0441";
const WAREHOUSE_HEADER_TITLE = "\u0421\u043a\u043b\u0430\u0434";

function useOfficeStackOwnerAudit() {
  const navigation = useNavigation();
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

  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      const action =
        typeof event?.data?.action?.type === "string"
          ? event.data.action.type
          : "unknown_action";
      recordOfficeLayoutBeforeRemove({
        owner: "office_stack_layout",
        route: "/office/_layout",
        pathname,
        segments: segmentsLabel,
        identity: identityRef.current,
        routeWrapper: "office_stack_layout_entry",
        action,
      });
    });
  }, [navigation, pathname, segmentsLabel]);
}

function handleOfficeChildBack(params: {
  sourceRoute: "/office/foreman" | "/office/warehouse";
}) {
  const hasHistory = hasSafeBackHistory(router);
  const receiptExtra = {
    sourceRoute: params.sourceRoute,
    target: OFFICE_SAFE_BACK_ROUTE,
    method: hasHistory ? "back" : "replace",
    selectedMethod: hasHistory ? "back" : "replace_fallback",
  };
  const markerExtra = {
    ...receiptExtra,
    owner: "office_stack_layout",
    route: params.sourceRoute,
    handler: "safe_back_header",
  };

  try {
    if (params.sourceRoute === "/office/warehouse") {
      recordOfficeWarehouseBackPressStart(markerExtra);
    }

    if (hasHistory) {
      markPendingOfficeRouteReturnReceipt(receiptExtra);
    } else {
      markPendingOfficeRouteReplaceReceipt(receiptExtra);
    }

    safeBack(router, OFFICE_SAFE_BACK_ROUTE);

    if (params.sourceRoute === "/office/warehouse") {
      recordOfficeWarehouseBackPressDone(markerExtra);
    }
  } catch (error) {
    recordOfficeBackPathFailure({
      error,
      errorStage: "safe_back_header_press",
      extra: markerExtra,
    });
    throw error;
  }
}

function createSafeOfficeBackButton(
  sourceRoute: "/office/foreman" | "/office/warehouse",
) {
  return function renderSafeOfficeChildBackButton(props: Record<string, unknown>) {
    return (
      <HeaderBackButton
        {...props}
        label={OFFICE_BACK_LABEL}
        onPress={() => handleOfficeChildBack({ sourceRoute })}
        testID="office-safe-back"
      />
    );
  };
}

export const renderSafeOfficeForemanBackButton = createSafeOfficeBackButton(
  "/office/foreman",
);
export const renderSafeOfficeWarehouseBackButton = createSafeOfficeBackButton(
  "/office/warehouse",
);
export const renderSafeOfficeBackButton = renderSafeOfficeForemanBackButton;

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
          title: "\u041f\u0440\u043e\u0440\u0430\u0431",
          headerLeft: renderSafeOfficeForemanBackButton,
        }}
      />
      <Stack.Screen name="buyer" options={{ title: "\u0421\u043d\u0430\u0431\u0436\u0435\u043d\u0435\u0446" }} />
      <Stack.Screen name="director" options={{ title: "\u0414\u0438\u0440\u0435\u043a\u0442\u043e\u0440" }} />
      <Stack.Screen name="accountant" options={{ title: "\u0411\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440" }} />
      <Stack.Screen
        name="warehouse"
        options={{
          title: WAREHOUSE_HEADER_TITLE,
          headerLeft: renderSafeOfficeWarehouseBackButton,
        }}
      />
      <Stack.Screen name="contractor" options={{ title: "\u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a" }} />
      <Stack.Screen name="reports" options={{ title: "\u041e\u0442\u0447\u0451\u0442\u044b" }} />
      <Stack.Screen name="security" options={{ title: "\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c" }} />
    </Stack>
  );
}
