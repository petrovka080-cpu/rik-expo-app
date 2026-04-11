import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFocusEffect, usePathname, useSegments } from "expo-router";

import OfficeHubScreen from "../../../src/screens/office/OfficeHubScreen";
import {
  clearPendingOfficeRouteReturnReceipt,
  consumePendingOfficeRouteReturnReceipt,
  recordOfficeIndexAfterReturnFocus,
  recordOfficeIndexAfterReturnMount,
  recordOfficeReentryFailure,
  recordOfficeReentryStart,
  recordOfficeRouteOwnerIdentity,
  recordOfficeRouteOwnerBlur,
  recordOfficeRouteOwnerFocus,
  recordOfficeRouteOwnerMount,
  recordOfficeRouteOwnerUnmount,
  recordOfficeRouteScopeActive,
  recordOfficeRouteScopeInactive,
  recordOfficeRouteScopeSkipReason,
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

const OFFICE_EXACT_PATH = "/office";

function getOfficeRouteScopeSkipReason(pathname: string | null | undefined) {
  if (!pathname) return "pathname_unavailable";
  if (pathname === OFFICE_EXACT_PATH) return "exact_office_path";
  return `non_exact_path:${pathname}`;
}

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
  const isExactOfficePath = pathname === OFFICE_EXACT_PATH;
  const [officeReturnReceipt, setOfficeReturnReceipt] = React.useState<Record<
    string,
    unknown
  > | null>(null);
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
  const afterReturnMountRef = useRef<Record<string, unknown> | null>(null);
  const afterReturnFocusRef = useRef<Record<string, unknown> | null>(null);
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
    if (!isExactOfficePath) {
      const reason = getOfficeRouteScopeSkipReason(pathname);
      const scopeExtra = buildRouteExtra({ reason });
      recordOfficeRouteScopeSkipReason(scopeExtra);
      recordOfficeRouteScopeInactive(scopeExtra);
      return;
    }

    const scopeExtra = buildRouteExtra();
    recordOfficeRouteScopeActive(scopeExtra);
    recordOfficeRouteOwnerIdentity(scopeExtra);
  }, [buildRouteExtra, isExactOfficePath, pathname]);

  useLayoutEffect(() => {
    if (!isExactOfficePath) return;

    recordOfficeReentryStart({
      owner: "office_index_route",
      pathname,
      segments: segmentsLabel,
      identity: identityRef.current,
      routeWrapper: "office_owned_screen_entry",
    });
    const returnReceipt = consumePendingOfficeRouteReturnReceipt();
    if (returnReceipt) {
      const afterReturnExtra = buildRouteExtra(returnReceipt);
      afterReturnMountRef.current = afterReturnExtra;
      afterReturnFocusRef.current = afterReturnExtra;
      setOfficeReturnReceipt(afterReturnExtra);
    }
  }, [buildRouteExtra, isExactOfficePath, pathname, segmentsLabel]);

  useEffect(() => {
    if (!isExactOfficePath) return;

    const afterReturnExtra = afterReturnMountRef.current;
    if (!afterReturnExtra) return;

    recordOfficeIndexAfterReturnMount(afterReturnExtra);
    afterReturnMountRef.current = null;
  }, [isExactOfficePath, pathname, segmentsLabel]);

  useFocusEffect(
    useCallback(() => {
      if (!isExactOfficePath) {
        const reason = getOfficeRouteScopeSkipReason(pathname);
        const scopeExtra = buildRouteExtra({ reason });
        recordOfficeRouteScopeSkipReason(scopeExtra);
        recordOfficeRouteScopeInactive(scopeExtra);
        return undefined;
      }

      const identity = identityRef.current;
      const afterReturnExtra = afterReturnFocusRef.current;
      if (afterReturnExtra) {
        recordOfficeIndexAfterReturnFocus(afterReturnExtra);
        afterReturnFocusRef.current = null;
        clearPendingOfficeRouteReturnReceipt(afterReturnExtra);
      }
      recordOfficeRouteOwnerFocus(buildRouteExtra());
      return () => {
        recordOfficeRouteOwnerBlur({
          owner: "office_index_route",
          route: "/office",
          pathname: pathnameRef.current,
          segments: segmentsRef.current,
          identity,
          routeWrapper: "office_owned_screen_entry",
        });
      };
    }, [buildRouteExtra, isExactOfficePath, pathname]),
  );

  return (
    <OfficeReentryCrashBoundary>
      <OfficeHubScreen
        officeReturnReceipt={officeReturnReceipt}
        routeScopeActive={isExactOfficePath}
      />
    </OfficeReentryCrashBoundary>
  );
}

export default withScreenErrorBoundary(OfficeIndexRoute, {
  screen: "office",
  route: "/office",
});
