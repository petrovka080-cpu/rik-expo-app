import {
  isExpandedComplexWorkFamilyId,
  resolveExpandedComplexWorkFamily,
} from "../../../lib/ai/expandedComplexWorks";
import {
  getEstimateFeatureFlags,
  type EstimateRuntimeEnv,
} from "./estimateFeatureFlags";
import { getEstimateKillSwitches } from "./estimateKillSwitch";

export type EstimateRuntimeBlockedReason =
  | "AI_ESTIMATE_RUNTIME_DISABLED"
  | "AI_ESTIMATE_KILL_SWITCH_DISABLED_ALL"
  | "AI_ESTIMATE_COMPLEX_ENGINEERING_DISABLED";

export type EstimateRuntimePolicyDecision = {
  estimate_generation_allowed: boolean;
  blocked_reason: EstimateRuntimeBlockedReason | null;
  safe_message_ru: string | null;
  force_quantity_only_mode: boolean;
  pdf_generation_allowed: boolean;
  buyer_handoff_allowed: boolean;
  support_package_allowed: boolean;
  pilot_mode_enabled: boolean;
  complex_engineering_request: boolean;
  active_switches: string[];
};

const DISABLED_MESSAGE_RU =
  "\u0410\u0419-\u0441\u043c\u0435\u0442\u0430 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043e\u0442\u043a\u043b\u044e\u0447\u0435\u043d\u0430. \u0417\u0430\u044f\u0432\u043a\u0443 \u043c\u043e\u0436\u043d\u043e \u043e\u0441\u0442\u0430\u0432\u0438\u0442\u044c, \u0441\u043c\u0435\u0442\u0447\u0438\u043a \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442 \u0435\u0435 \u0432\u0440\u0443\u0447\u043d\u0443\u044e.";

const COMPLEX_DISABLED_MESSAGE_RU =
  "\u0421\u043b\u043e\u0436\u043d\u044b\u0435 \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043d\u044b\u0435 \u0441\u043c\u0435\u0442\u044b \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043e\u0442\u043a\u043b\u044e\u0447\u0435\u043d\u044b. \u0417\u0430\u044f\u0432\u043a\u0443 \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442 \u0441\u043c\u0435\u0442\u0447\u0438\u043a.";

export function isComplexEngineeringEstimateRequest(input: {
  prompt: string;
  selectedWorkKey?: string | null;
}): boolean {
  if (isExpandedComplexWorkFamilyId(input.selectedWorkKey)) return true;
  return Boolean(resolveExpandedComplexWorkFamily(input.prompt, input.selectedWorkKey));
}

export function evaluateEstimateRuntimePolicy(input: {
  prompt: string;
  selectedWorkKey?: string | null;
  env?: EstimateRuntimeEnv;
}): EstimateRuntimePolicyDecision {
  const flags = getEstimateFeatureFlags(input.env);
  const switches = getEstimateKillSwitches(input.env);
  const activeSwitches = Object.entries(switches)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
  const complexRequest = isComplexEngineeringEstimateRequest({
    prompt: input.prompt,
    selectedWorkKey: input.selectedWorkKey,
  });

  let blockedReason: EstimateRuntimeBlockedReason | null = null;
  let safeMessageRu: string | null = null;
  if (!flags.AI_ESTIMATE_RUNTIME_ENABLED) {
    blockedReason = "AI_ESTIMATE_RUNTIME_DISABLED";
    safeMessageRu = DISABLED_MESSAGE_RU;
  } else if (switches.AI_ESTIMATE_DISABLE_ALL) {
    blockedReason = "AI_ESTIMATE_KILL_SWITCH_DISABLED_ALL";
    safeMessageRu = DISABLED_MESSAGE_RU;
  } else if (
    complexRequest &&
    (!flags.AI_ESTIMATE_PROFESSIONAL_ENGINEERING_ENABLED || switches.AI_ESTIMATE_DISABLE_COMPLEX_ENGINEERING)
  ) {
    blockedReason = "AI_ESTIMATE_COMPLEX_ENGINEERING_DISABLED";
    safeMessageRu = COMPLEX_DISABLED_MESSAGE_RU;
  }

  return {
    estimate_generation_allowed: blockedReason == null,
    blocked_reason: blockedReason,
    safe_message_ru: safeMessageRu,
    force_quantity_only_mode: switches.AI_ESTIMATE_FORCE_QUANTITY_ONLY_MODE,
    pdf_generation_allowed: flags.AI_ESTIMATE_PDF_ENABLED && !switches.AI_ESTIMATE_DISABLE_PDF,
    buyer_handoff_allowed: flags.AI_ESTIMATE_BUYER_HANDOFF_ENABLED && !switches.AI_ESTIMATE_DISABLE_BUYER_HANDOFF,
    support_package_allowed: flags.AI_ESTIMATE_SUPPORT_PACKAGE_ENABLED,
    pilot_mode_enabled: flags.AI_ESTIMATE_PILOT_MODE,
    complex_engineering_request: complexRequest,
    active_switches: activeSwitches,
  };
}
