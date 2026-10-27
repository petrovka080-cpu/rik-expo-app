import type { AssistantContext, AssistantRole } from "../assistant.types";

export type AiScreenMagicRiskLevel = "low" | "medium" | "high" | "critical";

export type AiScreenMagicActionKind =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden"
  | "exact_blocker";

export type AiScreenMagicExpectedResult =
  | "opens_read_result"
  | "creates_safe_draft"
  | "routes_to_approval_ledger"
  | "shows_forbidden_reason"
  | "shows_exact_blocker";

export type AiScreenMagicPreparedWork = {
  id: string;
  title: string;
  description: string;
  evidence: string[];
  missingData: string[];
  riskLevel: AiScreenMagicRiskLevel;
};

export type AiScreenMagicButtonIntent = {
  label: string;
  actionKind: AiScreenMagicActionKind;
  userFacingReason?: string;
  exactBlocker?: string;
};

export type AiScreenMagicButton = {
  id: string;
  label: string;
  actionKind: AiScreenMagicActionKind;
  resultType: AiScreenMagicActionKind;
  expectedResult: AiScreenMagicExpectedResult;
  bffRoute?: string;
  approvalRoute?: string;
  forbiddenReason?: string;
  exactBlocker?: string;
  canExecuteDirectly: false;
};

export type AiScreenMagicQa = {
  question: string;
  answerIntent: string;
};

export type AiScreenMagicSafety = {
  fakeDataUsed: false;
  directDangerousMutationAllowed: false;
  approvalBypassAllowed: false;
  providerRequired: false;
  dbWriteUsed: false;
};

export type AiScreenMagicPack = {
  screenId: string;
  roleScope: string[];
  domain: string;
  userGoal: string;
  userHeader: string;
  screenSummary: string;
  visibleDomainData: string[];
  riskSummary: string[];
  missingDataSummary: string[];
  safeActions: string[];
  approvalCandidates: string[];
  exactBlockers: string[];
  aiPreparedWork: AiScreenMagicPreparedWork[];
  buttons: AiScreenMagicButton[];
  qa: AiScreenMagicQa[];
  safety: AiScreenMagicSafety;
};

export type AiScreenMagicRegistryEntry = {
  screenId: string;
  roleScope: string[];
  domain: string;
  userGoal: string;
  userHeader: string;
  screenSummary: string;
  visibleDomainData: readonly string[];
  riskSummary: readonly string[];
  missingDataSummary: readonly string[];
  safeActions: readonly string[];
  approvalCandidates: readonly string[];
  exactBlockers: readonly string[];
  preparedWork: readonly {
    title: string;
    description: string;
    riskLevel: AiScreenMagicRiskLevel;
  }[];
  buttonLabels: Partial<Record<Exclude<AiScreenMagicActionKind, "exact_blocker">, string>>;
  buttonIntents: readonly AiScreenMagicButtonIntent[];
  qa: readonly AiScreenMagicQa[];
};

export type AiScreenMagicHydrationRequest = {
  role: AssistantRole;
  context: AssistantContext;
  screenId?: string | null;
  searchParams?: Record<string, string | string[] | undefined>;
  scopedFactsSummary?: string | null;
};

export type AiScreenMagicHydratedContext = {
  screenId: string;
  evidenceLabels: string[];
  missingDataLabels: string[];
  hasRealHydratedEvidence: boolean;
  scopedFactsSummary?: string | null;
};

export type AiScreenMagicValidationIssue = {
  screenId: string;
  actionId?: string;
  code:
    | "missing_screen"
    | "missing_prepared_work"
    | "missing_button"
    | "missing_button_label"
    | "missing_button_resolution"
    | "approval_route_missing"
    | "forbidden_reason_missing"
    | "direct_execution_allowed"
    | "qa_coverage_missing"
    | "debug_copy_exposed"
    | "user_header_invalid"
    | "screen_context_signal_missing"
    | "button_result_type_mismatch"
    | "fake_data_used"
    | "provider_required"
    | "db_write_used";
  exactReason: string;
};
