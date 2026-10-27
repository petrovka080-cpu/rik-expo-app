import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";

export type AiScreenRuntimeStatus = "loaded" | "empty" | "blocked" | "not_mounted";

export type AiScreenRuntimeCardType =
  | "risk"
  | "task"
  | "draft"
  | "document"
  | "finance"
  | "warehouse"
  | "procurement"
  | "contractor"
  | "map"
  | "chat";

export type AiScreenRuntimePriority = "critical" | "high" | "normal" | "low";

export type AiScreenRuntimeCardAction =
  | "ask_why"
  | "open_source"
  | "preview_tool"
  | "create_draft"
  | "submit_for_approval";

export type AiScreenRuntimeIntent =
  | "read"
  | "search"
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
  | "execute_approved"
  | "navigate";

export type AiScreenRuntimeMountStatus = "mounted" | "future_or_not_mounted";

export type EvidenceRef = {
  id: string;
  source: "safe_read" | "draft_preview" | "approval_gate" | "runtime_policy";
  label: string;
  redacted: true;
  rawPayloadStored: false;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
};

export type AiScreenRuntimeRequest = {
  screenId: string;
  intent?: string;
  cursor?: string | null;
  limit?: number;
};

export type AiScreenRuntimeCard = {
  id: string;
  screenId: string;
  domain: AiDomain;
  type: AiScreenRuntimeCardType;
  title: string;
  summary: string;
  priority: AiScreenRuntimePriority;
  evidenceRefs: string[];
  allowedActions: AiScreenRuntimeCardAction[];
  requiresApproval: boolean;
  sourceEntityType?: string;
  sourceEntityIdHash?: string;
};

export type AiScreenRuntimeBlockedIntent = {
  intent: string;
  reason: string;
};

export type AiScreenRuntimeApprovalBoundary = {
  requiredForRiskyActions: true;
  finalMutationAllowed: false;
};

export type AiScreenRuntimeResponse = {
  status: AiScreenRuntimeStatus;
  screenId: string;
  role: AiUserRole;
  domain: AiDomain;
  cards: AiScreenRuntimeCard[];
  availableIntents: string[];
  blockedIntents: AiScreenRuntimeBlockedIntent[];
  evidenceRefs: EvidenceRef[];
  nextCursor: string | null;
  approvalBoundary: AiScreenRuntimeApprovalBoundary;
  roleScoped: true;
  evidenceBacked: true;
  readOnly: true;
  mutationCount: 0;
  directMutationAllowed: false;
  silentSubmitAllowed: false;
  providerCalled: false;
  dbAccessedDirectly: false;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
  providerPayloadStored: false;
  fakeCards: false;
  hardcodedAiResponse: false;
  roleLeakageObserved: false;
  source: "runtime:ai_screen_runtime_matrix_v1";
};

export type AiScreenRuntimeEvidenceInput = {
  evidenceRefs?: readonly string[];
  sourceEntityType?: string;
  sourceEntityIdHash?: string;
};

export type AiScreenRuntimeResolverInput = {
  auth: {
    userId: string;
    role: AiUserRole;
  } | null;
  request: AiScreenRuntimeRequest;
  evidence?: AiScreenRuntimeEvidenceInput | null;
};

export type AiScreenRuntimeProducerName =
  | "directorControlProducer"
  | "accountantFinanceProducer"
  | "buyerProcurementProducer"
  | "foremanObjectProducer"
  | "warehouseStatusProducer"
  | "contractorOwnWorkProducer"
  | "officeAccessProducer"
  | "mapObjectProducer"
  | "chatContextProducer"
  | "reportsDocumentsProducer";

export type AiScreenRuntimeRegistryEntry = {
  screenId: string;
  domain: AiDomain;
  mounted: AiScreenRuntimeMountStatus;
  actualSurface?: string;
  producerName: AiScreenRuntimeProducerName;
  allowedRoles: readonly AiUserRole[];
  entityTypes: readonly string[];
  availableIntents: readonly AiScreenRuntimeIntent[];
  blockedIntents: readonly AiScreenRuntimeIntent[];
  cardType: AiScreenRuntimeCardType;
  cardTitle: string;
  cardSummary: string;
  priority: AiScreenRuntimePriority;
  approvalRequired: boolean;
  evidenceRequired: true;
  maxCards: number;
  source: "ai_cross_screen_runtime_registry_v1";
};

export type AiScreenRuntimeProducerMetadata = {
  name: AiScreenRuntimeProducerName;
  domain: AiDomain;
  allowedRoles: readonly AiUserRole[];
  requiredEvidence: true;
  maxCards: number;
  riskLevel: "safe_read" | "draft_only" | "approval_required";
  mutationCount: 0;
};

export type AiScreenRuntimeProducerContext = {
  auth: {
    userId: string;
    role: AiUserRole;
  };
  entry: AiScreenRuntimeRegistryEntry;
  evidenceRefs: readonly string[];
  evidence: AiScreenRuntimeEvidenceInput | null;
};

export type AiScreenRuntimeProducerResult = {
  cards: readonly AiScreenRuntimeCard[];
  evidenceRefs: readonly EvidenceRef[];
  blockedIntents: readonly AiScreenRuntimeBlockedIntent[];
};

export type AiScreenRuntimeProducer = {
  metadata: AiScreenRuntimeProducerMetadata;
  produce: (context: AiScreenRuntimeProducerContext) => AiScreenRuntimeProducerResult;
};

export type AiScreenRuntimeIntentPreviewInput = AiScreenRuntimeRequest & {
  evidenceRefs?: readonly string[];
};

export type AiScreenRuntimeIntentPreviewOutput = {
  status: AiScreenRuntimeStatus;
  screenId: string;
  role: AiUserRole;
  intent: string;
  allowed: boolean;
  reason: string;
  evidenceRefs: string[];
  nextAction: "explain" | "create_draft" | "submit_for_approval" | "blocked";
  approvalBoundary: AiScreenRuntimeApprovalBoundary;
  mutationCount: 0;
  finalMutationAllowed: false;
};

export type AiScreenRuntimeActionPlanInput = AiScreenRuntimeRequest & {
  action: AiScreenRuntimeCardAction;
  evidenceRefs?: readonly string[];
};

export type AiScreenRuntimeActionPlanOutput = {
  status: "planned" | "blocked";
  screenId: string;
  role: AiUserRole;
  action: AiScreenRuntimeCardAction;
  planMode: "safe_read_preview" | "draft_only" | "approval_boundary" | "blocked";
  evidenceRefs: string[];
  requiresApproval: boolean;
  mutationCount: 0;
  finalMutationAllowed: false;
  executed: false;
};

export const AI_SCREEN_RUNTIME_CONTRACT = Object.freeze({
  contractId: "ai_cross_screen_runtime_matrix_v1",
  source: "runtime:ai_screen_runtime_matrix_v1",
  roleScoped: true,
  evidenceRequired: true,
  mutationCount: 0,
  directMutationAllowed: false,
  finalMutationAllowed: false,
  providerCalled: false,
  dbAccessedDirectly: false,
  rawDbRowsExposed: false,
  rawPromptExposed: false,
  fakeCards: false,
} as const);
