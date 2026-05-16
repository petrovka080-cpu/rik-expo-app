export type AiRoleMagicRoleId =
  | "buyer"
  | "accountant"
  | "warehouse"
  | "foreman"
  | "contractor"
  | "director"
  | "office"
  | "documents"
  | "chat"
  | "map"
  | "security"
  | "runtime_admin";

export type AiRoleMagicOutputType =
  | "summary"
  | "ready_options"
  | "risk_report"
  | "missing_data_checklist"
  | "draft"
  | "approval_candidate"
  | "decision_queue"
  | "construction_guidance"
  | "financial_rationale"
  | "logistics_insight";

export type AiRoleMagicPreparedWork = {
  id: string;
  title: string;
  description: string;
  dataNeeded: string[];
  outputType: AiRoleMagicOutputType;
  expectedUserValue: string;
};

export type AiRoleMagicPainPoint = {
  id: string;
  pain: string;
  whyItMatters: string;
  currentManualWork: string;
};

export type AiRoleMagicScreenCoverage = {
  screenId: string;
  screenUserGoal: string;
  auditedButtonsToUse: string[];
  buttonsThatMustWork: string[];
  aiPreparedOutput: string[];
  aiQuestionsMustAnswer: string[];
  safeReadActions: string[];
  draftOnlyActions: string[];
  approvalRequiredActions: string[];
  forbiddenActions: string[];
};

export type AiRoleMagicExample = {
  scenario: string;
  aiOutput: string;
  userBenefit: string;
};

export type AiRoleMagicSafety = {
  noFakeData: boolean;
  noDirectDangerousMutation: boolean;
  approvalRequiredForDangerousActions: boolean;
  evidenceRequired: boolean;
  debugHiddenFromUser: boolean;
};

export type AiRoleMagicBlueprint = {
  roleId: AiRoleMagicRoleId;
  roleLabel: string;
  userDaySummary: string;
  userPainPoints: AiRoleMagicPainPoint[];
  aiMustPrepareBeforeUserAsks: AiRoleMagicPreparedWork[];
  screenCoverage: AiRoleMagicScreenCoverage[];
  realMagicExamples: AiRoleMagicExample[];
  safety: AiRoleMagicSafety;
};

export type AiRoleMagicValidationIssue = {
  roleId: AiRoleMagicRoleId;
  screenId?: string;
  code:
    | "missing_role_empathy"
    | "missing_prepared_work"
    | "missing_screen_coverage"
    | "missing_real_magic"
    | "missing_safety_flag"
    | "generic_chat_only"
    | "unknown_audited_action"
    | "approval_route_missing"
    | "forbidden_reason_missing"
    | "unsafe_direct_mutation"
    | "debug_copy_exposed"
    | "fake_data_language";
  exactReason: string;
};
