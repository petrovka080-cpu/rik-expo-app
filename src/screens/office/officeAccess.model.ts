import type { AppAccessOfficeRole } from "../../lib/appAccessModel";
import { getProfileRoleLabel } from "../profile/profile.helpers";
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
  route: string;
  tone: string;
  requiredRoles: readonly AppAccessOfficeRole[];
};

export const OFFICE_WORKSPACE_CARDS: readonly OfficeWorkspaceCard[] = [
  {
    key: "foreman",
    title: "Прораб",
    subtitle: "Заявки, сметы, субподряд и полевой контур.",
    route: "/office/foreman",
    tone: "#2563EB",
    requiredRoles: ["foreman"],
  },
  {
    key: "buyer",
    title: "Снабженец",
    subtitle: "Закупки, предложения и поставщики.",
    route: "/office/buyer",
    tone: "#7C3AED",
    requiredRoles: ["buyer"],
  },
  {
    key: "director",
    title: "Директор",
    subtitle: "Контроль, финансы и обзор исполнения.",
    route: "/office/director",
    tone: "#0F766E",
    requiredRoles: ["director"],
  },
  {
    key: "accountant",
    title: "Бухгалтер",
    subtitle: "Платежи, документы и финансовый контур.",
    route: "/office/accountant",
    tone: "#CA8A04",
    requiredRoles: ["accountant"],
  },
  {
    key: "warehouse",
    title: "Склад",
    subtitle: "Приемка, выдача и остатки материалов.",
    route: "/office/warehouse",
    tone: "#9333EA",
    requiredRoles: ["warehouse"],
  },
  {
    key: "contractor",
    title: "Подрядчик",
    subtitle: "Исполнение, статусы и рабочие задачи.",
    route: "/office/contractor",
    tone: "#059669",
    requiredRoles: ["contractor"],
  },
  {
    key: "security",
    title: "Безопасность",
    subtitle: "Контроль доступа и внутренние инциденты.",
    route: "/office/security",
    tone: "#DC2626",
    requiredRoles: ["security"],
  },
  {
    key: "reports",
    title: "Отчеты",
    subtitle: "Сводки, дашборды и аналитические модули.",
    route: "/office/reports",
    tone: "#EA580C",
    requiredRoles: ["director"],
  },
] as const;

const normalizeRole = (value: string | null | undefined): string =>
  String(value ?? "").trim().toLowerCase();

export const joinOfficeRoleLabels = (roles: string[]): string =>
  roles.length > 0 ? roles.map((role) => getProfileRoleLabel(role)).join(", ") : "Нет";

export const filterOfficeWorkspaceCards = (
  availableOfficeRoles: string[],
): OfficeWorkspaceCard[] => {
  const roleSet = new Set(availableOfficeRoles.map((role) => normalizeRole(role)));
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
      title: "Office и компания",
      subtitle:
        "Компания, сотрудники, приглашения, роли и вход в Office вынесены в отдельный контур.",
      cta: "Открыть Office и компанию",
    };
  }

  return {
    title: "Подключить Office",
    subtitle:
      "Создайте компанию, чтобы получить Office access и стартовую роль директора. Остальные роли назначаются отдельно.",
    cta: "Создать компанию и открыть access",
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
