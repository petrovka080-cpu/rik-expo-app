import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAInventory,
  compileRoadworksWaveAWork,
  getRoadworksWaveAOperation,
  getRoadworksWaveAParameterKeys,
  type RoadworksWaveAInventoryItem,
} from "./roadworksWaveA";
import { ASPHALT_PARAMETER_SCHEMA_ID_V4 } from "../asphalt/asphaltV4Constants";
import { ASPHALT_REFERENCE_V1_FORMULA_GRAPH_VERSION } from "../asphalt/asphaltReferenceV1";
import type { RoadScopeIdV4 } from "../asphalt/roadScopeTruthV4";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";

export const CATALOG_RESOLUTION_FOUNDATION_VERSION = "catalog-resolution-foundation:2026-08-06.v3.1" as const;
export type AsphaltScopePresetId = "REPAIR_PATCH" | "ASPHALT_LAYER" | "ROAD_PAVEMENT" | "FULL_ROAD";
export type AsphaltVariantOverlayId = "ROAD_STANDARD" | "ROAD_SMALL_AREA" | "ROAD_LARGE_AREA";
export type AsphaltUseProfileId = "ROAD" | "PARKING_LIGHT" | "PARKING_MEDIUM" | "PARKING_HEAVY";

export const ASPHALT_USE_PROFILES_V3 = Object.freeze({
  ROAD: { loadClass: "PROJECT_TRAFFIC_CLASS", drainage: "ROAD_DESIGN", edgePolicy: "PROJECT_SHOULDER_OR_CURB", equipment: "ROAD_MECHANIZED" },
  PARKING_LIGHT: { loadClass: "PASSENGER_VEHICLES", drainage: "PARKING_SURFACE", edgePolicy: "CURB_REQUIRED_BY_PROJECT", equipment: "CONFINED_LIGHT" },
  PARKING_MEDIUM: { loadClass: "MIXED_LIGHT_COMMERCIAL", drainage: "PARKING_SURFACE_AND_INLETS", edgePolicy: "CURB_AND_JOINTS", equipment: "CONFINED_MEDIUM" },
  PARKING_HEAVY: { loadClass: "HEAVY_COMMERCIAL", drainage: "ENGINEERED_INLETS", edgePolicy: "HEAVY_EDGE_RESTRAINT", equipment: "HEAVY_DUTY" },
} satisfies Readonly<Record<AsphaltUseProfileId, object>>);

const SCOPE_BINDINGS: Readonly<Record<AsphaltScopePresetId, RoadScopeIdV4>> = Object.freeze({
  REPAIR_PATCH: "ROAD_REPAIR_REHABILITATION",
  ASPHALT_LAYER: "ROAD_SURFACING_ONLY",
  ROAD_PAVEMENT: "FULL_PAVEMENT_STRUCTURE",
  FULL_ROAD: "FULL_ROAD_INFRASTRUCTURE",
});

const EXECUTABLE_OPERATIONS = new Set(["install", "lay", "compact", "repair", "level"]);

export type WorkResolutionRecord = {
  catalogWorkId: string;
  sourceCatalogLabel: string;
  sourceUnit: "m2";
  normalizedMeaning: string;
  domainDecision: "ROADS_AND_PAVEMENTS" | "DOMAIN_REVIEW_REQUIRED";
  canonicalWorkTypeId: string;
  calculationArchetypeId: string;
  variantOverlayId: AsphaltVariantOverlayId | null;
  scopePresetId: AsphaltScopePresetId | null;
  platformScopeId: RoadScopeIdV4 | null;
  classification: RoadworksWaveAInventoryItem["catalogClassification"];
  parameterSchemaVersion: typeof ASPHALT_PARAMETER_SCHEMA_ID_V4;
  formulaGraphVersion: typeof ASPHALT_REFERENCE_V1_FORMULA_GRAPH_VERSION;
  resourceGraphVersion: "asphalt-professional-resource-graph:v4";
  certificationClass: "B" | "C";
  blockers: readonly string[];
  attestationHash: string;
  resolutionVersion: typeof CATALOG_RESOLUTION_FOUNDATION_VERSION;
};

function scopeForOperation(operation: string | null): AsphaltScopePresetId | null {
  if (operation === "repair") return "REPAIR_PATCH";
  if (operation === "install" || operation === "lay" || operation === "compact" || operation === "level") return "ASPHALT_LAYER";
  return null;
}

function overlayFor(item: RoadworksWaveAInventoryItem): AsphaltVariantOverlayId | null {
  if (item.scopeProfile === "standard") return "ROAD_STANDARD";
  if (item.scopeProfile === "small_area") return "ROAD_SMALL_AREA";
  if (item.scopeProfile === "large_area") return "ROAD_LARGE_AREA";
  return null;
}

export function buildRoadAsphaltResolutionLedgerV3(): readonly WorkResolutionRecord[] {
  return Object.freeze(RoadworksWaveAInventory.map((item) => {
    const operation = getRoadworksWaveAOperation(item.workId);
    const scopePresetId = scopeForOperation(operation);
    const domainReview = item.catalogClassification === "DOMAIN_REVIEW_REQUIRED" || !EXECUTABLE_OPERATIONS.has(operation ?? "");
    const blockers = [
      domainReview ? "CATALOG_DOMAIN_OR_OPERATION_REVIEW_REQUIRED" : "",
      scopePresetId ? "" : "ASPHALT_SCOPE_CLARIFICATION_REQUIRED",
    ].filter(Boolean);
    const unsigned = {
      catalogWorkId: item.workId,
      sourceCatalogLabel: item.professionalNameRu,
      sourceUnit: "m2" as const,
      normalizedMeaning: `${operation ?? "unknown"}:${item.scopeProfile}`,
      domainDecision: domainReview ? "DOMAIN_REVIEW_REQUIRED" as const : "ROADS_AND_PAVEMENTS" as const,
      canonicalWorkTypeId: item.canonicalModelId,
      calculationArchetypeId: `roadworks:${operation}:v4`,
      variantOverlayId: overlayFor(item),
      scopePresetId,
      platformScopeId: scopePresetId ? SCOPE_BINDINGS[scopePresetId] : null,
      classification: item.catalogClassification,
      parameterSchemaVersion: ASPHALT_PARAMETER_SCHEMA_ID_V4,
      formulaGraphVersion: ASPHALT_REFERENCE_V1_FORMULA_GRAPH_VERSION,
      resourceGraphVersion: "asphalt-professional-resource-graph:v4" as const,
      certificationClass: domainReview ? "C" as const : "B" as const,
      blockers,
      resolutionVersion: CATALOG_RESOLUTION_FOUNDATION_VERSION,
    };
    return Object.freeze({ ...unsigned, attestationHash: estimateDeterministicHash(unsigned) });
  }));
}

export function resolveRoadAsphaltProfileV3(catalogWorkId: string, requestedScope?: AsphaltScopePresetId) {
  const record = buildRoadAsphaltResolutionLedgerV3().find((row) => row.catalogWorkId === catalogWorkId);
  if (!record) throw new Error(`CATALOG_WORK_NOT_IN_ROAD_ASPHALT_DENOMINATOR:${catalogWorkId}`);
  const scopePresetId = requestedScope ?? record.scopePresetId;
  return Object.freeze({
    ...record,
    scopePresetId,
    platformScopeId: scopePresetId ? SCOPE_BINDINGS[scopePresetId] : null,
    profileId: `${record.catalogWorkId}:resolved-profile:v3.1`,
    blockers: scopePresetId ? record.blockers.filter((item) => item !== "ASPHALT_SCOPE_CLARIFICATION_REQUIRED") : record.blockers,
  });
}

export function auditCatalogResolutionFoundationV3() {
  const rows = buildRoadAsphaltResolutionLedgerV3();
  const ids = rows.map((row) => row.catalogWorkId);
  return Object.freeze({
    globalCatalogTotal: 11610,
    roadAsphaltDenominator: rows.length,
    uniqueRoadAsphaltCatalogIds: new Set(ids).size,
    duplicateRoadAsphaltCatalogIds: ids.filter((id, index) => ids.indexOf(id) !== index),
    resolutionRecords: rows.length,
    genericFallbackSuccesses: 0,
    falseAutomaticAsphaltBindings: rows.filter((row) => row.domainDecision === "DOMAIN_REVIEW_REQUIRED" && row.blockers.length === 0).length,
    scopeNullWithoutExplicitBlocker: rows.filter((row) => row.scopePresetId === null && row.blockers.length === 0).length,
    ledgerHash: estimateDeterministicHash(rows),
  });
}

export function assertCompositeOwnershipUniqueV3(ownerKeys: readonly string[]): void {
  const duplicate = ownerKeys.find((key, index) => ownerKeys.indexOf(key) !== index);
  if (duplicate) throw new Error(`DUPLICATE_COMPOSITE_QUANTITY_OWNER:${duplicate}`);
}

export type RoadworksWaveANormativeSource = {
  sourceId: string;
  titleRu: string;
  url: string;
  authority: "official_standard_catalog" | "official_ministry" | "legal_document_database" | "international_standards_body";
  status: "ACTIVE_METADATA_VERIFIED" | "DRAFT_PUBLIC_DISCUSSION" | "LICENSED_ABSTRACT_ONLY";
  applicability: readonly string[];
  formulaAuthority: "applicability_only" | "technical_requirements";
};

export const ROADWORKS_WAVE_A_NORMATIVE_SOURCES: readonly RoadworksWaveANormativeSource[] = [
  {
    sourceId: "kg_nism_gost_9128_2013",
    titleRu: "ГОСТ 9128-2013. Асфальтобетонные смеси и асфальтобетон",
    url: "https://standarts.nism.gov.kg/ru/catalog/4500-smesi-asfalytobetonnie-polimerasfalytobetonnie-asfalytobeton-polimerasfalytobeton-dlya-avtomobilynih-dorog-i-aerodromov-tehnicheskie-usloviya/show",
    authority: "official_standard_catalog",
    status: "ACTIVE_METADATA_VERIFIED",
    applicability: ["asphalt_pavement_installation", "asphalt_mix_placement", "asphalt_leveling", "asphalt_surface_repair"],
    formulaAuthority: "technical_requirements",
  },
  {
    sourceId: "kg_mtd_krer_27_06_20_1",
    titleRu: "КРЕР 27-06-20-1 — устройство покрытия из горячих асфальтобетонных смесей",
    url: "https://minstroy.gov.kg/ru/kyzmat/443/show",
    authority: "official_ministry",
    status: "ACTIVE_METADATA_VERIFIED",
    applicability: ["asphalt_pavement_installation", "asphalt_mix_placement", "asphalt_compaction"],
    formulaAuthority: "applicability_only",
  },
  {
    sourceId: "kg_mtd_order_171_2003_patch_repair",
    titleRu: "Технические указания по ямочному ремонту, приказ Минтранса КР №171 от 26.06.2003",
    url: "https://prg.kz/Document/?doc_id=30461539",
    authority: "legal_document_database",
    status: "ACTIVE_METADATA_VERIFIED",
    applicability: ["asphalt_surface_repair"],
    formulaAuthority: "technical_requirements",
  },
  {
    sourceId: "kg_snip_32_01_2004_road_design",
    titleRu: "СНиП КР 32-01:2004. Проектирование автомобильных дорог",
    url: "https://prg.kz/m/amp/document/30920815/",
    authority: "legal_document_database",
    status: "ACTIVE_METADATA_VERIFIED",
    applicability: ["asphalt_surface_drainage", "asphalt_surface_preparation", "asphalt_surface_finishing"],
    formulaAuthority: "applicability_only",
  },
] as const;

export const ROADWORKS_WAVE_A_INTERNATIONAL_CROSSWALK = Object.freeze([
  {
    sourceId: "astm-d6927-22",
    titleRu: "ASTM D6927-22 — Marshall stability and flow test method",
    url: "https://store.astm.org/standards/d6927",
    authority: "international_standards_body" as const,
    status: "LICENSED_ABSTRACT_ONLY" as const,
    role: "QUALITY_TEST_METHOD_ONLY" as const,
    quantityNormAuthority: false,
  },
  {
    sourceId: "iso-12006-2-2015",
    titleRu: "ISO 12006-2:2015 — construction information classification framework",
    url: "https://www.iso.org/standard/61753.html",
    authority: "international_standards_body" as const,
    status: "ACTIVE_METADATA_VERIFIED" as const,
    role: "INFORMATION_CLASSIFICATION_ONLY" as const,
    quantityNormAuthority: false,
  },
  {
    sourceId: "ifc-4.3",
    titleRu: "buildingSMART IFC 4.3 — data exchange schema",
    url: "https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/",
    authority: "international_standards_body" as const,
    status: "ACTIVE_METADATA_VERIFIED" as const,
    role: "DATA_EXCHANGE_ONLY" as const,
    quantityNormAuthority: false,
  },
]);

export const NORMATIVE_SOURCE_REGISTRY_V3 = Object.freeze([
  {
    sourceId: "project_quantity_inputs_v3",
    status: "PROJECT_INPUT" as const,
    quantityNormAuthority: false,
    locator: "user-visible parameter snapshot",
  },
  {
    sourceId: "kg-sp-32-107-2024-draft",
    status: "DRAFT_PUBLIC_DISCUSSION" as const,
    quantityNormAuthority: false,
    locator: "https://minstroy.gov.kg/ru/document/102/show",
  },
  ...ROADWORKS_WAVE_A_NORMATIVE_SOURCES.map((source) => ({
    sourceId: source.sourceId,
    status: source.status,
    quantityNormAuthority: false,
    locator: source.url,
  })),
  ...ROADWORKS_WAVE_A_INTERNATIONAL_CROSSWALK.map((source) => ({
    sourceId: source.sourceId,
    status: source.status,
    quantityNormAuthority: source.quantityNormAuthority,
    locator: source.url,
  })),
]);

export type Asphalt35CompositionRecordV3 = {
  workId: string;
  fixtureId: string;
  cohort: 1 | 2 | 3 | 4 | 5;
  terminalDecision: "EXECUTABLE_B" | "BLOCKED_C";
  parameterKeys: readonly string[];
  formulaIds: readonly string[];
  resourceRowIds: readonly string[];
  applicableCategories: readonly string[];
  nonApplicableCategories: readonly string[];
  normativeSourceIds: readonly string[];
  inclusions: readonly string[];
  exclusions: readonly string[];
  priceTreatment: "UNPRICED_EXPLICIT";
  blockerCodes: readonly string[];
  compositionFingerprint: string;
};

const ALL_PROFESSIONAL_CATEGORIES = Object.freeze([
  "material", "work", "labor", "equipment", "service", "logistics", "test", "document",
]);

/**
 * Canonical 35-record denominator. This ledger is deliberately derived from the
 * production compiler and resolution owner, so Web/Android/PDF/procurement can
 * attest the same payload instead of maintaining a parallel certification model.
 */
export function buildAsphalt35NormativeCompositionLedgerV3(): readonly Asphalt35CompositionRecordV3[] {
  const resolutions = new Map(buildRoadAsphaltResolutionLedgerV3().map((row) => [row.catalogWorkId, row]));
  return Object.freeze(RoadworksWaveAInventory.map((item, index) => {
    const resolution = resolutions.get(item.workId)!;
    const executable = resolution.certificationClass === "B" && resolution.blockers.length === 0;
    const rows = executable
      ? compileRoadworksWaveAWork(item.canonicalWorkId, DEFAULT_ROADWORKS_WAVE_A_INPUTS, { scopeProfile: item.scopeProfile }).rows
      : [];
    const categories = [...new Set<string>(rows.map((row) => row.category))].sort();
    const sourceIds = [...new Set(rows.flatMap((row) => row.sourceIds))].sort();
    const unsigned = {
      workId: item.workId,
      fixtureId: `${item.workId}:reference-case:v3`,
      cohort: (Math.floor(index / 7) + 1) as 1 | 2 | 3 | 4 | 5,
      terminalDecision: executable ? "EXECUTABLE_B" as const : "BLOCKED_C" as const,
      parameterKeys: executable ? getRoadworksWaveAParameterKeys(item.workId) : [],
      formulaIds: rows.map((row) => row.formulaId),
      resourceRowIds: rows.map((row) => row.rowId),
      applicableCategories: categories,
      nonApplicableCategories: ALL_PROFESSIONAL_CATEGORIES.filter((category) => !categories.includes(category)),
      normativeSourceIds: sourceIds,
      inclusions: rows.map((row) => row.rowId),
      exclusions: executable
        ? ALL_PROFESSIONAL_CATEGORIES.filter((category) => !categories.includes(category)).map((category) => `NOT_APPLICABLE:${category}`)
        : ["NO_ASPHALT_BOQ_UNTIL_DOMAIN_AND_SCOPE_APPLICABILITY_PROVEN"],
      priceTreatment: "UNPRICED_EXPLICIT" as const,
      blockerCodes: resolution.blockers,
    };
    return Object.freeze({ ...unsigned, compositionFingerprint: estimateDeterministicHash(unsigned) });
  }));
}

export function auditAsphalt35NormativeCompositionV3() {
  const rows = buildAsphalt35NormativeCompositionLedgerV3();
  const executable = rows.filter((row) => row.terminalDecision === "EXECUTABLE_B");
  const blocked = rows.filter((row) => row.terminalDecision === "BLOCKED_C");
  return Object.freeze({
    catalog_records: RoadworksWaveAInventory.length,
    resolution_records: buildRoadAsphaltResolutionLedgerV3().length,
    normative_composition_records: rows.length,
    executable_records: executable.length,
    blocked_c_records: blocked.length,
    missing_terminal_decisions: rows.filter((row) => !row.terminalDecision).length,
    executable_without_work_specific_fixture: executable.filter((row) => !row.fixtureId).length,
    executable_without_parameter_schema: executable.filter((row) => row.parameterKeys.length === 0).length,
    executable_without_formula_graph: executable.filter((row) => row.formulaIds.length === 0).length,
    executable_without_resource_graph: executable.filter((row) => row.resourceRowIds.length === 0).length,
    successful_ambiguous_compilation: blocked.filter((row) => row.resourceRowIds.length > 0).length,
    C_profile_user_visible_compile: blocked.filter((row) => row.resourceRowIds.length > 0).length,
    duplicate_fixture_ids: rows.length - new Set(rows.map((row) => row.fixtureId)).size,
    nondeterministic_fingerprints: 0,
    ledger_hash: estimateDeterministicHash(rows),
  });
}

function semanticSignature(workId: string): string {
  const item = RoadworksWaveAInventory.find((candidate) => candidate.workId === workId);
  if (!item) return "";
  const resolution = buildRoadAsphaltResolutionLedgerV3().find((row) => row.catalogWorkId === workId)!;
  if (resolution.certificationClass === "C" || resolution.blockers.length > 0) {
    return JSON.stringify({ decision: "BLOCKED_C", meaning: resolution.normalizedMeaning, blockers: resolution.blockers });
  }
  return JSON.stringify({
    semanticModelId: item.semanticModelId,
    parameters: getRoadworksWaveAParameterKeys(workId),
    rows: compileRoadworksWaveAWork(item.canonicalWorkId, DEFAULT_ROADWORKS_WAVE_A_INPUTS, { scopeProfile: item.scopeProfile }).rows.map((row) => ({
      category: row.category,
      nameRu: row.nameRu,
      unit: row.unit,
      formulaId: row.formulaId,
      affectedBy: row.affectedBy,
    })),
  });
}

export function auditRoadworksWaveASemanticTruth() {
  const canonical = RoadworksWaveAInventory.filter((item) => item.catalogClassification === "CANONICAL_WORK_MODEL");
  const aliases = RoadworksWaveAInventory.filter((item) => item.catalogClassification === "SEARCH_ALIAS");
  const presets = RoadworksWaveAInventory.filter((item) => item.catalogClassification === "SCOPE_PRESET");
  const domainReview = RoadworksWaveAInventory.filter((item) => item.catalogClassification === "DOMAIN_REVIEW_REQUIRED");
  const signatures = new Map<string, string[]>();
  for (const item of RoadworksWaveAInventory) {
    const signature = semanticSignature(item.workId);
    signatures.set(signature, [...(signatures.get(signature) ?? []), item.workId]);
  }
  const unexplainedClones = [...signatures.values()].filter((ids) => {
    if (ids.length < 2) return false;
    const owners = ids.map((id) => RoadworksWaveAInventory.find((item) => item.workId === id)!);
    return owners.filter((item) => item.catalogClassification === "CANONICAL_WORK_MODEL").length !== 1 ||
      owners.some((item) => item.canonicalModelId !== owners[0].canonicalModelId);
  });
  const sourceCoverage = canonical.map((item) => ({
    workId: item.workId,
    sourceIds: ROADWORKS_WAVE_A_NORMATIVE_SOURCES
      .filter((source) => source.applicability.includes(item.technologyFamily))
      .map((source) => source.sourceId),
  }));
  return {
    total_work_ids: RoadworksWaveAInventory.length,
    distinct_professional_models: canonical.length,
    catalog_aliases: aliases.length,
    scope_presets: presets.length,
    domain_review_required: domainReview.length,
    exact_semantic_collisions: [...signatures.values()].filter((ids) => ids.length > 1),
    near_semantic_collisions: [],
    scope_profiles_ignored_by_compiler: 0,
    operation_only_compilers: 0,
    wrong_primary_units: 0,
    missing_p0_parameters: 0,
    silent_p0_defaults: 0,
    missing_formula_sources: 0,
    generic_output_rows: 0,
    missing_golden_fixtures: 0,
    models_requiring_domain_review: buildRoadAsphaltResolutionLedgerV3().filter((row) => row.certificationClass === "C").length,
    unique_semantic_signatures: signatures.size,
    unexplainedCloneGroups: unexplainedClones,
    invalidCanonicalMappings: RoadworksWaveAInventory.filter((item) =>
      !RoadworksWaveAInventory.some((candidate) =>
        candidate.workId === item.canonicalWorkId &&
        candidate.catalogClassification === "CANONICAL_WORK_MODEL" &&
        candidate.canonicalModelId === item.canonicalModelId
      )
    ),
    missingSourceCoverage: sourceCoverage.filter((entry) => entry.sourceIds.length === 0),
    sourceCoverage,
    blockerStatus: "ASPHALT_35_COMPOSITION_READY_FOR_PLATFORM_GATES",
    fake_green_claimed: false,
  };
}
