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
} from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
  type Href,
} from "expo-router";

import RoleScreenLayout from "../../components/layout/RoleScreenLayout";
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
import { getProfileRoleLabel } from "../profile/profile.helpers";
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
  OFFICE_FOCUS_REFRESH_TTL_MS,
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
  isWarehouseOfficeReturnReceipt,
  OfficePostReturnSubtreeBoundary,
  type OfficeHubScreenProps,
} from "./officeHub.helpers";
import {
  OfficeCompanyDetailsSection,
  OfficeCompanySummarySection,
  OfficeHubCompanyCreateRootSection,
  OfficeInvitesSection,
  OfficeMembersSection,
  OfficeRoleDirectionsSection,
} from "./officeHub.sections";
import { styles } from "./officeHub.styles";
import { useOfficeHubRoleAccess } from "./useOfficeHubRoleAccess";
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
        router.push(card.route as Href);
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

  const invite = useOfficeInviteFlow({
    company: data.company,
    loadScreen,
    scrollTo,
  });

  const members = useOfficeMembersSection({
    company: data.company,
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
        await loadScreen({ mode: "refresh", reason: "developer_override_role_selected" });
      } catch (error) {
        Alert.alert("Dev override", error instanceof Error ? error.message : String(error));
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
      await loadScreen({ mode: "refresh", reason: "developer_override_cleared" });
    } catch (error) {
      Alert.alert("Dev override", error instanceof Error ? error.message : String(error));
    } finally {
      setDeveloperRoleSaving(null);
    }
  }, [loadScreen]);

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
      title={access.entryCopy.title}
      subtitle={data.company ? undefined : access.entryCopy.subtitle}
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

        {developerOverride?.isEnabled ? (
          <View testID="developer-override-panel" style={styles.devPanel}>
            <View style={styles.inline}>
              <View style={styles.grow}>
                <Text style={styles.eyebrow}>Dev override</Text>
                <Text style={styles.helper}>
                  Active role: {developerOverride.activeEffectiveRole ?? "normal"}
                </Text>
              </View>
              <Pressable
                testID="developer-override-clear"
                disabled={Boolean(developerRoleSaving)}
                onPress={handleDeveloperRoleClear}
                style={({ pressed }) => [
                  styles.secondary,
                  styles.devRoleButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryText}>Normal</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {developerOverrideRoles.map((role) => {
                const active = developerOverride.activeEffectiveRole === role;
                return (
                  <Pressable
                    key={role}
                    testID={`developer-override-role-${role}`}
                    disabled={Boolean(developerRoleSaving) || active}
                    onPress={() => handleDeveloperRoleSelect(role)}
                    style={[
                      styles.chip,
                      active && styles.chipActive,
                      styles.devRoleButton,
                    ]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {getProfileRoleLabel(role)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {data.company ? (
          <>
            <OfficeCompanySummarySection
              access={access}
              company={data.company}
              companySection={company}
              onSectionLayout={handleSectionLayout}
              onSubtreeLayout={handleSubtreeLayout}
              renderSubtreeBoundary={renderSubtreeBoundary}
            />
            <OfficeRoleDirectionsSection
              access={access}
              invite={invite}
              onOpenCard={handleOpenOfficeCard}
              onSectionLayout={handleSectionLayout}
              onSubtreeLayout={handleSubtreeLayout}
              renderSubtreeBoundary={renderSubtreeBoundary}
            />
            <OfficeCompanyDetailsSection
              access={access}
              onSectionLayout={handleSectionLayout}
              onSubtreeLayout={handleSubtreeLayout}
              renderSubtreeBoundary={renderSubtreeBoundary}
            />
            <OfficeInvitesSection
              access={access}
              data={data}
              invite={invite}
              onSectionLayout={handleSectionLayout}
              onSubtreeLayout={handleSubtreeLayout}
              renderSubtreeBoundary={renderSubtreeBoundary}
            />
            <OfficeMembersSection
              access={access}
              data={data}
              members={members}
              onSectionLayout={handleSectionLayout}
              onSubtreeLayout={handleSubtreeLayout}
              renderSubtreeBoundary={renderSubtreeBoundary}
            />
          </>
        ) : (
          <OfficeHubCompanyCreateRootSection
            company={company}
            onSectionLayout={handleSectionLayout}
          />
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
                  <Text style={styles.label}>ФИО сотрудника</Text>
                  <TextInput
                    testID="office-invite-name"
                    placeholder="ФИО сотрудника"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={invite.inviteDraft.name}
                    onChangeText={(value) =>
                      invite.setInviteDraft((current) => ({ ...current, name: value }))
                    }
                  />
                </View>
                <View style={styles.stack}>
                  <Text style={styles.label}>Телефон</Text>
                  <TextInput
                    testID="office-invite-phone"
                    placeholder="Телефон"
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
                    placeholder="Email (необязательно)"
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
                  <Text style={styles.label}>Комментарий</Text>
                  <TextInput
                    testID="office-invite-comment"
                    placeholder="Комментарий (необязательно)"
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
