export const CONSTRUCTION_KNOWHOW_ROLE_IDS = [
  "director_control",
  "buyer",
  "warehouse",
  "accountant",
  "foreman",
  "contractor",
] as const;

export type ConstructionKnowhowRoleId = typeof CONSTRUCTION_KNOWHOW_ROLE_IDS[number];
export type RoleId = ConstructionKnowhowRoleId;

export const CONSTRUCTION_DOMAIN_IDS = [
  "project_planning",
  "bim_information_management",
  "procurement",
  "supplier_selection",
  "warehouse_material_flow",
  "field_execution",
  "quality_control",
  "document_control",
  "finance_cost_control",
  "accounting",
  "contractor_management",
  "real_estate_due_diligence",
  "approval_workflow",
] as const;

export type ConstructionDomainId = typeof CONSTRUCTION_DOMAIN_IDS[number];

export type ConstructionDecisionCardDomain =
  | "procurement"
  | "warehouse"
  | "finance"
  | "field_execution"
  | "documents"
  | "contractor_management"
  | "real_estate_due_diligence";

export type ConstructionRiskLevel = "low" | "medium" | "high";
export type ConstructionUrgency = "now" | "today" | "week" | "watch";
export type ConstructionInternalFirstStatus = "complete" | "partial" | "insufficient";
export type ConstructionExternalIntelStatus =
  | "not_needed"
  | "available_preview_only"
  | "blocked";
export type ConstructionExternalPreviewPolicy =
  | "disabled"
  | "citations_required_preview_only";

export type RiskRule = {
  ruleId: string;
  signal: string;
  riskLevel: ConstructionRiskLevel;
  urgency: ConstructionUrgency;
  approvalRequired: boolean;
  evidenceRequired: true;
};

export type ConstructionDomainPlaybook = {
  domainId: ConstructionDomainId;
  professionalGoal: string;
  roleScopes: RoleId[];
  evidenceRequired: true;
  safeReadUseCases: string[];
  draftUseCases: string[];
  approvalRequiredUseCases: string[];
  forbiddenUseCases: string[];
  internalDataSources: string[];
  externalPreviewPolicy: ConstructionExternalPreviewPolicy;
  riskRules: RiskRule[];
};

export type ConstructionProfessionalTone =
  | "executive_control"
  | "procurement_operator"
  | "warehouse_operator"
  | "finance_controller"
  | "field_foreman"
  | "contractor_self_service";

export type ConstructionRoleBoundary = {
  safeReadAllowed: true;
  draftPreviewAllowed: true;
  submitForApprovalAllowed: true;
  highRiskRequiresApproval: true;
  directExecutionWithoutApproval: false;
  domainMutationAllowed: false;
  mobileExternalFetchAllowed: false;
  externalPreviewOnly: true;
  ownRecordsOnly: boolean;
  roleIsolationClaimed: false;
};

export type ConstructionRoleProfile = {
  roleId: RoleId;
  title: string;
  professionalTone: ConstructionProfessionalTone;
  allowedDomains: ConstructionDomainId[];
  forbiddenDomains: ConstructionDomainId[];
  overviewScope:
    | "cross_domain_redacted"
    | "role_domain_redacted"
    | "own_records_only";
  canApprove: boolean;
  canExecuteApprovedViaLedger: boolean;
  evidenceRequired: true;
  approvalBoundary: ConstructionRoleBoundary;
};

export type EvidenceRef = {
  refId: string;
  sourceType:
    | "internal_runtime"
    | "policy_contract"
    | "role_scope"
    | "external_citation_preview";
  label: string;
  sourceIdHash: string;
  redacted: true;
  rawRowsReturned: false;
};

export type ActionPlan = {
  actionId: string;
  label: string;
  actionType: "safe_read" | "draft_only" | "submit_for_approval";
  domainId: ConstructionDomainId;
  requiresApproval: boolean;
  evidenceRefs: string[];
  mutates: false;
  mutationCount: 0;
  dbWrites: 0;
  executed: false;
};

export type ForbiddenAction = {
  actionId: string;
  label: string;
  reason: string;
  blockedBy:
    | "role_scope"
    | "approval_boundary"
    | "external_preview_policy"
    | "no_direct_mutation_policy";
  mutationCount: 0;
  dbWrites: 0;
};

export type ConstructionRecommendedActions = {
  safeRead: ActionPlan[];
  draftOnly: ActionPlan[];
  approvalRequired: ActionPlan[];
  forbidden: ForbiddenAction[];
};

export type ConstructionDecisionCard = {
  cardId: string;
  rolePerspective: ConstructionKnowhowRoleId;
  domain: ConstructionDecisionCardDomain;
  situationSummary: string;
  professionalAssessment: string;
  evidenceRefs: EvidenceRef[];
  riskLevel: ConstructionRiskLevel;
  urgency: ConstructionUrgency;
  recommendedActions: ConstructionRecommendedActions;
  internalFirstStatus: ConstructionInternalFirstStatus;
  externalIntelStatus: ConstructionExternalIntelStatus;
  mutationCount: 0;
  dbWrites: 0;
};

export type ConstructionDecisionCardInput = {
  roleId: RoleId;
  domainId: ConstructionDomainId;
  situationSummary?: string;
  internalEvidenceRefs?: EvidenceRef[];
  observedSignals?: string[];
  externalPreviewRequested?: boolean;
};

export type ConstructionAnalyzeInput = {
  roleId: RoleId;
  domainId: ConstructionDomainId;
  evidenceRefs?: EvidenceRef[];
  observedSignals?: string[];
  externalPreviewRequested?: boolean;
};

export type ConstructionExternalIntelPolicyDecision = {
  externalPreviewAllowed: boolean;
  status: ConstructionExternalIntelStatus;
  citationsRequired: boolean;
  previewOnly: true;
  externalLiveFetch: false;
  mobileExternalFetch: false;
  providerCalled: false;
  mutationCount: 0;
  reason: string;
};

export type ConstructionSafetyBoundaryResult = {
  highRiskRequiresApproval: true;
  directExecution: false;
  domainMutation: false;
  mobileExternalFetch: false;
  directSupabaseFromUi: false;
  mutationCount: 0;
  dbWrites: 0;
  recommendedActions: ConstructionRecommendedActions;
};
