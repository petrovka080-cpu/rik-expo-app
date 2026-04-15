import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  
  
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type LayoutChangeEvent,
} from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
  type Href,
} from "expo-router";

import RoleScreenLayout from "../../components/layout/RoleScreenLayout";
import { buildAppAccessModel } from "../../lib/appAccessModel";
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
import { getProfileRoleLabel } from "../profile/profile.helpers";
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  OFFICE_ASSIGNABLE_ROLES,
  buildOfficeAccessEntryCopy,
  canManageOfficeCompanyAccess,
  filterOfficeWorkspaceCards,
  
} from "./officeAccess.model";
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
  OFFICE_FOCUS_REFRESH_TTL_MS,
  primeOfficeHubBootstrapSnapshot,
  type OfficeHubBootstrapSnapshot,
} from "./officeHubBootstrapSnapshot";
import {
  type SectionKey,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type PostReturnSectionKey,
  type CompanyPostReturnSectionKey,
  type LoadScreenMode,
  
  EMPTY_DATA,
  COPY,
  COMPANY_FIELDS,
  RULES,
  getVisibleCompanyDetails,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPostReturnSections,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shouldRenderCompanySection,
  getVisiblePostReturnSections,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  formatDate,
} from "./officeHub.constants";
import { DirectionCard, MemberCard, InviteCard } from "./officeHub.cards";
import {
  isWarehouseOfficeReturnReceipt,
  OfficePostReturnSubtreeBoundary,
  type OfficeHubScreenProps,
} from "./officeHub.helpers";
import { styles } from "./officeHub.styles";
import { useOfficePostReturnTracing } from "./useOfficePostReturnTracing";

export { __resetOfficeHubBootstrapSnapshotForTests } from "./officeHubBootstrapSnapshot";


export default function OfficeHubScreen({
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
        company.syncDraftFromData(next);
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
        if (!isMountedRef.current) return;
        if (mode === "initial") {
          setLoading(false);
          return;
        }
        if (mode === "refresh") {
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
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

      if (!ownerBootstrapCompletedRef.current) {
        const reason = initialBootstrapInFlightRef.current
          ? "bootstrap_inflight"
          : "bootstrap_pending";
        recordOfficeFocusRefreshReason({
          ...focusExtra,
          reason,
        });
        recordOfficeFocusRefreshSkipped({
          ...focusExtra,
          reason,
        });
        return () => {
          cancelPostReturnIdle();
        };
      }

      if (focusRefreshInFlightRef.current) {
        recordOfficeLoadingShellSkippedOnFocusReturn({
          ...focusExtra,
          reason: "joined_inflight",
        });
        recordOfficeFocusRefreshReason({
          ...focusExtra,
          reason: "joined_inflight",
        });
        recordOfficeFocusRefreshSkipped({
          ...focusExtra,
          reason: "joined_inflight",
        });
        return () => {
          cancelPostReturnIdle();
        };
      }

      const pendingOfficeReturnReceipt = peekPendingOfficeRouteReturnReceipt();
      const warmOfficeReturnReceipt = isWarehouseOfficeReturnReceipt(
        officeReturnReceipt,
      )
        ? officeReturnReceipt
        : pendingOfficeReturnReceipt;

      if (
        isWarehouseOfficeReturnReceipt(warmOfficeReturnReceipt) &&
        processedWarmOfficeReturnReceiptRef.current !== warmOfficeReturnReceipt
      ) {
        processedWarmOfficeReturnReceiptRef.current = warmOfficeReturnReceipt;
        const ageMs = Date.now() - lastSuccessfulLoadAtRef.current;
        const warmReturnExtra = {
          ...focusExtra,
          reason: "ttl_fresh",
          ageMs,
          ttlMs: OFFICE_FOCUS_REFRESH_TTL_MS,
          freshnessSource: "warehouse_return_receipt",
          sourceRoute: warmOfficeReturnReceipt.sourceRoute,
          target: warmOfficeReturnReceipt.target,
        };
        recordOfficeLoadingShellSkippedOnFocusReturn(warmReturnExtra);
        recordOfficeFocusRefreshReason(warmReturnExtra);
        recordOfficeFocusRefreshSkipped(warmReturnExtra);
        return () => {
          cancelPostReturnIdle();
        };
      }

      const ageMs = Date.now() - lastSuccessfulLoadAtRef.current;
      if (
        lastSuccessfulLoadAtRef.current > 0 &&
        ageMs < OFFICE_FOCUS_REFRESH_TTL_MS
      ) {
        recordOfficeLoadingShellSkippedOnFocusReturn({
          ...focusExtra,
          reason: "ttl_fresh",
          ageMs,
          ttlMs: OFFICE_FOCUS_REFRESH_TTL_MS,
        });
        recordOfficeFocusRefreshReason({
          ...focusExtra,
          reason: "ttl_fresh",
          ageMs,
          ttlMs: OFFICE_FOCUS_REFRESH_TTL_MS,
        });
        recordOfficeFocusRefreshSkipped({
          ...focusExtra,
          reason: "ttl_fresh",
          ageMs,
          ttlMs: OFFICE_FOCUS_REFRESH_TTL_MS,
        });
        return () => {
          cancelPostReturnIdle();
        };
      }

      const task = loadScreen({
        mode: "focus_refresh",
        reason: "stale_ttl",
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

  const accessModel = useMemo(
    () => buildAppAccessModel(data.accessSourceSnapshot),
    [data.accessSourceSnapshot],
  );

  const entryCopy = useMemo(
    () =>
      buildOfficeAccessEntryCopy({
        hasOfficeAccess: accessModel.hasOfficeAccess,
        hasCompanyContext: accessModel.hasCompanyContext,
      }),
    [accessModel.hasCompanyContext, accessModel.hasOfficeAccess],
  );

  const officeRoles = useMemo(
    () =>
      Array.from(
        new Set(
          [...accessModel.availableOfficeRoles, data.companyAccessRole]
            .filter((role): role is string => Boolean(role))
            .map((role) => String(role).trim().toLowerCase()),
        ),
      ),
    [accessModel.availableOfficeRoles, data.companyAccessRole],
  );

  const canManageCompany = useMemo(
    () =>
      canManageOfficeCompanyAccess({
        currentUserId: data.currentUserId,
        companyOwnerUserId: data.company?.owner_user_id,
        companyAccessRole: data.companyAccessRole,
        availableOfficeRoles: officeRoles,
      }),
    [
      data.currentUserId,
      data.company?.owner_user_id,
      data.companyAccessRole,
      officeRoles,
    ],
  );

  const officeCards = useMemo(
    () =>
      filterOfficeWorkspaceCards({
        availableOfficeRoles: officeRoles,
        includeDirectorOwnedDirections: canManageCompany,
      }),
    [canManageCompany, officeRoles],
  );

  const roleLabel = useMemo(
    () =>
      getProfileRoleLabel(
        data.companyAccessRole ||
          accessModel.activeOfficeRole ||
          data.profileRole,
      ),
    [accessModel.activeOfficeRole, data.companyAccessRole, data.profileRole],
  );

  const accessStatus = accessModel.hasOfficeAccess
    ? { label: COPY.accessReady, tone: "success" as const }
    : data.company
      ? { label: COPY.accessPending, tone: "warning" as const }
      : { label: COPY.accessClosed, tone: "neutral" as const };
  const summaryMeta = useMemo(() => {
    if (!data.company) return "";
    return [data.company.industry, data.company.phone_main, data.company.email]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" вЂў ");
  }, [data.company]);
  const visibleCompanyDetails = useMemo(
    () => getVisibleCompanyDetails(data.company),
    [data.company],
  );
  const visiblePostReturnSections = useMemo(
    () => new Set(getVisiblePostReturnSections(data, activePostReturnProbe)),
    [activePostReturnProbe, data],
  );
  const visibleRoleLabel =
    roleLabel && roleLabel !== COPY.noRole ? roleLabel : null;

  const shouldRenderCompanyPostReturnSection = useCallback(
    (section: CompanyPostReturnSectionKey) =>
      visiblePostReturnSections.has(section),
    [visiblePostReturnSections],
  );

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

  const company = useOfficeCompanySection({
    profile: data.profile,
    profileEmail: data.profileEmail,
    loadScreen,
    scrollRef,
    initialBootstrapSnapshot,
  });

  const invite = useOfficeInviteFlow({
    company: data.company,
    loadScreen,
    scrollTo,
  });

  const members = useOfficeMembersSection({
    company: data.company,
    loadScreen,
  });

  if (loading) {
    return (
      <RoleScreenLayout
        style={styles.screen}
        title={COPY.title}
        subtitle={COPY.loadingSubtitle}
        contentStyle={styles.fill}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.helper}>{COPY.loading}</Text>
        </View>
      </RoleScreenLayout>
    );
  }

  return (
    <RoleScreenLayout
      style={styles.screen}
      title={entryCopy.title}
      subtitle={data.company ? undefined : entryCopy.subtitle}
      contentStyle={styles.fill}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onLayout={handleScrollLayout}
        onContentSizeChange={handleContentSizeChange}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void loadScreen({
                mode: "refresh",
              })
            }
            tintColor="#2563EB"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {company.companyFeedback ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{company.companyFeedback}</Text>
          </View>
        ) : null}

        {data.company ? (
          <>
            {shouldRenderCompanyPostReturnSection("summary") ? (
              <View
                testID="office-summary"
                style={styles.summary}
                onLayout={handleSectionLayout("summary")}
              >
                {renderSubtreeBoundary(
                  "summary_header",
                  <View
                    style={styles.summaryHeader}
                    onLayout={handleSubtreeLayout("summary_header")}
                  >
                    <Text style={styles.eyebrow}>{COPY.summaryTitle}</Text>
                    <Pressable
                      testID="office-company-edit"
                      onPress={company.handleEditCompany}
                      style={({ pressed }) => [
                        styles.editButton,
                        pressed && styles.pressed,
                      ]}
                      accessibilityLabel={COPY.summaryEdit}
                    >
                      <Text style={styles.editButtonText}>вњЏпёЏ</Text>
                    </Pressable>
                  </View>,
                )}
                <Text style={styles.company}>{data.company.name}</Text>
                {summaryMeta
                  ? renderSubtreeBoundary(
                      "summary_meta",
                      <Text
                        style={styles.summaryMeta}
                        onLayout={handleSubtreeLayout("summary_meta")}
                      >
                        {summaryMeta}
                      </Text>,
                    )
                  : null}
                {renderSubtreeBoundary(
                  "summary_badges",
                  <View
                    style={styles.summaryBadges}
                    onLayout={handleSubtreeLayout("summary_badges")}
                  >
                    {visibleRoleLabel ? (
                      <View
                        style={[styles.summaryBadge, styles.summaryBadgeRole]}
                      >
                        <Text style={styles.summaryBadgeText}>
                          {visibleRoleLabel}
                        </Text>
                      </View>
                    ) : null}
                    <View
                      style={[
                        styles.summaryBadge,
                        accessStatus.tone === "success" &&
                          styles.summaryBadgeSuccess,
                        accessStatus.tone === "warning" &&
                          styles.summaryBadgeWarning,
                      ]}
                    >
                      <Text
                        style={[
                          styles.summaryBadgeText,
                          accessStatus.tone === "success" &&
                            styles.summaryBadgeTextSuccess,
                          accessStatus.tone === "warning" &&
                            styles.summaryBadgeTextWarning,
                        ]}
                      >
                        {accessStatus.label}
                      </Text>
                    </View>
                  </View>,
                )}
              </View>
            ) : null}

            {shouldRenderCompanyPostReturnSection("directions") ? (
              <View
                testID="office-section-directions"
                style={styles.section}
                onLayout={handleSectionLayout("directions")}
              >
                <Text style={styles.sectionTitle}>{COPY.directionsTitle}</Text>
                {renderSubtreeBoundary(
                  "directions_cards",
                  officeCards.length > 0 ? (
                    <View
                      style={styles.grid}
                      onLayout={handleSubtreeLayout("directions_cards")}
                    >
                      {officeCards.map((card) => (
                        <DirectionCard
                          key={card.key}
                          card={card}
                          canInvite={canManageCompany}
                          onOpen={() =>
                            card.route && router.push(card.route as Href)
                          }
                          onInvite={() => invite.openInviteModal(card)}
                        />
                      ))}
                    </View>
                  ) : (
                    <View
                      style={styles.panel}
                      onLayout={handleSubtreeLayout("directions_cards")}
                    >
                      <Text style={styles.helper}>{COPY.noDirections}</Text>
                    </View>
                  ),
                )}
              </View>
            ) : null}

            {shouldRenderCompanyPostReturnSection("company_details") &&
            visibleCompanyDetails.length > 0 ? (
              <View
                testID="office-section-company-details"
                style={styles.section}
                onLayout={handleSectionLayout("company_details", "company")}
              >
                <Text style={styles.sectionTitle}>
                  {COPY.companyDetailsTitle}
                </Text>
                {renderSubtreeBoundary(
                  "company_details_rows",
                  <View
                    style={styles.panel}
                    onLayout={handleSubtreeLayout("company_details_rows")}
                  >
                    {visibleCompanyDetails.map((item, index) => (
                      <View
                        key={item.label}
                        style={
                          index === visibleCompanyDetails.length - 1
                            ? styles.rowLast
                            : styles.row
                        }
                      >
                        <Text style={styles.label}>{item.label}</Text>
                        <Text style={styles.value}>{item.value}</Text>
                      </View>
                    ))}
                  </View>,
                )}
              </View>
            ) : null}

            {shouldRenderCompanyPostReturnSection("invites") ? (
              <View
                testID="office-section-invites"
                style={styles.section}
                onLayout={handleSectionLayout("invites", "invites")}
              >
                <Text style={styles.sectionTitle}>{COPY.invitesTitle}</Text>
                {invite.inviteFeedback ? (
                  <View style={styles.notice}>
                    <Text
                      testID="office-invite-feedback"
                      style={styles.noticeText}
                    >
                      {invite.inviteFeedback}
                    </Text>
                  </View>
                ) : null}
                {invite.inviteHandoff
                  ? renderSubtreeBoundary(
                      "invites_handoff",
                      <View
                        testID="office-invite-handoff"
                        style={styles.handoff}
                        onLayout={handleSubtreeLayout("invites_handoff")}
                      >
                        <Text style={styles.eyebrow}>
                          {COPY.inviteHandoffTitle}
                        </Text>
                        <Text
                          testID="office-invite-handoff-role"
                          style={styles.handoffTitle}
                        >
                          {invite.inviteHandoff.roleLabel}
                        </Text>
                        <Text style={styles.helper}>
                          {COPY.inviteHandoffLead}
                        </Text>
                        <View style={styles.panel}>
                          <View style={styles.row}>
                            <Text style={styles.label}>
                              {COPY.summaryTitle}
                            </Text>
                            <Text
                              testID="office-invite-handoff-company"
                              style={styles.value}
                            >
                              {invite.inviteHandoff.companyName}
                            </Text>
                          </View>
                          <View style={styles.row}>
                            <Text style={styles.label}>{COPY.summaryRole}</Text>
                            <Text style={styles.value}>
                              {invite.inviteHandoff.roleLabel}
                            </Text>
                          </View>
                          <View style={styles.handoffCodeBlock}>
                            <Text style={styles.label}>РљРѕРґ</Text>
                            <Text
                              testID="office-invite-handoff-code"
                              style={styles.handoffCode}
                            >
                              {invite.inviteHandoff.inviteCode}
                            </Text>
                          </View>
                          <View style={styles.rowLast}>
                            <Text style={styles.label}>
                              {COPY.inviteHandoffInstruction}
                            </Text>
                            <Text style={styles.value}>
                              {invite.inviteHandoff.instruction}
                            </Text>
                          </View>
                        </View>
                        {invite.inviteHandoffFeedback ? (
                          <View style={styles.noticeSoft}>
                            <Text
                              testID="office-invite-handoff-feedback"
                              style={styles.noticeSoftText}
                            >
                              {invite.inviteHandoffFeedback}
                            </Text>
                          </View>
                        ) : null}
                        <View style={styles.actionGrid}>
                          <Pressable
                            testID="office-invite-copy-code"
                            onPress={() =>
                              void invite.handleCopyInvite(
                                invite.inviteHandoff.inviteCode,
                                COPY.inviteCodeCopied,
                              )
                            }
                            style={[styles.secondary, styles.actionButton]}
                          >
                            <Text
                              style={[
                                styles.secondaryText,
                                styles.actionButtonText,
                              ]}
                            >
                              {COPY.inviteCopyCode}
                            </Text>
                          </Pressable>
                          <Pressable
                            testID="office-invite-copy-message"
                            onPress={() =>
                              void invite.handleCopyInvite(
                                invite.inviteHandoff.message,
                                COPY.inviteMessageCopied,
                              )
                            }
                            style={[styles.secondary, styles.actionButton]}
                          >
                            <Text
                              style={[
                                styles.secondaryText,
                                styles.actionButtonText,
                              ]}
                            >
                              {COPY.inviteCopyMessage}
                            </Text>
                          </Pressable>
                          <Pressable
                            testID="office-invite-open-whatsapp"
                            onPress={() =>
                              void invite.handleOpenInviteChannel(
                                invite.inviteHandoff.whatsappUrl,
                              )
                            }
                            style={[styles.secondary, styles.actionButton]}
                          >
                            <Text
                              style={[
                                styles.secondaryText,
                                styles.actionButtonText,
                              ]}
                            >
                              {COPY.inviteOpenWhatsapp}
                            </Text>
                          </Pressable>
                          <Pressable
                            testID="office-invite-open-telegram"
                            onPress={() =>
                              void invite.handleOpenInviteChannel(
                                invite.inviteHandoff.telegramUrl,
                              )
                            }
                            style={[styles.secondary, styles.actionButton]}
                          >
                            <Text
                              style={[
                                styles.secondaryText,
                                styles.actionButtonText,
                              ]}
                            >
                              {COPY.inviteOpenTelegram}
                            </Text>
                          </Pressable>
                          <Pressable
                            testID="office-invite-open-email"
                            onPress={() =>
                              void invite.handleOpenInviteChannel(
                                invite.inviteHandoff.emailUrl,
                              )
                            }
                            style={[styles.secondary, styles.actionButton]}
                          >
                            <Text
                              style={[
                                styles.secondaryText,
                                styles.actionButtonText,
                              ]}
                            >
                              {COPY.inviteOpenEmail}
                            </Text>
                          </Pressable>
                        </View>
                      </View>,
                    )
                  : null}
                {!canManageCompany ? (
                  <View style={styles.panel}>
                    <Text style={styles.helper}>{COPY.invitesManageHint}</Text>
                  </View>
                ) : null}
                {renderSubtreeBoundary(
                  "invites_list",
                  data.invites.length > 0 ? (
                    <View
                      style={styles.stack}
                      onLayout={handleSubtreeLayout("invites_list")}
                    >
                      {data.invites.map((invite) => (
                        <InviteCard key={invite.id} invite={invite} />
                      ))}
                    </View>
                  ) : (
                    <View
                      style={styles.panel}
                      onLayout={handleSubtreeLayout("invites_list")}
                    >
                      <Text style={styles.helper}>{COPY.noInvites}</Text>
                    </View>
                  ),
                )}
              </View>
            ) : null}

            {shouldRenderCompanyPostReturnSection("members") ? (
              <View
                testID="office-section-members"
                style={styles.section}
                onLayout={handleSectionLayout("members", "members")}
              >
                <Text style={styles.sectionTitle}>{COPY.membersTitle}</Text>
                {renderSubtreeBoundary(
                  "members_list",
                  data.members.length > 0 ? (
                    <View
                      style={styles.stack}
                      onLayout={handleSubtreeLayout("members_list")}
                    >
                      {data.members.map((member) => (
                        <MemberCard
                          key={member.userId}
                          member={member}
                          canManage={canManageCompany}
                          savingRole={members.savingRole}
                          onAssignRole={members.handleAssignRole}
                        />
                      ))}
                    </View>
                  ) : (
                    <View
                      style={styles.panel}
                      onLayout={handleSubtreeLayout("members_list")}
                    >
                      <Text style={styles.helper}>{COPY.noMembers}</Text>
                    </View>
                  ),
                )}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View
              style={styles.section}
              onLayout={handleSectionLayout("company_create", "company")}
            >
              <Text style={styles.sectionTitle}>{COPY.companyCreateTitle}</Text>
              <View style={styles.panel}>
                <Text style={styles.helper}>{COPY.companyCreateLead}</Text>
                {COMPANY_FIELDS.map((field) => (
                  <View key={field.key} style={styles.stack}>
                    <Text style={styles.label}>{field.label}</Text>
                    <TextInput
                      testID={
                        field.key === "name"
                          ? "office-company-name"
                          : field.key === "legalAddress"
                            ? "office-company-legal-address"
                            : field.key === "inn"
                              ? "office-company-inn"
                              : undefined
                      }
                      placeholder={field.placeholder}
                      placeholderTextColor="#94A3B8"
                      style={[
                        styles.input,
                        field.key === "siteAddress" && styles.textArea,
                      ]}
                      autoCapitalize={
                        field.key === "email" || field.key === "website"
                          ? "none"
                          : "sentences"
                      }
                      keyboardType={
                        field.key === "phoneMain"
                          ? "phone-pad"
                          : field.key === "email"
                            ? "email-address"
                            : "default"
                      }
                      multiline={field.key === "siteAddress"}
                      value={company.companyDraft[field.key]}
                      onChangeText={(value) =>
                        company.setCompanyDraft((current) => ({
                          ...current,
                          [field.key]: value,
                        }))
                      }
                    />
                  </View>
                ))}
                <View style={styles.stack}>
                  <View style={styles.inline}>
                    <Text style={styles.label}>Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Рµ С‚РµР»РµС„РѕРЅС‹</Text>
                    <Pressable
                      testID="office-add-company-phone"
                      onPress={() =>
                        company.setCompanyDraft((current) => ({
                          ...current,
                          additionalPhones: [...current.additionalPhones, ""],
                        }))
                      }
                    >
                      <Text style={styles.link}>Р”РѕР±Р°РІРёС‚СЊ С‚РµР»РµС„РѕРЅ</Text>
                    </Pressable>
                  </View>
                  {company.companyDraft.additionalPhones.map((phone, index) => (
                    <View key={`phone-${index}`} style={styles.phoneRow}>
                      <TextInput
                        testID={`office-company-phone-${index}`}
                        placeholder="Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Р№ С‚РµР»РµС„РѕРЅ"
                        placeholderTextColor="#94A3B8"
                        style={[styles.input, styles.phoneInput]}
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={(value) =>
                          company.setCompanyDraft((current) => ({
                            ...current,
                            additionalPhones: current.additionalPhones.map(
                              (item, itemIndex) =>
                                itemIndex === index ? value : item,
                            ),
                          }))
                        }
                      />
                      <Pressable
                        onPress={() =>
                          company.setCompanyDraft((current) => ({
                            ...current,
                            additionalPhones: current.additionalPhones.filter(
                              (_item, itemIndex) => itemIndex !== index,
                            ),
                          }))
                        }
                      >
                        <Text style={styles.linkDanger}>РЈР±СЂР°С‚СЊ</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
                <Pressable
                  testID="office-create-company"
                  disabled={company.savingCompany}
                  onPress={() => void company.handleCreateCompany()}
                  style={[styles.primary, company.savingCompany && styles.dim]}
                >
                  <Text style={styles.primaryText}>{COPY.companyCta}</Text>
                </Pressable>
              </View>
            </View>

            <View
              style={styles.section}
              onLayout={handleSectionLayout("rules")}
            >
              <Text style={styles.sectionTitle}>{COPY.rulesTitle}</Text>
              <View style={styles.panel}>
                {RULES.map((rule) => (
                  <Text key={rule} style={styles.rule}>
                    вЂў {rule}
                  </Text>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {invite.inviteCard ? (
        <Modal
          transparent
          animationType="slide"
          visible
          onRequestClose={() => invite.closeInviteModal()}
        >
          <View style={styles.modalWrap}>
            <Pressable
              style={styles.backdrop}
              onPress={() => invite.closeInviteModal()}
            />
            {renderSubtreeBoundary(
              "invite_modal_form",
              <View
                testID="office-role-invite-modal"
                style={styles.sheet}
                onLayout={handleSubtreeLayout("invite_modal_form")}
              >
                <Text style={styles.eyebrow}>{COPY.inviteModalTitle}</Text>
                <Text
                  testID="office-role-invite-role"
                  style={styles.sheetTitle}
                >
                  {invite.inviteCard?.inviteRole
                    ? getProfileRoleLabel(invite.inviteCard.inviteRole)
                    : COPY.noRole}
                </Text>
                <Text style={styles.helper}>{COPY.inviteModalLead}</Text>
                <View style={styles.stack}>
                  <Text style={styles.label}>Р¤РРћ СЃРѕС‚СЂСѓРґРЅРёРєР°</Text>
                  <TextInput
                    testID="office-invite-name"
                    placeholder="Р¤РРћ СЃРѕС‚СЂСѓРґРЅРёРєР°"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={invite.inviteDraft.name}
                    onChangeText={(value) =>
                      invite.setInviteDraft((current) => ({ ...current, name: value }))
                    }
                  />
                </View>
                <View style={styles.stack}>
                  <Text style={styles.label}>РўРµР»РµС„РѕРЅ</Text>
                  <TextInput
                    testID="office-invite-phone"
                    placeholder="РўРµР»РµС„РѕРЅ"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    keyboardType="phone-pad"
                    value={invite.inviteDraft.phone}
                    onChangeText={(value) =>
                      invite.setInviteDraft((current) => ({
                        ...current,
                        phone: value,
                      }))
                    }
                  />
                </View>
                <View style={styles.stack}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    testID="office-invite-email"
                    placeholder="Email (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={invite.inviteDraft.email}
                    onChangeText={(value) =>
                      invite.setInviteDraft((current) => ({
                        ...current,
                        email: value,
                      }))
                    }
                  />
                </View>
                <View style={styles.stack}>
                  <Text style={styles.label}>РљРѕРјРјРµРЅС‚Р°СЂРёР№</Text>
                  <TextInput
                    testID="office-invite-comment"
                    placeholder="РљРѕРјРјРµРЅС‚Р°СЂРёР№ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)"
                    placeholderTextColor="#94A3B8"
                    style={[styles.input, styles.textArea]}
                    multiline
                    value={invite.inviteDraft.comment}
                    onChangeText={(value) =>
                      invite.setInviteDraft((current) => ({
                        ...current,
                        comment: value,
                      }))
                    }
                  />
                </View>
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => invite.closeInviteModal()}
                    style={styles.secondary}
                  >
                    <Text style={styles.secondaryText}>{COPY.cancel}</Text>
                  </Pressable>
                  <Pressable
                    testID="office-create-invite"
                    disabled={invite.savingInvite}
                    onPress={() => void invite.handleCreateInvite()}
                    style={[
                      styles.primary,
                      styles.grow,
                      invite.savingInvite && styles.dim,
                    ]}
                  >
                    <Text style={styles.primaryText}>{COPY.inviteCta}</Text>
                  </Pressable>
                </View>
              </View>,
            )}
          </View>
        </Modal>
      ) : null}
    </RoleScreenLayout>
  );
}


