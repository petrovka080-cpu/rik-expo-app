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

const BOOTSTRAP_RULES = [
  "Обычная регистрация не выдаёт office roles автоматически.",
  "Первое создание компании открывает Office access и назначает только роль директора.",
  "Остальные роли появляются только через invite или явное назначение.",
] as const;

function formatDate(value: string | null): string {
  if (!value) return "Не указано";
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
        Роль: {getProfileRoleLabel(props.member.role)}
        {props.member.isOwner ? " · владелец компании" : ""}
      </Text>
      {props.member.phone ? (
        <Text style={styles.entityMeta}>Телефон: {props.member.phone}</Text>
      ) : null}
      <Text style={styles.entityMeta}>
        Добавлен: {formatDate(props.member.createdAt)}
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
        Роль: {getProfileRoleLabel(props.invite.role)}
      </Text>
      <Text style={styles.entityMeta}>Телефон: {props.invite.phone}</Text>
      {props.invite.email ? (
        <Text style={styles.entityMeta}>Email: {props.invite.email}</Text>
      ) : null}
      <Text style={styles.entityMeta}>Код: {props.invite.inviteCode}</Text>
      <Text style={styles.entityMeta}>Статус: {props.invite.status}</Text>
      <Text style={styles.entityMeta}>
        Создано: {formatDate(props.invite.createdAt)}
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
            : "Не удалось открыть контур компании и Office.";
        Alert.alert("Office и компания", message);
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
    return role ? getProfileRoleLabel(role) : "Нет";
  }, [accessModel.activeOfficeRole, data.companyAccessRole, data.profileRole]);

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
      Alert.alert(
        "Office и компания",
        "Компания создана. Office access открыт, стартовая роль — директор.",
      );
      setCompanyDraft(EMPTY_COMPANY_DRAFT);
      await loadScreen("refresh");
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Не удалось создать компанию.";
      Alert.alert("Office и компания", message);
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
      Alert.alert(
        "Приглашение создано",
        "Роль не выдаётся автоматически. Сотрудник получит её только через invite.",
      );
      setInviteDraft(EMPTY_INVITE_DRAFT);
      await loadScreen("refresh");
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Не удалось создать приглашение.";
      Alert.alert("Office и компания", message);
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
            : "Не удалось назначить роль.";
        Alert.alert("Office и компания", message);
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
        title="Office и компания"
        subtitle="Открываем доступ к компании и Office"
        contentStyle={styles.content}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.stateText}>Загружаем контур доступа…</Text>
        </View>
      </RoleScreenLayout>
    );
  }

  return (
    <RoleScreenLayout
      style={styles.screen}
      title="Office и компания"
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
          <Text style={styles.heroText}>
            Profile здесь больше не управляет компанией. Этот экран владеет
            bootstrap, приглашениями, ролями и входом в Office.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bootstrap rules</Text>
          <View style={styles.sectionCard}>
            {BOOTSTRAP_RULES.map((rule) => (
              <Text key={rule} style={styles.ruleText}>
                • {rule}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Access summary</Text>
          <View style={styles.sectionCard}>
            <SummaryRow
              label="Market access"
              value={accessModel.hasMarketAccess ? "Есть" : "Нет"}
            />
            <SummaryRow
              label="Office access"
              value={accessModel.hasOfficeAccess ? "Есть" : "Нет"}
            />
            <SummaryRow
              label="Company context"
              value={data.company?.name || (accessModel.hasCompanyContext ? "Есть" : "Нет")}
            />
            <SummaryRow
              label="Рабочие роли"
              value={officeRolesLabel}
            />
            <SummaryRow
              label="Текущая роль"
              value={currentOfficeRoleLabel}
              last
            />
          </View>
        </View>

        {data.company ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Компания</Text>
            <View style={styles.sectionCard}>
              <SummaryRow label="Название" value={data.company.name} />
              <SummaryRow
                label="Город"
                value={data.company.city || "Не указан"}
              />
              <SummaryRow
                label="Сфера"
                value={data.company.industry || "Не указана"}
              />
              <SummaryRow
                label="Ваш доступ"
                value={currentOfficeRoleLabel}
                last
              />
              <Text style={styles.helperText}>
                Компания и memberships живут отдельно от profile identity.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Создать компанию</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.helperText}>
                У обычной регистрации нет office roles. Создание компании впервые
                откроет Office access и назначит только роль директора.
              </Text>
              <TextInput
                testID="office-company-name"
                placeholder="Название компании"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={companyDraft.name}
                onChangeText={(value) =>
                  setCompanyDraft((current) => ({ ...current, name: value }))
                }
              />
              <TextInput
                placeholder="Город"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={companyDraft.city}
                onChangeText={(value) =>
                  setCompanyDraft((current) => ({ ...current, city: value }))
                }
              />
              <TextInput
                placeholder="Сфера"
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
                placeholder="Телефон компании"
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
                placeholder="Email компании"
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
                  Создать компанию и получить роль директора
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {data.company ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Сотрудники и membership</Text>
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
                <Text style={styles.helperText}>
                  Пока нет подтверждённых memberships для этой компании.
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {data.company ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Приглашения и роли</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.helperText}>
                Роли не выдаются автоматически. Каждая новая роль появляется
                только через invite или явное назначение.
              </Text>

              {canManageCompany ? (
                <>
                  <TextInput
                    placeholder="Имя сотрудника"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={inviteDraft.name}
                    onChangeText={(value) =>
                      setInviteDraft((current) => ({ ...current, name: value }))
                    }
                  />
                  <TextInput
                    placeholder="Телефон"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={inviteDraft.phone}
                    onChangeText={(value) =>
                      setInviteDraft((current) => ({ ...current, phone: value }))
                    }
                  />
                  <TextInput
                    placeholder="Email (необязательно)"
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
                    placeholder="Комментарий (необязательно)"
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
                      Создать invite
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.helperText}>
                  Приглашения и назначение ролей доступны владельцу компании или
                  директору.
                </Text>
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
                <Text style={styles.helperText}>
                  Активных приглашений пока нет.
                </Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Рабочий Office</Text>
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
                      style={[styles.workspaceAccent, { backgroundColor: card.tone }]}
                    />
                    <Text style={styles.workspaceTitle}>{card.title}</Text>
                    <Text style={styles.workspaceSubtitle}>{card.subtitle}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.sectionCard}>
                <Text style={styles.helperText}>
                  Office access уже открыт, но рабочая роль ещё не назначена.
                  Вход в ERP-экраны появится после invite или explicit assignment.
                </Text>
              </View>
            )
          ) : (
            <View style={styles.sectionCard}>
              <Text style={styles.helperText}>
                Сначала создайте компанию или получите приглашение. Office access
                не появляется сам по себе после регистрации.
              </Text>
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
