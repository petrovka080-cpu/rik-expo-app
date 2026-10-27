export const AI_ESTIMATE_PLATFORM_ENTRY_IDS = [
  "request",
  "consumer_repair_ai_estimate",
  "approved_history_reopen_edit",
  "foreman_materials_estimate",
  "foreman_subcontracts_estimate",
  "director_review",
  "pdf_package",
  "buyer_handoff",
  "trusted_costing",
  "material_quantity",
  "material_completeness",
] as const;

export type AiEstimatePlatformEntryId = typeof AI_ESTIMATE_PLATFORM_ENTRY_IDS[number];

export type AiEstimatePlatformEntry = {
  entryId: AiEstimatePlatformEntryId;
  routeOrSurface: string;
  ownerFeature: string;
  usesSharedEstimateEngine: boolean;
  usesSharedSnapshotModel: boolean;
  usesSharedRevisionModel: boolean;
  usesSharedPdfRenderer: boolean;
  usesSharedBuyerHandoff: boolean;
  usesSharedCosting: boolean;
  usesSharedMaterialQuantity: boolean;
  forbiddenLocalCalculator: boolean;
  forbiddenRawDump: boolean;
  forbiddenFakeTotal: boolean;
};

export type PlatformCoreRegistryValidation = {
  platform_core_registry_created: boolean;
  all_estimate_entries_registered: boolean;
  all_entries_use_shared_engine: boolean;
  all_entries_use_shared_snapshot_model: boolean;
  all_entries_use_shared_revision_model: boolean;
  all_entries_use_shared_pdf_renderer: boolean;
  all_entries_use_shared_buyer_handoff: boolean;
  all_entries_use_shared_costing: boolean;
  all_entries_use_shared_material_quantity: boolean;
  no_unregistered_estimate_entry_points: boolean;
  duplicate_entry_ids_detected: boolean;
  forbidden_local_calculator_detected: boolean;
  forbidden_raw_dump_detected: boolean;
  forbidden_fake_total_detected: boolean;
  passed: boolean;
  failures: string[];
};
