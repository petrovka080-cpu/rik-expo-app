import type {
  AiEstimatePlatformEntry,
  AiEstimatePlatformEntryId,
  PlatformCoreRegistryValidation,
} from "./platformCoreContracts";
import { AI_ESTIMATE_PLATFORM_ENTRY_IDS } from "./platformCoreContracts";
import { AI_ESTIMATE_PLATFORM_CORE_REGISTRY } from "./platformCoreRegistry";

function missingIds(entries: readonly AiEstimatePlatformEntry[], expected: readonly AiEstimatePlatformEntryId[]): AiEstimatePlatformEntryId[] {
  const registered = new Set(entries.map((entry) => entry.entryId));
  return expected.filter((entryId) => !registered.has(entryId));
}

function unexpectedIds(entries: readonly AiEstimatePlatformEntry[], expected: readonly AiEstimatePlatformEntryId[]): string[] {
  const expectedSet = new Set<string>(expected);
  return entries.map((entry) => entry.entryId).filter((entryId) => !expectedSet.has(entryId));
}

function duplicateIds(entries: readonly AiEstimatePlatformEntry[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.entryId)) duplicates.add(entry.entryId);
    seen.add(entry.entryId);
  }
  return [...duplicates];
}

export function validatePlatformCoreRegistry(
  entries: readonly AiEstimatePlatformEntry[] = AI_ESTIMATE_PLATFORM_CORE_REGISTRY,
  expected: readonly AiEstimatePlatformEntryId[] = AI_ESTIMATE_PLATFORM_ENTRY_IDS,
): PlatformCoreRegistryValidation {
  const missing = missingIds(entries, expected);
  const unexpected = unexpectedIds(entries, expected);
  const duplicates = duplicateIds(entries);
  const allSharedEngine = entries.every((entry) => entry.usesSharedEstimateEngine === true);
  const allSharedSnapshot = entries.every((entry) => entry.usesSharedSnapshotModel === true);
  const allSharedRevision = entries.every((entry) => entry.usesSharedRevisionModel === true);
  const allSharedPdf = entries.every((entry) => entry.usesSharedPdfRenderer === true);
  const allSharedBuyer = entries.every((entry) => entry.usesSharedBuyerHandoff === true);
  const allSharedCosting = entries.every((entry) => entry.usesSharedCosting === true);
  const allSharedMaterialQuantity = entries.every((entry) => entry.usesSharedMaterialQuantity === true);
  const forbiddenLocalCalculator = entries.some((entry) => entry.forbiddenLocalCalculator);
  const forbiddenRawDump = entries.some((entry) => entry.forbiddenRawDump);
  const forbiddenFakeTotal = entries.some((entry) => entry.forbiddenFakeTotal);
  const failures = [
    entries.length > 0 ? "" : "platform_core_registry_empty",
    missing.length === 0 ? "" : `missing_entries:${missing.join(",")}`,
    unexpected.length === 0 ? "" : `unexpected_entries:${unexpected.join(",")}`,
    duplicates.length === 0 ? "" : `duplicate_entries:${duplicates.join(",")}`,
    allSharedEngine ? "" : "entry_not_using_shared_engine",
    allSharedSnapshot ? "" : "entry_not_using_shared_snapshot_model",
    allSharedRevision ? "" : "entry_not_using_shared_revision_model",
    allSharedPdf ? "" : "entry_not_using_shared_pdf_renderer",
    allSharedBuyer ? "" : "entry_not_using_shared_buyer_handoff",
    allSharedCosting ? "" : "entry_not_using_shared_costing",
    allSharedMaterialQuantity ? "" : "entry_not_using_shared_material_quantity",
    forbiddenLocalCalculator ? "forbidden_local_calculator" : "",
    forbiddenRawDump ? "forbidden_raw_dump" : "",
    forbiddenFakeTotal ? "forbidden_fake_total" : "",
  ].filter(Boolean);

  return {
    platform_core_registry_created: entries.length > 0,
    all_estimate_entries_registered: missing.length === 0,
    all_entries_use_shared_engine: allSharedEngine,
    all_entries_use_shared_snapshot_model: allSharedSnapshot,
    all_entries_use_shared_revision_model: allSharedRevision,
    all_entries_use_shared_pdf_renderer: allSharedPdf,
    all_entries_use_shared_buyer_handoff: allSharedBuyer,
    all_entries_use_shared_costing: allSharedCosting,
    all_entries_use_shared_material_quantity: allSharedMaterialQuantity,
    no_unregistered_estimate_entry_points: unexpected.length === 0,
    duplicate_entry_ids_detected: duplicates.length > 0,
    forbidden_local_calculator_detected: forbiddenLocalCalculator,
    forbidden_raw_dump_detected: forbiddenRawDump,
    forbidden_fake_total_detected: forbiddenFakeTotal,
    passed: failures.length === 0,
    failures,
  };
}
