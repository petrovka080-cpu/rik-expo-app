import type { AiUserRole } from "../policy/aiRolePolicy";
import type { CatalogItem, Supplier } from "../../../lib/catalog/catalog.types";

export type ProcurementContextStatus = "loaded" | "empty" | "blocked";
export type ProcurementAllowedNextAction =
  | "search_catalog"
  | "compare_suppliers"
  | "draft_request"
  | "submit_for_approval";

export type ProcurementEvidenceSource =
  | "internal_app"
  | "marketplace"
  | "external_policy"
  | "draft_preview"
  | "approval_gate";

export type EvidenceRef = {
  id: string;
  source: ProcurementEvidenceSource;
  label: string;
  redacted: true;
  payloadStored: false;
  rowDataExposed: false;
  promptStored: false;
};

export type ProcurementRequestedItem = {
  materialLabel: string;
  quantity?: number;
  unit?: string;
  category?: string;
  urgency?: "critical" | "high" | "normal" | "low";
};

export type ProcurementProjectSummary = {
  projectIdHash?: string;
  title?: string;
  locationBucket?: string;
};

export type ProcurementRequestContext = {
  status: ProcurementContextStatus;
  requestIdHash: string;
  role: AiUserRole;
  screenId: string;
  projectSummary: ProcurementProjectSummary;
  requestedItems: ProcurementRequestedItem[];
  internalEvidenceRefs: EvidenceRef[];
  missingFields: string[];
  allowedNextActions: ProcurementAllowedNextAction[];
  approvalRequired: true;
};

export type ProcurementAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type ProcurementSafeRequestItemSnapshot = {
  materialLabel?: string;
  quantity?: number;
  unit?: string;
  category?: string;
  urgency?: "critical" | "high" | "normal" | "low";
};

export type ProcurementSafeRequestSnapshot = {
  requestId: string;
  title?: string;
  projectId?: string;
  projectTitle?: string;
  location?: string;
  items?: readonly ProcurementSafeRequestItemSnapshot[];
  evidenceRefs?: readonly string[];
};

export type ProcurementRequestContextResolverInput = {
  auth: ProcurementAuthContext | null;
  requestId: string;
  screenId: string;
  cursor?: string | null;
  organizationId?: string;
  requestSnapshot?: ProcurementSafeRequestSnapshot | null;
};

export type ProcurementSourceCheck = "internal_app" | "marketplace" | "external_policy";

export type ProcurementInternalFirstPlan = {
  status: ProcurementContextStatus;
  sourceOrder: readonly ProcurementSourceCheck[];
  internalDataChecked: true;
  marketplaceChecked: boolean;
  externalChecked: false;
  externalStatus: "not_requested" | "external_policy_not_enabled" | "external_policy_blocked";
  evidenceRefs: string[];
  missingData: string[];
  violations: string[];
  recommendationAllowed: boolean;
  finalMutationAllowed: false;
};

export type SupplierMatchPreviewInput = {
  requestIdHash?: string;
  items: {
    materialLabel: string;
    category?: string;
    quantity?: number;
    unit?: string;
  }[];
  location?: string;
  limit?: number;
};

export type SupplierMatchPreviewOutput = {
  status: ProcurementContextStatus;
  internalDataChecked: true;
  marketplaceChecked: true;
  externalChecked: boolean;
  externalStatus?: "not_requested" | "external_policy_not_enabled" | "external_policy_blocked";
  supplierCards: {
    supplierLabel: string;
    priceBucket?: "low" | "medium" | "high" | "unknown";
    deliveryBucket?: "fast" | "normal" | "slow" | "unknown";
    availabilityBucket?: "available" | "limited" | "unknown";
    riskFlags: string[];
    evidenceRefs: string[];
  }[];
  recommendationSummary: string;
  missingData: string[];
  nextAction: "draft_request" | "explain" | "blocked";
  requiresApproval: true;
  evidenceRefs: string[];
};

export type ProcurementSafeToolName = "search_catalog" | "compare_suppliers" | "draft_request";

export type ProcurementNoMutationProof = {
  toolsCalled: readonly ProcurementSafeToolName[];
  mutationCount: 0;
  finalMutationAllowed: false;
  supplierSelectionAllowed: false;
  orderCreationAllowed: false;
  warehouseMutationAllowed: false;
  externalResultCanFinalize: false;
};

export type SupplierMatchPreviewResult = {
  output: SupplierMatchPreviewOutput;
  proof: ProcurementNoMutationProof;
};

export type ProcurementCatalogReader = (
  query: string,
  limit: number,
  apps?: string[],
) => Promise<readonly CatalogItem[]>;

export type ProcurementSupplierReader = (
  query: string,
  limit: number,
) => Promise<readonly Supplier[]>;

export type ProcurementDraftPreviewInput = {
  requestIdHash?: string;
  projectIdHash?: string;
  title?: string;
  items: {
    materialLabel: string;
    quantity?: number;
    unit?: string;
    supplierLabel?: string;
  }[];
  supplierLabel?: string;
  deliveryWindow?: string;
  notes?: string;
  evidenceRefs?: readonly string[];
};

export type ProcurementDraftPreviewOutput = {
  status: "draft_ready" | "blocked";
  draftPreview: {
    title: string;
    items: {
      materialLabel: string;
      quantity?: number;
      unit?: string;
      supplierLabel?: string;
    }[];
    notes: string[];
  };
  missingFields: string[];
  riskFlags: string[];
  evidenceRefs: string[];
  requiresApproval: true;
  nextAction: "submit_for_approval";
};

export type ProcurementDraftPreviewResult = {
  output: ProcurementDraftPreviewOutput;
  proof: ProcurementNoMutationProof;
};

export type ProcurementApprovalPreviewInput = {
  draftId: string;
  requestIdHash?: string;
  screenId: string;
  summary: string;
  idempotencyKey: string;
  evidenceRefs: readonly string[];
};

export type ProcurementApprovalPreviewOutput = {
  status: "pending" | "blocked";
  blocker?: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY";
  approvalRequired: true;
  idempotencyRequired: true;
  auditRequired: true;
  redactedPayloadOnly: true;
  persisted: boolean;
  mutationCount: 0;
  finalExecution: 0;
  evidenceRefs: string[];
};
