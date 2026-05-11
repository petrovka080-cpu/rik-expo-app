import type { AssistantContext } from "../assistant.types";
import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import { getAiScreenCapabilities, type AiContextPolicy } from "../policy/aiScreenCapabilityRegistry";

export type AiScreenContext = {
  screenId: string;
  role: AiUserRole;
  domain: AiDomain;
  contextPolicy: AiContextPolicy;
};

export function resolveAiScreenIdForAssistantContext(context: AssistantContext): string {
  switch (context) {
    case "director":
      return "director.dashboard";
    case "buyer":
      return "buyer.main";
    case "accountant":
      return "accountant.main";
    case "warehouse":
      return "chat.main";
    case "contractor":
      return "contractor.main";
    case "foreman":
      return "foreman.ai.quick_modal";
    case "market":
      return "market.home";
    case "supplierMap":
      return "map.main";
    case "reports":
      return "reports.modal";
    default:
      return "chat.main";
  }
}

export function buildAiScreenContext(params: {
  screenId: string;
  role: AiUserRole;
}): AiScreenContext {
  const decision = getAiScreenCapabilities(params.screenId, params.role);
  return {
    screenId: params.screenId,
    role: params.role,
    domain: decision.entry?.domain ?? "chat",
    contextPolicy: decision.entry?.contextPolicy ?? "redacted",
  };
}
