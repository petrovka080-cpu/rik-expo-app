import React, { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, usePathname, useRouter, useSegments } from "expo-router";

import RoleScreenLayout from "../../../src/components/layout/RoleScreenLayout";
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
import { resolveOfficeRouteScopePlan } from "../../../src/screens/office/office.route";
import {
  buildOfficeAccessEntryCopy,
  filterOfficeWorkspaceCards,
  OFFICE_BOOTSTRAP_ROLE,
  type OfficeWorkspaceCard,
} from "../../../src/screens/office/officeAccess.model";
import { DirectionCard } from "../../../src/screens/office/officeHub.cards";
import { COPY } from "../../../src/screens/office/officeHub.constants";
import { styles as officeStyles } from "../../../src/screens/office/officeHub.styles";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

const OfficeHubScreen = React.lazy(() => import("../../../src/screens/office/OfficeHubScreen"));
const OFFICE_BOOTSTRAP_CARDS = filterOfficeWorkspaceCards({
  availableOfficeRoles: [OFFICE_BOOTSTRAP_ROLE],
  includeDirectorOwnedDirections: true,
});
const OFFICE_BOOTSTRAP_ENTRY = buildOfficeAccessEntryCopy({
  hasOfficeAccess: true,
  hasCompanyContext: true,
});

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

function OfficeInstantShell({
  onOpenOfficeCard,
}: {
  onOpenOfficeCard: (card: OfficeWorkspaceCard) => void;
}) {
  return (
    <RoleScreenLayout
      style={officeStyles.screen}
      title={OFFICE_BOOTSTRAP_ENTRY.title}
      subtitle={OFFICE_BOOTSTRAP_ENTRY.subtitle}
      contentStyle={officeStyles.fill}
    >
      <ScrollView
        contentContainerStyle={officeStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <View testID="office-section-directions" style={officeStyles.section}>
          <Text style={officeStyles.sectionTitle}>{COPY.directionsTitle}</Text>
          <Text style={officeStyles.helper}>{COPY.directionsLead}</Text>
          <View style={officeStyles.grid}>
            {OFFICE_BOOTSTRAP_CARDS.map((card) => (
              <DirectionCard
                key={card.key}
                card={card}
                canInvite={false}
                onInvite={() => undefined}
                onOpen={() => onOpenOfficeCard(card)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </RoleScreenLayout>
  );
}

function OfficeIndexRoute() {
  const pathname = usePathname();
  const router = useRouter();
  const segments = useSegments();
  const routeScopePlan = resolveOfficeRouteScopePlan(pathname);
  const isExactOfficePath = routeScopePlan.isActive;
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
  const [hydrateFullOffice, setHydrateFullOffice] = React.useState(false);
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
  const handleOpenOfficeCard = useCallback(
    (card: OfficeWorkspaceCard) => {
      if (card.route) router.push(card.route);
    },
    [router],
  );

  useEffect(() => {
    let hydrateTimeout: ReturnType<typeof setTimeout> | null = null;
    const frame = requestAnimationFrame(() => {
      hydrateTimeout = setTimeout(() => {
        setHydrateFullOffice(true);
      }, 250);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (hydrateTimeout) clearTimeout(hydrateTimeout);
    };
  }, []);

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
      const reason = routeScopePlan.skipReason ?? "pathname_unavailable";
      const scopeExtra = buildRouteExtra({ reason });
      recordOfficeRouteScopeSkipReason(scopeExtra);
      recordOfficeRouteScopeInactive(scopeExtra);
      return;
    }

    const scopeExtra = buildRouteExtra();
    recordOfficeRouteScopeActive(scopeExtra);
    recordOfficeRouteOwnerIdentity(scopeExtra);
  }, [buildRouteExtra, isExactOfficePath, pathname, routeScopePlan.skipReason]);

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
        const reason = routeScopePlan.skipReason ?? "pathname_unavailable";
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
    }, [buildRouteExtra, isExactOfficePath, routeScopePlan.skipReason]),
  );

  return (
    <OfficeReentryCrashBoundary>
      <Suspense fallback={<OfficeInstantShell onOpenOfficeCard={handleOpenOfficeCard} />}>
        {hydrateFullOffice ? (
          <OfficeHubScreen
            officeReturnReceipt={officeReturnReceipt}
            routeScopeActive={isExactOfficePath}
          />
        ) : (
          <OfficeInstantShell onOpenOfficeCard={handleOpenOfficeCard} />
        )}
      </Suspense>
    </OfficeReentryCrashBoundary>
  );
}

export default withScreenErrorBoundary(OfficeIndexRoute, {
  screen: "office",
  route: "/office",
});
