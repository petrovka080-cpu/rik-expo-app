import type { SupabaseClientUnavailableReason } from "../supabaseClientAvailability";

export type ProtectedIdentityFailureStatus =
  | "no_session"
  | "expired_session"
  | "revoked_session"
  | "invalid_session"
  | "missing_profile"
  | "missing_organization"
  | "missing_membership"
  | "missing_role"
  | "identity_mismatch"
  | "cross_tenant"
  | "provider_unavailable";

export type ProtectedIdentity = {
  userId: string;
  email: string | null;
  organizationId: string;
  membershipId: string;
  role: string;
  profileEnsured: true;
  source: "provider_verified_claims" | "verified_company_membership";
};

export type ProtectedIdentityResolution =
  | { status: "ready"; identity: ProtectedIdentity }
  | {
      status: "configuration_unavailable";
      reason: SupabaseClientUnavailableReason;
      diagnostic: string;
    }
  | { status: ProtectedIdentityFailureStatus };

export type ProtectedIdentityFacts = {
  session: "valid" | "missing" | "expired" | "revoked" | "invalid";
  profileReady: boolean;
  userId: string | null;
  email?: string | null;
  organizationId: string | null;
  membershipId: string | null;
  claimedRole: string | null;
  resolvedRole: string | null;
  source?: ProtectedIdentity["source"];
  targetOrganizationId?: string | null;
};

const DENIED_PRINCIPAL_ROLES = new Set(["cross_tenant", "revoked"]);

const clean = (value: unknown): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
};

export function classifyProtectedIdentity(
  facts: ProtectedIdentityFacts,
): ProtectedIdentityResolution {
  if (facts.session === "missing") return { status: "no_session" };
  if (facts.session === "expired") return { status: "expired_session" };
  if (facts.session === "revoked") return { status: "revoked_session" };
  if (facts.session !== "valid" || !clean(facts.userId)) {
    return { status: "invalid_session" };
  }
  if (!facts.profileReady) return { status: "missing_profile" };

  const organizationId = clean(facts.organizationId);
  if (!organizationId) return { status: "missing_organization" };
  const membershipId = clean(facts.membershipId);
  if (!membershipId) return { status: "missing_membership" };
  const claimedRole = clean(facts.claimedRole);
  const resolvedRole = clean(facts.resolvedRole);
  if (!resolvedRole) return { status: "missing_role" };
  if (claimedRole && claimedRole !== resolvedRole) {
    return { status: "identity_mismatch" };
  }
  if (resolvedRole === "revoked") return { status: "revoked_session" };
  if (DENIED_PRINCIPAL_ROLES.has(resolvedRole)) {
    return { status: "cross_tenant" };
  }
  const targetOrganizationId = clean(facts.targetOrganizationId);
  if (targetOrganizationId && targetOrganizationId !== organizationId) {
    return { status: "cross_tenant" };
  }

  return {
    status: "ready",
    identity: {
      userId: clean(facts.userId)!,
      email: clean(facts.email),
      organizationId,
      membershipId,
      role: resolvedRole,
      profileEnsured: true,
      source: facts.source ?? "provider_verified_claims",
    },
  };
}

export function protectedIdentityMessageRu(
  status: ProtectedIdentityFailureStatus,
): { title: string; message: string } {
  switch (status) {
    case "no_session":
      return {
        title: "Требуется вход",
        message: "Войдите в GOX, чтобы открыть профиль и защищённую форму сметы.",
      };
    case "expired_session":
      return {
        title: "Сессия истекла",
        message: "Войдите снова. Сохранённая сессия больше не действует.",
      };
    case "revoked_session":
      return {
        title: "Сессия отозвана",
        message: "Доступ этой сессии отозван. Выполните выход и войдите снова.",
      };
    case "missing_profile":
      return {
        title: "Профиль не настроен",
        message: "Сессия найдена, но подтверждённый профиль пользователя отсутствует.",
      };
    case "missing_organization":
      return {
        title: "Организация не назначена",
        message: "Пользователь не привязан к организации. Обратитесь к администратору.",
      };
    case "missing_membership":
      return {
        title: "Нет членства в организации",
        message: "Для пользователя не найдено активное членство в организации.",
      };
    case "missing_role":
      return {
        title: "Роль не назначена",
        message: "Активная роль не подтверждена функцией get_my_role.",
      };
    case "identity_mismatch":
      return {
        title: "Данные доступа не совпадают",
        message: "Роль или членство сессии не совпадает с серверными данными. Доступ закрыт.",
      };
    case "cross_tenant":
      return {
        title: "Доступ к другой организации запрещён",
        message: "Эта сессия не имеет доступа к данным выбранной организации.",
      };
    case "provider_unavailable":
      return {
        title: "Не удалось проверить доступ",
        message: "Сервис авторизации временно недоступен. Повторите проверку.",
      };
    default:
      return {
        title: "Сессия недействительна",
        message: "Не удалось подтвердить пользователя. Выполните выход и войдите снова.",
      };
  }
}

export function readableUnknownError(error: unknown): string | null {
  if (error instanceof Error) return clean(error.message);
  if (!error || typeof error !== "object" || Array.isArray(error)) {
    return clean(error);
  }
  const record = error as Record<string, unknown>;
  for (const key of ["message", "details", "hint", "code"] as const) {
    const value = clean(record[key]);
    if (value) return value;
  }
  return null;
}
