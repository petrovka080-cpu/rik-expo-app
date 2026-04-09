import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useFocusEffect, usePathname, useSegments } from "expo-router";

import {
  recordOfficeRouteOwnerIdentity,
  recordOfficeRouteOwnerBlur,
  recordOfficeRouteOwnerFocus,
  recordOfficeRouteOwnerMount,
  recordOfficeRouteOwnerUnmount,
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";
import WarehouseScreenContent from "../../../src/screens/warehouse/WarehouseScreenContent";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeWarehouseRoute() {
  const pathname = usePathname();
  const segments = useSegments();
  const identityRef = useRef(
    `office_warehouse_route:${Math.random().toString(36).slice(2, 10)}`,
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
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      pathname,
      segments: segmentsLabel,
      identity: identityRef.current,
      routeWrapper: "office_owned_screen_entry",
      ...(extra ?? {}),
    }),
    [pathname, segmentsLabel],
  );

  useEffect(() => {
    const identity = identityRef.current;
    recordOfficeRouteOwnerMount({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      pathname: initialSnapshotRef.current.pathname,
      segments: initialSnapshotRef.current.segments,
      identity,
      routeWrapper: "office_owned_screen_entry",
    });
    return () => {
      recordOfficeRouteOwnerUnmount({
        owner: "office_warehouse_route",
        route: "/office/warehouse",
        pathname: pathnameRef.current,
        segments: segmentsRef.current,
        identity,
        routeWrapper: "office_owned_screen_entry",
      });
    };
  }, []);

  useEffect(() => {
    recordOfficeRouteOwnerIdentity(buildRouteExtra());
  }, [buildRouteExtra]);

  useFocusEffect(
    useCallback(() => {
      recordOfficeRouteOwnerFocus(buildRouteExtra());
      return () => {
        recordOfficeRouteOwnerBlur(buildRouteExtra());
      };
    }, [buildRouteExtra]),
  );

  return <WarehouseScreenContent />;
}

export default withScreenErrorBoundary(OfficeWarehouseRoute, {
  screen: "warehouse",
  route: "/office/warehouse",
});
