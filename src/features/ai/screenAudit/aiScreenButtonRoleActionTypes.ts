import type { AiUserRole } from "../policy/aiRolePolicy";

export type AiScreenAuditPrimaryDomain =
  | "control"
  | "procurement"
  | "marketplace"
  | "warehouse"
  | "finance"
  | "reports"
  | "documents"
  | "subcontracts"
  | "projects"
  | "map"
  | "chat"
  | "security"
  | "screen_runtime";

export type AiScreenButtonActionKind =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden"
  | "unknown_needs_audit";

export type AiScreenMutationRisk =
  | "none"
  | "draft"
  | "approval_required"
  | "forbidden_direct_mutation";

export type AiScreenAiOpportunity =
  | "none"
  | "explain"
  | "summarize"
  | "compare"
  | "draft"
  | "recommend_with_evidence"
  | "submit_for_approval";

export type AiScreenEmulatorTargetability =
  | "targetable"
  | "not_targeted_yet"
  | "route_missing"
  | "blocked_runtime";

export type AiScreenRouteStatus = "registered" | "route_missing_or_not_registered";

export type AiScreenPiiFinancialSupplierRisk =
  | "none"
  | "low"
  | "medium"
  | "high";

export type AiScreenBffCoverageStatus =
  | "covered_read_route"
  | "covered_draft_route"
  | "covered_approval_route"
  | "missing_read_route"
  | "missing_draft_route"
  | "missing_approval_route"
  | "unsafe_direct_client_access";

export type AiScreenAuditRecommendedWave =
  | "none"
  | "procurement_execution"
  | "warehouse_copilot"
  | "finance_copilot"
  | "foreman_closeout"
  | "director_control_center"
  | "approval_ledger_hardening"
  | "market_supplier_intel"
  | "security_admin_review"
  | "screen_runtime_bff_coverage";

export type AiScreenButtonActionEntry = {
  screenId: string;
  route: string;
  routeStatus: AiScreenRouteStatus;
  roleScope: readonly AiUserRole[];
  primaryDomain: AiScreenAuditPrimaryDomain;
  actionId: string;
  label: string;
  actionKind: AiScreenButtonActionKind;
  visibleButtons: readonly string[];
  onPressHandlers: readonly string[];
  existingTestIds: readonly string[];
  currentDataSources: readonly string[];
  evidenceSources: readonly string[];
  existingBffRoutes: readonly string[];
  missingBffRoutes: readonly string[];
  bffCoverage: readonly AiScreenBffCoverageStatus[];
  crossScreenRisks: readonly string[];
  mutationRisk: AiScreenMutationRisk;
  aiOpportunity: AiScreenAiOpportunity;
  forbiddenReason?: string;
  piiFinancialSupplierRisk: AiScreenPiiFinancialSupplierRisk;
  emulatorTargetability: AiScreenEmulatorTargetability;
  recommendedNextWave: AiScreenAuditRecommendedWave;
  source: "ai_all_screen_button_role_action_audit_v1";
};

export type AiScreenAuditValidationIssueCode =
  | "DUPLICATE_ACTION_ID_PER_SCREEN"
  | "MISSING_REQUIRED_SCREEN"
  | "MISSING_ROLE_SCOPE"
  | "MISSING_ACTION_KIND"
  | "FORBIDDEN_ACTION_WITHOUT_REASON"
  | "APPROVAL_REQUIRED_WITHOUT_APPROVAL_OR_EVIDENCE_ROUTE"
  | "SAFE_READ_WITHOUT_EVIDENCE_SOURCE"
  | "DIRECT_MUTATION_RISK_NOT_FORBIDDEN"
  | "UNKNOWN_ACTION_KIND_NEEDS_AUDIT"
  | "MISSING_BFF_ROUTE_NOT_REPORTED";

export type AiScreenAuditValidationIssue = {
  code: AiScreenAuditValidationIssueCode;
  screenId: string;
  actionId?: string;
  exactReason: string;
};

export type AiScreenAuditSummary = {
  ok: boolean;
  finalStatus:
    | "GREEN_AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_READY"
    | "BLOCKED_SCREEN_BUTTON_AUDIT_INCOMPLETE"
    | "BLOCKED_AI_SCREEN_AUDIT_MISSING_ROUTE_REGISTRY"
    | "BLOCKED_AI_SCREEN_AUDIT_MISSING_BFF_COVERAGE";
  exactReason: string | null;
  screensAudited: number;
  actionsAudited: number;
  rolesCovered: readonly AiUserRole[];
  safeReadOpportunities: number;
  draftOnlyOpportunities: number;
  approvalRequiredOpportunities: number;
  forbiddenActions: number;
  missingBffRoutes: number;
  unsafeDirectMutationPaths: number;
  routeMissingScreens: readonly string[];
  issues: readonly AiScreenAuditValidationIssue[];
  fakeAiCardsAdded: false;
  uiChanged: false;
  hooksAdded: false;
  dbWritesUsed: false;
  providerCalled: false;
  secretsPrinted: false;
  rawRowsPrinted: false;
  fakeGreenClaimed: false;
};
