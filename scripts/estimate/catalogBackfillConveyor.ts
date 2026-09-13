import type { ProductionWorkDefinition } from "../../src/lib/ai/estimateTemplate10000";
import { PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS } from "../../src/lib/ai/estimateTemplate10000";
import { resolveProfessionalWorkFamily } from "../../src/features/estimates/catalog/workCatalogResolver";
import type { ProfessionalWorkFamilyId } from "../../src/features/estimates/catalog/professionalCatalogTypes";
import { P0_CATALOG_FAMILY_IDS } from "./p0ProfessionalCatalog";

export type CatalogBackfillBatchId =
  | "p0-critical"
  | "p1-high-volume-repair"
  | "p2-structural-exterior"
  | "p3-long-tail";

export const DEFAULT_PROFESSIONAL_BACKFILL_BATCH_IDS: readonly CatalogBackfillBatchId[] = Object.freeze([
  "p0-critical",
  "p1-high-volume-repair",
  "p2-structural-exterior",
  "p3-long-tail",
]);

export const P1_HIGH_VOLUME_REPAIR_FAMILY_IDS: readonly ProfessionalWorkFamilyId[] = Object.freeze([
  "demolition",
  "plaster",
  "putty",
  "paint",
  "tile",
  "flooring",
  "screed",
  "waterproofing",
  "drywall",
  "windows_doors",
  "insulation",
  "cleaning_waste",
  "transport_delivery",
]);

export const P2_STRUCTURAL_EXTERIOR_FAMILY_IDS: readonly ProfessionalWorkFamilyId[] = Object.freeze([
  "masonry",
  "concrete",
  "reinforcement",
  "formwork",
  "earthworks",
  "roofing",
  "mansard_roof",
  "facade",
  "insulation",
  "profile_sheet_fence",
  "metalwork",
  "carpentry",
  "roadworks",
  "landscaping",
]);

export const P3_LONG_TAIL_FAMILY_IDS: readonly ProfessionalWorkFamilyId[] = Object.freeze([
  "hvac",
  "fire_safety",
  "low_voltage",
  "equipment_rental",
]);

export type CatalogBackfillBatchDefinition = {
  batch_id: CatalogBackfillBatchId;
  legacy_priority: "P0_CRITICAL" | "P1_HIGH_VOLUME_REPAIR" | "P2_STRUCTURAL_EXTERIOR" | "P3_LONG_TAIL";
  label: string;
  family_ids: readonly ProfessionalWorkFamilyId[];
  closes_ready_professional: boolean;
};

export const CATALOG_BACKFILL_BATCH_DEFINITIONS: readonly CatalogBackfillBatchDefinition[] = Object.freeze([
  {
    batch_id: "p0-critical",
    legacy_priority: "P0_CRITICAL",
    label: "P0 critical prompt/catalog calculators",
    family_ids: P0_CATALOG_FAMILY_IDS,
    closes_ready_professional: true,
  },
  {
    batch_id: "p1-high-volume-repair",
    legacy_priority: "P1_HIGH_VOLUME_REPAIR",
    label: "P1 high-volume repair and apartment renovation families",
    family_ids: P1_HIGH_VOLUME_REPAIR_FAMILY_IDS,
    closes_ready_professional: true,
  },
  {
    batch_id: "p2-structural-exterior",
    legacy_priority: "P2_STRUCTURAL_EXTERIOR",
    label: "P2 structural and exterior quantity families",
    family_ids: P2_STRUCTURAL_EXTERIOR_FAMILY_IDS,
    closes_ready_professional: true,
  },
  {
    batch_id: "p3-long-tail",
    legacy_priority: "P3_LONG_TAIL",
    label: "P3 engineering systems and long tail",
    family_ids: P3_LONG_TAIL_FAMILY_IDS,
    closes_ready_professional: true,
  },
]);

export type CatalogSourceEvidence = {
  source_id: string;
  source_title: string;
  source_type: string;
  source_url_or_document_ref: string;
  source_date_or_version: string;
  provenance: string;
  license_status: string;
  quality_status: string;
  review_status: string;
  evidence_kind: "registry_norm_pack";
};

const REGISTRY_SOURCE_EVIDENCE = new Map(
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item): [string, CatalogSourceEvidence] => [item.sourceId, {
    source_id: item.sourceId,
    source_title: item.sourceTitle,
    source_type: item.sourceType,
    source_url_or_document_ref: item.sourceUrl || item.sourcePage,
    source_date_or_version: item.sourceDocumentVersion,
    provenance: item.sourceProvenance,
    license_status: item.licenseStatus,
    quality_status: item.qualityStatus,
    review_status: item.reviewStatus,
    evidence_kind: "registry_norm_pack",
  }]),
);

export function resolveCatalogSourceEvidence(sourceId: string | null | undefined): CatalogSourceEvidence | null {
  const normalized = String(sourceId ?? "").trim();
  if (!normalized) return null;
  // Batch membership proves structural catalog coverage only. A source-like ID
  // is not evidence until an applicability-bound item exists in the registry.
  return REGISTRY_SOURCE_EVIDENCE.get(normalized) ?? null;
}

export function batchDefinitionById(batchId: CatalogBackfillBatchId): CatalogBackfillBatchDefinition {
  const batch = CATALOG_BACKFILL_BATCH_DEFINITIONS.find((item) => item.batch_id === batchId);
  if (!batch) throw new Error(`CATALOG_BACKFILL_BATCH_NOT_FOUND:${batchId}`);
  return batch;
}

export function resolveDefinitionBatchIds(definition: ProductionWorkDefinition): CatalogBackfillBatchId[] {
  const family = resolveProfessionalWorkFamily(definition);
  return CATALOG_BACKFILL_BATCH_DEFINITIONS
    .filter((batch) => batch.family_ids.includes(family))
    .map((batch) => batch.batch_id);
}

export function resolveBackfilledFamilyIds(
  batchIds: readonly CatalogBackfillBatchId[] = DEFAULT_PROFESSIONAL_BACKFILL_BATCH_IDS,
): Set<ProfessionalWorkFamilyId> {
  const selected = new Set(batchIds);
  return new Set(
    CATALOG_BACKFILL_BATCH_DEFINITIONS
      .filter((batch) => selected.has(batch.batch_id) && batch.closes_ready_professional)
      .flatMap((batch) => [...batch.family_ids]),
  );
}

export function isDefinitionCoveredByBackfillBatches(
  definition: ProductionWorkDefinition,
  batchIds: readonly CatalogBackfillBatchId[] = DEFAULT_PROFESSIONAL_BACKFILL_BATCH_IDS,
): boolean {
  return resolveBackfilledFamilyIds(batchIds).has(resolveProfessionalWorkFamily(definition));
}

export function isSourceAllowedForBackfilledTemplate(input: {
  sourceId: string | null | undefined;
  definition: ProductionWorkDefinition;
  batchIds?: readonly CatalogBackfillBatchId[];
}): boolean {
  if (!isDefinitionCoveredByBackfillBatches(input.definition, input.batchIds)) return false;
  const evidence = resolveCatalogSourceEvidence(input.sourceId);
  return Boolean(evidence && evidence.source_url_or_document_ref !== "unknown");
}
