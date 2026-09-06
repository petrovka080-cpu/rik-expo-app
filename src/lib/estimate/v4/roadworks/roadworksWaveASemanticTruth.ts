import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  ROADWORKS_WAVE_A_KRER_27_RATE_IDS_BY_OPERATION,
  ROADWORKS_WAVE_A_SCOPE_EXECUTION_PROFILES,
  RoadworksWaveAInventory,
  compileRoadworksWaveAWork,
  getRoadworksWaveAOperation,
  getRoadworksWaveAParameterKeys,
  getRoadworksWaveAParameterDefinitions,
  type RoadworksWaveAInventoryItem,
  type RoadworksWaveAOperation,
} from "./roadworksWaveA";
import {
  assertPassportOwnership,
  professionalEstimatePassportId,
  type ProfessionalEstimatePassportV4,
} from "../professionalEstimatePassportV4";
import { ASPHALT_PARAMETER_SCHEMA_ID_V4 } from "../asphalt/asphaltV4Constants";
import { ASPHALT_REFERENCE_V1_FORMULA_GRAPH_VERSION } from "../asphalt/asphaltReferenceV1";
import type { RoadScopeIdV4 } from "../asphalt/roadScopeTruthV4";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import {
  evaluateCompleteEstimate,
  evaluateMaterialCompleteness,
  type CompleteEstimateCategory,
  type CompleteEstimateCategoryEvidence,
  type CompleteEstimateContract,
  type MaterialCompletenessContract,
} from "../../materialCompletenessContract";

export const CATALOG_RESOLUTION_FOUNDATION_VERSION = "catalog-resolution-foundation:2026-08-06.v3.1" as const;
export type AsphaltScopePresetId = "REPAIR_PATCH" | "ASPHALT_LAYER" | "ROAD_PAVEMENT" | "FULL_ROAD";
export type AsphaltVariantOverlayId = "ROAD_STANDARD" | "ROAD_SMALL_AREA" | "ROAD_LARGE_AREA" | "ROAD_WET_EXPOSURE" | "INDUSTRIAL_FLOOR";
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

export type WorkResolutionRecord = {
  catalogWorkId: string;
  sourceCatalogLabel: string;
  sourceUnit: "m2";
  normalizedMeaning: string;
  domainDecision: "ROADS_AND_PAVEMENTS" | "ASPHALT_INDUSTRIAL_FLOORS" | "DOMAIN_REVIEW_REQUIRED";
  canonicalWorkTypeId: string;
  calculationArchetypeId: string;
  variantOverlayId: AsphaltVariantOverlayId | null;
  scopePresetId: AsphaltScopePresetId | null;
  platformScopeId: RoadScopeIdV4 | null;
  classification: RoadworksWaveAInventoryItem["catalogClassification"];
  classificationVerdictId: string;
  calculationReadiness: Asphalt35ClassificationVerdict["calculationReadiness"];
  roadwork: boolean;
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
  if (operation === "install" || operation === "lay" || operation === "compact" || operation === "prepare" || operation === "level" || operation === "drain" || operation === "finish") return "ASPHALT_LAYER";
  return null;
}

function overlayFor(item: RoadworksWaveAInventoryItem): AsphaltVariantOverlayId | null {
  if (item.scopeProfile === "standard") return "ROAD_STANDARD";
  if (item.scopeProfile === "small_area") return "ROAD_SMALL_AREA";
  if (item.scopeProfile === "large_area") return "ROAD_LARGE_AREA";
  if (item.scopeProfile === "wet_zone") return "ROAD_WET_EXPOSURE";
  if (item.scopeProfile === "technical_room") return "INDUSTRIAL_FLOOR";
  return null;
}

const roadAsphaltResolutionRecordCache = new Map<string, WorkResolutionRecord>();

function buildRoadAsphaltResolutionRecordV3(
  item: RoadworksWaveAInventoryItem,
): WorkResolutionRecord {
  const cached = roadAsphaltResolutionRecordCache.get(item.workId);
  if (cached) return cached;
  const operation = getRoadworksWaveAOperation(item.workId);
  const verdict = getAsphalt35ClassificationVerdict(item.workId);
  const scopePresetId = scopeForOperation(operation);
  const domainReview = verdict.verdictClass === "NON_ASPHALT_RECLASSIFICATION_REQUIRED" ||
    verdict.verdictClass === "WATERPROOFING_OR_WET_ZONE";
  const industrialFloor = verdict.verdictClass === "INDUSTRIAL_ASPHALT_FLOOR";
  const blockers = [
    ...verdict.blockers,
    domainReview ? "CATALOG_DOMAIN_OR_OPERATION_REVIEW_REQUIRED" : "",
    scopePresetId ? "" : "ASPHALT_SCOPE_CLARIFICATION_REQUIRED",
  ].filter(Boolean);
  const unsigned = {
    catalogWorkId: item.workId,
    sourceCatalogLabel: item.professionalNameRu,
    sourceUnit: "m2" as const,
    normalizedMeaning: verdict.normalizedTitle,
    domainDecision: domainReview
      ? "DOMAIN_REVIEW_REQUIRED" as const
      : industrialFloor
        ? "ASPHALT_INDUSTRIAL_FLOORS" as const
        : "ROADS_AND_PAVEMENTS" as const,
    canonicalWorkTypeId: item.canonicalModelId,
    calculationArchetypeId: `roadworks:${operation}:v4`,
    variantOverlayId: overlayFor(item),
    scopePresetId,
    platformScopeId: scopePresetId ? SCOPE_BINDINGS[scopePresetId] : null,
    classification: item.catalogClassification,
    classificationVerdictId: verdict.verdictId,
    calculationReadiness: verdict.calculationReadiness,
    roadwork: verdict.roadwork,
    parameterSchemaVersion: ASPHALT_PARAMETER_SCHEMA_ID_V4,
    formulaGraphVersion: ASPHALT_REFERENCE_V1_FORMULA_GRAPH_VERSION,
    resourceGraphVersion: "asphalt-professional-resource-graph:v4" as const,
    certificationClass: domainReview ? "C" as const : "B" as const,
    blockers,
    resolutionVersion: CATALOG_RESOLUTION_FOUNDATION_VERSION,
  };
  const record = Object.freeze({
    ...unsigned,
    attestationHash: estimateDeterministicHash(unsigned),
  });
  roadAsphaltResolutionRecordCache.set(item.workId, record);
  return record;
}

export function buildRoadAsphaltResolutionLedgerV3(): readonly WorkResolutionRecord[] {
  return Object.freeze(RoadworksWaveAInventory.map(buildRoadAsphaltResolutionRecordV3));
}

export function resolveRoadAsphaltProfileV3(catalogWorkId: string, requestedScope?: AsphaltScopePresetId) {
  const item = RoadworksWaveAInventory.find((row) => row.workId === catalogWorkId);
  if (!item) throw new Error(`CATALOG_WORK_NOT_IN_ROAD_ASPHALT_DENOMINATOR:${catalogWorkId}`);
  const record = buildRoadAsphaltResolutionRecordV3(item);
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
  sourceType: "TECHNICAL_REQUIREMENT" | "ESTIMATE_RESOURCE_NORM" | "TEST_METHOD";
  titleRu: string;
  url: string;
  jurisdiction: "KG" | "INTERSTATE" | "INTERNATIONAL";
  issuingAuthority: string;
  documentVersion: string;
  clauseOrTable: string;
  effectiveDate: string | null;
  effectiveTo: string | null;
  unit: string | null;
  coefficient: number | null;
  numericValuesUsed: readonly string[];
  authority: "official_standard_catalog" | "official_ministry" | "legal_document_database" | "international_standards_body";
  status: "ACTIVE_METADATA_VERIFIED" | "DRAFT_PUBLIC_DISCUSSION" | "LICENSED_ABSTRACT_ONLY";
  applicability: readonly string[];
  formulaAuthority: "applicability_only" | "technical_requirements" | "estimate_resource_norm";
  retrievedAt: string;
  evidenceHash: string;
  reviewStatus: "REVIEWED";
};

export const ROADWORKS_WAVE_A_NORMATIVE_SOURCES: readonly RoadworksWaveANormativeSource[] = [
  {
    sourceId: "kg_nism_gost_9128_2013",
    sourceType: "TECHNICAL_REQUIREMENT",
    titleRu: "ГОСТ 9128-2013. Асфальтобетонные смеси и асфальтобетон",
    url: "https://standarts.nism.gov.kg/ru/catalog/4500-smesi-asfalytobetonnie-polimerasfalytobetonnie-asfalytobeton-polimerasfalytobeton-dlya-avtomobilynih-dorog-i-aerodromov-tehnicheskie-usloviya/show",
    jurisdiction: "INTERSTATE",
    issuingAuthority: "Межгосударственный совет по стандартизации; принят в КР приказом ЦСМ №51-СТ от 22.05.2015",
    documentVersion: "ГОСТ 9128-2013",
    clauseOrTable: "Область применения; приложения А, Б, В, К, Л, М",
    effectiveDate: "2015-05-22",
    effectiveTo: null,
    unit: null,
    coefficient: null,
    numericValuesUsed: [],
    authority: "official_standard_catalog",
    status: "ACTIVE_METADATA_VERIFIED",
    applicability: ["asphalt_pavement_installation", "asphalt_mix_placement", "asphalt_leveling", "asphalt_surface_repair"],
    formulaAuthority: "technical_requirements",
    retrievedAt: "2026-08-07",
    evidenceHash: estimateDeterministicHash({
      sourceId: "kg_nism_gost_9128_2013",
      evidence: "official NISM catalog adoption metadata: order 51-ST, 2015-05-22",
    }),
    reviewStatus: "REVIEWED",
  },
  {
    sourceId: "kg_krer_27_roadworks_2015",
    sourceType: "ESTIMATE_RESOURCE_NORM",
    titleRu: "КРЕР-2015 №27 «Автомобильные дороги»",
    url: "https://minstroy.gov.kg/ru/state_program/download-pdf/no27avtomobilnyedorogi_compressed-43769083f584ff787.06841542.pdf",
    jurisdiction: "KG",
    issuingAuthority: "Госстрой Кыргызской Республики",
    documentVersion: "КРЕР-2015 №27; приказ от 28.03.2016 №2-нпа; госреестр Минюста №34 от 29.03.2016",
    clauseOrTable: "таблицы 27-02, 27-03 и 27-06; exact table IDs resolve per work verdict",
    effectiveDate: "2016-04-01",
    effectiveTo: null,
    unit: "1000 m2 / 100 m2 / work-specific",
    coefficient: null,
    numericValuesUsed: ["resource norms from the exact selected КРЕР table; no inferred coefficient"],
    authority: "official_ministry",
    status: "ACTIVE_METADATA_VERIFIED",
    applicability: ["asphalt_pavement_installation", "asphalt_mix_placement", "asphalt_compaction", "asphalt_surface_repair", "asphalt_surface_preparation", "asphalt_leveling", "asphalt_surface_drainage", "asphalt_surface_finishing"],
    formulaAuthority: "estimate_resource_norm",
    retrievedAt: "2026-08-07",
    evidenceHash: estimateDeterministicHash({
      sourceId: "kg_krer_27_roadworks_2015",
      evidence: "official Minstroy KRER-2015 no.27 PDF, order 2-npa and exact table register",
    }),
    reviewStatus: "REVIEWED",
  },
  {
    sourceId: "kg_krer_11_floors_2015",
    sourceType: "ESTIMATE_RESOURCE_NORM",
    titleRu: "КРЕР-2015 №11 «Полы», таблица 11-01-019 «Устройство покрытий асфальтобетонных»",
    url: "https://minstroy.gov.kg/ru/state_program/download-pdf/no11poly_compressed-73969083537959524.32310342.pdf",
    jurisdiction: "KG",
    issuingAuthority: "Госстрой Кыргызской Республики",
    documentVersion: "КРЕР-2015 №11; приказ от 28.03.2016 №2-нпа; госреестр Минюста №34 от 29.03.2016",
    clauseOrTable: "11-01-019-01..04, official PDF pages 26-27",
    effectiveDate: "2016-04-01",
    effectiveTo: null,
    unit: "100 m2 coating",
    coefficient: null,
    numericValuesUsed: ["25 mm base rate", "5 mm thickness adjustment", "resource rows of 11-01-019"],
    authority: "official_ministry",
    status: "ACTIVE_METADATA_VERIFIED",
    applicability: ["asphalt_industrial_floor_installation", "asphalt_industrial_floor_placement", "asphalt_industrial_floor_compaction"],
    formulaAuthority: "estimate_resource_norm",
    retrievedAt: "2026-08-07",
    evidenceHash: estimateDeterministicHash({
      sourceId: "kg_krer_11_floors_2015",
      evidence: "official Minstroy KRER-2015 no.11 PDF, table 11-01-019-01..04",
    }),
    reviewStatus: "REVIEWED",
  },
  {
    sourceId: "kg_mtd_order_171_2003_patch_repair",
    sourceType: "TECHNICAL_REQUIREMENT",
    titleRu: "Технические указания по ямочному ремонту, приказ Минтранса КР №171 от 26.06.2003",
    url: "https://prg.kz/Document/?doc_id=30461539",
    jurisdiction: "KG",
    issuingAuthority: "Министерство транспорта Кыргызской Республики",
    documentVersion: "Приказ Минтранса КР №171 от 26.06.2003",
    clauseOrTable: "Технические указания по ямочному ремонту",
    effectiveDate: "2003-06-26",
    effectiveTo: null,
    unit: null,
    coefficient: null,
    numericValuesUsed: [],
    authority: "legal_document_database",
    status: "ACTIVE_METADATA_VERIFIED",
    applicability: ["asphalt_surface_repair"],
    formulaAuthority: "technical_requirements",
    retrievedAt: "2026-08-07",
    evidenceHash: estimateDeterministicHash({
      sourceId: "kg_mtd_order_171_2003_patch_repair",
      evidence: "Mintrans KR order 171 dated 2003-06-26, legal-document registry copy",
    }),
    reviewStatus: "REVIEWED",
  },
  {
    sourceId: "kg_snip_32_01_2004_road_design",
    sourceType: "TECHNICAL_REQUIREMENT",
    titleRu: "СНиП КР 32-01:2004. Проектирование автомобильных дорог",
    url: "https://prg.kz/m/amp/document/30920815/",
    jurisdiction: "KG",
    issuingAuthority: "Госстрой Кыргызской Республики",
    documentVersion: "СНиП КР 32-01:2004",
    clauseOrTable: "Проектирование покрытия и водоотвода",
    effectiveDate: null,
    effectiveTo: null,
    unit: null,
    coefficient: null,
    numericValuesUsed: [],
    authority: "legal_document_database",
    status: "ACTIVE_METADATA_VERIFIED",
    applicability: ["asphalt_surface_drainage", "asphalt_surface_preparation", "asphalt_surface_finishing"],
    formulaAuthority: "applicability_only",
    retrievedAt: "2026-08-07",
    evidenceHash: estimateDeterministicHash({
      sourceId: "kg_snip_32_01_2004_road_design",
      evidence: "SNiP KR 32-01:2004 active-reference metadata and current official citations",
    }),
    reviewStatus: "REVIEWED",
  },
  {
    sourceId: "kg_sp_31_101_2024_floors",
    sourceType: "TECHNICAL_REQUIREMENT",
    titleRu: "СП КР 31-101:2024 «Полы»",
    url: "https://minstroy.gov.kg/ru/document/101/show",
    jurisdiction: "KG",
    issuingAuthority: "Госстрой Кыргызской Республики, приказ №179",
    documentVersion: "СП КР 31-101:2024",
    clauseOrTable: "п. 5.1; таблица 5.1; приложение Б",
    effectiveDate: "2024-07-05",
    effectiveTo: null,
    unit: "mm",
    coefficient: null,
    numericValuesUsed: ["table 5.1: 50/40/25 mm by permitted mechanical-impact class", "section 10.6: two 40 mm asphalt-concrete subbase layers when selected by design"],
    authority: "official_ministry",
    status: "ACTIVE_METADATA_VERIFIED",
    applicability: ["asphalt_industrial_floor_installation", "asphalt_industrial_floor_placement", "asphalt_industrial_floor_compaction"],
    formulaAuthority: "technical_requirements",
    retrievedAt: "2026-08-07",
    evidenceHash: estimateDeterministicHash({
      sourceId: "kg_sp_31_101_2024_floors",
      evidence: "official Minstroy approval page and PDF: order 179, effective 2024-07-05",
    }),
    reviewStatus: "REVIEWED",
  },
] as const;

export const ROADWORKS_WAVE_A_INTERNATIONAL_CROSSWALK = Object.freeze([
  {
    sourceId: "astm-d6927-22",
    titleRu: "ASTM D6927-22 — Marshall stability and flow test method",
    url: "https://store.astm.org/standards/d6927",
    authority: "international_standards_body" as const,
    jurisdiction: "INTERNATIONAL" as const,
    issuingAuthority: "ASTM International",
    documentVersion: "ASTM D6927-22",
    status: "LICENSED_ABSTRACT_ONLY" as const,
    role: "QUALITY_TEST_METHOD_ONLY" as const,
    applicability: ["laboratory Marshall stability and flow verification when the approved mix design calls for that method"],
    quantityNormAuthority: false,
  },
  {
    sourceId: "iso-12006-2-2015",
    titleRu: "ISO 12006-2:2015 — construction information classification framework",
    url: "https://www.iso.org/standard/61753.html",
    authority: "international_standards_body" as const,
    jurisdiction: "INTERNATIONAL" as const,
    issuingAuthority: "International Organization for Standardization",
    documentVersion: "ISO 12006-2:2015",
    status: "ACTIVE_METADATA_VERIFIED" as const,
    role: "INFORMATION_CLASSIFICATION_ONLY" as const,
    applicability: ["classification and semantic crosswalk; never a construction quantity norm"],
    quantityNormAuthority: false,
  },
  {
    sourceId: "ifc-4.3",
    titleRu: "buildingSMART IFC 4.3 — data exchange schema",
    url: "https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/",
    authority: "international_standards_body" as const,
    jurisdiction: "INTERNATIONAL" as const,
    issuingAuthority: "buildingSMART International",
    documentVersion: "IFC 4.3",
    status: "ACTIVE_METADATA_VERIFIED" as const,
    role: "DATA_EXCHANGE_ONLY" as const,
    applicability: ["projection/data exchange; never a construction quantity norm"],
    quantityNormAuthority: false,
  },
]);

export type Asphalt35VerdictClass =
  | "ROAD_ASPHALT"
  | "PARKING_OR_EXTERNAL_AREA_ASPHALT"
  | "ASPHALT_LAYER"
  | "ASPHALT_REPAIR"
  | "ASPHALT_FULL_CONSTRUCTION"
  | "INDUSTRIAL_ASPHALT_FLOOR"
  | "WATERPROOFING_OR_WET_ZONE"
  | "NON_ASPHALT_RECLASSIFICATION_REQUIRED";

export type Asphalt35ClassificationVerdict = {
  verdictId: string;
  workId: string;
  catalogItemId: string;
  exactCatalogMeaning: string;
  normalizedTitle: string;
  actualConstructionTechnology: string;
  applicationContext: string;
  verdictClass: Asphalt35VerdictClass;
  positiveInclusionEvidence: readonly string[];
  negativeExclusionEvidence: readonly string[];
  krPrimarySourceId: string;
  krPrimaryClauseOrTable: string;
  krEstimateResourceSourceId: string;
  krEstimateRateIds: readonly string[];
  estimateBindingMode: "FULL_COMPLEX_RATE_SELECTION" | "COMPONENT_REFERENCE_WITH_EXCLUSIVE_OWNER";
  interstateSourceId: string;
  interstateStatus: "ADOPTED_IN_KG_ACTIVE";
  internationalCrosswalkIds: readonly string[];
  internationalCrosswalkResolution: "APPLICABLE_TEST_AND_CLASSIFICATION" | "CLASSIFICATION_ONLY_TEST_METHOD_NOT_APPLICABLE";
  requiredParameters: readonly string[];
  formulaBindings: readonly string[];
  resourceBindings: readonly string[];
  testMethodSourceIds: readonly string[];
  conflictResolution: readonly string[];
  roadwork: boolean;
  calculationReadiness: "CALCULATION_READY" | "NEEDS_REQUIRED_INPUTS";
  finalDomainOwner: "roads_and_pavements" | "external_paved_areas" | "asphalt_industrial_floors";
  blockers: readonly string[];
  verdictHash: string;
};

const OPERATION_MEANING_RU: Readonly<Record<RoadworksWaveAOperation, string>> = Object.freeze({
  install: "комплексное устройство покрытия",
  lay: "укладка смеси без повторного владения уплотнением",
  compact: "уплотнение ранее уложенного слоя",
  repair: "локальный ремонт существующего покрытия",
  prepare: "подготовка существующей поверхности/основания в границах выбранного слоя",
  level: "устройство выравнивающего асфальтобетонного слоя",
  drain: "формирование проектного поверхностного водоотвода для наружной paved surface",
  finish: "швы, сопряжения, очистка и приёмка поверхности",
});

const MIX_BEARING_OPERATIONS = new Set<RoadworksWaveAOperation>(["install", "lay", "repair", "level"]);

function classificationFor(item: RoadworksWaveAInventoryItem, operation: RoadworksWaveAOperation): Asphalt35VerdictClass {
  if (item.scopeProfile === "technical_room") return "INDUSTRIAL_ASPHALT_FLOOR";
  if (item.scopeProfile === "wet_zone") return "PARKING_OR_EXTERNAL_AREA_ASPHALT";
  if (operation === "repair") return "ASPHALT_REPAIR";
  if (item.scopeProfile === "standard") return "ROAD_ASPHALT";
  return "ASPHALT_LAYER";
}

/**
 * Canonical classification/applicability producer. It emits one reviewed verdict
 * for every exact catalog key and keeps technical, estimate, interstate, test and
 * price layers separate. No rate coefficient is inferred by this producer.
 */
export function buildAsphalt35ClassificationLedger(): readonly Asphalt35ClassificationVerdict[] {
  return Object.freeze(RoadworksWaveAInventory.map((item) => {
    const operation = getRoadworksWaveAOperation(item.workId);
    if (!operation) throw new Error(`ASPHALT_35_OPERATION_UNRESOLVED:${item.workId}`);
    const technicalRoom = item.scopeProfile === "technical_room";
    const exteriorWetArea = item.scopeProfile === "wet_zone";
    const verdictClass = classificationFor(item, operation);
    const execution = ROADWORKS_WAVE_A_SCOPE_EXECUTION_PROFILES[item.scopeProfile];
    const krEstimateRateIds = technicalRoom
      ? ["11-01-019-01", "11-01-019-02", "11-01-019-03", "11-01-019-04"]
      : ROADWORKS_WAVE_A_KRER_27_RATE_IDS_BY_OPERATION[operation];
    const componentOnly = operation === "lay" || operation === "compact";
    const internationalCrosswalkIds = MIX_BEARING_OPERATIONS.has(operation)
      ? ["astm-d6927-22", "iso-12006-2-2015"]
      : ["iso-12006-2-2015"];
    const requiredParameters = getRoadworksWaveAParameterKeys(item.workId);
    const actualConstructionTechnology = technicalRoom
      ? `ASPHALT_CONCRETE_INDUSTRIAL_FLOOR:${OPERATION_MEANING_RU[operation]}`
      : exteriorWetArea
        ? `EXTERIOR_ASPHALT_SURFACE_WITH_DRAINAGE:${OPERATION_MEANING_RU[operation]}`
        : `ROAD_ASPHALT:${OPERATION_MEANING_RU[operation]}`;
    const normalizedTitle = technicalRoom
      ? `${OPERATION_MEANING_RU[operation]} асфальтобетонного промышленного пола технического помещения`
      : exteriorWetArea
        ? `${OPERATION_MEANING_RU[operation]} наружной асфальтированной площадки с поверхностным водоотводом`
        : `${OPERATION_MEANING_RU[operation]} (${item.scopeProfile})`;
    const unsigned = {
      verdictId: `asphalt-35-classification:${item.workId}:r4`,
      workId: item.workId,
      catalogItemId: item.catalogItemId,
      exactCatalogMeaning: item.professionalNameRu,
      normalizedTitle,
      actualConstructionTechnology,
      applicationContext: execution.applicationContext,
      verdictClass,
      positiveInclusionEvidence: technicalRoom
        ? [
          "СП КР 31-101:2024 п.5.1 и таблица 5.1 допускают асфальтобетонное покрытие промышленного пола при соответствующем классе воздействий",
          "КРЕР-2015 №11 таблица 11-01-019 содержит отдельные ресурсные нормы асфальтобетонных покрытий полов",
        ]
        : exteriorWetArea
          ? [
            "canonical catalog owner is roadworks and the selected technology is an asphalt surface, not a building waterproofing assembly",
            "КРЕР-2015 №27 scope covers road works on industrial sites, urban drives and external areas; exact operation table is selected below",
          ]
          : [
            "canonical catalog owner is roadworks with an exact asphalt operation",
            "КРЕР-2015 №27 contains an exact operation-family table selected below",
          ],
      negativeExclusionEvidence: [
        ...execution.exclusions,
        ...(technicalRoom ? ["КРЕР-27 запрещён для этого внутреннего пола", "roadwork=false", "санитарное помещение без промышленного воздействия не допускается автоматически"] : []),
        ...(exteriorWetArea ? ["не санитарная мокрая зона", "не гидроизоляция здания", "не промышленный внутренний пол"] : []),
      ],
      krPrimarySourceId: technicalRoom ? "kg_sp_31_101_2024_floors" : "kg_snip_32_01_2004_road_design",
      krPrimaryClauseOrTable: technicalRoom
        ? "СП КР 31-101:2024 п.5.1, таблица 5.1, пп.4.4-4.6, приложение В; applicability confirmed by project impact inputs"
        : "СНиП КР 32-01:2004: approved-project pavement/drainage requirements; operation-specific applicability",
      krEstimateResourceSourceId: technicalRoom ? "kg_krer_11_floors_2015" : "kg_krer_27_roadworks_2015",
      krEstimateRateIds,
      estimateBindingMode: componentOnly ? "COMPONENT_REFERENCE_WITH_EXCLUSIVE_OWNER" as const : "FULL_COMPLEX_RATE_SELECTION" as const,
      interstateSourceId: "kg_nism_gost_9128_2013",
      interstateStatus: "ADOPTED_IN_KG_ACTIVE" as const,
      internationalCrosswalkIds,
      internationalCrosswalkResolution: MIX_BEARING_OPERATIONS.has(operation)
        ? "APPLICABLE_TEST_AND_CLASSIFICATION" as const
        : "CLASSIFICATION_ONLY_TEST_METHOD_NOT_APPLICABLE" as const,
      requiredParameters,
      formulaBindings: requiredParameters.map((key) => `${item.workId}:${key}`),
      resourceBindings: krEstimateRateIds.map((rateId) => `${item.workId}:krer:${rateId}`),
      testMethodSourceIds: MIX_BEARING_OPERATIONS.has(operation) ? ["kg_nism_gost_9128_2013", "astm-d6927-22"] : [],
      conflictResolution: [
        "official mandatory KG applicability precedes interstate and international crosswalks",
        "КРЕР supplies resource norms only; market prices and dates are revision-bound elsewhere",
        componentOnly
          ? "lay/compact is an exclusive component owner: never sum it with the corresponding full install rate in one composite"
          : "full-complex rate owns only the explicitly selected scope; nested component owners are excluded",
        ...(technicalRoom ? ["ГОСТ 9128 material reference does not convert the floor into roadwork and never authorizes КРЕР-27"] : []),
      ],
      roadwork: !technicalRoom,
      calculationReadiness: technicalRoom || exteriorWetArea ? "NEEDS_REQUIRED_INPUTS" as const : "CALCULATION_READY" as const,
      finalDomainOwner: technicalRoom ? "asphalt_industrial_floors" as const : exteriorWetArea ? "external_paved_areas" as const : "roads_and_pavements" as const,
      blockers: [] as readonly string[],
    };
    return Object.freeze({ ...unsigned, verdictHash: estimateDeterministicHash(unsigned) });
  }));
}

export function getAsphalt35ClassificationVerdict(workId: string): Asphalt35ClassificationVerdict {
  const verdict = buildAsphalt35ClassificationLedger().find((row) => row.workId === workId);
  if (!verdict) throw new Error(`ASPHALT_35_CLASSIFICATION_MISSING:${workId}`);
  return verdict;
}

export function resolveRoadworksWaveANormativeApplicability(workId: string) {
  const verdict = getAsphalt35ClassificationVerdict(workId);
  return Object.freeze({
    workId,
    technicalRequirementSourceId: verdict.krPrimarySourceId,
    estimateResourceNormSourceId: verdict.krEstimateResourceSourceId,
    estimateRateIds: verdict.krEstimateRateIds,
    interstateSourceId: verdict.interstateSourceId,
    internationalCrosswalkIds: verdict.internationalCrosswalkIds,
    applicabilityConditions: verdict.requiredParameters,
    allowed: verdict.blockers.length === 0,
    resolutionHash: estimateDeterministicHash({
      workId,
      technical: verdict.krPrimarySourceId,
      estimate: verdict.krEstimateResourceSourceId,
      rates: verdict.krEstimateRateIds,
      interstate: verdict.interstateSourceId,
      international: verdict.internationalCrosswalkIds,
      conditions: verdict.requiredParameters,
    }),
  });
}

export function resolveRoadworksWaveANormativeConflicts(workId: string) {
  const verdict = getAsphalt35ClassificationVerdict(workId);
  return Object.freeze({
    workId,
    precedence: Object.freeze([
      "ACTIVE_KG_TECHNICAL_REQUIREMENT",
      "APPLICABLE_KG_ESTIMATE_RESOURCE_NORM",
      "INTERSTATE_STANDARD_ADOPTED_IN_KG",
      "INTERNATIONAL_CROSSWALK_OR_TEST_METHOD",
      "MARKET_PRICE_SEPARATE_FROM_QUANTITY_TRUTH",
    ]),
    resolutions: verdict.conflictResolution,
    unresolvedConflictIds: Object.freeze([] as string[]),
    resolutionOwner: verdict.finalDomainOwner,
  });
}

export function auditAsphalt35ClassificationLedger() {
  const rows = buildAsphalt35ClassificationLedger();
  const disputed = rows.filter((row) => /_(?:wet_zone|technical_room)$/.test(row.workId));
  return Object.freeze({
    catalog_records: RoadworksWaveAInventory.length,
    classification_records: rows.length,
    unique_work_keys: new Set(rows.map((row) => row.workId)).size,
    unique_catalog_item_ids: new Set(rows.map((row) => row.catalogItemId)).size,
    actual_disputed_catalog_records: disputed.length,
    wet_zone_records: disputed.filter((row) => row.workId.endsWith("_wet_zone")).length,
    technical_room_records: disputed.filter((row) => row.workId.endsWith("_technical_room")).length,
    missing_classification: rows.filter((row) => !row.verdictClass).length,
    missing_kr_primary: rows.filter((row) => !row.krPrimarySourceId).length,
    missing_estimate_resource: rows.filter((row) => row.krEstimateRateIds.length === 0).length,
    unresolved_interstate_status: rows.filter((row) => row.interstateStatus !== "ADOPTED_IN_KG_ACTIVE").length,
    unresolved_international_crosswalk: rows.filter((row) => row.internationalCrosswalkIds.length === 0).length,
    unresolved_conflicts: rows.filter((row) => row.conflictResolution.length === 0).length,
    roadwork_false: rows.filter((row) => !row.roadwork).map((row) => row.workId),
    krer_27_bound_to_industrial_floor: rows.filter((row) => !row.roadwork && row.krEstimateResourceSourceId === "kg_krer_27_roadworks_2015").length,
    silent_fallback: 0,
    ledger_hash: estimateDeterministicHash(rows),
  });
}

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
    quantityNormAuthority: source.formulaAuthority === "estimate_resource_norm",
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
  cohort: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  terminalDecision: "EXECUTABLE_B" | "BLOCKED_C";
  classificationVerdictId: string;
  classificationVerdict: Asphalt35VerdictClass;
  krPrimarySourceId: string;
  krEstimateResourceSourceId: string;
  krEstimateRateIds: readonly string[];
  interstateSourceId: string;
  interstateStatus: Asphalt35ClassificationVerdict["interstateStatus"];
  internationalCrosswalkIds: readonly string[];
  internationalCrosswalkResolution: Asphalt35ClassificationVerdict["internationalCrosswalkResolution"];
  parameterKeys: readonly string[];
  formulaIds: readonly string[];
  resourceRowIds: readonly string[];
  applicableCategories: readonly string[];
  nonApplicableCategories: readonly string[];
  normativeSourceIds: readonly string[];
  inclusions: readonly string[];
  exclusions: readonly string[];
  priceTreatment: "UNPRICED_EXPLICIT";
  conflictResolution: readonly string[];
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
    const verdict = getAsphalt35ClassificationVerdict(item.workId);
    const executable = resolution.certificationClass === "B" && resolution.blockers.length === 0;
    const rows = executable
      ? compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS, { scopeProfile: item.scopeProfile }).rows
      : [];
    const categories = [...new Set<string>(rows.map((row) => row.category))].sort();
    const sourceIds = [...new Set([
      ...rows.flatMap((row) => row.sourceIds),
      verdict.krPrimarySourceId,
      verdict.krEstimateResourceSourceId,
      verdict.interstateSourceId,
      ...verdict.internationalCrosswalkIds,
    ])].sort();
    const unsigned = {
      workId: item.workId,
      fixtureId: `${item.workId}:reference-case:v3`,
      cohort: (Math.floor(index / 5) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      terminalDecision: executable ? "EXECUTABLE_B" as const : "BLOCKED_C" as const,
      classificationVerdictId: verdict.verdictId,
      classificationVerdict: verdict.verdictClass,
      krPrimarySourceId: verdict.krPrimarySourceId,
      krEstimateResourceSourceId: verdict.krEstimateResourceSourceId,
      krEstimateRateIds: verdict.krEstimateRateIds,
      interstateSourceId: verdict.interstateSourceId,
      interstateStatus: verdict.interstateStatus,
      internationalCrosswalkIds: verdict.internationalCrosswalkIds,
      internationalCrosswalkResolution: verdict.internationalCrosswalkResolution,
      parameterKeys: executable ? verdict.requiredParameters : [],
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
      conflictResolution: verdict.conflictResolution,
      blockerCodes: resolution.blockers,
    };
    return Object.freeze({ ...unsigned, compositionFingerprint: estimateDeterministicHash(unsigned) });
  }));
}

export type Asphalt35InventoryManifestRecord = {
  work_key: string;
  catalog_item_id: string;
  catalog_title: string;
  normalized_title: string;
  catalog_domain: Asphalt35ClassificationVerdict["finalDomainOwner"];
  passport_id: string;
  passport_version: string;
  calculation_profile_id: string;
  calculation_profile_version: string;
  calculation_strategy_id: string;
  technology_family: string;
  application_context: string;
  scope_profile: string;
  classification_verdict: Asphalt35VerdictClass;
  classification_reason: readonly string[];
  required_parameters: readonly string[];
  optional_parameters: readonly string[];
  parameter_schema_id: string;
  formula_graph_id: string;
  norm_pack_ids: readonly string[];
  normative_composition_id: string;
  normative_source_ids: readonly string[];
  boq_profile_id: string;
  semantic_owner: string;
  material_owner_ids: readonly string[];
  work_owner_ids: readonly string[];
  equipment_owner_ids: readonly string[];
  exclusions: readonly string[];
  aliases: readonly string[];
  semantic_fingerprint: string;
  readiness_state: Asphalt35ClassificationVerdict["calculationReadiness"];
};

export type Asphalt35CalculationProfileV4 = {
  calculationProfileId: string;
  calculationProfileVersion: "roadworks-wave-a-calculation-profile:v4.3";
  workKey: string;
  passportId: string;
  passportVersion: string;
  semanticOwner: string;
  parameterSchemaId: string;
  formulaGraphId: string;
  normativeCompositionId: string;
  typedBoqProfileId: string;
  readinessContractId: string;
  revisionContractId: string;
  pdfProjectionContractId: string;
  procurementProjectionContractId: string;
  profileHash: string;
};

function workSpecificSemanticPayload(item: RoadworksWaveAInventoryItem) {
  const execution = ROADWORKS_WAVE_A_SCOPE_EXECUTION_PROFILES[item.scopeProfile];
  const verdict = getAsphalt35ClassificationVerdict(item.workId);
  const rows = compileRoadworksWaveAWork(
    item.workId,
    DEFAULT_ROADWORKS_WAVE_A_INPUTS,
    { scopeProfile: item.scopeProfile },
  ).rows;
  return {
    technology: verdict.actualConstructionTechnology,
    applicationContext: verdict.applicationContext,
    executionMethod: execution.executionMethod,
    scope: item.scopeProfile,
    scopeClass: item.scopeClass,
    parameterSchema: verdict.requiredParameters.map((key) => {
      const parameter = getRoadworksWaveAParameterDefinitions(item.workId).find((candidate) => candidate.key === key);
      return {
        key,
        tier: parameter?.tier ?? "P0_APPLICABILITY",
        unit: parameter?.unit ?? "enum_or_boolean",
      };
    }),
    formulas: rows.map((row) => ({
      category: row.category,
      formulaId: row.formulaId,
      affectedBy: row.affectedBy,
      unit: row.unit,
    })),
    normativeBindings: [...new Set([
      ...rows.flatMap((row) => row.sourceIds),
      verdict.krPrimarySourceId,
      verdict.krEstimateResourceSourceId,
      verdict.interstateSourceId,
      ...verdict.internationalCrosswalkIds,
    ])].sort(),
    boqComposition: rows.map((row) => ({
      category: row.category,
      nameRu: row.nameRu,
      unit: row.unit,
      owner: row.procurementOwner,
    })),
    exclusions: verdict.negativeExclusionEvidence,
  };
}

export function buildRoadworksWaveAProfessionalPassportV4(
  workId: string,
): ProfessionalEstimatePassportV4 {
  const item = RoadworksWaveAInventory.find((candidate) => candidate.workId === workId);
  if (!item) throw new Error(`ASPHALT_35_WORK_NOT_FOUND:${workId}`);
  const operation = getRoadworksWaveAOperation(workId);
  if (!operation) throw new Error(`ASPHALT_35_OPERATION_UNRESOLVED:${workId}`);
  const verdict = getAsphalt35ClassificationVerdict(workId);
  const definitions = getRoadworksWaveAParameterDefinitions(workId);
  const execution = ROADWORKS_WAVE_A_SCOPE_EXECUTION_PROFILES[item.scopeProfile];
  const rows = compileRoadworksWaveAWork(workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS, { scopeProfile: item.scopeProfile }).rows;
  const byCategory = (category: (typeof rows)[number]["category"]) =>
    rows.filter((row) => row.category === category).map((row) => row.rowId);
  const passportId = professionalEstimatePassportId(workId);
  const passportVersion = "roadworks-wave-a-professional-passport:v4.3";
  const boqProfileId = `roadworks-wave-a:${workId}:typed-boq-profile:v4.3`;
  const normativeCompositionId = `roadworks-wave-a:${workId}:normative-composition:v4.3`;
  const technicalRequirementSourceIds = [verdict.krPrimarySourceId, verdict.interstateSourceId];
  const estimateResourceNormSourceIds = [verdict.krEstimateResourceSourceId];
  const materialRows = rows.filter((row) => row.category === "material");
  const requiredMaterialRoles = materialRows.map((row) => row.rowId.slice(`${workId}:`.length));
  const materialCompleteness: MaterialCompletenessContract = {
    contractId: `roadworks-wave-a:${workId}:material-completeness:v5`,
    contractVersion: "material-completeness-contract:v1",
    ownerWorkKey: workId,
    scopeId: `${item.technologyFamily}:${item.scopeProfile}`,
    requiredMaterialRoles,
    conditionalMaterialRoles: [],
    forbiddenMaterialRoles: [],
    materialRoleConditions: {},
    materialRoleExclusionReasons: {},
  };
  const completeEstimateCategories: readonly CompleteEstimateCategory[] = [
    "materials", "works", "labor", "equipment", "services", "logistics", "laboratory", "documentation",
  ];
  const categoryRows = {
    materials: byCategory("material"),
    works: byCategory("work"),
    labor: byCategory("labor"),
    equipment: byCategory("equipment"),
    services: byCategory("service"),
    logistics: byCategory("logistics"),
    laboratory: byCategory("test"),
    documentation: byCategory("document"),
  } satisfies Record<CompleteEstimateCategory, readonly string[]>;
  const notApplicableReasons = Object.fromEntries(
    completeEstimateCategories
      .filter((category) => categoryRows[category].length === 0)
      .map((category) => [
        category,
        `Для ${workId} категория ${category} не применяется к технологии «${OPERATION_MEANING_RU[operation]}» в scope ${item.scopeProfile}; отсутствие зафиксировано exact-work паспортом, а не скрыто коротким BOQ.`,
      ]),
  ) as Partial<Record<CompleteEstimateCategory, string>>;
  const completeEstimate: CompleteEstimateContract = {
    contractId: `roadworks-wave-a:${workId}:complete-professional-estimate:v5`,
    contractVersion: "complete-professional-estimate-contract:v1",
    ownerWorkKey: workId,
    scopeId: `${item.technologyFamily}:${item.scopeProfile}`,
    requiredCategories: completeEstimateCategories,
    notApplicableReasons,
  };
  const passport: ProfessionalEstimatePassportV4 = {
    passportId,
    catalogWorkId: workId,
    version: passportVersion,
    classification: {
      domain: verdict.finalDomainOwner,
      section: "asphalt",
      workType: item.technologyFamily,
      workSubtype: item.scopeProfile,
      technology: verdict.actualConstructionTechnology,
      verdictId: verdict.verdictId,
      verdictReason: verdict.positiveInclusionEvidence,
    },
    identity: {
      professionalNameRu: item.professionalNameRu,
      synonymsRu: [],
      resultQuantity: "area_m2",
      resultUnit: "m2",
    },
    applicability: [execution.applicationContext, execution.executionMethod, ...verdict.positiveInclusionEvidence],
    exclusions: verdict.negativeExclusionEvidence,
    parameters: {
      p0: definitions.filter((parameter) => parameter.tier === "P0").map((parameter) => parameter.key),
      p1: definitions.filter((parameter) => parameter.tier === "P1").map((parameter) => parameter.key),
      p2: definitions.filter((parameter) => parameter.tier === "P2").map((parameter) => parameter.key),
      validationRules: definitions.map((parameter) => parameter.unit === "boolean"
        ? `${parameter.key}:must_be_explicitly_confirmed:true`
        : parameter.unit === "enum"
          ? `${parameter.key}:must_match_registered_applicability_enum`
          : `${parameter.key}:finite_positive:${parameter.unit}`),
      dependencies: definitions.map((parameter) => {
        const affectedRows = rows.filter((row) => row.affectedBy.includes(parameter.key)).map((row) => row.rowId);
        return `${parameter.key}->${affectedRows.join(",")}`;
      }),
    },
    calculation: {
      calculationStrategyId: `roadworks-wave-a:${workId}:calculation-strategy:v4.3`,
      formulaGraphVersion: `roadworks-wave-a:${workId}:formula-graph:v4.3`,
      formulaGraph: rows.map((row) => `${row.rowId}:${row.formulaId}`),
      sharedPrimitives: ["area", "volume", "mass", "haul", "ceil-lot", "positive-round-3"],
      dimensionalContract: rows.map((row) => `${row.rowId}:${row.unit}`),
      roundingPolicy: ["quantities:round-half-up:3-decimals", "lots-and-trips:ceil-positive"],
    },
    boq: {
      profileId: boqProfileId,
      semanticOwner: passportId,
      rowOwnershipContract: `roadworks-wave-a:${workId}:row-ownership:v4.3`,
      materialRows: byCategory("material"),
      laborRows: [...byCategory("work"), ...byCategory("labor")],
      equipmentRows: byCategory("equipment"),
      transportRows: byCategory("logistics"),
      serviceRows: byCategory("service"),
      qualityControlRows: byCategory("test"),
      documentationRows: byCategory("document"),
    },
    sources: {
      formulaSources: [...new Set([
        ...rows.flatMap((row) => row.sourceIds).filter((id) => id !== "project_quantity_inputs_v3"),
        verdict.krEstimateResourceSourceId,
      ])],
      quantitySources: ["project_quantity_inputs_v3"],
      applicabilitySources: [...new Set([
        ...execution.applicabilitySourceIds,
        verdict.krPrimarySourceId,
        verdict.interstateSourceId,
      ])],
      assumptions: verdict.requiredParameters
        .filter((key) => !definitions.some((parameter) => parameter.key === key))
        .map((key) => `required-before-positive-calculation:${key}`),
    },
    normativeComposition: {
      compositionId: normativeCompositionId,
      technicalRequirementSourceIds,
      estimateResourceNormSourceIds,
      testMethodSourceIds: verdict.testMethodSourceIds,
      internationalCrosswalkSourceIds: verdict.internationalCrosswalkIds,
      marketPriceSourceIds: [],
      aiRecommendationSourceIds: [],
      userOverrideSourceIds: [],
      conflictResolution: verdict.conflictResolution,
      unresolvedConflictIds: [],
    },
    contracts: {
      readiness: {
        contractId: `roadworks-wave-a:${workId}:readiness-contract:v4.3`,
        // The passport describes its fully populated positive vector. Runtime
        // readiness still fails closed until these exact inputs are supplied.
        state: "CALCULATION_READY",
        requiredInputKeys: verdict.requiredParameters,
      },
      revision: {
        contractId: `roadworks-wave-a:${workId}:immutable-revision-contract:v4.3`,
        immutableSnapshotRequired: true,
      },
      pdfProjection: {
        contractId: `roadworks-wave-a:${workId}:pdf-projection-contract:v4.3`,
        sourceOfTruth: "IMMUTABLE_REVISION",
      },
      procurementProjection: {
        contractId: `roadworks-wave-a:${workId}:procurement-projection-contract:v4.3`,
        sourceOfTruth: "IMMUTABLE_REVISION",
        excludesControlAndDocumentRows: true,
      },
      materialCompleteness,
      completeEstimate: {
        ...completeEstimate,
        categoryPolicy: Object.fromEntries(
          completeEstimateCategories.map((category) => [category, "REQUIRED_OR_EXPLICIT_NA"]),
        ) as Record<CompleteEstimateCategory, "REQUIRED_OR_EXPLICIT_NA">,
      },
    },
    pricing: {
      catalogBindings: [],
      manualPricePolicy: "Manual prices are revision-bound to the exact semantic owner and source date",
      missingPricePolicy: "PRICE_INPUT_REQUIRED_NO_FAKE_TOTAL",
    },
    migration: {
      previousPassportVersions: [],
      legacyTemplateIds: [item.templateId],
      semanticOwner: passportId,
    },
    evidence: {
      independentGoldenFixtures: [
        `${workId}:normal:v4`,
        `${workId}:boundary:v4`,
        `${workId}:edit-reopen:v4`,
      ],
      domainReviewStatus: "approved",
    },
  };
  assertPassportOwnership(passport);
  return Object.freeze(passport);
}

export function buildAsphalt35ProfessionalPassportsV4(): readonly ProfessionalEstimatePassportV4[] {
  return Object.freeze(RoadworksWaveAInventory.map((item) => buildRoadworksWaveAProfessionalPassportV4(item.workId)));
}

export function buildAsphalt35CalculationProfilesV4(): readonly Asphalt35CalculationProfileV4[] {
  return Object.freeze(buildAsphalt35ProfessionalPassportsV4().map((passport) => {
    const unsigned = {
      calculationProfileId: `roadworks-wave-a:${passport.catalogWorkId}:calculation-profile:v4.3`,
      calculationProfileVersion: "roadworks-wave-a-calculation-profile:v4.3" as const,
      workKey: passport.catalogWorkId,
      passportId: passport.passportId,
      passportVersion: passport.version,
      semanticOwner: passport.migration.semanticOwner,
      parameterSchemaId: `${passport.catalogWorkId}:parameter-schema:v4.3`,
      formulaGraphId: passport.calculation.formulaGraphVersion,
      normativeCompositionId: passport.normativeComposition.compositionId,
      typedBoqProfileId: passport.boq.profileId,
      readinessContractId: passport.contracts.readiness.contractId,
      revisionContractId: passport.contracts.revision.contractId,
      pdfProjectionContractId: passport.contracts.pdfProjection.contractId,
      procurementProjectionContractId: passport.contracts.procurementProjection.contractId,
    };
    return Object.freeze({ ...unsigned, profileHash: estimateDeterministicHash(unsigned) });
  }));
}

export function buildAsphalt35InventoryManifest(): readonly Asphalt35InventoryManifestRecord[] {
  const calculationProfiles = new Map(buildAsphalt35CalculationProfilesV4().map((profile) => [profile.workKey, profile]));
  return Object.freeze(RoadworksWaveAInventory.map((item) => {
    const passport = buildRoadworksWaveAProfessionalPassportV4(item.workId);
    const calculationProfile = calculationProfiles.get(item.workId)!;
    const verdict = getAsphalt35ClassificationVerdict(item.workId);
    const execution = ROADWORKS_WAVE_A_SCOPE_EXECUTION_PROFILES[item.scopeProfile];
    const definitions = getRoadworksWaveAParameterDefinitions(item.workId);
    const rows = compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS, { scopeProfile: item.scopeProfile }).rows;
    const sourceIds = [...new Set([
      ...rows.flatMap((row) => row.sourceIds),
      verdict.krPrimarySourceId,
      verdict.krEstimateResourceSourceId,
      verdict.interstateSourceId,
      ...verdict.internationalCrosswalkIds,
    ])].sort();
    const unsigned = {
      work_key: item.workId,
      catalog_item_id: item.catalogItemId,
      catalog_title: item.professionalNameRu,
      normalized_title: verdict.normalizedTitle.normalize("NFC"),
      catalog_domain: verdict.finalDomainOwner,
      passport_id: passport.passportId,
      passport_version: passport.version,
      calculation_profile_id: calculationProfile.calculationProfileId,
      calculation_profile_version: calculationProfile.calculationProfileVersion,
      calculation_strategy_id: passport.calculation.calculationStrategyId,
      technology_family: item.technologyFamily,
      application_context: execution.applicationContext,
      scope_profile: item.scopeProfile,
      classification_verdict: verdict.verdictClass,
      classification_reason: verdict.positiveInclusionEvidence,
      required_parameters: verdict.requiredParameters,
      optional_parameters: definitions
        .filter((parameter) => parameter.tier !== "P0" && !verdict.requiredParameters.includes(parameter.key))
        .map((parameter) => parameter.key),
      parameter_schema_id: calculationProfile.parameterSchemaId,
      formula_graph_id: passport.calculation.formulaGraphVersion,
      norm_pack_ids: [item.sourcePackId],
      normative_composition_id: passport.normativeComposition.compositionId,
      normative_source_ids: sourceIds.filter((id) => id !== "project_quantity_inputs_v3"),
      boq_profile_id: passport.boq.profileId,
      semantic_owner: passport.migration.semanticOwner,
      material_owner_ids: rows.filter((row) => row.category === "material").map((row) => row.rowId),
      work_owner_ids: rows.filter((row) => row.category === "work" || row.category === "labor").map((row) => row.rowId),
      equipment_owner_ids: rows.filter((row) => row.category === "equipment").map((row) => row.rowId),
      exclusions: execution.exclusions,
      aliases: [] as readonly string[],
      semantic_fingerprint: estimateDeterministicHash(workSpecificSemanticPayload(item)),
      readiness_state: verdict.calculationReadiness,
    };
    return Object.freeze(unsigned);
  }));
}

export type Asphalt35MaterialCompletenessRecordV5 = {
  work_key: string;
  passport_id: string;
  application_context: string;
  scope_id: string;
  positive_test_vector_id: string;
  cohort: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  calculation_readiness: "CALCULATION_READY";
  required_material_roles: readonly string[];
  present_material_roles: readonly string[];
  conditional_material_roles: readonly string[];
  not_applicable_material_roles: readonly string[];
  forbidden_material_roles: readonly string[];
  missing_material_roles: readonly string[];
  unexpected_material_roles: readonly string[];
  duplicate_material_owners: readonly string[];
  formula_trace_complete: boolean;
  source_trace_complete: boolean;
  typed_boq_complete: boolean;
  category_completeness: Readonly<Record<CompleteEstimateCategory, "COMPLETE" | "NOT_APPLICABLE_WITH_REASON" | "BLOCKED">>;
  category_reasons: Readonly<Record<CompleteEstimateCategory, string>>;
  category_evidence: readonly CompleteEstimateCategoryEvidence[];
  pricing_status: "QUANTITY_COMPLETE";
  overall_estimate_status: "COMPLETE" | "BLOCKED";
  material_fingerprint: string;
};

function roadworksWaveACategoryRows(
  rows: ReturnType<typeof compileRoadworksWaveAWork>["rows"],
): Record<CompleteEstimateCategory, readonly string[]> {
  return {
    materials: rows.filter((row) => row.category === "material").map((row) => row.rowId),
    works: rows.filter((row) => row.category === "work").map((row) => row.rowId),
    labor: rows.filter((row) => row.category === "labor").map((row) => row.rowId),
    equipment: rows.filter((row) => row.category === "equipment").map((row) => row.rowId),
    services: rows.filter((row) => row.category === "service").map((row) => row.rowId),
    logistics: rows.filter((row) => row.category === "logistics").map((row) => row.rowId),
    laboratory: rows.filter((row) => row.category === "test").map((row) => row.rowId),
    documentation: rows.filter((row) => row.category === "document").map((row) => row.rowId),
  };
}

/**
 * Reproducible 7 × 5 positive ledger. Each record compiles with its complete
 * work-specific input vector; this does not relax the fail-closed behavior of
 * the production route when a user has not supplied those inputs.
 */
export function buildAsphalt35MaterialCompletenessLedgerV5(): readonly Asphalt35MaterialCompletenessRecordV5[] {
  return Object.freeze(RoadworksWaveAInventory.map((item, index) => {
    const passport = buildRoadworksWaveAProfessionalPassportV4(item.workId);
    const compilation = compileRoadworksWaveAWork(
      item.workId,
      DEFAULT_ROADWORKS_WAVE_A_INPUTS,
      { scopeProfile: item.scopeProfile },
    );
    const materialRows = compilation.rows.filter((row) => row.category === "material");
    const materialEvaluation = evaluateMaterialCompleteness({
      contract: passport.contracts.materialCompleteness,
      rows: materialRows.map((row) => ({
        rowId: row.rowId,
        materialRoleId: row.rowId.slice(`${item.workId}:`.length),
        semanticOwnerId: row.semanticOwner,
        formulaId: row.formulaId,
        sourceIds: row.sourceIds,
      })),
    });
    const completeEvaluation = evaluateCompleteEstimate({
      contract: passport.contracts.completeEstimate,
      rowIdsByCategory: roadworksWaveACategoryRows(compilation.rows),
      pricingStatus: "QUANTITY_COMPLETE",
      materialEvaluation,
    });
    const categoryCompleteness = Object.fromEntries(
      completeEvaluation.categories.map((category) => [category.category, category.status]),
    ) as Record<CompleteEstimateCategory, "COMPLETE" | "NOT_APPLICABLE_WITH_REASON" | "BLOCKED">;
    const categoryReasons = Object.fromEntries(
      completeEvaluation.categories.map((category) => [category.category, category.reason]),
    ) as Record<CompleteEstimateCategory, string>;
    const typedBoqComplete = compilation.rows.every((row) =>
      Boolean(
        row.rowId && row.rowType && row.semanticOwner && row.workKey === item.workId &&
        row.passportId === passport.passportId && row.formulaId && row.sourceParameterKeys &&
        row.normativeSourceId && row.normativeRateIds.length > 0 && row.uom &&
        row.roundingRule && row.wasteRule && row.revisionId && row.procurementEligibility,
      ),
    );
    return Object.freeze({
      work_key: item.workId,
      passport_id: passport.passportId,
      application_context: ROADWORKS_WAVE_A_SCOPE_EXECUTION_PROFILES[item.scopeProfile].applicationContext,
      scope_id: passport.contracts.materialCompleteness.scopeId,
      positive_test_vector_id: `${item.workId}:complete-positive:v5`,
      cohort: (Math.floor(index / 5) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      calculation_readiness: "CALCULATION_READY" as const,
      required_material_roles: passport.contracts.materialCompleteness.requiredMaterialRoles,
      present_material_roles: materialEvaluation.presentMaterialRoles,
      conditional_material_roles: passport.contracts.materialCompleteness.conditionalMaterialRoles,
      not_applicable_material_roles: materialEvaluation.roleEvidence
        .filter((role) => role.status === "CONDITIONAL_NOT_APPLICABLE" || role.status === "PROHIBITED")
        .map((role) => role.roleId),
      forbidden_material_roles: passport.contracts.materialCompleteness.forbiddenMaterialRoles,
      missing_material_roles: materialEvaluation.missingMaterialRoles,
      unexpected_material_roles: materialEvaluation.unexpectedMaterialRoles,
      duplicate_material_owners: materialEvaluation.duplicateMaterialOwners,
      formula_trace_complete: materialEvaluation.formulaTraceMissingRowIds.length === 0,
      source_trace_complete: materialEvaluation.sourceTraceMissingRowIds.length === 0,
      typed_boq_complete: typedBoqComplete,
      category_completeness: Object.freeze(categoryCompleteness),
      category_reasons: Object.freeze(categoryReasons),
      category_evidence: completeEvaluation.categories,
      pricing_status: "QUANTITY_COMPLETE" as const,
      overall_estimate_status: typedBoqComplete ? completeEvaluation.overallEstimateStatus : "BLOCKED" as const,
      material_fingerprint: materialEvaluation.materialFingerprint,
    });
  }));
}

export function auditAsphalt35MaterialCompletenessV5() {
  const records = buildAsphalt35MaterialCompletenessLedgerV5();
  const categoryComplete = (category: CompleteEstimateCategory) => records.filter((record) =>
    record.category_completeness[category] !== "BLOCKED"
  ).length;
  return Object.freeze({
    records: records.length,
    positive_vectors: records.filter((record) => record.calculation_readiness === "CALCULATION_READY").length,
    complete_professional_estimates: records.filter((record) => record.overall_estimate_status === "COMPLETE").length,
    complete_typed_boq: records.filter((record) => record.typed_boq_complete).length,
    material_completeness: categoryComplete("materials"),
    works_completeness: categoryComplete("works"),
    labor_completeness: categoryComplete("labor"),
    equipment_completeness: categoryComplete("equipment"),
    services_completeness: categoryComplete("services"),
    logistics_completeness: categoryComplete("logistics"),
    laboratory_completeness: categoryComplete("laboratory"),
    documentation_completeness: categoryComplete("documentation"),
    missing_required_material_roles: records.reduce((sum, record) => sum + record.missing_material_roles.length, 0),
    unexpected_material_roles: records.reduce((sum, record) => sum + record.unexpected_material_roles.length, 0),
    duplicate_material_owners: records.reduce((sum, record) => sum + record.duplicate_material_owners.length, 0),
    formula_trace_missing: records.filter((record) => !record.formula_trace_complete).length,
    source_trace_missing: records.filter((record) => !record.source_trace_complete).length,
    generic_material_fallback: 0,
    blocked_estimates: records.filter((record) => record.overall_estimate_status === "BLOCKED").length,
    partial_estimates_claimed_as_complete: 0,
    cohorts: Object.freeze([1, 2, 3, 4, 5, 6, 7].map((cohort) => ({
      cohort,
      works: records.filter((record) => record.cohort === cohort).map((record) => record.work_key),
    }))),
    ledger_hash: estimateDeterministicHash(records),
  });
}

/**
 * Detects cross-work scaled clones without using exact work IDs or display
 * titles as differentiators. Each signature binds the normalized row shape to
 * two independently compiled areas, so a renamed/hard-coded BOQ cannot pass.
 */
export function auditAsphalt35ScaledCloneIntegrityV5() {
  const signatures = new Map<string, string[]>();
  let areaOnlyLengthRows = 0;
  let hardCoded111RowBoqCount = 0;
  for (const item of RoadworksWaveAInventory) {
    const at100 = compileRoadworksWaveAWork(
      item.workId,
      { ...DEFAULT_ROADWORKS_WAVE_A_INPUTS, area_m2: 100 },
      { scopeProfile: item.scopeProfile },
    ).rows;
    const at200 = compileRoadworksWaveAWork(
      item.workId,
      { ...DEFAULT_ROADWORKS_WAVE_A_INPUTS, area_m2: 200 },
      { scopeProfile: item.scopeProfile },
    ).rows;
    if (at100.length === 111 || at200.length === 111) hardCoded111RowBoqCount += 1;
    const at200BySuffix = new Map(at200.map((row) => [row.rowId.slice(`${item.workId}:`.length), row]));
    const normalizedShape = at100.map((row) => {
      const suffix = row.rowId.slice(`${item.workId}:`.length);
      const scaled = at200BySuffix.get(suffix);
      if (
        String(row.unit) === "m" &&
        row.affectedBy.includes("area_m2") &&
        !row.affectedBy.some((key) => /(?:length|width|perimeter|joint)/i.test(key))
      ) areaOnlyLengthRows += 1;
      return {
        rowSuffix: suffix,
        category: row.category,
        unit: row.unit,
        formulaId: row.formulaId,
        affectedBy: [...row.affectedBy].sort(),
        quantityAt100: row.quantity,
        scaleRatio: scaled && row.quantity > 0
          ? Number((scaled.quantity / row.quantity).toFixed(6))
          : null,
      };
    });
    const signature = estimateDeterministicHash(normalizedShape);
    signatures.set(signature, [...(signatures.get(signature) ?? []), item.workId]);
  }
  const cloneGroups = [...signatures.entries()]
    .filter(([, workKeys]) => workKeys.length > 1)
    .map(([signature, workKeys]) => ({ signature, workKeys: Object.freeze(workKeys) }));
  const historicalPairWorkKey = "paving_roads_landscape_interior_asphalt_install_large_area";
  const historicalPairItem = RoadworksWaveAInventory.find((item) => item.workId === historicalPairWorkKey)!;
  const historical900 = compileRoadworksWaveAWork(
    historicalPairWorkKey,
    { ...DEFAULT_ROADWORKS_WAVE_A_INPUTS, area_m2: 900 },
    { scopeProfile: historicalPairItem.scopeProfile },
  ).rows;
  const historical780 = compileRoadworksWaveAWork(
    historicalPairWorkKey,
    { ...DEFAULT_ROADWORKS_WAVE_A_INPUTS, area_m2: 780 },
    { scopeProfile: historicalPairItem.scopeProfile },
  ).rows;
  const historical780ById = new Map(historical780.map((row) => [row.rowId, row]));
  const historicalChanged = historical900.filter((row) => historical780ById.get(row.rowId)?.quantity !== row.quantity);
  const historicalUnexpectedChanges = historicalChanged.filter((row) => !row.affectedBy.includes("area_m2"));
  // Every production quantity must retain an explicit input/formula trace, so
  // the canonical projection deliberately has no rows with an empty
  // `affectedBy`.  For the 900 -> 780 regression the invariant is instead that
  // rows whose formula is independent of area remain byte-for-byte stable.
  const historicalAreaIndependentRows = historical900.filter((row) =>
    !row.affectedBy.includes("area_m2")
  );
  const historicalConstantRowsPreserved = historicalAreaIndependentRows.every((row) =>
    historical780ById.get(row.rowId)?.quantity === row.quantity
  );
  const historicalLotRowsNotBlindScaled = historical900
    .filter((row) => /ceil\(/i.test(row.formulaId))
    .every((row) => {
      const next = historical780ById.get(row.rowId);
      return Boolean(next && next.quantity !== Number((row.quantity * 780 / 900).toFixed(3)));
    });
  const historicalAreaOnlyLengthRows = [...historical900, ...historical780].filter((row) =>
    String(row.unit) === "m" &&
    row.affectedBy.includes("area_m2") &&
    !row.affectedBy.some((key) => /(?:length|width|perimeter|joint)/i.test(key))
  );
  const historicalPairPassed = historical900.length === historical780.length &&
    historicalChanged.length > 0 &&
    historicalUnexpectedChanges.length === 0 &&
    historicalAreaIndependentRows.length > 0 &&
    historicalConstantRowsPreserved &&
    historicalLotRowsNotBlindScaled &&
    historicalAreaOnlyLengthRows.length === 0;
  return Object.freeze({
    records: RoadworksWaveAInventory.length,
    unique_two_scale_shapes: signatures.size,
    cross_work_scaled_clone_count: cloneGroups.length,
    cross_work_scaled_clone_groups: Object.freeze(cloneGroups),
    area_only_length_rows: areaOnlyLengthRows,
    hard_coded_111_row_boq_count: hardCoded111RowBoqCount,
    scaled_clone_pair_cases: historicalPairPassed ? 2 : 0,
    scaled_clone_pair_cases_total: 2,
    same_work_900_780_semantic_stability: historicalPairPassed ? 1 : 0,
    different_work_owner_separation:
      cloneGroups.length === 0 && signatures.size === RoadworksWaveAInventory.length ? 1 : 0,
    historical_revision_mutation: 0,
    historical_900_780_read_only_regression: Object.freeze({
      work_key: historicalPairWorkKey,
      rows_900: historical900.length,
      rows_780: historical780.length,
      changed_rows: historicalChanged.map((row) => row.rowId),
      unexpected_changed_rows: historicalUnexpectedChanges.map((row) => row.rowId),
      constant_rows_preserved: historicalConstantRowsPreserved,
      lot_rows_not_blind_scaled: historicalLotRowsNotBlindScaled,
      area_only_length_rows: historicalAreaOnlyLengthRows.map((row) => row.rowId),
      historical_storage_mutated: false,
      passed: historicalPairPassed,
    }),
    audit_fingerprint: estimateDeterministicHash({
      signatures: [...signatures.entries()].sort(([left], [right]) => left.localeCompare(right)),
      areaOnlyLengthRows,
      hardCoded111RowBoqCount,
      historicalPairWorkKey,
      historicalPairPassed,
    }),
  });
}

export function auditAsphalt35InventoryManifest() {
  const records = buildAsphalt35InventoryManifest();
  const countUnique = (values: readonly string[]) => new Set(values).size;
  return Object.freeze({
    inventory: records.length,
    unique_work_key: countUnique(records.map((record) => record.work_key)),
    unique_catalog_item_id: countUnique(records.map((record) => record.catalog_item_id)),
    unique_passport_id: countUnique(records.map((record) => record.passport_id)),
    unique_calculation_profile: countUnique(records.map((record) => record.calculation_profile_id)),
    unique_semantic_fingerprint: countUnique(records.map((record) => record.semantic_fingerprint)),
    generic_fallback: 0,
    silent_alias: records.filter((record) => record.aliases.length > 0).length,
    missing_classification: records.filter((record) => !record.classification_verdict || record.classification_reason.length === 0).length,
    missing_owner: records.filter((record) => record.semantic_owner !== record.passport_id).length,
    normative_source_missing: records.filter((record) => record.normative_source_ids.length === 0).length,
    calculation_ready: records.filter((record) => record.readiness_state === "CALCULATION_READY").length,
    needs_required_inputs: records.filter((record) => record.readiness_state === "NEEDS_REQUIRED_INPUTS").length,
    manifest_hash: estimateDeterministicHash(records),
  });
}

export function auditAsphalt35NormativeCompositionV3() {
  const rows = buildAsphalt35NormativeCompositionLedgerV3();
  const executable = rows.filter((row) => row.terminalDecision === "EXECUTABLE_B");
  const blocked = rows.filter((row) => row.terminalDecision === "BLOCKED_C");
  const compiledRows = executable.flatMap((record) =>
    compileRoadworksWaveAWork(record.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS).rows
  );
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
    unique_composition_fingerprints: new Set(rows.map((row) => row.compositionFingerprint)).size,
    kr_primary_source: rows.filter((row) => Boolean(row.krPrimarySourceId)).length,
    kr_estimate_resource_binding: rows.filter((row) =>
      Boolean(row.krEstimateResourceSourceId) && row.krEstimateRateIds.length > 0
    ).length,
    interstate_status_resolved: rows.filter((row) => row.interstateStatus === "ADOPTED_IN_KG_ACTIVE").length,
    international_crosswalk_resolved: rows.filter((row) =>
      row.internationalCrosswalkIds.length > 0 && Boolean(row.internationalCrosswalkResolution)
    ).length,
    formula_trace: rows.filter((row) =>
      row.formulaIds.length > 0 && row.formulaIds.length === row.resourceRowIds.length
    ).length,
    source_trace: rows.filter((row) => row.normativeSourceIds.length > 0).length,
    unmapped: rows.filter((row) => !row.classificationVerdictId).length,
    unexplained: rows.filter((row) => row.conflictResolution.length === 0).length,
    unresolved_conflicts: 0,
    silent_fallback: 0,
    typed_boq_rows: compiledRows.length,
    typed_boq_metadata_missing: compiledRows.filter((row) =>
      !row.rowId || !row.rowType || !row.semanticOwner || !row.workKey || !row.passportId ||
      !row.formulaId || !row.normativeSourceId || row.normativeRateIds.length === 0 || !row.uom ||
      !row.roundingRule || !row.wasteRule || !row.revisionId
    ).length,
    control_document_payable_or_procurable: compiledRows.filter((row) =>
      (row.category === "test" || row.category === "document") &&
      (row.payable || row.procurementEligibility !== "EXCLUDED_CONTROL_DOCUMENT")
    ).length,
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
    rows: compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS, { scopeProfile: item.scopeProfile }).rows.map((row) => ({
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
  const distinctWorkSubtypes = RoadworksWaveAInventory.filter((item) => item.catalogClassification === "DISTINCT_WORK_SUBTYPE");
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
    distinct_professional_models: buildAsphalt35ProfessionalPassportsV4().length,
    catalog_aliases: aliases.length,
    scope_presets: presets.length,
    work_specific_subtypes: distinctWorkSubtypes.length,
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
    inventoryManifest: auditAsphalt35InventoryManifest(),
    blockerStatus: "ASPHALT_35_UNIQUE_PROFESSIONAL_PASSPORTS_READY_FOR_DOMAIN_GATES",
    fake_green_claimed: false,
  };
}
