import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useSegments } from "expo-router";

import {
  recordWarehouseAsyncAbort,
  recordWarehouseCleanupError,
  recordWarehouseInteractionCleanup,
  recordWarehouseStateUpdateBlockedAfterUnmount,
  recordWarehouseSubscriptionCleanup,
  recordWarehouseTimerCleanup,
  recordWarehouseUnmountCleanupDone,
  recordWarehouseUnmountCleanupStart,
} from "../../../lib/navigation/officeReentryBreadcrumbs";

const OFFICE_WAREHOUSE_ROUTE = "/office/warehouse";

type WarehouseCleanupExtra = Record<string, unknown> | undefined;

export function useWarehouseUnmountSafety(owner: string) {
  const pathname = usePathname();
  const segments = useSegments();
  const pathnameRef = useRef(pathname);
  const segmentsLabel = useMemo(() => segments.join("/") || "none", [segments]);
  const segmentsRef = useRef(segmentsLabel);
  const mountedRef = useRef(false);
  const cleanupStartedRef = useRef(false);
  const diagnosticsEnabledRef = useRef(pathname === OFFICE_WAREHOUSE_ROUTE);

  pathnameRef.current = pathname;
  segmentsRef.current = segmentsLabel;
  if (pathname === OFFICE_WAREHOUSE_ROUTE) {
    diagnosticsEnabledRef.current = true;
  }

  const buildExtra = useCallback(
    (extra?: WarehouseCleanupExtra) => ({
      owner,
      route: OFFICE_WAREHOUSE_ROUTE,
      pathname: pathnameRef.current,
      segments: segmentsRef.current,
      routeWrapper: "warehouse_unmount_safety",
      ...(extra ?? {}),
    }),
    [owner],
  );

  const recordIfEnabled = useCallback(
    (
      recorder: (extra?: Record<string, unknown>) => void,
      extra?: WarehouseCleanupExtra,
    ) => {
      if (!diagnosticsEnabledRef.current) return;
      recorder(buildExtra(extra));
    },
    [buildExtra],
  );

  const recordErrorIfEnabled = useCallback(
    (error: unknown, errorStage: string, extra?: WarehouseCleanupExtra) => {
      if (!diagnosticsEnabledRef.current) return;
      recordWarehouseCleanupError({
        error,
        errorStage,
        extra: buildExtra(extra),
      });
    },
    [buildExtra],
  );

  useEffect(() => {
    mountedRef.current = true;
    cleanupStartedRef.current = false;

    return () => {
      cleanupStartedRef.current = true;
      recordIfEnabled(recordWarehouseUnmountCleanupStart);
      mountedRef.current = false;
      recordIfEnabled(recordWarehouseUnmountCleanupDone);
    };
  }, [recordIfEnabled]);

  const isMounted = useCallback(
    () => mountedRef.current && !cleanupStartedRef.current,
    [],
  );

  const shouldHandleAsyncResult = useCallback(
    (extra?: WarehouseCleanupExtra) => {
      if (isMounted()) return true;
      recordIfEnabled(recordWarehouseAsyncAbort, extra);
      return false;
    },
    [isMounted, recordIfEnabled],
  );

  const guardStateUpdate = useCallback(
    (apply: () => void, extra?: WarehouseCleanupExtra) => {
      if (!isMounted()) {
        recordIfEnabled(recordWarehouseStateUpdateBlockedAfterUnmount, extra);
        return false;
      }
      apply();
      return true;
    },
    [isMounted, recordIfEnabled],
  );

  const runSubscriptionCleanup = useCallback(
    (cleanup: () => void, extra?: WarehouseCleanupExtra) => {
      try {
        cleanup();
        recordIfEnabled(recordWarehouseSubscriptionCleanup, extra);
      } catch (error) {
        recordErrorIfEnabled(error, `${owner}:subscription_cleanup`, extra);
      }
    },
    [owner, recordErrorIfEnabled, recordIfEnabled],
  );

  const runTimerCleanup = useCallback(
    (cleanup: () => void, extra?: WarehouseCleanupExtra) => {
      try {
        cleanup();
        recordIfEnabled(recordWarehouseTimerCleanup, extra);
      } catch (error) {
        recordErrorIfEnabled(error, `${owner}:timer_cleanup`, extra);
      }
    },
    [owner, recordErrorIfEnabled, recordIfEnabled],
  );

  const runInteractionCleanup = useCallback(
    (cleanup: () => void, extra?: WarehouseCleanupExtra) => {
      try {
        cleanup();
        recordIfEnabled(recordWarehouseInteractionCleanup, extra);
      } catch (error) {
        recordErrorIfEnabled(error, `${owner}:interaction_cleanup`, extra);
      }
    },
    [owner, recordErrorIfEnabled, recordIfEnabled],
  );

  return {
    isMounted,
    shouldHandleAsyncResult,
    guardStateUpdate,
    runSubscriptionCleanup,
    runTimerCleanup,
    runInteractionCleanup,
    recordCleanupError: recordErrorIfEnabled,
  };
}
