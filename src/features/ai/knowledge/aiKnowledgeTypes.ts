import type { AiUserRole } from "../policy/aiRolePolicy";
import type { AiActionType, AiRiskLevel } from "../policy/aiRiskPolicy";

export type AiBusinessDomain =
  | "control"
  | "projects"
  | "procurement"
  | "marketplace"
  | "warehouse"
  | "finance"
  | "reports"
  | "documents"
  | "subcontracts"
  | "contractors"
  | "map"
  | "chat"
  | "office"
  | "real_estate_future";

export type AiBusinessEntity =
  | "project"
  | "request"
  | "supplier"
  | "material"
  | "warehouse_item"
  | "stock_movement"
  | "payment"
  | "company_debt"
  | "accounting_posting"
  | "report"
  | "pdf_document"
  | "act"
  | "subcontract"
  | "contractor"
  | "chat_thread"
  | "map_object"
  | "office_member"
  | "invite";

export type AiIntent =
  | "find"
  | "summarize"
  | "compare"
  | "explain"
  | "draft"
  | "prepare_report"
  | "prepare_act"
  | "prepare_request"
  | "check_status"
  | "find_risk"
  | "submit_for_approval"
  | "approve"
  | "execute_approved";

export type AiKnowledgeContextPolicy =
  | "none"
  | "role_scoped"
  | "director_full"
  | "own_records_only"
  | "redacted_finance"
  | "redacted_marketplace";

export type AiKnowledgeSourceKind =
  | "screen_state"
  | "bff_route"
  | "transport"
  | "report"
  | "pdf"
  | "attachment"
  | "ai_report"
  | "audit_log"
  | "future_tool";

export type AiDomainKnowledgeEntry = {
  domain: AiBusinessDomain;
  label: string;
  professionalDescription: string;
  primaryEntities: readonly AiBusinessEntity[];
  commonUserQuestions: readonly string[];
  allowedIntents: readonly AiIntent[];
  requiresEvidenceFor: readonly AiIntent[];
  defaultContextPolicy: AiKnowledgeContextPolicy;
};

export type AiEntitySensitiveFieldsPolicy =
  | "none"
  | "redact_ids"
  | "redact_finance"
  | "redact_internal"
  | "own_records_only";

export type AiEntityKnowledgeEntry = {
  entity: AiBusinessEntity;
  label: string;
  domains: readonly AiBusinessDomain[];
  readableByRoles: readonly AiUserRole[];
  sensitiveFieldsPolicy: AiEntitySensitiveFieldsPolicy;
  usefulForIntents: readonly AiIntent[];
  evidenceRequired: boolean;
};

export type AiScreenKnowledgeEntry = {
  screenId: string;
  domain: AiBusinessDomain;
  title: string;
  availableEntities: readonly AiBusinessEntity[];
  allowedIntents: readonly AiIntent[];
  documentSources: readonly string[];
  reportSources: readonly string[];
  pdfSources: readonly string[];
  defaultQuestions: readonly string[];
  roleNotes: Partial<Record<AiUserRole, string>>;
  contextPolicy: AiKnowledgeContextPolicy;
  futureOrExistingRoute?: boolean;
  actualSurface?: string;
};

export type AiDocumentSourceKind =
  | "report"
  | "pdf"
  | "act"
  | "attachment"
  | "ai_report"
  | "document";

export type AiDocumentSourceEntry = {
  sourceId: string;
  kind: AiDocumentSourceKind;
  domains: readonly AiBusinessDomain[];
  entities: readonly AiBusinessEntity[];
  readableByRoles: readonly AiUserRole[];
  contextPolicy: AiKnowledgeContextPolicy;
  canSummarize: boolean;
  canDraft: boolean;
  canSend: "never" | "approval_required";
};

export type AiIntentKnowledgeEntry = {
  intent: AiIntent;
  mapsToActionTypes: readonly AiActionType[];
  defaultRisk: AiRiskLevel;
  requiresApproval: boolean;
  canBeAnsweredWithoutTool: boolean;
  requiresEvidence: boolean;
  professionalAnswerSections: readonly string[];
  executionBoundary: "none" | "draft_only" | "aiApprovalGate";
};

export type AiKnowledgeResolveParams = {
  role: AiUserRole;
  screenId: string;
  organizationScope?: "known" | "unknown";
  projectScope?: "known" | "unknown";
};

export type AiResolvedIntent = {
  intent: AiIntent;
  allowed: boolean;
  riskLevel: AiRiskLevel;
  requiresApproval: boolean;
  reason: string;
};

export type AiResolvedScreenKnowledge = {
  role: AiUserRole;
  screenId: string;
  domain: AiBusinessDomain;
  screenTitle: string;
  contextPolicy: AiKnowledgeContextPolicy;
  allowedEntities: readonly AiBusinessEntity[];
  allowedIntents: readonly AiResolvedIntent[];
  blockedIntents: readonly AiResolvedIntent[];
  documentSourceIds: readonly string[];
  reportSourceIds: readonly string[];
  pdfSourceIds: readonly string[];
  approvalBoundarySummary: string;
  redactionPolicy: AiKnowledgeContextPolicy;
  professionalAnswerRequirements: readonly string[];
  fullDomainKnowledge: boolean;
};
