import type { AiScreenButtonActionEntry } from "./aiScreenButtonRoleActionTypes";

export const AI_SCREEN_FORBIDDEN_ACTION_POLICY = Object.freeze({
  source: "ai_screen_forbidden_action_policy_v1",
  forbiddenDirectActions: [
    "direct final submit",
    "direct payment",
    "direct warehouse mutation",
    "direct supplier confirmation",
    "direct contract signing",
    "direct finance posting",
    "direct role/permission changes",
    "direct deletion",
    "direct DB write from UI",
    "direct Supabase mutation from UI",
    "LLM-only decision without evidence",
    "external supplier creation without citation/evidence",
  ],
  directExecutionAllowed: false,
  directDbWriteAllowed: false,
  directSupabaseMutationAllowed: false,
  providerDecisionWithoutEvidenceAllowed: false,
} as const);

const FORBIDDEN_LABEL_PATTERNS = [
  /\bfinal\b.*\bsubmit\b/i,
  /\bpayment\b.*\bdirect/i,
  /\bapply payment\b/i,
  /\bwarehouse\b.*\bmutat/i,
  /\bstock\b.*\bdirect/i,
  /\bsupplier\b.*\bconfirm/i,
  /\bcontract\b.*\bsign/i,
  /\bfinance\b.*\bpost/i,
  /\brole\b.*\bchange/i,
  /\bpermission\b.*\bchange/i,
  /\bdelete\b/i,
  /\bdb write\b/i,
  /\bsupabase\b.*\bmutat/i,
  /\bwithout evidence\b/i,
  /\bwithout citation\b/i,
  /\bwithout ledger\b/i,
  /\bwithout approval\b/i,
];

export type AiScreenForbiddenPolicyResult = {
  forbidden: boolean;
  directExecutionAllowed: false;
  reason: string | null;
};

export function evaluateAiScreenForbiddenActionPolicy(entry: AiScreenButtonActionEntry): AiScreenForbiddenPolicyResult {
  if (entry.actionKind === "forbidden") {
    return {
      forbidden: true,
      directExecutionAllowed: false,
      reason: entry.forbiddenReason ?? "Forbidden action must declare a reason.",
    };
  }

  const haystack = [
    entry.actionId,
    entry.label,
    entry.aiOpportunity,
    entry.mutationRisk,
    ...entry.onPressHandlers,
    ...entry.missingBffRoutes,
  ].join(" ");
  const matched = FORBIDDEN_LABEL_PATTERNS.some((pattern) => pattern.test(haystack));

  return {
    forbidden: matched,
    directExecutionAllowed: false,
    reason: matched ? "Action text matches a direct final mutation forbidden by AI policy." : null,
  };
}

export function isAiScreenActionDirectExecutionAllowed(entry: AiScreenButtonActionEntry): false {
  void entry;
  return false;
}
