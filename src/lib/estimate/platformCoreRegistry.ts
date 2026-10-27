import type { AiEstimatePlatformEntry } from "./platformCoreContracts";
import { AI_ESTIMATE_PLATFORM_ENTRY_IDS } from "./platformCoreContracts";

function shared(entry: Pick<AiEstimatePlatformEntry, "entryId" | "routeOrSurface" | "ownerFeature">): AiEstimatePlatformEntry {
  return {
    ...entry,
    usesSharedEstimateEngine: true,
    usesSharedSnapshotModel: true,
    usesSharedRevisionModel: true,
    usesSharedPdfRenderer: true,
    usesSharedBuyerHandoff: true,
    usesSharedCosting: true,
    usesSharedMaterialQuantity: true,
    forbiddenLocalCalculator: false,
    forbiddenRawDump: false,
    forbiddenFakeTotal: false,
  };
}

export const EXPECTED_AI_ESTIMATE_PLATFORM_ENTRY_IDS = AI_ESTIMATE_PLATFORM_ENTRY_IDS;

export const AI_ESTIMATE_PLATFORM_CORE_REGISTRY: readonly AiEstimatePlatformEntry[] = [
  shared({
    entryId: "request",
    routeOrSurface: "/request",
    ownerFeature: "src/features/consumerRepair",
  }),
  shared({
    entryId: "consumer_repair_ai_estimate",
    routeOrSurface: "consumer repair AI estimate workspace",
    ownerFeature: "src/features/consumerRepair",
  }),
  shared({
    entryId: "approved_history_reopen_edit",
    routeOrSurface: "approved history reopen/edit",
    ownerFeature: "src/features/consumerRepair",
  }),
  shared({
    entryId: "foreman_materials_estimate",
    routeOrSurface: "/office/foreman materials block",
    ownerFeature: "src/screens/foreman",
  }),
  shared({
    entryId: "foreman_subcontracts_estimate",
    routeOrSurface: "/office/foreman subcontracts block",
    ownerFeature: "src/screens/foreman",
  }),
  shared({
    entryId: "director_review",
    routeOrSurface: "/office/director",
    ownerFeature: "src/lib/foreman",
  }),
  shared({
    entryId: "pdf_package",
    routeOrSurface: "professional PDF package",
    ownerFeature: "src/features/pdf",
  }),
  shared({
    entryId: "buyer_handoff",
    routeOrSurface: "buyer procurement handoff",
    ownerFeature: "src/features/procurement",
  }),
  shared({
    entryId: "trusted_costing",
    routeOrSurface: "trusted costing pricebook",
    ownerFeature: "src/features/estimates/pricing",
  }),
  shared({
    entryId: "material_quantity",
    routeOrSurface: "material quantity trace",
    ownerFeature: "src/lib/estimate",
  }),
  shared({
    entryId: "material_completeness",
    routeOrSurface: "material completeness trace",
    ownerFeature: "src/features/pdf",
  }),
];

export function platformCoreRegistryById(): Map<AiEstimatePlatformEntry["entryId"], AiEstimatePlatformEntry> {
  return new Map(AI_ESTIMATE_PLATFORM_CORE_REGISTRY.map((entry) => [entry.entryId, entry]));
}
