import React, { useEffect, useMemo, useRef } from "react";
import { HeaderBackButton } from "@react-navigation/elements";
import {
  router,
  Stack,
  useNavigation,
  usePathname,
  useSegments,
} from "expo-router";

import {
  markPendingOfficeRouteReturnReceipt,
  recordOfficeBackPathFailure,
  recordOfficeLayoutBeforeRemove,
  recordOfficeRouteOwnerIdentity,
  recordOfficeRouteOwnerMount,
  recordOfficeRouteOwnerUnmount,
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";

export const OFFICE_SAFE_BACK_ROUTE = "/office";
export const OFFICE_BACK_LABEL = "\u041e\u0444\u0438\u0441";
export const unstable_settings = {
  initialRouteName: "index",
};

const WAREHOUSE_HEADER_TITLE = "\u0421\u043a\u043b\u0430\u0434";
type OfficeChildBackSourceRoute = "/office/foreman" | "/office/warehouse";
type OfficeHeaderBackButtonProps = Record<string, unknown> & {
  onPress?: (...args: unknown[]) => void;
};

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
  nativeOnPress: unknown;
  nativePressArgs: unknown[];
  sourceRoute: OfficeChildBackSourceRoute;
}) {
  let method =
    typeof params.nativeOnPress === "function"
      ? "native_header_back"
      : "router_back_fallback";

  try {
    if (typeof params.nativeOnPress === "function") {
      params.nativeOnPress(...params.nativePressArgs);
    } else {
      router.back();
    }
  } catch (error) {
    recordOfficeBackPathFailure({
      error,
      errorStage: "safe_back_header_press",
      extra: {
        owner: "office_stack_layout",
        route: params.sourceRoute,
        sourceRoute: params.sourceRoute,
        target: OFFICE_SAFE_BACK_ROUTE,
        method,
        handler: "safe_back_header",
      },
    });
    router.back();
    method = "router_back_fallback";
  }

  markPendingOfficeRouteReturnReceipt({
    sourceRoute: params.sourceRoute,
    target: OFFICE_SAFE_BACK_ROUTE,
    method,
  });
}

export function renderSafeOfficeChildBackButton(
  sourceRoute: OfficeChildBackSourceRoute,
  props: OfficeHeaderBackButtonProps,
) {
  return (
    <HeaderBackButton
      {...props}
      label={OFFICE_BACK_LABEL}
      onPress={(...nativePressArgs: unknown[]) => {
        handleOfficeChildBack({
          nativeOnPress: props.onPress,
          nativePressArgs,
          sourceRoute,
        });
      }}
      testID="office-safe-back"
    />
  );
}

export function renderSafeOfficeForemanBackButton(
  props: OfficeHeaderBackButtonProps,
) {
  return renderSafeOfficeChildBackButton("/office/foreman", props);
}

export const renderSafeOfficeBackButton = renderSafeOfficeForemanBackButton;

const safeOfficeChildBackButtons = {
  foreman: renderSafeOfficeForemanBackButton,
  warehouse: (props: OfficeHeaderBackButtonProps) =>
    renderSafeOfficeChildBackButton("/office/warehouse", props),
};

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
          headerLeft: safeOfficeChildBackButtons.foreman,
        }}
      />
      <Stack.Screen
        name="buyer"
        options={{
          title: "\u0421\u043d\u0430\u0431\u0436\u0435\u043d\u0435\u0446",
        }}
      />
      <Stack.Screen
        name="director"
        options={{ title: "\u0414\u0438\u0440\u0435\u043a\u0442\u043e\u0440" }}
      />
      <Stack.Screen
        name="accountant"
        options={{
          title: "\u0411\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440",
        }}
      />
      <Stack.Screen
        name="warehouse"
        options={{
          title: WAREHOUSE_HEADER_TITLE,
          headerLeft: safeOfficeChildBackButtons.warehouse,
        }}
      />
      <Stack.Screen
        name="contractor"
        options={{
          title: "\u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a",
        }}
      />
      <Stack.Screen
        name="reports"
        options={{ title: "\u041e\u0442\u0447\u0451\u0442\u044b" }}
      />
      <Stack.Screen
        name="security"
        options={{
          title:
            "\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c",
        }}
      />
    </Stack>
  );
}
