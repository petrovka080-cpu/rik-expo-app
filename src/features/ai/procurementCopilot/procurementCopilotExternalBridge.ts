import { PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS } from "../externalIntel/externalSourceRegistry";
import { createExternalIntelGateway } from "../externalIntel/ExternalIntelGateway";
import type {
  ProcurementAuthContext,
  ProcurementRequestedItem,
} from "../procurement/procurementContextTypes";
import type {
  ProcurementCopilotExternalIntelStatus,
  ProcurementCopilotExternalPreview,
} from "./procurementCopilotTypes";
import {
  normalizeProcurementCopilotOptionalText,
  uniqueProcurementCopilotRefs,
} from "./procurementCopilotRedaction";

function externalStatusFromGatewayStatus(
  status: "loaded" | "empty" | "blocked" | "external_policy_not_enabled" | "external_provider_not_configured",
): ProcurementCopilotExternalIntelStatus {
  if (status === "external_policy_not_enabled") return "disabled";
  if (status === "external_provider_not_configured") return "provider_not_configured";
  if (status === "loaded" || status === "empty") return "checked";
  return "blocked";
}

function buildQuery(items: readonly ProcurementRequestedItem[], location?: string): string {
  const labels = items
    .map((item) => item.materialLabel)
    .filter((label) => label.trim().length > 0)
    .slice(0, 5);
  const locationPart = normalizeProcurementCopilotOptionalText(location);
  return uniqueProcurementCopilotRefs([...labels, ...(locationPart ? [`location:${locationPart}`] : [])]).join(" ");
}

export async function previewProcurementCopilotExternalIntel(params: {
  auth: ProcurementAuthContext | null;
  items: readonly ProcurementRequestedItem[];
  location?: string;
  internalEvidenceRefs: readonly string[];
  marketplaceChecked: boolean;
  externalRequested?: boolean;
  sourcePolicyIds?: readonly string[];
  externalGateway?: ReturnType<typeof createExternalIntelGateway>;
}): Promise<ProcurementCopilotExternalPreview> {
  if (params.externalRequested !== true) {
    return {
      status: "not_needed",
      externalChecked: false,
      citations: [],
      supplierCards: [],
      evidenceRefs: [],
      providerCalled: false,
      mutationCount: 0,
    };
  }

  if (!params.auth || params.items.length === 0 || params.internalEvidenceRefs.length === 0 || !params.marketplaceChecked) {
    return {
      status: "blocked",
      externalChecked: false,
      citations: [],
      supplierCards: [],
      evidenceRefs: [],
      providerCalled: false,
      mutationCount: 0,
    };
  }

  const gateway = params.externalGateway ?? createExternalIntelGateway();
  const result = await gateway.searchPreview({
    domain: "procurement",
    query: buildQuery(params.items, params.location) || "procurement material",
    location: params.location,
    internalEvidenceRefs: [...params.internalEvidenceRefs],
    marketplaceChecked: params.marketplaceChecked,
    sourcePolicyIds: [...(params.sourcePolicyIds ?? PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS)],
    limit: 5,
  });

  return {
    status: externalStatusFromGatewayStatus(result.status),
    externalChecked: result.externalChecked,
    citations: result.citations,
    supplierCards: result.results.map((item) => ({
      supplierLabel: item.title,
      source: "external",
      priceBucket: "unknown",
      deliveryBucket: "unknown",
      availabilityBucket: "unknown",
      riskFlags: ["external_preview_only", "approval_required_for_action"],
      evidenceRefs: [item.evidenceRef],
      citationRefs: result.citations
        .filter((citation) => citation.sourceId === item.sourceId)
        .map((citation) => citation.urlHash),
    })),
    evidenceRefs: uniqueProcurementCopilotRefs(result.results.map((item) => item.evidenceRef)),
    providerCalled: result.providerCalled,
    mutationCount: 0,
  };
}
