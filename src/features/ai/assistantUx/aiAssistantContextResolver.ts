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

export type AssistantRouteParamValue = string | string[] | undefined;

export function firstAssistantRouteParam(value: AssistantRouteParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function booleanAssistantRouteParam(value: AssistantRouteParamValue): boolean {
  const normalized = String(firstAssistantRouteParam(value) || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function parseAssistantRouteContextParam(value: string | undefined): {
  context: string | undefined;
  debugAiContext: boolean;
} {
  const raw = String(value || "").trim();
  if (!raw) return { context: undefined, debugAiContext: false };

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const debugSuffix = "__debug";
  if (decoded.toLowerCase().endsWith(debugSuffix)) {
    return {
      context: decoded.slice(0, -debugSuffix.length),
      debugAiContext: true,
    };
  }

  if (decoded.includes("&")) {
    const query = decoded.split("&")[0].includes("=") ? decoded : `context=${decoded}`;
    const nestedParams = query.split("&").reduce<Record<string, string>>((acc, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) return acc;
      const key = part.slice(0, separatorIndex).trim();
      const nestedValue = part.slice(separatorIndex + 1).trim();
      if (key) acc[key] = nestedValue;
      return acc;
    }, {});
    return {
      context: nestedParams.context ?? decoded.split("&")[0],
      debugAiContext: booleanAssistantRouteParam(nestedParams.debugAiContext),
    };
  }

  return { context: decoded, debugAiContext: false };
}

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
  office: "documents",
  documents: "documents",
  chat: "chat",
  admin: "documents",
  runtime: "documents",
  client: "projects",
  supplier: "marketplace",
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
