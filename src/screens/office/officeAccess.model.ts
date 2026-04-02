import type { AppAccessOfficeRole } from "../../lib/appAccessModel";
import type { ProfilePayload, UserProfile } from "../profile/profile.types";

export const OFFICE_BOOTSTRAP_ROLE: AppAccessOfficeRole = "director";

export const OFFICE_ASSIGNABLE_ROLES: readonly AppAccessOfficeRole[] = [
  "director",
  "buyer",
  "foreman",
  "warehouse",
  "accountant",
  "security",
  "contractor",
  "engineer",
] as const;

export type OfficeWorkspaceCard = {
  key: string;
  title: string;
  subtitle: string;
  route: string | null;
  entryKind: "screen" | "invite-only";
  tone: string;
  requiredRoles: readonly AppAccessOfficeRole[];
  inviteRole: AppAccessOfficeRole | null;
  primary?: boolean;
};

export const OFFICE_WORKSPACE_CARDS: readonly OfficeWorkspaceCard[] = [
  {
    key: "director",
    title: "Открыть Контроль",
    subtitle: "Главный экран директора: контроль, финансы и ход работ.",
    route: "/office/director",
    entryKind: "screen",
    tone: "#0F766E",
    requiredRoles: ["director"],
    inviteRole: "director",
    primary: true,
  },
  {
    key: "foreman",
    title: "Прораб",
    subtitle: "Полевая работа, заявки, задачи и исполнение на объекте.",
    route: "/office/foreman",
    entryKind: "screen",
    tone: "#2563EB",
    requiredRoles: ["foreman"],
    inviteRole: "foreman",
  },
  {
    key: "buyer",
    title: "Снабжение",
    subtitle: "Закупки, поставщики и движение материалов по заявкам.",
    route: "/office/buyer",
    entryKind: "screen",
    tone: "#7C3AED",
    requiredRoles: ["buyer"],
    inviteRole: "buyer",
  },
  {
    key: "accountant",
    title: "Бухгалтерия",
    subtitle: "Платежи, документы и финансовая дисциплина компании.",
    route: "/office/accountant",
    entryKind: "screen",
    tone: "#CA8A04",
    requiredRoles: ["accountant"],
    inviteRole: "accountant",
  },
  {
    key: "warehouse",
    title: "Склад",
    subtitle: "Приемка, выдача, остатки и движение материалов.",
    route: "/office/warehouse",
    entryKind: "screen",
    tone: "#9333EA",
    requiredRoles: ["warehouse"],
    inviteRole: "warehouse",
  },
  {
    key: "contractor",
    title: "Подрядчики",
    subtitle: "Подрядные направления, статусы и рабочие задачи.",
    route: "/office/contractor",
    entryKind: "screen",
    tone: "#059669",
    requiredRoles: ["contractor"],
    inviteRole: "contractor",
  },
  {
    key: "security",
    title: "Безопасность",
    subtitle: "Доступ, инциденты и контроль внутренней безопасности.",
    route: "/office/security",
    entryKind: "screen",
    tone: "#DC2626",
    requiredRoles: ["security"],
    inviteRole: "security",
  },
  {
    key: "engineer",
    title: "Инженер",
    subtitle: "Набор инженеров и координация инженерного направления через приглашения.",
    route: null,
    entryKind: "invite-only",
    tone: "#0EA5E9",
    requiredRoles: ["engineer"],
    inviteRole: "engineer",
  },
  {
    key: "reports",
    title: "Отчеты",
    subtitle: "Сводки, отчеты и аналитический обзор для директора.",
    route: "/office/reports",
    entryKind: "screen",
    tone: "#EA580C",
    requiredRoles: ["director"],
    inviteRole: null,
  },
] as const;

const DIRECTOR_OWNED_CARD_KEYS = new Set(
  OFFICE_WORKSPACE_CARDS.map((card) => card.key),
);

const normalizeRole = (value: string | null | undefined): string =>
  String(value ?? "").trim().toLowerCase();

export const filterOfficeWorkspaceCards = (params: {
  availableOfficeRoles: string[];
  includeDirectorOwnedDirections?: boolean;
}): OfficeWorkspaceCard[] => {
  const roleSet = new Set(
    params.availableOfficeRoles.map((role) => normalizeRole(role)),
  );

  if (params.includeDirectorOwnedDirections && roleSet.has("director")) {
    return OFFICE_WORKSPACE_CARDS.filter((card) =>
      DIRECTOR_OWNED_CARD_KEYS.has(card.key),
    );
  }

  return OFFICE_WORKSPACE_CARDS.filter((card) =>
    card.requiredRoles.some((role) => roleSet.has(role)),
  );
};

export const canManageOfficeCompanyAccess = (params: {
  currentUserId: string | null;
  companyOwnerUserId: string | null | undefined;
  companyAccessRole: string | null | undefined;
  availableOfficeRoles: string[];
}): boolean => {
  if (
    params.currentUserId &&
    params.companyOwnerUserId &&
    params.currentUserId === params.companyOwnerUserId
  ) {
    return true;
  }

  if (normalizeRole(params.companyAccessRole) === OFFICE_BOOTSTRAP_ROLE) {
    return true;
  }

  return params.availableOfficeRoles.some(
    (role) => normalizeRole(role) === OFFICE_BOOTSTRAP_ROLE,
  );
};

export const buildOfficeAccessEntryCopy = (params: {
  hasOfficeAccess: boolean;
  hasCompanyContext: boolean;
}) => {
  if (params.hasOfficeAccess || params.hasCompanyContext) {
    return {
      title: "Office",
      subtitle: "Контроль, команда и компания.",
      cta: "Открыть Office",
    };
  }

  return {
    title: "Подключить Office",
    subtitle: "Создайте компанию, чтобы начать работу.",
    cta: "Создать компанию",
  };
};

export const buildOfficeBootstrapProfilePayload = (
  profile: UserProfile,
): ProfilePayload => ({
  id: profile.id || undefined,
  user_id: profile.user_id,
  full_name: profile.full_name,
  phone: profile.phone,
  city: profile.city,
  usage_market: profile.usage_market,
  usage_build: true,
  bio: profile.bio ?? null,
  telegram: profile.telegram ?? null,
  whatsapp: profile.whatsapp ?? null,
  position: profile.position ?? null,
});
