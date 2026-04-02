import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";

import RoleScreenLayout from "../../components/layout/RoleScreenLayout";
import { buildAppAccessModel } from "../../lib/appAccessModel";
import { getProfileRoleLabel } from "../profile/profile.helpers";
import {
  OFFICE_ASSIGNABLE_ROLES,
  buildOfficeAccessEntryCopy,
  canManageOfficeCompanyAccess,
  filterOfficeWorkspaceCards,
  type OfficeWorkspaceCard,
} from "./officeAccess.model";
import {
  createOfficeCompany,
  createOfficeInvite,
  loadOfficeAccessScreenData,
  updateOfficeMemberRole,
} from "./officeAccess.services";
import {
  copyOfficeInviteText,
  shareOfficeInviteCode,
  type OfficeInviteHandoff,
} from "./officeInviteShare";
import type {
  CreateCompanyDraft,
  OfficeAccessInvite,
  OfficeAccessMember,
  OfficeAccessScreenData,
} from "./officeAccess.types";

type SectionKey = "members" | "invites" | "company";
type Tone = "neutral" | "success" | "warning";
type InviteFormDraft = {
  name: string;
  phone: string;
  email: string;
  comment: string;
};

const EMPTY_DATA: OfficeAccessScreenData = {
  currentUserId: "",
  profile: {
    id: "",
    user_id: "",
    full_name: null,
    phone: null,
    city: null,
    usage_market: true,
    usage_build: false,
  },
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
  legalAddress: "",
  industry: "",
  inn: "",
  phoneMain: "",
  additionalPhones: [],
  email: "",
  constructionObjectName: "",
  siteAddress: "",
  website: "",
};

const buildInviteDraft = (): InviteFormDraft => ({
  name: "",
  phone: "",
  email: "",
  comment: "",
});

const COPY_BASE = {
  title: "Office",
  loadingSubtitle: "Готовим director-owned Office flow.",
  loading: "Загружаем Office...",
  loadError: "Не удалось открыть Office.",
  noValue: "Не указано",
  noRole: "Роль не назначена",
  companyCreated:
    "Компания создана. Office открыт в директорском режиме управления.",
  companyError: "Не удалось создать компанию.",
  inviteShared:
    "Код создан и отправлен через окно шаринга. Ожидающее приглашение уже в списке ниже.",
  inviteHandoffReady:
    "Код создан и скопирован. Отправьте его сотруднику вручную из буфера обмена.",
  inviteManual:
    "Код создан. Если отправка не открылась, возьмите код из списка приглашений ниже и отправьте сотруднику вручную.",
  inviteError: "Не удалось создать приглашение.",
  inviteShareError:
    "Код создан, но открыть окно отправки не удалось. Используйте код из списка приглашений ниже.",
  roleAssignError: "Не удалось назначить роль.",
  summaryTitle: "Компания",
  summaryFallback: "Компания не подключена",
  summaryRole: "Моя роль",
  summaryAccess: "Статус доступа",
  accessReady: "Office открыт",
  accessPending: "Ждет рабочую роль",
  accessClosed: "Office не открыт",
  directionsTitle: "Управляемые направления",
  directionsLead:
    "Откройте нужный раздел для работы или добавьте сотрудника сразу через +.",
  noDirections: "Рабочие направления появятся после подтвержденной office-роли.",
  companyCreateTitle: "Создать компанию",
  companyCreateLead:
    "После создания вы сразу входите как директор и получаете все управляемые направления.",
  companyLead:
    "Карточка компании и объекта, заполненная при создании Office.",
  companyDetailsTitle: "Реквизиты компании",
  membersTitle: "Сотрудники",
  membersLead: "Подтвержденные сотрудники и их текущие роли.",
  membersLeadWithInvites:
    "Подтвержденные сотрудники и их текущие роли. Ожидают активации:",
  invitesTitle: "Приглашения",
  invitesLead:
    "Коды, созданные через + в направлениях, появляются здесь до активации сотрудника.",
  invitesManageHint:
    "Создавать приглашения может владелец компании или директор.",
  rulesTitle: "Правила доступа",
  inviteModalTitle: "Добавить сотрудника",
  inviteModalLead:
    "Роль уже зафиксирована контекстом направления. После создания кода сразу откроется окно отправки.",
  companyCta: "Создать компанию",
  inviteCta: "Создать код",
  cancel: "Отмена",
  noMembers: "Подтвержденных сотрудников пока нет.",
  noInvites: "Ожидающих приглашений пока нет.",
  summaryEdit: "Редактировать компанию",
  memberActiveStatus: "active",
} as const;

const COPY = {
  ...COPY_BASE,
  inviteShared:
    "Код создан и отправлен через системное окно. Ожидающее приглашение уже в списке ниже.",
  inviteHandoffReady:
    "Код создан. Выберите ниже, как отправить приглашение сотруднику.",
  inviteManual:
    "Код создан. Если отправка не открылась, возьмите код из списка приглашений ниже и отправьте сотруднику вручную.",
  inviteError: "Не удалось создать приглашение.",
  inviteShareError:
    "Код создан, но открыть окно отправки не удалось. Используйте код из списка приглашений ниже.",
  inviteCopyCode: "Скопировать код",
  inviteCopyMessage: "Скопировать полное приглашение",
  inviteOpenWhatsapp: "Открыть WhatsApp Web",
  inviteOpenTelegram: "Открыть Telegram Web",
  inviteOpenEmail: "Открыть email compose",
  inviteCodeCopied: "Код скопирован.",
  inviteMessageCopied: "Полное приглашение скопировано.",
  inviteCopyError: "Не удалось скопировать приглашение.",
  inviteOpenError: "Не удалось открыть канал отправки.",
  invitesLead:
    "Коды, созданные через + в направлениях, появляются здесь до активации сотрудника.",
  invitesManageHint:
    "Создавать приглашения может владелец компании или директор.",
  inviteHandoffTitle: "Код создан",
  inviteHandoffLead:
    "На web/desktop invite не прячется в системном share. Скопируйте код или откройте нужный канал отправки.",
  inviteHandoffInstruction: "Инструкция",
  inviteModalLead:
    "Роль уже зафиксирована контекстом направления. После создания кода откроется нужный handoff для отправки.",
} as const;

const COMPANY_FIELDS = [
  {
    key: "name",
    label: "Наименование компании",
    placeholder: "Например, GOX Build",
  },
  {
    key: "legalAddress",
    label: "Юридический адрес компании",
    placeholder: "Юридический адрес компании",
  },
  {
    key: "industry",
    label: "Сфера деятельности",
    placeholder: "Строительство, снабжение, подряд",
  },
  { key: "inn", label: "ИНН компании", placeholder: "ИНН компании" },
  {
    key: "phoneMain",
    label: "Основной телефон",
    placeholder: "Основной телефон",
  },
  {
    key: "email",
    label: "Email компании",
    placeholder: "office@company.kg",
  },
  {
    key: "constructionObjectName",
    label: "Наименование объекта строительства",
    placeholder: "Название объекта",
  },
  {
    key: "siteAddress",
    label: "Фактический адрес строительства",
    placeholder: "Адрес стройки",
  },
  {
    key: "website",
    label: "Сайт компании",
    placeholder: "https://company.kg",
  },
] as const;

const COMPANY_DETAILS: ReadonlyArray<{
  label: string;
  pick: (
    company: NonNullable<OfficeAccessScreenData["company"]>,
  ) => string | null | undefined;
}> = [
  { label: "Наименование компании", pick: (company) => company.name },
  { label: "Юридический адрес компании", pick: (company) => company.address },
  { label: "Сфера деятельности", pick: (company) => company.industry },
  { label: "ИНН компании", pick: (company) => company.inn },
  { label: "Основной телефон", pick: (company) => company.phone_main },
  {
    label: "Дополнительные телефоны",
    pick: (company) => company.phone_whatsapp,
  },
  { label: "Email компании", pick: (company) => company.email },
  { label: "Сайт компании", pick: (company) => company.site },
  {
    label: "Наименование объекта строительства",
    pick: (company) => company.about_short,
  },
  {
    label: "Фактический адрес строительства",
    pick: (company) => company.about_full,
  },
];

const RULES = [
  "Регистрация сама по себе не выдает office-роли автоматически.",
  "Создание компании открывает Office и назначает только стартовую роль director.",
  "Остальные роли появляются только через приглашение или явное назначение.",
] as const;

const formatDate = (value: string | null): string => {
  if (!value) return COPY.noValue;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("ru-RU");
};

function DirectionCard(props: {
  card: OfficeWorkspaceCard;
  canInvite: boolean;
  onOpen: () => void;
  onInvite: () => void;
}) {
  const disabled = props.card.entryKind !== "screen" || !props.card.route;

  return (
    <View
      testID={`office-card-${props.card.key}`}
      style={[styles.card, props.card.primary && styles.cardPrimary]}
    >
      <View style={styles.cardHead}>
        <View
          style={[
            styles.accent,
            { backgroundColor: props.card.primary ? "#FFFFFF" : props.card.tone },
          ]}
        />
        {props.canInvite && props.card.inviteRole ? (
          <Pressable
            testID={`office-direction-add-${props.card.key}`}
            onPress={props.onInvite}
            style={({ pressed }) => [
              styles.add,
              props.card.primary && styles.addPrimary,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.addText,
                props.card.primary && styles.addTextPrimary,
              ]}
            >
              +
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        testID={`office-direction-open-${props.card.key}`}
        disabled={disabled}
        onPress={props.onOpen}
        style={({ pressed }) => [
          styles.stack,
          disabled && styles.dim,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.cardTitle,
            props.card.primary && styles.cardTitlePrimary,
          ]}
        >
          {props.card.title}
        </Text>
        <Text
          style={[
            styles.cardSubtitle,
            props.card.primary && styles.cardSubtitlePrimary,
          ]}
        >
          {props.card.subtitle}
        </Text>
      </Pressable>
    </View>
  );
}

function MemberCard(props: {
  member: OfficeAccessMember;
  canManage: boolean;
  savingRole: string | null;
  onAssignRole: (memberUserId: string, nextRole: string) => void;
}) {
  const roleLabel = getProfileRoleLabel(props.member.role);

  return (
    <View style={styles.entity}>
      <View style={styles.entityHeader}>
        <View style={styles.entityHeaderMain}>
          <Text style={styles.entityTitle}>
            {props.member.fullName?.trim() || props.member.userId}
          </Text>
          <Text style={styles.entityMeta}>{roleLabel}</Text>
        </View>
        <View style={styles.memberStatusRow}>
          <View style={[styles.statusBadge, styles.statusActive]}>
            <Text style={[styles.statusText, styles.statusTextActive]}>
              {COPY.memberActiveStatus}
            </Text>
          </View>
          {props.member.isOwner ? (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>owner</Text>
            </View>
          ) : null}
        </View>
      </View>
      {props.member.phone ? (
        <Text style={styles.entityMeta}>{props.member.phone}</Text>
      ) : null}
      {props.member.createdAt ? (
        <Text style={styles.entityMeta}>Добавлен: {formatDate(props.member.createdAt)}</Text>
      ) : null}
      {props.canManage && !props.member.isOwner ? (
        <View style={styles.chips}>
          {OFFICE_ASSIGNABLE_ROLES.map((role) => {
            const active = props.member.role === role;
            const roleKey = `${props.member.userId}:${role}`;
            return (
              <Pressable
                key={roleKey}
                testID={`office-member-role-${props.member.userId}-${role}`}
                disabled={Boolean(props.savingRole) || active}
                onPress={() => props.onAssignRole(props.member.userId, role)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
    <View style={styles.entity}>
      <View style={styles.entityHeader}>
        <View style={styles.entityHeaderMain}>
          <Text style={styles.entityTitle}>{props.invite.name}</Text>
          <Text style={styles.entityMeta}>{getProfileRoleLabel(props.invite.role)}</Text>
        </View>
        <View style={[styles.statusBadge, styles.statusPending]}>
          <Text style={[styles.statusText, styles.statusTextPending]}>
            {props.invite.status}
          </Text>
        </View>
      </View>
      <Text style={styles.entityMeta}>{props.invite.phone}</Text>
      {props.invite.email ? (
        <Text style={styles.entityMeta}>{props.invite.email}</Text>
      ) : null}
      <Text style={styles.entityMeta}>Код: {props.invite.inviteCode}</Text>
      <Text style={styles.entityMeta}>
        Создано: {formatDate(props.invite.createdAt)}
      </Text>
    </View>
  );
}

export default function OfficeHubScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView | null>(null);
  const offsetsRef = useRef<Record<SectionKey, number>>({
    members: 0,
    invites: 0,
    company: 0,
  });
  const [data, setData] = useState<OfficeAccessScreenData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [companyDraft, setCompanyDraft] =
    useState<CreateCompanyDraft>(EMPTY_COMPANY_DRAFT);
  const [inviteDraft, setInviteDraft] = useState<InviteFormDraft>(buildInviteDraft());
  const [companyFeedback, setCompanyFeedback] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteCard, setInviteCard] = useState<OfficeWorkspaceCard | null>(null);
  const [inviteHandoff, setInviteHandoff] = useState<OfficeInviteHandoff | null>(
    null,
  );
  const [inviteHandoffFeedback, setInviteHandoffFeedback] = useState<string | null>(
    null,
  );

  const loadScreen = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      try {
        const next = await loadOfficeAccessScreenData();
        setData(next);
        setCompanyDraft((current) => ({
          ...current,
          phoneMain: current.phoneMain || next.profile.phone || "",
          email: current.email || next.profileEmail || "",
        }));
      } catch (error: unknown) {
        Alert.alert(
          COPY.title,
          error instanceof Error && error.message.trim()
            ? error.message
            : COPY.loadError,
        );
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
        data.companyAccessRole || accessModel.activeOfficeRole || data.profileRole,
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
      .join(" • ");
  }, [data.company]);
  const visibleCompanyDetails = useMemo(() => {
    if (!data.company) return [];
    return COMPANY_DETAILS.map((item) => ({
      label: item.label,
      value: String(item.pick(data.company) || "").trim(),
    })).filter((item) => item.value);
  }, [data.company]);
  const visibleRoleLabel =
    roleLabel && roleLabel !== COPY.noRole ? roleLabel : null;

  const recordOffset = useCallback(
    (key: SectionKey) => (event: LayoutChangeEvent) => {
      offsetsRef.current[key] = event.nativeEvent.layout.y;
    },
    [],
  );

  const scrollTo = useCallback((key: SectionKey) => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, offsetsRef.current[key] - 12),
      animated: true,
    });
  }, []);

  const handleEditCompany = useCallback(() => {
    router.push("/profile?section=company");
  }, [router]);

  const handleCreateCompany = useCallback(async () => {
    try {
      setSavingCompany(true);
      setCompanyFeedback(null);
      await createOfficeCompany({
        profile: data.profile,
        profileEmail: data.profileEmail,
        draft: companyDraft,
      });
      setCompanyDraft(EMPTY_COMPANY_DRAFT);
      setCompanyFeedback(COPY.companyCreated);
      await loadScreen("refresh");
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error: unknown) {
      Alert.alert(
        COPY.title,
        error instanceof Error && error.message.trim()
          ? error.message
          : COPY.companyError,
      );
    } finally {
      setSavingCompany(false);
    }
  }, [companyDraft, data.profile, data.profileEmail, loadScreen]);

  const openInviteModal = useCallback((card: OfficeWorkspaceCard) => {
    if (!card.inviteRole) return;
    setInviteFeedback(null);
    setInviteHandoffFeedback(null);
    setInviteDraft(buildInviteDraft());
    setInviteCard(card);
  }, []);

  const handleCopyInvite = useCallback(
    async (value: string, feedback: string) => {
      try {
        await copyOfficeInviteText(value);
        setInviteHandoffFeedback(feedback);
      } catch (error: unknown) {
        Alert.alert(
          COPY.title,
          error instanceof Error && error.message.trim()
            ? error.message
            : COPY.inviteCopyError,
        );
      }
    },
    [],
  );

  const handleOpenInviteChannel = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error: unknown) {
      Alert.alert(
        COPY.title,
        error instanceof Error && error.message.trim()
          ? error.message
          : COPY.inviteOpenError,
      );
    }
  }, []);

  const handleCreateInvite = useCallback(async () => {
    if (!data.company || !inviteCard?.inviteRole) return;
    try {
      setSavingInvite(true);
      const created = await createOfficeInvite({
        companyId: data.company.id,
        draft: { ...inviteDraft, role: inviteCard.inviteRole },
      });
      setInviteCard(null);
      setInviteDraft(buildInviteDraft());
      let shareError: string | null = null;
      try {
        const shareResult = await shareOfficeInviteCode({
          companyName: data.company.name,
          role: created.role,
          inviteCode: created.inviteCode,
        });
        if (shareResult.kind === "web-handoff") {
          setInviteHandoff(shareResult.handoff);
          setInviteHandoffFeedback(null);
          setInviteFeedback(null);
        } else {
          setInviteHandoff(null);
          setInviteHandoffFeedback(null);
          setInviteFeedback(COPY.inviteShared);
        }
      } catch (error: unknown) {
        shareError =
          error instanceof Error && error.message.trim()
            ? error.message
            : COPY.inviteShareError;
        setInviteHandoff(null);
        setInviteHandoffFeedback(null);
        setInviteFeedback(COPY.inviteManual);
      }
      await loadScreen("refresh");
      scrollTo("invites");
      if (shareError) Alert.alert(COPY.title, shareError);
    } catch (error: unknown) {
      Alert.alert(
        COPY.title,
        error instanceof Error && error.message.trim()
          ? error.message
          : COPY.inviteError,
      );
    } finally {
      setSavingInvite(false);
    }
  }, [data.company, inviteCard, inviteDraft, loadScreen, scrollTo]);

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
        Alert.alert(
          COPY.title,
          error instanceof Error && error.message.trim()
            ? error.message
            : COPY.roleAssignError,
        );
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadScreen("refresh")}
            tintColor="#2563EB"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {companyFeedback ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{companyFeedback}</Text>
          </View>
        ) : null}

        {data.company ? (
          <>
            <View testID="office-summary" style={styles.summary}>
              <View style={styles.summaryHeader}>
                <Text style={styles.eyebrow}>{COPY.summaryTitle}</Text>
                <Pressable
                  testID="office-company-edit"
                  onPress={handleEditCompany}
                  style={({ pressed }) => [
                    styles.editButton,
                    pressed && styles.pressed,
                  ]}
                  accessibilityLabel={COPY.summaryEdit}
                >
                  <Text style={styles.editButtonText}>✏️</Text>
                </Pressable>
              </View>
              <Text style={styles.company}>{data.company.name}</Text>
              {summaryMeta ? (
                <Text style={styles.summaryMeta}>{summaryMeta}</Text>
              ) : null}
              <View style={styles.summaryBadges}>
                {visibleRoleLabel ? (
                  <View style={[styles.summaryBadge, styles.summaryBadgeRole]}>
                    <Text style={styles.summaryBadgeText}>{visibleRoleLabel}</Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.summaryBadge,
                    accessStatus.tone === "success" && styles.summaryBadgeSuccess,
                    accessStatus.tone === "warning" && styles.summaryBadgeWarning,
                  ]}
                >
                  <Text
                    style={[
                      styles.summaryBadgeText,
                      accessStatus.tone === "success" && styles.summaryBadgeTextSuccess,
                      accessStatus.tone === "warning" && styles.summaryBadgeTextWarning,
                    ]}
                  >
                    {accessStatus.label}
                  </Text>
                </View>
              </View>
            </View>

            <View testID="office-section-directions" style={styles.section}>
              <Text style={styles.sectionTitle}>{COPY.directionsTitle}</Text>
              {officeCards.length > 0 ? (
                <View style={styles.grid}>
                  {officeCards.map((card) => (
                    <DirectionCard
                      key={card.key}
                      card={card}
                      canInvite={canManageCompany}
                      onOpen={() => card.route && router.push(card.route as Href)}
                      onInvite={() => openInviteModal(card)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.panel}>
                  <Text style={styles.helper}>{COPY.noDirections}</Text>
                </View>
              )}
            </View>

            {visibleCompanyDetails.length > 0 ? (
              <View
                testID="office-section-company-details"
                style={styles.section}
                onLayout={recordOffset("company")}
              >
                <Text style={styles.sectionTitle}>{COPY.companyDetailsTitle}</Text>
                <View style={styles.panel}>
                  {visibleCompanyDetails.map((item, index) => (
                    <View
                      key={item.label}
                      style={index === visibleCompanyDetails.length - 1 ? styles.rowLast : styles.row}
                    >
                      <Text style={styles.label}>{item.label}</Text>
                      <Text style={styles.value}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View
              testID="office-section-invites"
              style={styles.section}
              onLayout={recordOffset("invites")}
            >
              <Text style={styles.sectionTitle}>{COPY.invitesTitle}</Text>
              {inviteFeedback ? (
                <View style={styles.notice}>
                  <Text testID="office-invite-feedback" style={styles.noticeText}>
                    {inviteFeedback}
                  </Text>
                </View>
              ) : null}
              {inviteHandoff ? (
                <View testID="office-invite-handoff" style={styles.handoff}>
                  <Text style={styles.eyebrow}>{COPY.inviteHandoffTitle}</Text>
                  <Text
                    testID="office-invite-handoff-role"
                    style={styles.handoffTitle}
                  >
                    {inviteHandoff.roleLabel}
                  </Text>
                  <Text style={styles.helper}>{COPY.inviteHandoffLead}</Text>
                  <View style={styles.panel}>
                    <View style={styles.row}>
                      <Text style={styles.label}>{COPY.summaryTitle}</Text>
                      <Text
                        testID="office-invite-handoff-company"
                        style={styles.value}
                      >
                        {inviteHandoff.companyName}
                      </Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}>{COPY.summaryRole}</Text>
                      <Text style={styles.value}>{inviteHandoff.roleLabel}</Text>
                    </View>
                    <View style={styles.handoffCodeBlock}>
                      <Text style={styles.label}>Код</Text>
                      <Text
                        testID="office-invite-handoff-code"
                        style={styles.handoffCode}
                      >
                        {inviteHandoff.inviteCode}
                      </Text>
                    </View>
                    <View style={styles.rowLast}>
                      <Text style={styles.label}>
                        {COPY.inviteHandoffInstruction}
                      </Text>
                      <Text style={styles.value}>{inviteHandoff.instruction}</Text>
                    </View>
                  </View>
                  {inviteHandoffFeedback ? (
                    <View style={styles.noticeSoft}>
                      <Text
                        testID="office-invite-handoff-feedback"
                        style={styles.noticeSoftText}
                      >
                        {inviteHandoffFeedback}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.actionGrid}>
                    <Pressable
                      testID="office-invite-copy-code"
                      onPress={() =>
                        void handleCopyInvite(
                          inviteHandoff.inviteCode,
                          COPY.inviteCodeCopied,
                        )
                      }
                      style={[styles.secondary, styles.actionButton]}
                    >
                      <Text style={[styles.secondaryText, styles.actionButtonText]}>
                        {COPY.inviteCopyCode}
                      </Text>
                    </Pressable>
                    <Pressable
                      testID="office-invite-copy-message"
                      onPress={() =>
                        void handleCopyInvite(
                          inviteHandoff.message,
                          COPY.inviteMessageCopied,
                        )
                      }
                      style={[styles.secondary, styles.actionButton]}
                    >
                      <Text style={[styles.secondaryText, styles.actionButtonText]}>
                        {COPY.inviteCopyMessage}
                      </Text>
                    </Pressable>
                    <Pressable
                      testID="office-invite-open-whatsapp"
                      onPress={() =>
                        void handleOpenInviteChannel(inviteHandoff.whatsappUrl)
                      }
                      style={[styles.secondary, styles.actionButton]}
                    >
                      <Text style={[styles.secondaryText, styles.actionButtonText]}>
                        {COPY.inviteOpenWhatsapp}
                      </Text>
                    </Pressable>
                    <Pressable
                      testID="office-invite-open-telegram"
                      onPress={() =>
                        void handleOpenInviteChannel(inviteHandoff.telegramUrl)
                      }
                      style={[styles.secondary, styles.actionButton]}
                    >
                      <Text style={[styles.secondaryText, styles.actionButtonText]}>
                        {COPY.inviteOpenTelegram}
                      </Text>
                    </Pressable>
                    <Pressable
                      testID="office-invite-open-email"
                      onPress={() =>
                        void handleOpenInviteChannel(inviteHandoff.emailUrl)
                      }
                      style={[styles.secondary, styles.actionButton]}
                    >
                      <Text style={[styles.secondaryText, styles.actionButtonText]}>
                        {COPY.inviteOpenEmail}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
              {!canManageCompany ? (
                <View style={styles.panel}>
                  <Text style={styles.helper}>{COPY.invitesManageHint}</Text>
                </View>
              ) : null}
              {data.invites.length > 0 ? (
                <View style={styles.stack}>
                  {data.invites.map((invite) => (
                    <InviteCard key={invite.id} invite={invite} />
                  ))}
                </View>
              ) : (
                <View style={styles.panel}>
                  <Text style={styles.helper}>{COPY.noInvites}</Text>
                </View>
              )}
            </View>

            <View
              testID="office-section-members"
              style={styles.section}
              onLayout={recordOffset("members")}
            >
              <Text style={styles.sectionTitle}>{COPY.membersTitle}</Text>
              {data.members.length > 0 ? (
                <View style={styles.stack}>
                  {data.members.map((member) => (
                    <MemberCard
                      key={member.userId}
                      member={member}
                      canManage={canManageCompany}
                      savingRole={savingRole}
                      onAssignRole={handleAssignRole}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.panel}>
                  <Text style={styles.helper}>{COPY.noMembers}</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <>
          <View style={styles.section} onLayout={recordOffset("company")}>
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
                    value={companyDraft[field.key]}
                    onChangeText={(value) =>
                      setCompanyDraft((current) => ({
                        ...current,
                        [field.key]: value,
                      }))
                    }
                  />
                </View>
              ))}
              <View style={styles.stack}>
                <View style={styles.inline}>
                  <Text style={styles.label}>Дополнительные телефоны</Text>
                  <Pressable
                    testID="office-add-company-phone"
                    onPress={() =>
                      setCompanyDraft((current) => ({
                        ...current,
                        additionalPhones: [...current.additionalPhones, ""],
                      }))
                    }
                  >
                    <Text style={styles.link}>Добавить телефон</Text>
                  </Pressable>
                </View>
                {companyDraft.additionalPhones.map((phone, index) => (
                  <View key={`phone-${index}`} style={styles.phoneRow}>
                    <TextInput
                      testID={`office-company-phone-${index}`}
                      placeholder="Дополнительный телефон"
                      placeholderTextColor="#94A3B8"
                      style={[styles.input, styles.phoneInput]}
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={(value) =>
                        setCompanyDraft((current) => ({
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
                        setCompanyDraft((current) => ({
                          ...current,
                          additionalPhones: current.additionalPhones.filter(
                            (_item, itemIndex) => itemIndex !== index,
                          ),
                        }))
                      }
                    >
                      <Text style={styles.linkDanger}>Убрать</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              <Pressable
                testID="office-create-company"
                disabled={savingCompany}
                onPress={() => void handleCreateCompany()}
                style={[styles.primary, savingCompany && styles.dim]}
              >
                <Text style={styles.primaryText}>{COPY.companyCta}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{COPY.rulesTitle}</Text>
            <View style={styles.panel}>
              {RULES.map((rule) => (
                <Text key={rule} style={styles.rule}>
                  • {rule}
                </Text>
              ))}
            </View>
          </View>
          </>
        )}
      </ScrollView>

      <Modal
        transparent
        animationType="slide"
        visible={Boolean(inviteCard)}
        onRequestClose={() => setInviteCard(null)}
      >
        <View style={styles.modalWrap}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setInviteCard(null)}
          />
          <View testID="office-role-invite-modal" style={styles.sheet}>
            <Text style={styles.eyebrow}>{COPY.inviteModalTitle}</Text>
            <Text testID="office-role-invite-role" style={styles.sheetTitle}>
              {inviteCard?.inviteRole
                ? getProfileRoleLabel(inviteCard.inviteRole)
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
                value={inviteDraft.name}
                onChangeText={(value) =>
                  setInviteDraft((current) => ({ ...current, name: value }))
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
                value={inviteDraft.phone}
                onChangeText={(value) =>
                  setInviteDraft((current) => ({ ...current, phone: value }))
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
                value={inviteDraft.email}
                onChangeText={(value) =>
                  setInviteDraft((current) => ({ ...current, email: value }))
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
                value={inviteDraft.comment}
                onChangeText={(value) =>
                  setInviteDraft((current) => ({ ...current, comment: value }))
                }
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setInviteCard(null)}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>{COPY.cancel}</Text>
              </Pressable>
              <Pressable
                testID="office-create-invite"
                disabled={savingInvite}
                onPress={() => void handleCreateInvite()}
                style={[styles.primary, styles.grow, savingInvite && styles.dim]}
              >
                <Text style={styles.primaryText}>{COPY.inviteCta}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </RoleScreenLayout>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  fill: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  summary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    gap: 12,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  company: { color: "#0F172A", fontSize: 24, fontWeight: "900" },
  editButton: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: { fontSize: 16 },
  summaryMeta: { color: "#475569", fontSize: 14, lineHeight: 20, fontWeight: "600" },
  summaryBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryBadge: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBadgeRole: {
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  summaryBadgeSuccess: { borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" },
  summaryBadgeWarning: { borderColor: "#FDE68A", backgroundColor: "#FEFCE8" },
  summaryBadgeText: { color: "#0F172A", fontSize: 13, fontWeight: "800" },
  summaryBadgeTextSuccess: { color: "#166534" },
  summaryBadgeTextWarning: { color: "#92400E" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { flexGrow: 1, flexBasis: 140, gap: 8 },
  label: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  pill: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  pillSuccess: { borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" },
  pillWarning: { borderColor: "#FDE68A", backgroundColor: "#FEFCE8" },
  pillText: { color: "#0F172A", fontSize: 14, fontWeight: "800" },
  pillTextSuccess: { color: "#166534" },
  pillTextWarning: { color: "#92400E" },
  section: { gap: 8 },
  sectionTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  helper: { color: "#475569", fontSize: 13, lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 150,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D8E2F0",
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 14,
  },
  cardPrimary: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accent: { width: 44, height: 6, borderRadius: 999 },
  add: {
    minWidth: 34,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  addPrimary: {
    borderColor: "rgba(255,255,255,0.32)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  addText: { color: "#1D4ED8", fontSize: 20, fontWeight: "900", lineHeight: 22 },
  addTextPrimary: { color: "#FFFFFF" },
  pressed: { opacity: 0.86 },
  dim: { opacity: 0.6 },
  stack: { gap: 10 },
  cardTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  cardTitlePrimary: { color: "#FFFFFF" },
  cardSubtitle: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  cardSubtitlePrimary: { color: "rgba(255,255,255,0.88)" },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,
  },
  handoff: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 16,
    gap: 12,
  },
  handoffTitle: { color: "#0F172A", fontSize: 20, fontWeight: "900" },
  handoffCodeBlock: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    padding: 14,
    gap: 6,
  },
  handoffCode: {
    color: "#166534",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  notice: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    padding: 14,
  },
  noticeText: {
    color: "#166534",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  noticeSoft: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    padding: 14,
  },
  noticeSoftText: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  entity: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 6,
  },
  entityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  entityHeaderMain: { flex: 1, gap: 4 },
  entityTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  entityMeta: { color: "#475569", fontSize: 13, lineHeight: 18 },
  memberStatusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusBadge: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusActive: { borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" },
  statusPending: { borderColor: "#FDE68A", backgroundColor: "#FEFCE8" },
  statusText: { color: "#334155", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  statusTextActive: { color: "#166534" },
  statusTextPending: { color: "#92400E" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: { borderColor: "#0F766E", backgroundColor: "#ECFDF5" },
  chipText: { color: "#334155", fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: "#0F766E" },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 4,
  },
  rowLast: { paddingTop: 10, gap: 4 },
  value: { color: "#0F172A", fontSize: 14, lineHeight: 20, fontWeight: "600" },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#0F172A",
    fontSize: 15,
  },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  link: { color: "#1D4ED8", fontSize: 12, fontWeight: "800" },
  linkDanger: { color: "#B91C1C", fontSize: 12, fontWeight: "800" },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  phoneInput: { flex: 1 },
  primary: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  secondary: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryText: { color: "#0F172A", fontSize: 14, fontWeight: "800" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionButton: { flexGrow: 1, flexBasis: 180 },
  actionButtonText: { textAlign: "center" },
  grow: { flex: 1 },
  rule: { color: "#475569", fontSize: 13, lineHeight: 19 },
  modalWrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 12,
  },
  sheetTitle: { color: "#0F172A", fontSize: 24, fontWeight: "900" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
});
