import {
  SENSITIVE_REDACTION_MARKER,
  redactSensitiveText,
} from "../../../lib/security/redaction";
import type { AiUserRole } from "../policy/aiRolePolicy";
import { buildAiScreenContext } from "./aiScreenContext";

export type RedactAiContextForModelParams = {
  role: AiUserRole;
  screenId: string;
  context: unknown;
};

const forbiddenContextKeys = new Set([
  "accesstoken",
  "authorization",
  "authorizationheader",
  "companyid",
  "jwt",
  "providerpayload",
  "rawcontext",
  "rawdbrow",
  "rawdbrows",
  "rawprompt",
  "rawproviderpayload",
  "servicerole",
  "servicerolekey",
  "supabaseurl",
  "token",
  "userid",
]);

const normalizeKey = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();

const isFinanceBlockedForRole = (role: AiUserRole, key: string): boolean =>
  !["director", "control", "accountant"].includes(role) &&
  /finance|payment|posting|debt|invoice|supplierfinancial/i.test(key);

const isContractorInternalBlocked = (role: AiUserRole, key: string): boolean =>
  role === "contractor" && /internal|supplier|othercontractor|procurement|finance/i.test(key);

function redactContextValue(value: unknown, role: AiUserRole, keyPath: string): unknown {
  const normalizedKey = normalizeKey(keyPath);
  if (
    forbiddenContextKeys.has(normalizedKey) ||
    isFinanceBlockedForRole(role, normalizedKey) ||
    isContractorInternalBlocked(role, normalizedKey)
  ) {
    return SENSITIVE_REDACTION_MARKER;
  }

  if (value == null) return value;
  if (typeof value === "string") return redactSensitiveText(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((entry) => redactContextValue(entry, role, keyPath));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const nestedPath = keyPath ? `${keyPath}.${key}` : key;
    redacted[key] = redactContextValue(entry, role, nestedPath);
  }
  return redacted;
}

export function redactAiContextForModel(params: RedactAiContextForModelParams): {
  screenId: string;
  role: AiUserRole;
  domain: string;
  contextPolicy: string;
  redacted: true;
  context: unknown;
} {
  const screenContext = buildAiScreenContext({
    screenId: params.screenId,
    role: params.role,
  });
  return {
    screenId: screenContext.screenId,
    role: screenContext.role,
    domain: screenContext.domain,
    contextPolicy: screenContext.contextPolicy,
    redacted: true,
    context: redactContextValue(params.context, params.role, ""),
  };
}

export function redactAiContextSummaryText(
  value: string,
  params: { role: AiUserRole; screenId: string },
): string {
  const redacted = redactAiContextForModel({
    role: params.role,
    screenId: params.screenId,
    context: { summary: value },
  });
  const context = redacted.context;
  if (context && typeof context === "object" && !Array.isArray(context)) {
    const summary = Object.entries(context).find(([key]) => key === "summary")?.[1];
    return typeof summary === "string" ? summary : SENSITIVE_REDACTION_MARKER;
  }
  return SENSITIVE_REDACTION_MARKER;
}
