import { useCallback, useEffect, useMemo, useRef } from "react";
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
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";

type OfficeChildRouteAuditParams = {
  owner: string;
  route: string;
  wrappedRoute: string;
};

export function useOfficeChildRouteAudit({
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
    (extra?: Record<string, unknown>) => ({
      owner,
      route,
      pathname,
      segments: segmentsLabel,
      identity: identityRef.current,
      wrappedRoute,
      routeWrapper: "office_child_screen_entry",
      ...(extra ?? {}),
    }),
    [owner, pathname, route, segmentsLabel, wrappedRoute],
  );

  useEffect(() => {
    recordOfficeChildEntryMount(
      buildExtra({
        pathname: initialSnapshotRef.current.pathname,
        segments: initialSnapshotRef.current.segments,
      }),
    );

    return () => {
      recordOfficeChildUnmount(
        buildExtra({
          pathname: pathnameRef.current,
          segments: segmentsRef.current,
        }),
      );
    };
  }, [buildExtra]);

  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      const action =
        typeof event?.data?.action?.type === "string"
          ? event.data.action.type
          : "unknown_action";
      recordOfficeChildBeforeRemove(
        buildExtra({
          action,
        }),
      );
    });
  }, [buildExtra, navigation]);

  useFocusEffect(
    useCallback(() => {
      recordOfficeChildEntryFocus(buildExtra());
      return undefined;
    }, [buildExtra]),
  );
}
