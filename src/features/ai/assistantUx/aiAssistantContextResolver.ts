import type { AssistantContext, AssistantRole } from "../assistant.types";
import { resolveAiScreenIdForAssistantContext } from "../context/aiScreenContext";
import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import { getAllowedAiDomainsForRole } from "../policy/aiRolePolicy";
import { normalizeAssistantRoleToAiUserRole } from "../schemas/aiRoleSchemas";

export type AiAssistantAccessMode = "full" | "limited" | "read_only" | "blocked";

export type AiAssistantResolvedUserContext = {
  effectiveDomain: AiDomain;
  screenId: string;
  userRole: AiUserRole;
  accessMode: AiAssistantAccessMode;
  userFacingScopeLabel: string;
  userFacingNotice?: string;
  debugReason: string;
};

const CONTEXT_DOMAIN: Partial<Record<AssistantContext, AiDomain>> = {
  buyer: "procurement",
  request: "procurement",
  market: "marketplace",
  supplierMap: "marketplace",
  warehouse: "warehouse",
  accountant: "finance",
  director: "control",
  reports: "reports",
  foreman: "projects",
  contractor: "subcontracts",
  profile: "documents",
  security: "documents",
};

const DOMAIN_LABEL: Record<AiDomain, string> = {
  control: "Директор",
  procurement: "Снабжение",
  marketplace: "Рынок",
  warehouse: "Склад",
  finance: "Финансы",
  reports: "Отчёты",
  documents: "Документы",
  subcontracts: "Подрядчики",
  projects: "Прораб",
  map: "Карта",
  chat: "Чаты",
  real_estate_future: "Будущие объекты",
};

function resolveDomain(context: AssistantContext, screenId: string): AiDomain {
  if (CONTEXT_DOMAIN[context]) return CONTEXT_DOMAIN[context]!;
  if (screenId.startsWith("buyer.")) return "procurement";
  if (screenId.startsWith("warehouse.")) return "warehouse";
  if (screenId.startsWith("accountant.")) return "finance";
  if (screenId.startsWith("director.")) return "control";
  if (screenId.startsWith("foreman.")) return "projects";
  return "chat";
}

function resolveAccessMode(params: {
  role: AiUserRole;
  domain: AiDomain;
  urlContext: AssistantContext;
}): AiAssistantAccessMode {
  if (params.role === "unknown") return "read_only";
  if (params.role === "director" || params.role === "control" || params.role === "admin") return "full";
  if (getAllowedAiDomainsForRole(params.role).includes(params.domain)) return "full";
  if (params.urlContext === "buyer" && params.role === "contractor") return "limited";
  if (params.domain === "procurement" && params.role === "foreman") return "limited";
  if (params.domain === "chat" || params.domain === "documents" || params.domain === "reports") return "read_only";
  return "blocked";
}

export function resolveAssistantUserContext(params: {
  urlContext: AssistantContext;
  sessionRole: AssistantRole;
  screenId?: string;
}): AiAssistantResolvedUserContext {
  const screenId = params.screenId || resolveAiScreenIdForAssistantContext(params.urlContext);
  const userRole = normalizeAssistantRoleToAiUserRole(params.sessionRole);
  const effectiveDomain = resolveDomain(params.urlContext, screenId);
  const accessMode = resolveAccessMode({
    role: userRole,
    domain: effectiveDomain,
    urlContext: params.urlContext,
  });
  const userFacingScopeLabel = DOMAIN_LABEL[effectiveDomain] ?? "AI";
  const limitedBuyerContext =
    params.urlContext === "buyer" && userRole === "contractor"
      ? "Вы открыли контекст снабжения, но ваша роль имеет ограниченный доступ. Я могу объяснить процесс и подготовить черновик, но не могу выполнять действия."
      : undefined;

  return {
    effectiveDomain,
    screenId,
    userRole,
    accessMode,
    userFacingScopeLabel,
    userFacingNotice:
      limitedBuyerContext
      ?? (accessMode === "blocked"
        ? "Доступ к действиям этого контекста ограничен. Я могу объяснить процесс без выполнения операций."
        : undefined),
    debugReason: `urlContext=${params.urlContext}; sessionRole=${userRole}; screenId=${screenId}; domain=${effectiveDomain}; accessMode=${accessMode}`,
  };
}
