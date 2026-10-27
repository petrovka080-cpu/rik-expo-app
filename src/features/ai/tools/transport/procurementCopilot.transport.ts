import type { ProcurementSafeRequestSnapshot } from "../../procurement/procurementContextTypes";
import { runProcurementCopilotRuntimeChain } from "../../procurementCopilot/procurementCopilotPlanEngine";
import type {
  ProcurementCopilotDraftPreview,
  ProcurementCopilotPlan,
  ProcurementCopilotSubmitForApprovalPreview,
} from "../../procurementCopilot/procurementCopilotTypes";
import type {
  AiProcurementCopilotTransportInput,
  AiToolTransportAuthContext,
} from "./aiToolTransportTypes";

export const PROCUREMENT_COPILOT_TRANSPORT_ROUTE_SCOPE =
  "agent.procurement_copilot.preview" as const;

export type ProcurementCopilotTransportRequest = {
  auth: AiToolTransportAuthContext | null;
  input: AiProcurementCopilotTransportInput;
  requestSnapshot?: ProcurementSafeRequestSnapshot | null;
};

export type ProcurementCopilotTransportOutput = {
  status: "ready" | "empty" | "blocked";
  requestIdHash: string | null;
  plan: ProcurementCopilotPlan;
  draftPreview: ProcurementCopilotDraftPreview;
  submitForApprovalPreview: ProcurementCopilotSubmitForApprovalPreview;
  evidenceRefs: readonly string[];
  blockedReason: string | null;
  routeScope: typeof PROCUREMENT_COPILOT_TRANSPORT_ROUTE_SCOPE;
  boundedRequest: true;
  dtoOnly: true;
  redactionRequired: true;
  rawRowsExposed: false;
  rawProviderPayloadExposed: false;
  mutationCount: 0;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export async function runProcurementCopilotTransport(
  request: ProcurementCopilotTransportRequest,
): Promise<ProcurementCopilotTransportOutput> {
  const requestId = normalizeText(request.input.request_ref);
  const screenId = normalizeText(request.input.screen_id) || "ai.procurement.copilot";
  const result = await runProcurementCopilotRuntimeChain({
    auth: request.auth,
    input: {
      requestId,
      screenId,
      organizationId: normalizeText(request.input.organization_ref) || undefined,
      cursor: request.input.cursor,
      requestSnapshot: request.requestSnapshot,
      externalRequested: request.input.external_requested,
      externalSourcePolicyIds: request.input.external_source_policy_ids,
    },
  });

  return {
    status: result.plan.status,
    requestIdHash: result.context.requestIdHash ?? null,
    plan: result.plan,
    draftPreview: result.draftPreview,
    submitForApprovalPreview: result.submitForApprovalPreview,
    evidenceRefs: result.plan.evidenceRefs,
    blockedReason:
      result.plan.status === "blocked"
        ? "BLOCKED_PROCUREMENT_COPILOT_TRANSPORT"
        : null,
    routeScope: PROCUREMENT_COPILOT_TRANSPORT_ROUTE_SCOPE,
    boundedRequest: true,
    dtoOnly: true,
    redactionRequired: true,
    rawRowsExposed: false,
    rawProviderPayloadExposed: false,
    mutationCount: 0,
  };
}
