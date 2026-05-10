import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, type ScrollView } from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import {
  clearDeveloperEffectiveRole,
  DEVELOPER_OVERRIDE_ROLES,
  setDeveloperEffectiveRole,
  type DeveloperOverrideRole,
} from "../../lib/developerOverride";
import {
  formatOfficePostReturnProbe,
  getOfficePostReturnProbe,
  normalizeOfficePostReturnProbe,
  peekPendingOfficeRouteReturnReceipt,
  recordOfficeBootstrapInitialDone,
  recordOfficeBootstrapInitialStart,
  recordOfficeFocusRefreshDone,
  recordOfficeFocusRefreshReason,
  recordOfficeFocusRefreshSkipped,
  recordOfficeFocusRefreshStart,
  recordOfficeLoadingShellEnter,
  recordOfficeLoadingShellSkippedOnFocusReturn,
  recordOfficeReentryEffectDone,
  recordOfficeReentryEffectStart,
  recordOfficeReentryFailure,
  recordOfficePostReturnFailure,
  recordOfficePostReturnFocus,
  setOfficePostReturnProbe,
  type OfficePostReturnSubtree,
} from "../../lib/navigation/officeReentryBreadcrumbs";
import type { OfficeWorkspaceCard } from "./officeAccess.model";
import {
  loadOfficeAccessScreenData,
} from "./officeAccess.services";

import { useOfficeInviteFlow } from "./useOfficeInviteFlow";
import { useOfficeCompanySection } from "./useOfficeCompanySection";
import { useOfficeMembersSection } from "./useOfficeMembersSection";
import type {
  OfficeAccessScreenData,
} from "./officeAccess.types";
import {
  clearOfficeHubBootstrapSnapshot,
  getFreshOfficeHubBootstrapSnapshot,
  primeOfficeHubBootstrapSnapshot,
  type OfficeHubBootstrapSnapshot,
} from "./officeHubBootstrapSnapshot";
import {
  type SectionKey,
  type LoadScreenMode,
  EMPTY_DATA,
  COPY,
} from "./officeHub.constants";
import {
  OfficePostReturnSubtreeBoundary,
  type OfficeHubScreenProps,
} from "./officeHub.helpers";
import { buildOfficeShellContentModel } from "./office.layout.model";
import { resolveOfficeHubFocusRefreshPlan } from "./office.reentry";
import { useOfficeHubRoleAccess } from "./useOfficeHubRoleAccess";
import { useOfficePostReturnTracing } from "./useOfficePostReturnTracing";

export function useOfficeHubScreenController({
  officeReturnReceipt = null,
  routeScopeActive = true,
}: OfficeHubScreenProps) {
  const initialBootstrapSnapshotRef = useRef<OfficeHubBootstrapSnapshot | null>(
    getFreshOfficeHubBootstrapSnapshot(),
  );
  const initialBootstrapSnapshot = initialBootstrapSnapshotRef.current;
  const router = useRouter();
  const params = useLocalSearchParams<{
    postReturnProbe?: string | string[];
  }>();
  const requestedPostReturnProbe = useMemo(
    () => normalizeOfficePostReturnProbe(params.postReturnProbe),
    [params.postReturnProbe],
  );
  const activePostReturnProbe =
    requestedPostReturnProbe ?? getOfficePostReturnProbe();
  const postReturnProbeLabel = useMemo(
    () => formatOfficePostReturnProbe(activePostReturnProbe),
    [activePostReturnProbe],
  );
  const scrollRef = useRef<ScrollView | null>(null);
  const offsetsRef = useRef<Record<SectionKey, number>>({
    members: 0,
    invites: 0,
    company: 0,
  });
  const [data, setData] = useState<OfficeAccessScreenData>(
    () => initialBootstrapSnapshot?.data ?? EMPTY_DATA,
  );
  const [loading, setLoading] = useState(() => !initialBootstrapSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [developerRoleSaving, setDeveloperRoleSaving] = useState<string | null>(
    null,
  );

  const isMountedRef = useRef(true);
  const focusCycleRef = useRef(0);
  const ownerBootstrapCompletedRef = useRef(Boolean(initialBootstrapSnapshot));
  const initialBootstrapInFlightRef = useRef<
    Promise<OfficeAccessScreenData | null> | null
  >(null);
  const focusRefreshInFlightRef = useRef<
    Promise<OfficeAccessScreenData | null> | null
  >(null);
  const processedWarmOfficeReturnReceiptRef = useRef<Record<
    string,
    unknown
  > | null>(null);
  const lastSuccessfulLoadAtRef = useRef<number>(
    initialBootstrapSnapshot?.loadedAt ?? 0,
  );
  const companyDraftSyncRef = useRef<(next: OfficeAccessScreenData) => void>(
    () => undefined,
  );
  const disableFocusPostCommit = activePostReturnProbe.includes(
    "no_focus_post_commit",
  );

  React.useEffect(() => {
    if (requestedPostReturnProbe) {
      setOfficePostReturnProbe(requestedPostReturnProbe);
      return;
    }
    if (postReturnProbeLabel !== "all") {
      setOfficePostReturnProbe("all");
    }
  }, [postReturnProbeLabel, requestedPostReturnProbe]);

  const {
    buildPostReturnExtra,
    runObservedNativeCallback,
    recordPostReturnSubtreeStart,
    recordPostReturnSubtreeDone,
    handleSubtreeLayout,
    handleSubtreeFailure,
    cancelPostReturnIdle,
    handleSectionLayout,
    handleScrollLayout,
    handleContentSizeChange,
    startPostReturnTrace,
  } = useOfficePostReturnTracing({
    postReturnProbeLabel,
    activePostReturnProbe,
    routeScopeActive,
    focusCycleRef,
    isMountedRef,
    offsetsRef,
  });


  const loadScreen = useCallback(
    async ({
      mode = "initial",
      reason,
    }: {
      mode?: LoadScreenMode;
      reason?: string;
    } = {}) => {
      const loadExtra = buildPostReturnExtra({
        mode,
        reason,
      });

      if (mode === "initial") {
        recordOfficeBootstrapInitialStart(loadExtra);
        recordOfficeReentryEffectStart(loadExtra);
        recordOfficeLoadingShellEnter(loadExtra);
        setLoading(true);
      } else if (mode === "refresh") {
        setRefreshing(true);
      } else {
        recordOfficeFocusRefreshReason(loadExtra);
        recordOfficeLoadingShellSkippedOnFocusReturn(loadExtra);
        recordOfficeFocusRefreshStart(loadExtra);
      }

      try {
        const next = await loadOfficeAccessScreenData();
        if (!isMountedRef.current) return next;

        const loadedAt = Date.now();
        setData(next);
        companyDraftSyncRef.current(next);
        primeOfficeHubBootstrapSnapshot(next, loadedAt);

        const completionExtra = buildPostReturnExtra({
          mode,
          reason,
          companyId: next.company?.id ?? null,
          availableOfficeRoles: next.accessSourceSnapshot.companyMemberships
            .map((item) => item.role)
            .filter(Boolean)
            .join(","),
        });

        if (mode === "initial") {
          ownerBootstrapCompletedRef.current = true;
          recordOfficeReentryEffectDone(completionExtra);
          recordOfficeBootstrapInitialDone(completionExtra);
          startPostReturnTrace(next);
        } else if (mode === "focus_refresh") {
          recordOfficeFocusRefreshDone(completionExtra);
        }

        lastSuccessfulLoadAtRef.current = loadedAt;
        return next;
      } catch (error: unknown) {
        if (mode === "initial") {
          ownerBootstrapCompletedRef.current = false;
          clearOfficeHubBootstrapSnapshot();
          recordOfficeReentryFailure({
            error,
            errorStage: "load_screen",
            extra: buildPostReturnExtra({
              mode,
              reason,
            }),
          });
        } else if (mode === "focus_refresh") {
          recordOfficePostReturnFailure({
            error,
            errorStage: "focus_refresh",
            extra: buildPostReturnExtra({
              mode,
              reason,
            }),
          });
        }

        Alert.alert(
          COPY.title,
          error instanceof Error && error.message.trim()
            ? error.message
            : COPY.loadError,
        );
        return null;
      } finally {
        if (isMountedRef.current) {
          if (mode === "initial") {
            setLoading(false);
          } else if (mode === "refresh") {
            setRefreshing(false);
          }
        }
      }
    },
    [buildPostReturnExtra, startPostReturnTrace],
  );

  React.useEffect(() => {
    if (!routeScopeActive) {
      return;
    }

    if (
      ownerBootstrapCompletedRef.current ||
      initialBootstrapInFlightRef.current
    ) {
      return;
    }

    const task = loadScreen({
      mode: "initial",
      reason: "mount_bootstrap",
    }).finally(() => {
      if (initialBootstrapInFlightRef.current === task) {
        initialBootstrapInFlightRef.current = null;
      }
    });

    initialBootstrapInFlightRef.current = task;
  }, [loadScreen, routeScopeActive]);

  useFocusEffect(
    useCallback(() => {
      if (!routeScopeActive) {
        return () => {
          cancelPostReturnIdle();
        };
      }

      if (ownerBootstrapCompletedRef.current) {
        focusCycleRef.current += 1;
      }

      const focusExtra = buildPostReturnExtra({
        focusCycle: focusCycleRef.current,
      });
      const focusRefreshPlan = resolveOfficeHubFocusRefreshPlan({
        routeScopeActive,
        ownerBootstrapCompleted: ownerBootstrapCompletedRef.current,
        initialBootstrapInFlight: Boolean(initialBootstrapInFlightRef.current),
        focusRefreshInFlight: Boolean(focusRefreshInFlightRef.current),
        officeReturnReceipt,
        pendingOfficeReturnReceipt: peekPendingOfficeRouteReturnReceipt(),
        processedWarmOfficeReturnReceipt:
          processedWarmOfficeReturnReceiptRef.current,
        lastSuccessfulLoadAt: lastSuccessfulLoadAtRef.current,
      });

      if (!disableFocusPostCommit) {
        runObservedNativeCallback({
          callback: "useFocusEffect",
          phase: "focus",
          run: () => {
            recordPostReturnSubtreeStart("focus_effect_callback");
            recordOfficePostReturnFocus(focusExtra);
            recordPostReturnSubtreeDone("focus_effect_callback");
          },
        });
      }

      if (focusRefreshPlan.kind === "scope_inactive") {
        return () => {
          cancelPostReturnIdle();
        };
      }

      if (focusRefreshPlan.kind === "bootstrap_pending") {
        recordOfficeFocusRefreshReason({
          ...focusExtra,
          reason: focusRefreshPlan.reason,
        });
        recordOfficeFocusRefreshSkipped({
          ...focusExtra,
          reason: focusRefreshPlan.reason,
        });
        return () => {
          cancelPostReturnIdle();
        };
      }

      if (focusRefreshPlan.kind === "joined_inflight") {
        recordOfficeLoadingShellSkippedOnFocusReturn({
          ...focusExtra,
          reason: focusRefreshPlan.reason,
        });
        recordOfficeFocusRefreshReason({
          ...focusExtra,
          reason: focusRefreshPlan.reason,
        });
        recordOfficeFocusRefreshSkipped({
          ...focusExtra,
          reason: focusRefreshPlan.reason,
        });
        return () => {
          cancelPostReturnIdle();
        };
      }

      if (focusRefreshPlan.kind === "skip_refresh") {
        if (focusRefreshPlan.receipt) {
          processedWarmOfficeReturnReceiptRef.current = focusRefreshPlan.receipt;
        }
        const skippedExtra = focusRefreshPlan.freshnessSource
          ? {
              ...focusExtra,
              reason: focusRefreshPlan.reason,
              ageMs: focusRefreshPlan.ageMs,
              ttlMs: focusRefreshPlan.ttlMs,
              freshnessSource: focusRefreshPlan.freshnessSource,
              sourceRoute: focusRefreshPlan.sourceRoute,
              target: focusRefreshPlan.target,
            }
          : {
              ...focusExtra,
              reason: focusRefreshPlan.reason,
              ageMs: focusRefreshPlan.ageMs,
              ttlMs: focusRefreshPlan.ttlMs,
            };
        recordOfficeLoadingShellSkippedOnFocusReturn(skippedExtra);
        recordOfficeFocusRefreshReason(skippedExtra);
        recordOfficeFocusRefreshSkipped(skippedExtra);
        return () => {
          cancelPostReturnIdle();
        };
      }

      const task = loadScreen({
        mode: "focus_refresh",
        reason: focusRefreshPlan.reason,
      }).finally(() => {
        if (focusRefreshInFlightRef.current === task) {
          focusRefreshInFlightRef.current = null;
        }
      });

      focusRefreshInFlightRef.current = task;

      return () => {
        cancelPostReturnIdle();
      };
    }, [
      buildPostReturnExtra,
      cancelPostReturnIdle,
      disableFocusPostCommit,
      loadScreen,
      officeReturnReceipt,
      recordPostReturnSubtreeDone,
      recordPostReturnSubtreeStart,
      routeScopeActive,
      runObservedNativeCallback,
    ]),
  );

  const access = useOfficeHubRoleAccess(data, activePostReturnProbe);

  const renderSubtreeBoundary = useCallback(
    (subtree: OfficePostReturnSubtree, children: React.ReactNode) => (
      <OfficePostReturnSubtreeBoundary
        key={subtree}
        onMount={() => recordPostReturnSubtreeStart(subtree)}
        onError={(error, info) => handleSubtreeFailure(subtree, error, info)}
      >
        {children}
      </OfficePostReturnSubtreeBoundary>
    ),
    [handleSubtreeFailure, recordPostReturnSubtreeStart],
  );

  const scrollTo = useCallback((key: SectionKey) => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, offsetsRef.current[key] - 12),
      animated: true,
    });
  }, []);

  const handleOpenOfficeCard = useCallback(
    (card: OfficeWorkspaceCard) => {
      if (card.route) {
        router.push(card.route);
      }
    },
    [router],
  );

  const company = useOfficeCompanySection({
    profile: data.profile,
    profileEmail: data.profileEmail,
    loadScreen,
    scrollRef,
    initialBootstrapSnapshot,
  });
  companyDraftSyncRef.current = company.syncDraftFromData;

  const invite = useOfficeInviteFlow({
    company: data.company,
    loadScreen,
    scrollTo,
  });

  const members = useOfficeMembersSection({
    company: data.company,
    initialMembers: data.members,
    initialMembersPagination: data.membersPagination,
    loadScreen,
  });

  const developerOverride = data.developerOverride;
  const developerOverrideRoles = useMemo(
    () =>
      DEVELOPER_OVERRIDE_ROLES.filter((role) =>
        developerOverride?.allowedRoles.includes(role),
      ),
    [developerOverride?.allowedRoles],
  );
  const handleDeveloperRoleSelect = useCallback(
    async (role: DeveloperOverrideRole) => {
      setDeveloperRoleSaving(role);
      try {
        await setDeveloperEffectiveRole(role);
        await loadScreen({
          mode: "refresh",
          reason: "developer_override_role_selected",
        });
      } catch (error) {
        Alert.alert(
          "Dev override",
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        setDeveloperRoleSaving(null);
      }
    },
    [loadScreen],
  );
  const handleDeveloperRoleClear = useCallback(async () => {
    setDeveloperRoleSaving("normal");
    try {
      await clearDeveloperEffectiveRole();
      await loadScreen({
        mode: "refresh",
        reason: "developer_override_cleared",
      });
    } catch (error) {
      Alert.alert(
        "Dev override",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setDeveloperRoleSaving(null);
    }
  }, [loadScreen]);

  const shellModel = useMemo(
    () =>
      buildOfficeShellContentModel({
        loading,
        data,
        access,
        companyFeedback: company.companyFeedback,
      }),
    [access, company.companyFeedback, data, loading],
  );
  const handleRefresh = useCallback(() => {
    void loadScreen({
      mode: "refresh",
    });
  }, [loadScreen]);

  return {
    model: shellModel,
    data,
    access,
    company,
    invite,
    members,
    scrollRef,
    refreshing,
    developerRoleSaving,
    developerOverrideRoles,
    onRefresh: handleRefresh,
    onOpenOfficeCard: handleOpenOfficeCard,
    onDeveloperRoleSelect: (role: DeveloperOverrideRole) => void handleDeveloperRoleSelect(role),
    onDeveloperRoleClear: () => void handleDeveloperRoleClear(),
    onSectionLayout: handleSectionLayout,
    onSubtreeLayout: handleSubtreeLayout,
    onScrollLayout: handleScrollLayout,
    onContentSizeChange: handleContentSizeChange,
    renderSubtreeBoundary,
  };
}

export type OfficeHubScreenController = ReturnType<typeof useOfficeHubScreenController>;
