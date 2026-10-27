import type { AiUserRole } from "../policy/aiRolePolicy";
import type {
  EvidenceRef,
  ProcurementApprovalPreviewOutput,
  ProcurementAuthContext,
  ProcurementCatalogReader,
  ProcurementDraftPreviewOutput,
  ProcurementRequestContext,
  ProcurementRequestContextResolverInput,
  ProcurementRequestedItem,
  ProcurementSafeRequestSnapshot,
  ProcurementSupplierReader,
} from "../procurement/procurementContextTypes";
import type { ExternalIntelCitation } from "../externalIntel/externalIntelTypes";
import type { ExternalIntelGateway } from "../externalIntel/ExternalIntelGateway";

export type ProcurementCopilotStatus = "loaded" | "empty" | "blocked";

export type ProcurementCopilotContext = {
  status: ProcurementCopilotStatus;
  role: AiUserRole;
  screenId: string;
  requestIdHash?: string;
  projectLabel?: string;
  requestedItems: {
    materialLabel: string;
    category?: string;
    quantity?: number;
    unit?: string;
    urgency?: "critical" | "high" | "normal" | "low";
  }[];
  internalEvidenceRefs: EvidenceRef[];
  missingFields: string[];
  approvalRequired: true;
};

export type ProcurementCopilotExternalIntelStatus =
  | "disabled"
  | "provider_not_configured"
  | "not_needed"
  | "checked"
  | "blocked";

export type ProcurementCopilotSupplierCard = {
  supplierLabel: string;
  source: "internal" | "marketplace" | "external";
  priceBucket?: "low" | "medium" | "high" | "unknown";
  deliveryBucket?: "fast" | "normal" | "slow" | "unknown";
  availabilityBucket?: "available" | "limited" | "unknown";
  riskFlags: string[];
  evidenceRefs: string[];
  citationRefs?: string[];
};

export type ProcurementCopilotPlan = {
  status: "ready" | "empty" | "blocked";
  internalDataChecked: true;
  marketplaceChecked: boolean;
  externalIntelStatus: ProcurementCopilotExternalIntelStatus;
  summary: string;
  supplierCards: ProcurementCopilotSupplierCard[];
  recommendedNextAction: "draft_request" | "explain" | "blocked";
  requiresApproval: true;
  evidenceRefs: string[];
};

export type ProcurementCopilotDraftPreview = ProcurementDraftPreviewOutput;

export type ProcurementCopilotSubmitForApprovalPreview = ProcurementApprovalPreviewOutput;

export type ProcurementCopilotPlanInput = {
  requestId: string;
  screenId: string;
  organizationId?: string;
  cursor?: string | null;
  requestSnapshot?: ProcurementSafeRequestSnapshot | null;
  externalRequested?: boolean;
  externalSourcePolicyIds?: readonly string[];
  searchCatalogItems?: ProcurementCatalogReader;
  listSuppliers?: ProcurementSupplierReader;
  externalGateway?: ExternalIntelGateway;
  recordStep?: (step: ProcurementCopilotContextSourceOrder[number]) => void;
};

export type ProcurementCopilotDraftPreviewInput = {
  context: ProcurementCopilotContext;
  plan: ProcurementCopilotPlan;
  title?: string;
  deliveryWindow?: string;
  notes?: string;
};

export type ProcurementCopilotPlanRequest = {
  auth: ProcurementAuthContext | null;
  input: ProcurementCopilotPlanInput;
};

export type ProcurementCopilotContextRequest = {
  auth: ProcurementAuthContext | null;
  input: ProcurementRequestContextResolverInput;
};

export type ProcurementCopilotDraftBridgeRequest = {
  auth: ProcurementAuthContext | null;
  input: ProcurementCopilotDraftPreviewInput;
};

export type ProcurementCopilotSubmitPreviewInput = {
  draftId: string;
  requestIdHash?: string;
  screenId: string;
  summary: string;
  idempotencyKey: string;
  evidenceRefs: readonly string[];
};

export type ProcurementCopilotNoMutationProof = {
  toolsCalled: readonly ("search_catalog" | "compare_suppliers" | "draft_request")[];
  mutationCount: 0;
  finalMutationAllowed: false;
  supplierConfirmationAllowed: false;
  orderCreationAllowed: false;
  warehouseMutationAllowed: false;
  documentSendAllowed: false;
  externalResultCanFinalize: false;
};

export type ProcurementCopilotExternalPreview = {
  status: ProcurementCopilotExternalIntelStatus;
  externalChecked: boolean;
  citations: ExternalIntelCitation[];
  supplierCards: ProcurementCopilotSupplierCard[];
  evidenceRefs: string[];
  providerCalled: boolean;
  mutationCount: 0;
};

export type ProcurementCopilotResolvedPlan = {
  context: ProcurementCopilotContext;
  procurementContext: ProcurementRequestContext;
  plan: ProcurementCopilotPlan;
  draftPreview: ProcurementCopilotDraftPreview;
  submitForApprovalPreview: ProcurementCopilotSubmitForApprovalPreview;
  proof: ProcurementCopilotNoMutationProof;
};

export type ProcurementCopilotRouteResult = {
  context: ProcurementCopilotContext;
  plan?: ProcurementCopilotPlan;
  draftPreview?: ProcurementCopilotDraftPreview;
  submitForApprovalPreview?: ProcurementCopilotSubmitForApprovalPreview;
  mutationCount: 0;
};

export type ProcurementCopilotRoleDecision = {
  allowed: boolean;
  role: AiUserRole;
  reason: "allowed" | "auth_required" | "role_scope_denied";
  approvalRequired: true;
  finalMutationAllowed: false;
};

export type ProcurementCopilotContextSourceOrder = readonly [
  "internal_request_context",
  "internal_marketplace",
  "compare_suppliers",
  "external_intel_status",
  "draft_request_preview",
  "approval_boundary",
];

export const PROCUREMENT_COPILOT_SOURCE_ORDER: ProcurementCopilotContextSourceOrder = [
  "internal_request_context",
  "internal_marketplace",
  "compare_suppliers",
  "external_intel_status",
  "draft_request_preview",
  "approval_boundary",
] as const;

export function toCopilotRequestedItems(
  items: readonly ProcurementRequestedItem[],
): ProcurementCopilotContext["requestedItems"] {
  return items.map((item) => ({
    materialLabel: item.materialLabel,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    urgency: item.urgency,
  }));
}
