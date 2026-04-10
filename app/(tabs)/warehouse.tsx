import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useFocusEffect, usePathname, useSegments } from "expo-router";

import {
  recordTabWarehouseEntryMountDone,
  recordTabWarehouseEntryMountStart,
  recordWarehouseRouteOwnerBlur,
  recordWarehouseRouteOwnerFocus,
  recordWarehouseRouteOwnerIdentity,
  recordWarehouseRouteOwnerMount,
  recordWarehouseRouteOwnerUnmount,
} from "../../src/lib/navigation/officeReentryBreadcrumbs";
import WarehouseScreenContent from "../../src/screens/warehouse/WarehouseScreenContent";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

export function WarehouseScreen() {
  return <WarehouseScreenContent />;
}

function WarehouseTabRoute() {
  const pathname = usePathname();
  const segments = useSegments();
  const identityRef = useRef(
    `warehouse_tab_route:${Math.random().toString(36).slice(2, 10)}`,
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
  const buildRouteExtra = useCallback(
    (extra?: Record<string, unknown>) => ({
      owner: "warehouse_tab_route",
      route: "/warehouse",
      pathname,
      segments: segmentsLabel,
      identity: identityRef.current,
      routeWrapper: "tab_owned_screen_entry",
      ...(extra ?? {}),
    }),
    [pathname, segmentsLabel],
  );

  React.useLayoutEffect(() => {
    recordTabWarehouseEntryMountStart(
      buildRouteExtra({
        phase: "layout_effect",
      }),
    );
  }, [buildRouteExtra]);

  useEffect(() => {
    const identity = identityRef.current;
    recordWarehouseRouteOwnerMount({
      owner: "warehouse_tab_route",
      route: "/warehouse",
      pathname: initialSnapshotRef.current.pathname,
      segments: initialSnapshotRef.current.segments,
      identity,
      routeWrapper: "tab_owned_screen_entry",
    });
    return () => {
      recordWarehouseRouteOwnerUnmount({
        owner: "warehouse_tab_route",
        route: "/warehouse",
        pathname: pathnameRef.current,
        segments: segmentsRef.current,
        identity,
        routeWrapper: "tab_owned_screen_entry",
      });
    };
  }, []);

  useEffect(() => {
    recordTabWarehouseEntryMountDone(
      buildRouteExtra({
        phase: "effect",
      }),
    );
    recordWarehouseRouteOwnerIdentity(buildRouteExtra());
  }, [buildRouteExtra]);

  useFocusEffect(
    useCallback(() => {
      recordWarehouseRouteOwnerFocus(buildRouteExtra());
      return () => {
        recordWarehouseRouteOwnerBlur(buildRouteExtra());
      };
    }, [buildRouteExtra]),
  );

  return <WarehouseScreen />;
}

export default withScreenErrorBoundary(WarehouseTabRoute, {
  screen: "warehouse",
  route: "/warehouse",
});
