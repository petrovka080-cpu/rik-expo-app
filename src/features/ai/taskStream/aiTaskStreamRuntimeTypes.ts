import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiToolName } from "../tools/aiToolTypes";

export type AiTaskStreamRuntimeStatus = "loaded" | "empty" | "blocked";

export type AiTaskStreamCardType =
  | "approval_pending"
  | "supplier_price_change"
  | "warehouse_low_stock"
  | "draft_ready"
  | "report_ready"
  | "finance_risk"
  | "missing_document"
  | "recommended_next_action";

export type AiTaskStreamPriority = "critical" | "high" | "normal" | "low";

export type AiTaskStreamAction =
  | "ask_why"
  | "open_source"
  | "preview_tool"
  | "create_draft"
  | "submit_for_approval";

export type AiTaskStreamScope =
  | {
      kind: "cross_domain";
    }
  | {
      kind: "role_domain";
      allowedRoles: readonly AiUserRole[];
    }
  | {
      kind: "own_record";
      ownerUserIdHash: string;
    };

export type EvidenceRef = {
  id: string;
  source: "safe_read" | "draft_preview" | "approval_gate" | "runtime_policy";
  label: string;
  redacted: true;
  rawPayloadStored: false;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
};

export type AiTaskStreamCard = {
  id: string;
  type: AiTaskStreamCardType;
  domain: AiDomain;
  title: string;
  summary: string;
  priority: AiTaskStreamPriority;
  evidenceRefs: string[];
  allowedActions: AiTaskStreamAction[];
  requiresApproval: boolean;
  sourceScreenId?: string;
  sourceEntityType?: string;
  sourceEntityIdHash?: string;
  createdAt: string;
  scope: AiTaskStreamScope;
  recommendedToolName?: AiToolName;
  nextActionLabel?: string;
};

export type AiTaskStreamRuntimeAuth = {
  userId: string;
  role: AiUserRole;
};

export type AiTaskStreamWarehouseEvidence = {
  summary: string;
  evidenceRefs: readonly string[];
  lowStockFlags?: readonly string[];
  sourceScreenId?: string;
  sourceEntityIdHash?: string;
};

export type AiTaskStreamDraftEvidence = {
  draftId: string;
  draftKind: "request" | "report" | "act";
  domain: AiDomain;
  summary: string;
  evidenceRefs: readonly string[];
  sourceScreenId?: string;
  ownerUserIdHash?: string;
};

export type AiTaskStreamApprovalEvidence = {
  actionId: string;
  domain: AiDomain;
  screenId: string;
  summary: string;
  evidenceRefs: readonly string[];
  ownerUserIdHash?: string;
};

export type AiTaskStreamFinanceEvidence = {
  summary: string;
  evidenceRefs: readonly string[];
  riskFlags?: readonly string[];
  overdueCount?: number;
  debtAmount?: number;
};

export type AiTaskStreamProcurementEvidence = {
  summary: string;
  materialIds: readonly string[];
  evidenceRefs: readonly string[];
  sourceScreenId?: string;
};

export type AiTaskStreamRuntimeEvidenceInput = {
  warehouse?: AiTaskStreamWarehouseEvidence | null;
  drafts?: readonly AiTaskStreamDraftEvidence[];
  approvals?: readonly AiTaskStreamApprovalEvidence[];
  finance?: AiTaskStreamFinanceEvidence | null;
  procurement?: AiTaskStreamProcurementEvidence | null;
};

export type AiTaskStreamRuntimeInput = {
  auth: AiTaskStreamRuntimeAuth | null;
  screenId: string;
  cursor?: string | null;
  limit?: number;
  evidence?: AiTaskStreamRuntimeEvidenceInput;
  nowIso?: string;
};

export type AiTaskStreamProducerName =
  | "approvalPendingProducer"
  | "warehouseStatusProducer"
  | "draftReadyProducer"
  | "reportReadyProducer"
  | "financeRiskProducer"
  | "procurementNextActionProducer";

export type AiTaskStreamProducerMetadata = {
  name: AiTaskStreamProducerName;
  domain: AiDomain;
  roles: readonly AiUserRole[];
  inputPolicy: "evidence_required" | "scoped_evidence_required";
  evidenceRequired: true;
  maxCards: number;
  riskLevel: "safe_read" | "draft_only" | "approval_required";
  mutation_count: 0;
};

export type AiTaskStreamProducerBlock = {
  producer: AiTaskStreamProducerName;
  code:
    | "BLOCKED_PRODUCER_BACKEND_NOT_READY"
    | "BLOCKED_FINANCE_TOOL_NOT_READY"
    | "BLOCKED_ROLE_DENIED"
    | "BLOCKED_SCREEN_POLICY_DENIED";
  reason: string;
};

export type AiTaskStreamProducerResult = {
  cards: readonly AiTaskStreamCard[];
  evidenceRefs: readonly EvidenceRef[];
  blocks: readonly AiTaskStreamProducerBlock[];
};

export type AiTaskStreamProducerContext = {
  auth: AiTaskStreamRuntimeAuth;
  screenId: string;
  nowIso: string;
  evidence: AiTaskStreamRuntimeEvidenceInput;
};

export type AiTaskStreamCardProducer = {
  metadata: AiTaskStreamProducerMetadata;
  produce: (context: AiTaskStreamProducerContext) => AiTaskStreamProducerResult;
};

export type AiTaskStreamRuntimeResult = {
  status: AiTaskStreamRuntimeStatus;
  role: AiUserRole;
  screenId: string;
  cards: AiTaskStreamCard[];
  nextCursor: string | null;
  countsByType: Record<string, number>;
  evidenceRefs: EvidenceRef[];
  blockedReason?: string;
  producerBlocks: AiTaskStreamProducerBlock[];
  roleScoped: true;
  evidenceBacked: true;
  readOnly: true;
  mutationCount: 0;
  directMutationAllowed: false;
  providerCalled: false;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
  fakeCards: false;
  hardcodedAiResponse: false;
  source: "runtime:ai_task_stream_v1";
};
