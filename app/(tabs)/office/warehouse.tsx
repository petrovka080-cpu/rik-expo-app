import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useFocusEffect, useNavigation, usePathname, useSegments } from "expo-router";

import {
  recordOfficeWarehouseBeforeRemove,
  recordOfficeWarehouseEntryFailure,
  recordOfficeWarehouseEntryFocusDone,
  recordOfficeWarehouseEntryFocusStart,
  recordOfficeWarehouseEntryMountDone,
  recordOfficeWarehouseEntryMountStart,
  recordOfficeWarehouseScopeActive,
  recordOfficeWarehouseScopeInactive,
  recordOfficeWarehouseScopeSkipReason,
  recordOfficeWarehouseUnmount,
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
  const navigation = useNavigation();
  const pathname = usePathname();
  const segments = useSegments();
  const isExactWarehousePath = pathname === "/office/warehouse";
  const identityRef = useRef(
    `office_warehouse_route:${Math.random().toString(36).slice(2, 10)}`,
  );
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const segmentsLabel = useMemo(() => segments.join("/") || "none", [segments]);
  const segmentsRef = useRef(segmentsLabel);
  segmentsRef.current = segmentsLabel;
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
  const scopeInactiveReason = isExactWarehousePath
    ? null
    : `non_exact_path:${pathname}`;

  useEffect(() => {
    if (isExactWarehousePath) {
      recordOfficeWarehouseScopeActive(buildRouteExtra());
      return;
    }

    const inactiveExtra = buildRouteExtra({
      reason: scopeInactiveReason ?? "non_exact_path:unknown",
    });
    recordOfficeWarehouseScopeSkipReason(inactiveExtra);
    recordOfficeWarehouseScopeInactive(inactiveExtra);
  }, [buildRouteExtra, isExactWarehousePath, scopeInactiveReason]);

  React.useLayoutEffect(() => {
    if (!isExactWarehousePath) return;
    recordOfficeWarehouseEntryMountStart(
      buildRouteExtra({
        phase: "layout_effect",
      }),
    );
  }, [buildRouteExtra, isExactWarehousePath]);

  useEffect(() => {
    if (!isExactWarehousePath) return;
    const identity = identityRef.current;
    recordOfficeRouteOwnerMount(buildRouteExtra({ identity }));
    return () => {
      recordOfficeWarehouseUnmount({
        owner: "office_warehouse_route",
        route: "/office/warehouse",
        pathname: pathnameRef.current,
        segments: segmentsRef.current,
        identity,
        routeWrapper: "office_owned_screen_entry",
      });
      recordOfficeRouteOwnerUnmount({
        ...buildRouteExtra({
          pathname: pathnameRef.current,
          segments: segmentsRef.current,
        }),
        identity,
      });
    };
  }, [buildRouteExtra, isExactWarehousePath]);

  useEffect(() => {
    if (!isExactWarehousePath) return;
    return navigation.addListener("beforeRemove", (event) => {
      const action =
        typeof event?.data?.action?.type === "string"
          ? event.data.action.type
          : "unknown_action";
      recordOfficeWarehouseBeforeRemove(
        buildRouteExtra({
          action,
        }),
      );
    });
  }, [buildRouteExtra, isExactWarehousePath, navigation]);

  useEffect(() => {
    if (!isExactWarehousePath) return;
    recordOfficeWarehouseEntryMountDone(
      buildRouteExtra({
        phase: "effect",
      }),
    );
    recordOfficeRouteOwnerIdentity(buildRouteExtra());
  }, [buildRouteExtra, isExactWarehousePath]);

  useFocusEffect(
    useCallback(() => {
      if (!isExactWarehousePath) return undefined;
      const focusExtra = buildRouteExtra();
      recordOfficeWarehouseEntryFocusStart(focusExtra);
      recordOfficeRouteOwnerFocus(buildRouteExtra());
      recordOfficeWarehouseEntryFocusDone(focusExtra);
      return () => {
        recordOfficeRouteOwnerBlur(buildRouteExtra());
      };
    }, [buildRouteExtra, isExactWarehousePath]),
  );

  if (!isExactWarehousePath) {
    return null;
  }

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
