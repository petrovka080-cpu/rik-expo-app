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

  const buildExtra = useCallback(
    (extra?: Record<string, unknown>): OfficeChildRouteAuditExtra & Record<string, unknown> => ({
      owner,
      route,
      pathname,
      segments: segmentsLabel,
      identity: identityRef.current,
      wrappedRoute,
      routeWrapper: "office_child_screen_entry" as const,
      ...(extra ?? {}),
    }),
    [owner, pathname, route, segmentsLabel, wrappedRoute],
  );
  const buildInitialExtra = useCallback(
    (extra?: Record<string, unknown>) =>
      buildExtra({
        pathname: initialSnapshotRef.current.pathname,
        segments: initialSnapshotRef.current.segments,
        ...(extra ?? {}),
      }),
    [buildExtra],
  );
  const buildCurrentExtra = useCallback(
    (extra?: Record<string, unknown>) =>
      buildExtra({
        pathname: pathnameRef.current,
        segments: segmentsRef.current,
        ...(extra ?? {}),
      }),
    [buildExtra],
  );
  const resolvedEntryExtra = useMemo(
    () =>
      buildExtra({
        ...(entryExtra ?? {}),
      }),
    [buildExtra, entryExtra],
  );

  useLayoutEffect(() => {
    diagnostics?.onLayoutMount?.(
      buildInitialExtra({
        phase: "layout_effect",
      }) as OfficeChildRouteAuditExtra & { phase: "layout_effect" },
    );
  }, [buildInitialExtra, diagnostics]);

  useEffect(() => {
    recordOfficeChildEntryMount(
      buildInitialExtra(),
    );
    diagnostics?.onMount?.(
      buildInitialExtra({
        phase: "effect",
      }) as OfficeChildRouteAuditExtra & { phase: "effect" },
    );

    return () => {
      const unmountExtra = buildCurrentExtra();
      recordOfficeChildUnmount(unmountExtra);
      diagnostics?.onUnmount?.(unmountExtra);
    };
  }, [buildCurrentExtra, buildInitialExtra, diagnostics]);

  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      const action =
        typeof event?.data?.action?.type === "string"
          ? event.data.action.type
          : "unknown_action";
      const beforeRemoveExtra = buildExtra({
        action,
      }) as OfficeChildRouteAuditExtra & { action: string };
      recordOfficeChildBeforeRemove(beforeRemoveExtra);
      diagnostics?.onBeforeRemove?.(beforeRemoveExtra);
    });
  }, [buildExtra, diagnostics, navigation]);

  useFocusEffect(
    useCallback(() => {
      const focusExtra = buildExtra();
      diagnostics?.onFocusStart?.(focusExtra);
      recordOfficeChildEntryFocus(focusExtra);
      diagnostics?.onFocusDone?.(focusExtra);
      return undefined;
    }, [buildExtra, diagnostics]),
  );

  return resolvedEntryExtra;
}

export function useOfficeWarehouseChildRouteAudit() {
  return useOfficeChildRouteAudit({
    owner: "office_warehouse_route",
    route: "/office/warehouse",
    wrappedRoute: "/warehouse",
    entryExtra: {
      contentOwner: "office_warehouse_route",
    },
    diagnostics: {
      onLayoutMount: recordOfficeWarehouseEntryMountStart,
      onMount: recordOfficeWarehouseEntryMountDone,
      onFocusStart: recordOfficeWarehouseEntryFocusStart,
      onFocusDone: recordOfficeWarehouseEntryFocusDone,
      onBeforeRemove: recordOfficeWarehouseBeforeRemove,
      onUnmount: recordOfficeWarehouseUnmount,
    },
  });
}
