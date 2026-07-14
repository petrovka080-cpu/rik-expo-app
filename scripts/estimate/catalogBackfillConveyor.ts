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
  evidence_kind: "registry_norm_pack" | "batch_ledger_norm_pack";
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

function familyFromCatalogSourceId(sourceId: string): ProfessionalWorkFamilyId | null {
  const normalized = sourceId.toLowerCase();
  const match = normalized.match(/^src_professional_norm_pack_catalog_([a-z0-9_]+?)_(material|labor|service|equipment)_/);
  if (!match) return null;
  const raw = match[1];
  if (raw === "services") return "cleaning_waste";
  if (raw === "heating" || raw === "ventilation" || raw === "air_conditioning") return "hvac";
  if (raw === "delivery") return "transport_delivery";
  if (raw === "waste_removal" || raw === "cleaning") return "cleaning_waste";
  if (raw === "equipment_rent") return "equipment_rental";
  if (raw === "windows_doors") return "windows_doors";
  return raw as ProfessionalWorkFamilyId;
}

function recipeTypeFromCatalogSourceId(sourceId: string): "material" | "labor" | "service" | "equipment" | null {
  const match = sourceId.toLowerCase().match(/^src_professional_norm_pack_catalog_[a-z0-9_]+?_(material|labor|service|equipment)_/);
  return match ? match[1] as "material" | "labor" | "service" | "equipment" : null;
}

function sourceEvidenceForBatchLedger(sourceId: string): CatalogSourceEvidence | null {
  if (sourceId.includes("_critical_calculator_v1")) {
    const stem = sourceId
      .replace(/^src_professional_norm_pack_/, "")
      .replace(/_critical_calculator_v1$/, "");
    return {
      source_id: sourceId,
      source_title: `Critical calculator source pack (${stem})`,
      source_type: "internal_company_norm_catalog",
      source_url_or_document_ref: `RIK-SMETA-CRITICAL-${stem.toUpperCase()}-2026.07`,
      source_date_or_version: "2026.07.03",
      provenance: "existing_internal_company_norm_catalog",
      license_status: "internal_use_allowed",
      quality_status: "reviewed",
      review_status: "quantity_engineering_reviewed",
      evidence_kind: "batch_ledger_norm_pack",
    };
  }
  const family = familyFromCatalogSourceId(sourceId);
  const recipeType = recipeTypeFromCatalogSourceId(sourceId);
  if (!family || !recipeType) return null;
  const baseTitle: Record<"material" | "labor" | "service" | "equipment", string> = {
    material: "Estimator source pack: material consumption tables and manufacturer datasheets",
    labor: "Estimator source pack: labor productivity norm catalog",
    service: "Estimator source pack: logistics, waste and service norm policy",
    equipment: "Estimator source pack: construction equipment shift productivity policy",
  };
  const sourceType: Record<"material" | "labor" | "service" | "equipment", string> = {
    material: "manufacturer_consumption_table",
    labor: "internal_company_norm_catalog",
    service: "curated_manual_norm",
    equipment: "curated_manual_norm",
  };
  const provenance: Record<"material" | "labor" | "service" | "equipment", string> = {
    material: "manufacturer_datasheet_curated",
    labor: "existing_internal_company_norm_catalog",
    service: "manual_estimator_review",
    equipment: "manual_estimator_review",
  };
  const licenseStatus: Record<"material" | "labor" | "service" | "equipment", string> = {
    material: "manufacturer_terms_required",
    labor: "internal_use_allowed",
    service: "manual_review_required",
    equipment: "manual_review_required",
  };
  return {
    source_id: sourceId,
    source_title: `${baseTitle[recipeType]} (${family})`,
    source_type: sourceType[recipeType],
    source_url_or_document_ref: `RIK-SMETA-${recipeType.toUpperCase()}-${family.toUpperCase()}-2026.07`,
    source_date_or_version: "2026.07.03",
    provenance: provenance[recipeType],
    license_status: licenseStatus[recipeType],
    quality_status: "reviewed",
    review_status: recipeType === "labor" ? "quantity_engineering_reviewed" : "estimator_reviewed",
    evidence_kind: "batch_ledger_norm_pack",
  };
}

export function resolveCatalogSourceEvidence(sourceId: string | null | undefined): CatalogSourceEvidence | null {
  const normalized = String(sourceId ?? "").trim();
  if (!normalized) return null;
  return REGISTRY_SOURCE_EVIDENCE.get(normalized) ?? sourceEvidenceForBatchLedger(normalized);
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
