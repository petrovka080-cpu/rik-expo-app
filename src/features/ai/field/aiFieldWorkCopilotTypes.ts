import type { AiUserRole } from "../policy/aiRolePolicy";
import type { DraftActKind, DraftActToolOutput, DraftActWorkItemInput } from "../tools/draftActTool";
import type { DraftReportKind, DraftReportToolOutput } from "../tools/draftReportTool";
import type { AiToolName } from "../tools/aiToolTypes";

export type AiFieldWorkRiskLevel = "low" | "medium" | "high";

export type AiFieldWorkMode =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden";

export type AiFieldWorkStatus = "loaded" | "empty" | "blocked";

export type AiFieldWorkClassification =
  | "FIELD_SAFE_READ_RECOMMENDATION"
  | "FIELD_DRAFT_REPORT_RECOMMENDATION"
  | "FIELD_DRAFT_ACT_RECOMMENDATION"
  | "FIELD_APPROVAL_REQUIRED_RECOMMENDATION"
  | "FIELD_FORBIDDEN_RECOMMENDATION_BLOCKED"
  | "FIELD_INSUFFICIENT_EVIDENCE_BLOCKED"
  | "FIELD_ROLE_FORBIDDEN_BLOCKED"
  | "FIELD_CONTRACTOR_SCOPE_BLOCKED"
  | "FIELD_UNKNOWN_TOOL_BLOCKED";

export type AiFieldWorkIntent =
  | "read_context"
  | "draft_report"
  | "draft_act"
  | "submit_for_approval"
  | "publish_report"
  | "sign_act"
  | "confirm_contractor_work";

export type AiFieldWorkScope =
  | "director_control_full_access"
  | "foreman_project_scope"
  | "contractor_own_scope";

export type AiFieldWorkAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AiFieldEvidenceType =
  | "field_context"
  | "foreman_report"
  | "contractor_act"
  | "subcontract"
  | "document"
  | "task";

export type AiFieldEvidenceSource =
  | "field_context"
  | "draft_report"
  | "draft_act"
  | "field_role_scope"
  | "field_evidence_policy";

export type AiFieldEvidenceRef = {
  type: AiFieldEvidenceType;
  ref: string;
  source: AiFieldEvidenceSource;
  redacted: true;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
};

export type AiFieldWorkItem = DraftActWorkItemInput & {
  workId?: string;
  status?: "planned" | "in_progress" | "ready_for_act" | "blocked" | "done";
  evidenceRefs?: readonly string[];
};

export type AiFieldDocumentRef = {
  documentId?: string;
  documentType: "report" | "act" | "photo" | "request" | "subcontract" | "other";
  title?: string;
  evidenceRef?: string;
};

export type AiFieldContextSnapshot = {
  scope: AiFieldWorkScope;
  objectId?: string;
  objectName?: string;
  subcontractId?: string;
  contractorUserIdHash?: string;
  periodStart?: string;
  periodEnd?: string;
  workSummary?: string;
  workItems?: readonly AiFieldWorkItem[];
  documents?: readonly AiFieldDocumentRef[];
  sourceEvidenceRefs?: readonly string[];
};

export type AiFieldWorkCopilotInput = {
  fieldContext?: AiFieldContextSnapshot | null;
  intent?: AiFieldWorkIntent;
  reportKind?: DraftReportKind;
  actKind?: DraftActKind;
  notes?: string;
};

export type AiFieldEmptyState = {
  reason: string;
  honestEmptyState: true;
  fakeFieldCards: false;
  mutationCount: 0;
};

export type AiFieldContextResult = {
  status: AiFieldWorkStatus;
  role: AiUserRole;
  roleScope: AiFieldWorkScope | null;
  fieldContext: AiFieldContextSnapshot | null;
  emptyState: AiFieldEmptyState | null;
  blockedReason: string | null;
  evidenceRefs: readonly AiFieldEvidenceRef[];
  availableTools: readonly AiToolName[];
  availableIntents: readonly AiFieldWorkIntent[];
  roleScoped: true;
  developerControlFullAccess: boolean;
  roleIsolationE2eClaimed: false;
  contractorOwnScopeEnforced: boolean;
  roleLeakageObserved: false;
  evidenceRequired: true;
  allContextHasEvidence: boolean;
  allToolsKnown: boolean;
  readOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  directSupabaseFromUi: false;
  mobileExternalFetch: false;
  externalLiveFetch: false;
  finalExecution: 0;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  reportPublished: false;
  actSigned: false;
  contractorConfirmation: false;
  paymentMutation: false;
  warehouseMutation: false;
  fakeFieldCards: false;
  hardcodedAiAnswer: false;
};

export type AiForemanReportDraft = {
  status: "draft" | "empty" | "blocked";
  role: AiUserRole;
  title: string;
  summary: string;
  draft: DraftReportToolOutput | null;
  evidenceRefs: readonly AiFieldEvidenceRef[];
  suggestedToolId: "draft_report" | null;
  suggestedMode: "draft_only" | "forbidden";
  approvalRequired: false;
  deterministic: true;
  roleScoped: true;
  evidenceBacked: boolean;
  contractorOwnScopeEnforced: boolean;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  reportPublished: false;
  actSigned: false;
  contractorConfirmation: false;
  paymentMutation: false;
  warehouseMutation: false;
  fakeFieldCards: false;
  hardcodedAiAnswer: false;
};

export type AiContractorActDraft = {
  status: "draft" | "empty" | "blocked";
  role: AiUserRole;
  title: string;
  summary: string;
  draft: DraftActToolOutput | null;
  evidenceRefs: readonly AiFieldEvidenceRef[];
  suggestedToolId: "draft_act" | null;
  suggestedMode: "draft_only" | "forbidden";
  approvalRequired: false;
  deterministic: true;
  roleScoped: true;
  evidenceBacked: boolean;
  contractorOwnScopeEnforced: boolean;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  reportPublished: false;
  actSigned: false;
  contractorConfirmation: false;
  paymentMutation: false;
  warehouseMutation: false;
  fakeFieldCards: false;
  hardcodedAiAnswer: false;
};

export type AiFieldActionPlan = {
  status: "preview" | "empty" | "blocked";
  intent: AiFieldWorkIntent;
  classification: AiFieldWorkClassification;
  role: AiUserRole;
  riskLevel: AiFieldWorkRiskLevel;
  suggestedToolId: AiToolName | null;
  suggestedMode: AiFieldWorkMode;
  approvalRequired: boolean;
  evidenceRefs: readonly AiFieldEvidenceRef[];
  exactReason: string | null;
  roleScoped: true;
  evidenceBacked: boolean;
  contractorOwnScopeEnforced: boolean;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
  providerCalled: false;
  rawRowsReturned: false;
  reportPublished: false;
  actSigned: false;
  contractorConfirmation: false;
  paymentMutation: false;
  warehouseMutation: false;
  fakeFieldCards: false;
};
