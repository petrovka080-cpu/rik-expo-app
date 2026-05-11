import {
  AI_CAPABILITIES,
  AI_DOMAINS,
  AI_USER_ROLES,
  type AiCapability,
  type AiDomain,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import type { AssistantRole } from "../assistant.types";

export { AI_CAPABILITIES, AI_DOMAINS, AI_USER_ROLES };

const aiUserRoleValues: readonly string[] = AI_USER_ROLES;
const aiDomainValues: readonly string[] = AI_DOMAINS;
const aiCapabilityValues: readonly string[] = AI_CAPABILITIES;

export function isAiUserRole(value: string): value is AiUserRole {
  return aiUserRoleValues.includes(value);
}

export function isAiDomain(value: string): value is AiDomain {
  return aiDomainValues.includes(value);
}

export function isAiCapability(value: string): value is AiCapability {
  return aiCapabilityValues.includes(value);
}

export function normalizeAiUserRole(value: string | null | undefined): AiUserRole {
  const normalized = String(value ?? "").trim().toLowerCase();
  return isAiUserRole(normalized) ? normalized : "unknown";
}

export function normalizeAssistantRoleToAiUserRole(role: AssistantRole): AiUserRole {
  if (role === "security") return "unknown";
  return normalizeAiUserRole(role);
}
