import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";

import { buildAppAccessModel } from "../../lib/appAccessModel";
import RoleScreenLayout from "../../components/layout/RoleScreenLayout";
import {
  getProfileDisplayName,
  getProfileRoleLabel,
} from "../profile/profile.helpers";
import {
  OFFICE_ASSIGNABLE_ROLES,
  buildOfficeAccessEntryCopy,
  canManageOfficeCompanyAccess,
  filterOfficeWorkspaceCards,
  joinOfficeRoleLabels,
} from "./officeAccess.model";
import {
  createOfficeCompany,
  createOfficeInvite,
  loadOfficeAccessScreenData,
  updateOfficeMemberRole,
} from "./officeAccess.services";
import type {
  CreateCompanyDraft,
  CreateInviteDraft,
  OfficeAccessInvite,
  OfficeAccessMember,
  OfficeAccessScreenData,
} from "./officeAccess.types";

const EMPTY_PROFILE = {
  id: "",
  user_id: "",
  full_name: null,
  phone: null,
  city: null,
  usage_market: true,
  usage_build: false,
};

const EMPTY_DATA: OfficeAccessScreenData = {
  currentUserId: "",
  profile: EMPTY_PROFILE,
  profileEmail: null,
  profileRole: null,
  company: null,
  companyAccessRole: null,
  accessSourceSnapshot: {
    userId: null,
    authRole: null,
    resolvedRole: null,
    usageMarket: true,
    usageBuild: false,
    ownedCompanyId: null,
    companyMemberships: [],
    listingsCount: 0,
  },
  members: [],
  invites: [],
};

const EMPTY_COMPANY_DRAFT: CreateCompanyDraft = {
  name: "",
  city: "",
  industry: "",
  phoneMain: "",
  email: "",
};

const EMPTY_INVITE_DRAFT: CreateInviteDraft = {
  name: "",
  phone: "",
  email: "",
  role: "buyer",
  comment: "",
};

const COPY = {
  alertTitle: "Office и компания",
  loadingSubtitle: "Открываем доступ к компании и Office",
  loadingState: "Загружаем контур доступа...",
  loadError: "Не удалось открыть контур компании и Office.",
  noValue: "Не указано",
  noAccess: "Нет",
  yesAccess: "Есть",
  companyCreated:
    "Компания создана. Office access открыт, стартовая роль — директор.",
  companyCreateError: "Не удалось создать компанию.",
  inviteCreatedTitle: "Приглашение создано",
  inviteCreatedMessage:
    "Роль не выдаётся автоматически. Сотрудник получит её только через invite.",
  inviteCreateError: "Не удалось создать приглашение.",
  roleAssignError: "Не удалось назначить роль.",
  heroText:
    "Profile здесь больше не управляет компанией. Этот экран владеет bootstrap, приглашениями, ролями и входом в Office.",
  bootstrapTitle: "Bootstrap rules",
  accessSummaryTitle: "Access summary",
  officeRolesLabel: "Рабочие роли",
  currentRoleLabel: "Текущая роль",
  companyTitle: "Компания",
  companyName: "Название",
  companyCity: "Город",
  companyIndustry: "Сфера",
  companyAccess: "Ваш доступ",
  companyIsolationHint:
    "Компания и memberships живут отдельно от profile identity.",
  companyCreateTitle: "Создать компанию",
  companyCreateHint:
    "У обычной регистрации нет office roles. Создание компании впервые откроет Office access и назначит только роль директора.",
  companyNamePlaceholder: "Название компании",
  companyCityPlaceholder: "Город",
  companyIndustryPlaceholder: "Сфера",
  companyPhonePlaceholder: "Телефон компании",
  companyEmailPlaceholder: "Email компании",
  companyCreateCta: "Создать компанию и получить роль директора",
  membersTitle: "Сотрудники и membership",
  noMemberships: "Пока нет подтверждённых memberships для этой компании.",
  invitesTitle: "Приглашения и роли",
  invitesHint:
    "Роли не выдаются автоматически. Каждая новая роль появляется только через invite или явное назначение.",
  inviteNamePlaceholder: "Имя сотрудника",
  invitePhonePlaceholder: "Телефон",
  inviteEmailPlaceholder: "Email (необязательно)",
  inviteCommentPlaceholder: "Комментарий (необязательно)",
  inviteCreateCta: "Создать invite",
  inviteManageHint:
    "Приглашения и назначение ролей доступны владельцу компании или директору.",
  noInvites: "Активных приглашений пока нет.",
  workspaceTitle: "Рабочий Office",
  noWorkspaceRole:
    "Office access уже открыт, но рабочая роль ещё не назначена. Вход в ERP-экраны появится после invite или explicit assignment.",
  noOfficeAccess:
    "Сначала создайте компанию или получите приглашение. Office access не появляется сам по себе после регистрации.",
  memberRoleLabel: "Роль",
  memberOwnerSuffix: " • владелец компании",
  memberPhoneLabel: "Телефон",
  memberAddedLabel: "Добавлен",
  inviteCodeLabel: "Код",
  inviteStatusLabel: "Статус",
  inviteCreatedLabel: "Создано",
} as const;

const BOOTSTRAP_RULES = [
  "Обычная регистрация не выдаёт office roles автоматически.",
  "Первое создание компании открывает Office access и назначает только роль директора.",
  "Остальные роли появляются только через invite или явное назначение.",
] as const;

function formatDate(value: string | null): string {
  if (!value) return COPY.noValue;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ru-RU");
}

function SummaryRow(props: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, props.last && styles.summaryRowLast]}>
      <Text style={styles.summaryLabel}>{props.label}</Text>
      <Text style={styles.summaryValue}>{props.value}</Text>
    </View>
  );
}

function MemberCard(props: {
  member: OfficeAccessMember;
  canManage: boolean;
  saving: boolean;
  onAssignRole: (memberUserId: string, nextRole: string) => void;
}) {
  return (
    <View style={styles.entityCard}>
      <Text style={styles.entityTitle}>
        {props.member.fullName?.trim() || props.member.userId}
      </Text>
      <Text style={styles.entityMeta}>
        {COPY.memberRoleLabel}: {getProfileRoleLabel(props.member.role)}
        {props.member.isOwner ? COPY.memberOwnerSuffix : ""}
      </Text>
      {props.member.phone ? (
        <Text style={styles.entityMeta}>
          {COPY.memberPhoneLabel}: {props.member.phone}
        </Text>
      ) : null}
      <Text style={styles.entityMeta}>
        {COPY.memberAddedLabel}: {formatDate(props.member.createdAt)}
      </Text>

      {props.canManage && !props.member.isOwner ? (
        <View style={styles.roleChipRow}>
          {OFFICE_ASSIGNABLE_ROLES.map((role) => {
            const active = props.member.role === role;
            return (
              <Pressable
                key={`${props.member.userId}-${role}`}
                testID={`office-member-role-${props.member.userId}-${role}`}
                style={[
                  styles.roleChip,
                  active && styles.roleChipActive,
                  props.saving && styles.roleChipDisabled,
                ]}
                disabled={props.saving || active}
                onPress={() => props.onAssignRole(props.member.userId, role)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    active && styles.roleChipTextActive,
                  ]}
                >
                  {getProfileRoleLabel(role)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function InviteCard(props: { invite: OfficeAccessInvite }) {
  return (
    <View style={styles.entityCard}>
      <Text style={styles.entityTitle}>{props.invite.name}</Text>
      <Text style={styles.entityMeta}>
        {COPY.memberRoleLabel}: {getProfileRoleLabel(props.invite.role)}
      </Text>
      <Text style={styles.entityMeta}>
        {COPY.memberPhoneLabel}: {props.invite.phone}
      </Text>
      {props.invite.email ? (
        <Text style={styles.entityMeta}>Email: {props.invite.email}</Text>
      ) : null}
      <Text style={styles.entityMeta}>
        {COPY.inviteCodeLabel}: {props.invite.inviteCode}
      </Text>
      <Text style={styles.entityMeta}>
        {COPY.inviteStatusLabel}: {props.invite.status}
      </Text>
      <Text style={styles.entityMeta}>
        {COPY.inviteCreatedLabel}: {formatDate(props.invite.createdAt)}
      </Text>
    </View>
  );
}

export default function OfficeHubScreen() {
  const router = useRouter();
  const [data, setData] = useState<OfficeAccessScreenData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [companyDraft, setCompanyDraft] =
    useState<CreateCompanyDraft>(EMPTY_COMPANY_DRAFT);
  const [inviteDraft, setInviteDraft] =
    useState<CreateInviteDraft>(EMPTY_INVITE_DRAFT);

  const loadScreen = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const next = await loadOfficeAccessScreenData();
        setData(next);
        setCompanyDraft((current) => ({
          ...current,
          phoneMain: current.phoneMain || next.profile.phone || "",
          email: current.email || next.profileEmail || "",
          city: current.city || next.profile.city || "",
        }));
      } catch (error: unknown) {
        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : COPY.loadError;
        Alert.alert(COPY.alertTitle, message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadScreen();
    }, [loadScreen]),
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

  const displayName = useMemo(
    () =>
      getProfileDisplayName({
        fullName: data.profile.full_name,
        email: data.profileEmail,
        companyName: data.company?.name,
        userId: data.profile.user_id,
      }),
    [
      data.company?.name,
      data.profile.full_name,
      data.profile.user_id,
      data.profileEmail,
    ],
  );

  const officeRolesLabel = useMemo(
    () => joinOfficeRoleLabels(accessModel.availableOfficeRoles),
    [accessModel.availableOfficeRoles],
  );

  const officeCards = useMemo(
    () => filterOfficeWorkspaceCards(accessModel.availableOfficeRoles),
    [accessModel.availableOfficeRoles],
  );
  const currentOfficeRoleLabel = useMemo(() => {
    const role =
      data.companyAccessRole || accessModel.activeOfficeRole || data.profileRole;
    return role ? getProfileRoleLabel(role) : COPY.noAccess;
  }, [
    accessModel.activeOfficeRole,
    data.companyAccessRole,
    data.profileRole,
  ]);

  const canManageCompany = useMemo(
    () =>
      canManageOfficeCompanyAccess({
        currentUserId: data.currentUserId,
        companyOwnerUserId: data.company?.owner_user_id,
        companyAccessRole: data.companyAccessRole,
        availableOfficeRoles: accessModel.availableOfficeRoles,
      }),
    [
      accessModel.availableOfficeRoles,
      data.company?.owner_user_id,
      data.companyAccessRole,
      data.currentUserId,
    ],
  );

  const handleCreateCompany = useCallback(async () => {
    try {
      setSavingCompany(true);
      await createOfficeCompany({
        profile: data.profile,
        profileEmail: data.profileEmail,
        draft: companyDraft,
      });
      Alert.alert(COPY.alertTitle, COPY.companyCreated);
      setCompanyDraft(EMPTY_COMPANY_DRAFT);
      await loadScreen("refresh");
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : COPY.companyCreateError;
      Alert.alert(COPY.alertTitle, message);
    } finally {
      setSavingCompany(false);
    }
  }, [companyDraft, data.profile, data.profileEmail, loadScreen]);

  const handleCreateInvite = useCallback(async () => {
    if (!data.company) return;
    try {
      setSavingInvite(true);
      await createOfficeInvite({
        companyId: data.company.id,
        draft: inviteDraft,
      });
      Alert.alert(COPY.inviteCreatedTitle, COPY.inviteCreatedMessage);
      setInviteDraft(EMPTY_INVITE_DRAFT);
      await loadScreen("refresh");
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : COPY.inviteCreateError;
      Alert.alert(COPY.alertTitle, message);
    } finally {
      setSavingInvite(false);
    }
  }, [data.company, inviteDraft, loadScreen]);

  const handleAssignRole = useCallback(
    async (memberUserId: string, nextRole: string) => {
      if (!data.company) return;
      try {
        setSavingRole(`${memberUserId}:${nextRole}`);
        await updateOfficeMemberRole({
          companyId: data.company.id,
          memberUserId,
          nextRole,
        });
        await loadScreen("refresh");
      } catch (error: unknown) {
        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : COPY.roleAssignError;
        Alert.alert(COPY.alertTitle, message);
      } finally {
        setSavingRole(null);
      }
    },
    [data.company, loadScreen],
  );

  if (loading) {
    return (
      <RoleScreenLayout
        style={styles.screen}
        title={COPY.alertTitle}
        subtitle={COPY.loadingSubtitle}
        contentStyle={styles.content}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.stateText}>{COPY.loadingState}</Text>
        </View>
      </RoleScreenLayout>
    );
  }

  return (
    <RoleScreenLayout
      style={styles.screen}
      title={COPY.alertTitle}
      subtitle={entryCopy.subtitle}
      contentStyle={styles.content}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadScreen("refresh")}
            tintColor="#2563EB"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>{entryCopy.title}</Text>
          <Text style={styles.heroTitle}>{displayName}</Text>
          <Text style={styles.heroText}>{COPY.heroText}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{COPY.bootstrapTitle}</Text>
          <View style={styles.sectionCard}>
            {BOOTSTRAP_RULES.map((rule) => (
              <Text key={rule} style={styles.ruleText}>
                {"\u2022"} {rule}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{COPY.accessSummaryTitle}</Text>
          <View style={styles.sectionCard}>
            <SummaryRow
              label="Market access"
              value={accessModel.hasMarketAccess ? COPY.yesAccess : COPY.noAccess}
            />
            <SummaryRow
              label="Office access"
              value={accessModel.hasOfficeAccess ? COPY.yesAccess : COPY.noAccess}
            />
            <SummaryRow
              label="Company context"
              value={
                data.company?.name ||
                (accessModel.hasCompanyContext ? COPY.yesAccess : COPY.noAccess)
              }
            />
            <SummaryRow label={COPY.officeRolesLabel} value={officeRolesLabel} />
            <SummaryRow
              label={COPY.currentRoleLabel}
              value={currentOfficeRoleLabel}
              last
            />
          </View>
        </View>

        {data.company ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{COPY.companyTitle}</Text>
            <View style={styles.sectionCard}>
              <SummaryRow label={COPY.companyName} value={data.company.name} />
              <SummaryRow
                label={COPY.companyCity}
                value={data.company.city || COPY.noValue}
              />
              <SummaryRow
                label={COPY.companyIndustry}
                value={data.company.industry || COPY.noValue}
              />
              <SummaryRow
                label={COPY.companyAccess}
                value={currentOfficeRoleLabel}
                last
              />
              <Text style={styles.helperText}>{COPY.companyIsolationHint}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{COPY.companyCreateTitle}</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.helperText}>{COPY.companyCreateHint}</Text>
              <TextInput
                testID="office-company-name"
                placeholder={COPY.companyNamePlaceholder}
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={companyDraft.name}
                onChangeText={(value) =>
                  setCompanyDraft((current) => ({ ...current, name: value }))
                }
              />
              <TextInput
                placeholder={COPY.companyCityPlaceholder}
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={companyDraft.city}
                onChangeText={(value) =>
                  setCompanyDraft((current) => ({ ...current, city: value }))
                }
              />
              <TextInput
                placeholder={COPY.companyIndustryPlaceholder}
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={companyDraft.industry}
                onChangeText={(value) =>
                  setCompanyDraft((current) => ({
                    ...current,
                    industry: value,
                  }))
                }
              />
              <TextInput
                placeholder={COPY.companyPhonePlaceholder}
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={companyDraft.phoneMain}
                onChangeText={(value) =>
                  setCompanyDraft((current) => ({
                    ...current,
                    phoneMain: value,
                  }))
                }
              />
              <TextInput
                placeholder={COPY.companyEmailPlaceholder}
                placeholderTextColor="#94A3B8"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={companyDraft.email}
                onChangeText={(value) =>
                  setCompanyDraft((current) => ({ ...current, email: value }))
                }
              />
              <Pressable
                testID="office-create-company"
                style={[
                  styles.primaryButton,
                  savingCompany && styles.primaryButtonDisabled,
                ]}
                disabled={savingCompany}
                onPress={() => void handleCreateCompany()}
              >
                <Text style={styles.primaryButtonText}>
                  {COPY.companyCreateCta}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {data.company ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{COPY.membersTitle}</Text>
            {data.members.length > 0 ? (
              <View style={styles.entityColumn}>
                {data.members.map((member) => (
                  <MemberCard
                    key={member.userId}
                    member={member}
                    canManage={canManageCompany}
                    saving={Boolean(savingRole)}
                    onAssignRole={handleAssignRole}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.sectionCard}>
                <Text style={styles.helperText}>{COPY.noMemberships}</Text>
              </View>
            )}
          </View>
        ) : null}

        {data.company ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{COPY.invitesTitle}</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.helperText}>{COPY.invitesHint}</Text>

              {canManageCompany ? (
                <>
                  <TextInput
                    placeholder={COPY.inviteNamePlaceholder}
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={inviteDraft.name}
                    onChangeText={(value) =>
                      setInviteDraft((current) => ({ ...current, name: value }))
                    }
                  />
                  <TextInput
                    placeholder={COPY.invitePhonePlaceholder}
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={inviteDraft.phone}
                    onChangeText={(value) =>
                      setInviteDraft((current) => ({ ...current, phone: value }))
                    }
                  />
                  <TextInput
                    placeholder={COPY.inviteEmailPlaceholder}
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={inviteDraft.email}
                    onChangeText={(value) =>
                      setInviteDraft((current) => ({ ...current, email: value }))
                    }
                  />
                  <View style={styles.roleChipRow}>
                    {OFFICE_ASSIGNABLE_ROLES.map((role) => {
                      const active = inviteDraft.role === role;
                      return (
                        <Pressable
                          key={role}
                          testID={`office-invite-role-${role}`}
                          style={[
                            styles.roleChip,
                            active && styles.roleChipActive,
                          ]}
                          onPress={() =>
                            setInviteDraft((current) => ({
                              ...current,
                              role,
                            }))
                          }
                        >
                          <Text
                            style={[
                              styles.roleChipText,
                              active && styles.roleChipTextActive,
                            ]}
                          >
                            {getProfileRoleLabel(role)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <TextInput
                    placeholder={COPY.inviteCommentPlaceholder}
                    placeholderTextColor="#94A3B8"
                    style={[styles.input, styles.textArea]}
                    multiline
                    value={inviteDraft.comment}
                    onChangeText={(value) =>
                      setInviteDraft((current) => ({
                        ...current,
                        comment: value,
                      }))
                    }
                  />
                  <Pressable
                    testID="office-create-invite"
                    style={[
                      styles.primaryButton,
                      savingInvite && styles.primaryButtonDisabled,
                    ]}
                    disabled={savingInvite}
                    onPress={() => void handleCreateInvite()}
                  >
                    <Text style={styles.primaryButtonText}>
                      {COPY.inviteCreateCta}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.helperText}>{COPY.inviteManageHint}</Text>
              )}
            </View>

            {data.invites.length > 0 ? (
              <View style={styles.entityColumn}>
                {data.invites.map((invite) => (
                  <InviteCard key={invite.id} invite={invite} />
                ))}
              </View>
            ) : (
              <View style={styles.sectionCard}>
                <Text style={styles.helperText}>{COPY.noInvites}</Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{COPY.workspaceTitle}</Text>
          {accessModel.hasOfficeAccess ? (
            officeCards.length > 0 ? (
              <View style={styles.workspaceGrid}>
                {officeCards.map((card) => (
                  <Pressable
                    key={card.key}
                    testID={`office-card-${card.key}`}
                    onPress={() => router.push(card.route as Href)}
                    style={({ pressed }) => [
                      styles.workspaceCard,
                      { borderColor: `${card.tone}33` },
                      pressed && styles.workspaceCardPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.workspaceAccent,
                        { backgroundColor: card.tone },
                      ]}
                    />
                    <Text style={styles.workspaceTitle}>{card.title}</Text>
                    <Text style={styles.workspaceSubtitle}>{card.subtitle}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.sectionCard}>
                <Text style={styles.helperText}>{COPY.noWorkspaceRole}</Text>
              </View>
            )
          ) : (
            <View style={styles.sectionCard}>
              <Text style={styles.helperText}>{COPY.noOfficeAccess}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </RoleScreenLayout>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stateText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    gap: 8,
  },
  heroEyebrow: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "900",
  },
  heroText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  summaryRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  summaryLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryValue: {
    marginTop: 4,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  ruleText: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 20,
  },
  helperText: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#0F172A",
    fontSize: 14,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  entityColumn: {
    gap: 12,
  },
  entityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 6,
  },
  entityTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },
  entityMeta: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
  },
  roleChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  roleChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleChipActive: {
    borderColor: "#2563EB",
    backgroundColor: "#DBEAFE",
  },
  roleChipDisabled: {
    opacity: 0.65,
  },
  roleChipText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  roleChipTextActive: {
    color: "#1D4ED8",
  },
  workspaceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  workspaceCard: {
    width: "48%",
    minHeight: 144,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "flex-start",
  },
  workspaceCardPressed: {
    opacity: 0.85,
  },
  workspaceAccent: {
    width: 42,
    height: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  workspaceTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },
  workspaceSubtitle: {
    marginTop: 8,
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
  },
});
