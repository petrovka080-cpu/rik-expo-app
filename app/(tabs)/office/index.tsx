import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFocusEffect, usePathname, useSegments } from "expo-router";

import OfficeHubScreen from "../../../src/screens/office/OfficeHubScreen";
import {
  consumePendingOfficeRouteReplaceReceipt,
  recordOfficeReentryFailure,
  recordOfficeReentryStart,
  recordOfficeRouteOwnerIdentity,
  recordOfficeRouteOwnerBlur,
  recordOfficeRouteOwnerFocus,
  recordOfficeRouteOwnerMount,
  recordOfficeRouteOwnerUnmount,
  recordOfficeRouteReplaceReceived,
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

type OfficeReentryCrashBoundaryProps = {
  children: React.ReactNode;
};

type OfficeReentryCrashBoundaryState = {
  error: Error | null;
};

class OfficeReentryCrashBoundary extends React.Component<
  OfficeReentryCrashBoundaryProps,
  OfficeReentryCrashBoundaryState
> {
  state: OfficeReentryCrashBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): Partial<OfficeReentryCrashBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    recordOfficeReentryFailure({
      error,
      errorStage: "render_boundary",
      extra: {
        owner: "office_route_boundary",
        componentStack: String(info.componentStack || "").trim().slice(0, 2000),
      },
    });
  }

  render() {
    if (this.state.error) {
      throw this.state.error;
    }

    return this.props.children;
  }
}

function OfficeIndexRoute() {
  const pathname = usePathname();
  const segments = useSegments();
  const identityRef = useRef(
    `office_index_route:${Math.random().toString(36).slice(2, 10)}`,
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
      owner: "office_index_route",
      route: "/office",
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
      owner: "office_index_route",
      route: "/office",
      pathname: initialSnapshotRef.current.pathname,
      segments: initialSnapshotRef.current.segments,
      identity,
      routeWrapper: "office_owned_screen_entry",
    });
    return () => {
      recordOfficeRouteOwnerUnmount({
        owner: "office_index_route",
        route: "/office",
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

  useLayoutEffect(() => {
    recordOfficeReentryStart({
      owner: "office_index_route",
    });
    const replaceReceipt = consumePendingOfficeRouteReplaceReceipt();
    if (replaceReceipt) {
      recordOfficeRouteReplaceReceived({
        owner: "office_index_route",
        route: "/office",
        pathname: initialSnapshotRef.current.pathname,
        segments: initialSnapshotRef.current.segments,
        identity: identityRef.current,
        routeWrapper: "office_owned_screen_entry",
        ...replaceReceipt,
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      recordOfficeRouteOwnerFocus(buildRouteExtra());
      return () => {
        recordOfficeRouteOwnerBlur(buildRouteExtra());
      };
    }, [buildRouteExtra]),
  );

  return (
    <OfficeReentryCrashBoundary>
      <OfficeHubScreen />
    </OfficeReentryCrashBoundary>
  );
}

export default withScreenErrorBoundary(OfficeIndexRoute, {
  screen: "office",
  route: "/office",
});
