import type { AiUserRole } from "../policy/aiRolePolicy";
import type {
  GetWarehouseStatusToolInput,
  GetWarehouseStatusToolOutput,
  WarehouseStatusReader,
} from "../tools/getWarehouseStatusTool";

export type AiWarehouseCopilotRiskLevel = "low" | "medium" | "high";

export type AiWarehouseCopilotMode =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden";

export type AiWarehouseCopilotStatus = "loaded" | "empty" | "blocked";

export type AiWarehouseCopilotClassification =
  | "WAREHOUSE_SAFE_READ_RECOMMENDATION"
  | "WAREHOUSE_DRAFT_ACTION_RECOMMENDATION"
  | "WAREHOUSE_APPROVAL_REQUIRED_RECOMMENDATION"
  | "WAREHOUSE_FORBIDDEN_MUTATION_BLOCKED"
  | "WAREHOUSE_INSUFFICIENT_EVIDENCE_BLOCKED"
  | "WAREHOUSE_ROLE_FORBIDDEN_BLOCKED";

export type AiWarehouseCopilotAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AiWarehouseEvidenceType =
  | "warehouse_status"
  | "warehouse_low_stock"
  | "warehouse_movement"
  | "warehouse_draft_action";

export type AiWarehouseEvidenceRef = {
  type: AiWarehouseEvidenceType;
  ref: string;
  source: "get_warehouse_status" | "warehouse_copilot_policy";
  redacted: true;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
};

export type AiWarehouseCopilotInput = GetWarehouseStatusToolInput & {
  warehouseStatus?: GetWarehouseStatusToolOutput | null;
  readWarehouseStatus?: WarehouseStatusReader;
};

export type AiWarehouseRiskCard = {
  riskId: string;
  title: string;
  summary: string;
  riskLevel: AiWarehouseCopilotRiskLevel;
  urgency: "today" | "week" | "watch";
  source: "get_warehouse_status";
  evidenceRefs: readonly AiWarehouseEvidenceRef[];
  suggestedToolId: "get_warehouse_status";
  nextActionToolId: "draft_request" | null;
  suggestedMode: "safe_read" | "draft_only";
  approvalRequired: boolean;
  mutationCount: 0;
  stockMutated: false;
  reservationCreated: false;
  movementCreated: false;
  rawRowsReturned: false;
};

export type AiWarehouseEmptyState = {
  reason: string;
  honestEmptyState: true;
  fakeWarehouseCards: false;
  mutationCount: 0;
};

export type AiWarehouseCopilotStatusResult = {
  status: AiWarehouseCopilotStatus;
  role: AiUserRole;
  warehouseStatus: GetWarehouseStatusToolOutput | null;
  riskCards: readonly AiWarehouseRiskCard[];
  emptyState: AiWarehouseEmptyState | null;
  blockedReason: string | null;
  evidenceRefs: readonly AiWarehouseEvidenceRef[];
  roleScoped: true;
  developerControlFullAccess: boolean;
  roleIsolationE2eClaimed: false;
  evidenceRequired: true;
  allCardsHaveEvidence: boolean;
  allCardsHaveRiskPolicy: boolean;
  allCardsHaveKnownTool: boolean;
  movementSummaryReady: boolean;
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
  stockMutated: false;
  reservationCreated: false;
  movementCreated: false;
  fakeWarehouseCards: false;
  hardcodedAiAnswer: false;
};

export type AiWarehouseMovementSummaryPreview = {
  status: "preview" | "empty" | "blocked";
  role: AiUserRole;
  movementSummary: GetWarehouseStatusToolOutput["movement_summary"] | null;
  evidenceRefs: readonly AiWarehouseEvidenceRef[];
  roleScoped: true;
  evidenceBacked: boolean;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
  providerCalled: false;
  rawRowsReturned: false;
  stockMutated: false;
  reservationCreated: false;
  movementCreated: false;
  fakeWarehouseCards: false;
};

export type AiWarehouseRiskPreview = {
  status: "preview" | "empty" | "blocked";
  classification: AiWarehouseCopilotClassification;
  riskLevel: AiWarehouseCopilotRiskLevel;
  title: string;
  summary: string;
  riskCards: readonly AiWarehouseRiskCard[];
  evidenceRefs: readonly AiWarehouseEvidenceRef[];
  suggestedToolId: "get_warehouse_status" | null;
  suggestedMode: AiWarehouseCopilotMode;
  approvalRequired: boolean;
  roleScoped: true;
  evidenceBacked: boolean;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
  providerCalled: false;
  rawRowsReturned: false;
  stockMutated: false;
  reservationCreated: false;
  movementCreated: false;
  fakeWarehouseCards: false;
};

export type AiWarehouseDraftAction = {
  status: "draft" | "empty" | "blocked";
  title: string;
  summary: string;
  bulletPoints: readonly string[];
  evidenceRefs: readonly AiWarehouseEvidenceRef[];
  suggestedToolId: "draft_request" | null;
  suggestedMode: "draft_only" | "forbidden";
  approvalRequired: false;
  deterministic: true;
  roleScoped: true;
  evidenceBacked: boolean;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  stockMutated: false;
  reservationCreated: false;
  movementCreated: false;
  fakeWarehouseCards: false;
  hardcodedAiAnswer: false;
};
