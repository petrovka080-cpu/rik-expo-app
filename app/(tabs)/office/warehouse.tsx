import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useFocusEffect, usePathname, useSegments } from "expo-router";

import {
  recordOfficeWarehouseEntryFailure,
  recordOfficeWarehouseEntryFocusDone,
  recordOfficeWarehouseEntryFocusStart,
  recordOfficeWarehouseEntryMountDone,
  recordOfficeWarehouseEntryMountStart,
  recordOfficeRouteOwnerIdentity,
  recordOfficeRouteOwnerBlur,
  recordOfficeRouteOwnerFocus,
  recordOfficeRouteOwnerMount,
  recordOfficeRouteOwnerUnmount,
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";
import WarehouseScreenContent from "../../../src/screens/warehouse/WarehouseScreenContent";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

type OfficeWarehouseEntryBoundaryProps = {
  children: React.ReactNode;
  extra: Record<string, unknown>;
};

type OfficeWarehouseEntryBoundaryState = {
  error: Error | null;
};

class OfficeWarehouseEntryBoundary extends React.Component<
  OfficeWarehouseEntryBoundaryProps,
  OfficeWarehouseEntryBoundaryState
> {
  state: OfficeWarehouseEntryBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(
    error: Error,
  ): Partial<OfficeWarehouseEntryBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    recordOfficeWarehouseEntryFailure({
      error,
      errorStage: "entry_boundary",
      extra: {
        ...this.props.extra,
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

  React.useLayoutEffect(() => {
    recordOfficeWarehouseEntryMountStart(
      buildRouteExtra({
        phase: "layout_effect",
      }),
    );
  }, [buildRouteExtra]);

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
    recordOfficeWarehouseEntryMountDone(
      buildRouteExtra({
        phase: "effect",
      }),
    );
    recordOfficeRouteOwnerIdentity(buildRouteExtra());
  }, [buildRouteExtra]);

  useFocusEffect(
    useCallback(() => {
      const focusExtra = buildRouteExtra();
      recordOfficeWarehouseEntryFocusStart(focusExtra);
      recordOfficeRouteOwnerFocus(buildRouteExtra());
      recordOfficeWarehouseEntryFocusDone(focusExtra);
      return () => {
        recordOfficeRouteOwnerBlur(buildRouteExtra());
      };
    }, [buildRouteExtra]),
  );

  return (
    <OfficeWarehouseEntryBoundary extra={buildRouteExtra()}>
      <WarehouseScreenContent
        entryKind="office"
        entryExtra={buildRouteExtra({
          contentOwner: "office_warehouse_route",
        })}
      />
    </OfficeWarehouseEntryBoundary>
  );
}

export default withScreenErrorBoundary(OfficeWarehouseRoute, {
  screen: "warehouse",
  route: "/office/warehouse",
});
