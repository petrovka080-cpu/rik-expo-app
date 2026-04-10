import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  useFocusEffect,
  useNavigation,
  usePathname,
  useSegments,
} from "expo-router";

import {
  recordOfficeChildBeforeRemove,
  recordOfficeChildEntryFocus,
  recordOfficeChildEntryMount,
  recordOfficeChildUnmount,
  recordOfficeWarehouseBeforeRemove,
  recordOfficeWarehouseEntryFocusDone,
  recordOfficeWarehouseEntryFocusStart,
  recordOfficeWarehouseEntryMountDone,
  recordOfficeWarehouseEntryMountStart,
  recordOfficeWarehouseUnmount,
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";

type OfficeChildRouteAuditExtra = {
  owner: string;
  route: string;
  pathname: string;
  segments: string;
  identity: string;
  wrappedRoute: string;
  routeWrapper: "office_child_screen_entry";
};

type OfficeChildRouteDiagnostics = {
  onBeforeRemove?: (extra: OfficeChildRouteAuditExtra & { action: string }) => void;
  onFocusDone?: (extra: OfficeChildRouteAuditExtra) => void;
  onFocusStart?: (extra: OfficeChildRouteAuditExtra) => void;
  onLayoutMount?: (extra: OfficeChildRouteAuditExtra & { phase: "layout_effect" }) => void;
  onMount?: (extra: OfficeChildRouteAuditExtra & { phase: "effect" }) => void;
  onUnmount?: (extra: OfficeChildRouteAuditExtra) => void;
};

type OfficeChildRouteAuditParams = {
  diagnostics?: OfficeChildRouteDiagnostics;
  entryExtra?: Record<string, unknown>;
  owner: string;
  route: string;
  wrappedRoute: string;
};

function buildOfficeChildRouteAuditExtra(params: {
  extra?: Record<string, unknown>;
  identity: string;
  owner: string;
  pathname: string;
  route: string;
  segments: string;
  wrappedRoute: string;
}): OfficeChildRouteAuditExtra & Record<string, unknown> {
  return {
    owner: params.owner,
    route: params.route,
    pathname: params.pathname,
    segments: params.segments,
    identity: params.identity,
    wrappedRoute: params.wrappedRoute,
    routeWrapper: "office_child_screen_entry",
    ...(params.extra ?? {}),
  };
}

export function useOfficeChildRouteAudit({
  diagnostics,
  entryExtra,
  owner,
  route,
  wrappedRoute,
}: OfficeChildRouteAuditParams) {
  const navigation = useNavigation();
  const pathname = usePathname();
  const segments = useSegments();
  const identityRef = useRef(
    `${owner}:${Math.random().toString(36).slice(2, 10)}`,
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
  const diagnosticsRef = useRef(diagnostics);
  diagnosticsRef.current = diagnostics;

  const buildExtra = useCallback(
    (
      snapshot: { pathname: string; segments: string },
      extra?: Record<string, unknown>,
    ): OfficeChildRouteAuditExtra & Record<string, unknown> =>
      buildOfficeChildRouteAuditExtra({
        owner,
        route,
        pathname: snapshot.pathname,
        segments: snapshot.segments,
        identity: identityRef.current,
        wrappedRoute,
        extra,
      }),
    [owner, route, wrappedRoute],
  );
  const buildInitialExtra = useCallback(
    (extra?: Record<string, unknown>) =>
      buildExtra(initialSnapshotRef.current, extra),
    [buildExtra],
  );
  const buildCurrentExtra = useCallback(
    (extra?: Record<string, unknown>) =>
      buildExtra({
        pathname: pathnameRef.current,
        segments: segmentsRef.current,
      }, extra),
    [buildExtra],
  );
  const resolvedEntryExtra = useMemo(
    () =>
      buildExtra({
        pathname: initialSnapshotRef.current.pathname,
        segments: initialSnapshotRef.current.segments,
      }, entryExtra),
    [buildExtra, entryExtra],
  );

  useLayoutEffect(() => {
    diagnosticsRef.current?.onLayoutMount?.(
      buildInitialExtra({
        phase: "layout_effect",
      }) as OfficeChildRouteAuditExtra & { phase: "layout_effect" },
    );
  }, [buildInitialExtra]);

  useEffect(() => {
    recordOfficeChildEntryMount(
      buildInitialExtra(),
    );
    diagnosticsRef.current?.onMount?.(
      buildInitialExtra({
        phase: "effect",
      }) as OfficeChildRouteAuditExtra & { phase: "effect" },
    );

    return () => {
      const unmountExtra = buildCurrentExtra();
      recordOfficeChildUnmount(unmountExtra);
      diagnosticsRef.current?.onUnmount?.(unmountExtra);
    };
  }, [buildCurrentExtra, buildInitialExtra]);

  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      const action =
        typeof event?.data?.action?.type === "string"
          ? event.data.action.type
          : "unknown_action";
      const beforeRemoveExtra = buildCurrentExtra({
        action,
      }) as OfficeChildRouteAuditExtra & { action: string };
      recordOfficeChildBeforeRemove(beforeRemoveExtra);
      diagnosticsRef.current?.onBeforeRemove?.(beforeRemoveExtra);
    });
  }, [buildCurrentExtra, navigation]);

  useFocusEffect(
    useCallback(() => {
      const focusExtra = buildCurrentExtra();
      diagnosticsRef.current?.onFocusStart?.(focusExtra);
      recordOfficeChildEntryFocus(focusExtra);
      diagnosticsRef.current?.onFocusDone?.(focusExtra);
      return undefined;
    }, [buildCurrentExtra]),
  );

  return resolvedEntryExtra;
}

export function useOfficeWarehouseChildRouteAudit() {
  const warehouseEntryExtra = useMemo(
    () => ({
      contentOwner: "office_warehouse_route",
    }),
    [],
  );
  const warehouseDiagnostics = useMemo<OfficeChildRouteDiagnostics>(
    () => ({
      onLayoutMount: recordOfficeWarehouseEntryMountStart,
      onMount: recordOfficeWarehouseEntryMountDone,
      onFocusStart: recordOfficeWarehouseEntryFocusStart,
      onFocusDone: recordOfficeWarehouseEntryFocusDone,
      onBeforeRemove: recordOfficeWarehouseBeforeRemove,
      onUnmount: recordOfficeWarehouseUnmount,
    }),
    [],
  );

  return useOfficeChildRouteAudit({
    owner: "office_warehouse_route",
    route: "/office/warehouse",
    wrappedRoute: "/warehouse",
    entryExtra: warehouseEntryExtra,
    diagnostics: warehouseDiagnostics,
  });
}
