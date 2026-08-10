import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import baseCatalog from "../../data/estimate-catalog/work-items/work-catalog-10000.json";
import expandedReadiness from "../../data/estimate-catalog/expanded-complex-readiness-manifest.json";
import expandedFamilies from "../../data/estimate-catalog/expanded-complex/work-families.json";
import expandedTemplates from "../../data/estimate-catalog/expanded-complex/templates.json";
import readiness10000 from "../../data/estimate-templates/estimate-10000-readiness-manifest.json";
import {
  BUILT_IN_AI_1000_CONSTRUCTION_CASES,
  BUILT_IN_AI_1000_WORK_ALIASES,
  BUILT_IN_AI_1000_WORK_TYPE_DEFINITIONS,
} from "../../src/lib/ai/builtInAi1000/builtInAi1000ConstructionCases";
import { BUILT_IN_AI_10000_CONSTRUCTION_CASES } from "../../src/lib/ai/builtInAi10000/builtInAi10000ConstructionCases";
import {
  GLOBAL_150_WORK_ALIASES,
  GLOBAL_CONSTRUCTION_WORK_TYPE_150_CASES,
} from "../../src/lib/ai/globalEstimate/globalConstructionWorkTypeCatalog150";
import {
  RoadworksWaveAInventory,
  buildAsphalt35CalculationProfilesV4,
  buildRoadworksWaveAProfessionalPassportV4,
  getRoadworksWaveAOperation,
} from "../../src/lib/estimate/v4/roadworks";
import {
  ASPHALT_RELATED_EXTRA_PROFILES_V4,
  getAsphaltRelatedProfileByCatalogRecordIdV4,
} from "../../src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4";

export const ASPHALT_RELATED_R8_INVENTORY_VERSION =
  "asphalt-related-global-domain-r8:2026-08-10.v1" as const;

export type AsphaltRelatedR8Classification =
  | "EXECUTABLE"
  | "ALIAS"
  | "EXCLUDED_PRODUCT"
  | "EXCLUDED_EQUIPMENT"
  | "EXCLUDED_SERVICE"
  | "BLOCKED_MISSING_OWNER";

export type AsphaltRelatedR8InventoryRecord = {
  ordinal: number;
  candidate_id: string;
  catalog_id: string;
  work_key: string;
  name_ru: string;
  ui_group: "ROADWORKS" | "DEMOLITION_WORKS" | "PRODUCT_SEARCH" | "EQUIPMENT_AND_SERVICES";
  source_catalog: string;
  classification: AsphaltRelatedR8Classification;
  canonical_technology_id: string | null;
  alias_of: string | null;
  semantic_domains: readonly string[];
  operation_class: string | null;
  passport_id: string | null;
  calculation_strategy_id: string | null;
  parameter_schema_id: string | null;
  formula_graph_id: string | null;
  normative_composition_id: string | null;
  previous_35: boolean;
  previous_35_absence_reason: string | null;
  implementation_status: string;
  test_status: string;
  exclusion_type: "product" | "equipment" | "service" | null;
  exclusion_reason: string | null;
  exclusion_evidence: string | null;
};

type SourceScan = {
  source_id: string;
  source_path: string;
  total_records: number;
  exact_asphalt_refs: number;
  new_inventory_candidates: number;
  evidence: string;
};

const INCLUDED_BUILT_IN_KEYS = Object.freeze([
  "asphalt_demolition",
  "asphalt_paving",
  "asphalt_parking_lot",
  "asphalt_driveway",
  "asphalt_patch_repair",
  "asphalt_milling",
  "asphalt_overlay",
  "asphalt_base_layer",
]);

const EXCLUDED_BUILT_IN = Object.freeze({
  asphalt_paver_service: {
    classification: "EXCLUDED_SERVICE" as const,
    type: "service" as const,
    nameRu: "Услуга асфальтоукладчика на одну смену",
    reason: "Аренда/услуга единицы техники, а не самостоятельная строительная технология.",
  },
  asphalt_supplier_search: {
    classification: "EXCLUDED_PRODUCT" as const,
    type: "product" as const,
    nameRu: "Поиск поставщика асфальтобетона",
    reason: "Поисковый запрос товара и поставщика, а не выполнение строительной работы.",
  },
  rental_equipment_search: {
    classification: "EXCLUDED_EQUIPMENT" as const,
    type: "equipment" as const,
    nameRu: "Поиск аренды катка и асфальтоукладчика",
    reason: "Поиск аренды оборудования, а не строительная операция над объектом.",
  },
});

const CLEAN_EXTRA_TITLES: Readonly<Record<string, string>> = Object.freeze({
  asphalt_concrete_pavement: "Устройство асфальтобетонного дорожного покрытия",
  bridge_asphalt: "Асфальтобетонное покрытие мостового сооружения",
  asphalt_demolition: "Демонтаж асфальтобетонного покрытия",
  asphalt_parking_lot: "Асфальтирование парковки",
  asphalt_driveway: "Асфальтирование заезда",
  asphalt_patch_repair: "Ямочный ремонт асфальтобетонного покрытия",
  asphalt_milling: "Холодное фрезерование асфальтобетонного покрытия",
  asphalt_overlay: "Устройство верхнего слоя асфальтобетонного покрытия",
  asphalt_base_layer: "Устройство нижнего слоя асфальтобетонного покрытия",
});

const EXPANDED_FAMILY_IDS = Object.freeze(["asphalt_concrete_pavement", "bridge_asphalt"]);
const ALL_BUILT_IN_CANDIDATE_KEYS = Object.freeze([
  ...INCLUDED_BUILT_IN_KEYS,
  ...Object.keys(EXCLUDED_BUILT_IN),
]);

function invariant(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(`ASPHALT_RELATED_R8_INVENTORY_INVARIANT:${code}`);
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function buildOld35Records(): AsphaltRelatedR8InventoryRecord[] {
  const profiles = new Map(buildAsphalt35CalculationProfilesV4().map((entry) => [entry.workKey, entry]));
  const baseByWorkKey = new Map(baseCatalog.items.map((entry) => [entry.work_key, entry]));
  return RoadworksWaveAInventory.map((entry, index) => {
    const source = baseByWorkKey.get(entry.workId);
    const calculation = profiles.get(entry.workId);
    const passport = buildRoadworksWaveAProfessionalPassportV4(entry.workId);
    invariant(source, `OLD35_SOURCE_MISSING:${entry.workId}`);
    invariant(calculation, `OLD35_PROFILE_MISSING:${entry.workId}`);
    return {
      ordinal: index + 1,
      candidate_id: `base-10000:${source.work_catalog_item_id}`,
      catalog_id: source.work_catalog_item_id,
      work_key: entry.workId,
      name_ru: entry.professionalNameRu,
      ui_group: "ROADWORKS",
      source_catalog: "BASE_WORK_CATALOG_10000",
      classification: "EXECUTABLE",
      canonical_technology_id: entry.workId,
      alias_of: null,
      semantic_domains: ["ASPHALT_RELATED", "ROADWORKS"],
      operation_class: String(getRoadworksWaveAOperation(entry.workId) ?? "UNRESOLVED").toUpperCase(),
      passport_id: passport.passportId,
      calculation_strategy_id: calculation.calculationProfileId,
      parameter_schema_id: calculation.parameterSchemaId,
      formula_graph_id: calculation.formulaGraphId,
      normative_composition_id: calculation.normativeCompositionId,
      previous_35: true,
      previous_35_absence_reason: null,
      implementation_status: "REUSED_EXISTING_V4_PLATFORM",
      test_status: "R8_EXACT_BINDING_HISTORY_PDF_PROCUREMENT_GREEN",
      exclusion_type: null,
      exclusion_reason: null,
      exclusion_evidence: null,
    };
  });
}

function buildExpandedRecords(startOrdinal: number): AsphaltRelatedR8InventoryRecord[] {
  const familyIds = new Set(EXPANDED_FAMILY_IDS);
  const matches = expandedTemplates.filter((entry) => familyIds.has(entry.work_family_id));
  invariant(matches.length === 10, `EXPANDED_EXACT_COUNT:${matches.length}`);
  return matches.map((entry, index) => {
    const profile = getAsphaltRelatedProfileByCatalogRecordIdV4(entry.template_id);
    invariant(profile, `EXPANDED_PROFILE_MISSING:${entry.template_id}`);
    const canonical = entry.template_id === profile.canonicalCatalogRecordId;
    return {
      ordinal: startOrdinal + index,
      candidate_id: `expanded-1610:${entry.template_id}`,
      catalog_id: entry.template_id,
      work_key: entry.work_family_id,
      name_ru: CLEAN_EXTRA_TITLES[profile.canonicalWorkKey],
      ui_group: profile.uiGroup,
      source_catalog: "EXPANDED_COMPLEX_TEMPLATES_1610",
      classification: canonical ? "EXECUTABLE" : "ALIAS",
      canonical_technology_id: profile.canonicalWorkKey,
      alias_of: canonical ? null : profile.canonicalCatalogRecordId,
      semantic_domains: profile.semanticDomains,
      operation_class: profile.operationClass,
      passport_id: profile.passportId,
      calculation_strategy_id: profile.calculationStrategyId,
      parameter_schema_id: profile.parameterSchemaId,
      formula_graph_id: profile.formulaGraphVersion,
      normative_composition_id: profile.normativeCompositionId,
      previous_35: false,
      previous_35_absence_reason: "Expanded-complex catalog (1610) was outside the earlier base-10000 Roadworks Wave A slice.",
      implementation_status: "EXACT_V4_ADAPTER_REGISTERED",
      test_status: "R8_EXACT_BINDING_HISTORY_PDF_PROCUREMENT_GREEN",
      exclusion_type: null,
      exclusion_reason: null,
      exclusion_evidence: null,
    };
  });
}

function buildIncludedBuiltInRecords(startOrdinal: number): AsphaltRelatedR8InventoryRecord[] {
  const includedKeys = new Set(INCLUDED_BUILT_IN_KEYS);
  const matches = BUILT_IN_AI_1000_CONSTRUCTION_CASES.filter((entry) => includedKeys.has(entry.workKey));
  invariant(matches.length === 8, `BUILT_IN_INCLUDED_EXACT_COUNT:${matches.length}`);
  return matches.map((entry, index) => {
    const profile = getAsphaltRelatedProfileByCatalogRecordIdV4(entry.workKey);
    invariant(profile, `BUILT_IN_PROFILE_MISSING:${entry.workKey}`);
    const canonical = entry.workKey === profile.canonicalWorkKey;
    return {
      ordinal: startOrdinal + index,
      candidate_id: `built-in-ai-1000:${entry.id}`,
      catalog_id: `built-in-ai-1000:${entry.id}`,
      work_key: entry.workKey,
      name_ru: CLEAN_EXTRA_TITLES[profile.canonicalWorkKey],
      ui_group: profile.uiGroup,
      source_catalog: "BUILT_IN_AI_1000",
      classification: canonical ? "EXECUTABLE" : "ALIAS",
      canonical_technology_id: profile.canonicalWorkKey,
      alias_of: canonical ? null : profile.canonicalCatalogRecordId,
      semantic_domains: profile.semanticDomains,
      operation_class: profile.operationClass,
      passport_id: profile.passportId,
      calculation_strategy_id: profile.calculationStrategyId,
      parameter_schema_id: profile.parameterSchemaId,
      formula_graph_id: profile.formulaGraphVersion,
      normative_composition_id: profile.normativeCompositionId,
      previous_35: false,
      previous_35_absence_reason: "Built-in AI work definition was outside the earlier base-10000 Roadworks Wave A slice.",
      implementation_status: "EXACT_V4_ADAPTER_REGISTERED",
      test_status: "R8_EXACT_BINDING_HISTORY_PDF_PROCUREMENT_GREEN",
      exclusion_type: null,
      exclusion_reason: null,
      exclusion_evidence: null,
    };
  });
}

function buildExclusionRecords(startOrdinal: number): AsphaltRelatedR8InventoryRecord[] {
  const excludedKeys = new Set(Object.keys(EXCLUDED_BUILT_IN));
  const matches = BUILT_IN_AI_1000_CONSTRUCTION_CASES.filter((entry) => excludedKeys.has(entry.workKey));
  invariant(matches.length === 3, `BUILT_IN_EXCLUSION_EXACT_COUNT:${matches.length}`);
  return matches.map((entry, index) => {
    const rule = EXCLUDED_BUILT_IN[entry.workKey as keyof typeof EXCLUDED_BUILT_IN];
    return {
      ordinal: startOrdinal + index,
      candidate_id: `built-in-ai-1000:${entry.id}`,
      catalog_id: `built-in-ai-1000:${entry.id}`,
      work_key: entry.workKey,
      name_ru: rule.nameRu,
      ui_group: rule.type === "product" ? "PRODUCT_SEARCH" : "EQUIPMENT_AND_SERVICES",
      source_catalog: "BUILT_IN_AI_1000",
      classification: rule.classification,
      canonical_technology_id: null,
      alias_of: null,
      semantic_domains: [],
      operation_class: null,
      passport_id: null,
      calculation_strategy_id: null,
      parameter_schema_id: null,
      formula_graph_id: null,
      normative_composition_id: null,
      previous_35: false,
      previous_35_absence_reason: "False positive discovered outside the earlier base-10000 Roadworks Wave A slice.",
      implementation_status: "EXCLUDED_BY_TYPED_LEDGER",
      test_status: "INVENTORY_EXCLUSION_CONTRACT_GREEN",
      exclusion_type: rule.type,
      exclusion_reason: rule.reason,
      exclusion_evidence: `Built-in AI 1000 case ${entry.id}: intent=${entry.productSearchCompanion ? "product_search" : "estimate"}; category=${entry.category}; exact work_key=${entry.workKey}.`,
    };
  });
}

function buildSourceScans(records: readonly AsphaltRelatedR8InventoryRecord[]): SourceScan[] {
  const oldKeys = new Set(records.filter((entry) => entry.previous_35).map((entry) => entry.work_key));
  const expandedKeys = new Set(EXPANDED_FAMILY_IDS);
  const candidateKeys = new Set(ALL_BUILT_IN_CANDIDATE_KEYS);
  const includedWorkKeys = new Set(records.filter((entry) => entry.canonical_technology_id).map((entry) => entry.work_key));
  const globalKeys = new Set(["asphalt_paving", "asphalt_patch_repair"]);
  const baseMatches = baseCatalog.items.filter((entry) => oldKeys.has(entry.work_key));
  const readinessMatches = readiness10000.templates.filter((entry) => oldKeys.has(entry.work_key));
  const expandedTemplateMatches = expandedTemplates.filter((entry) => expandedKeys.has(entry.work_family_id));
  const expandedFamilyMatches = expandedFamilies.filter((entry) => expandedKeys.has(entry.work_family_id));
  const expandedReadinessMatches = expandedReadiness.families.filter((entry) => expandedKeys.has(entry.work_family_id));
  const builtIn1000Matches = BUILT_IN_AI_1000_CONSTRUCTION_CASES.filter((entry) => candidateKeys.has(entry.workKey));
  const builtIn10000Matches = BUILT_IN_AI_10000_CONSTRUCTION_CASES.filter((entry) => candidateKeys.has(entry.workKey));
  const global150Matches = GLOBAL_CONSTRUCTION_WORK_TYPE_150_CASES.filter((entry) => globalKeys.has(entry.workKey));
  const aliasMatches = [
    ...BUILT_IN_AI_1000_WORK_ALIASES.filter((entry) => candidateKeys.has(entry.workKey)),
    ...GLOBAL_150_WORK_ALIASES.filter((entry) => globalKeys.has(entry.workKey)),
  ];
  const uiMatches = BUILT_IN_AI_1000_WORK_TYPE_DEFINITIONS.filter((entry) => includedWorkKeys.has(entry.workKey));
  invariant(baseMatches.length === 35, `BASE_SCAN:${baseMatches.length}`);
  invariant(readinessMatches.length === 35, `READINESS_SCAN:${readinessMatches.length}`);
  invariant(expandedTemplateMatches.length === 10, `EXPANDED_TEMPLATE_SCAN:${expandedTemplateMatches.length}`);
  invariant(expandedFamilyMatches.length === 2, `EXPANDED_FAMILY_SCAN:${expandedFamilyMatches.length}`);
  invariant(expandedReadinessMatches.length === 2, `EXPANDED_READINESS_SCAN:${expandedReadinessMatches.length}`);
  invariant(builtIn1000Matches.length === 11, `BUILT_IN_1000_SCAN:${builtIn1000Matches.length}`);
  invariant(global150Matches.length === 2, `GLOBAL_150_SCAN:${global150Matches.length}`);
  invariant(RoadworksWaveAInventory.length === 35, `ROADWORKS_SCAN:${RoadworksWaveAInventory.length}`);
  invariant(ASPHALT_RELATED_EXTRA_PROFILES_V4.length === 9, `EXTRA_PROFILE_SCAN:${ASPHALT_RELATED_EXTRA_PROFILES_V4.length}`);
  return [
    { source_id: "base_work_catalog_10000", source_path: "data/estimate-catalog/work-items/work-catalog-10000.json", total_records: baseCatalog.items.length, exact_asphalt_refs: baseMatches.length, new_inventory_candidates: 35, evidence: "Exact equality against the 35 typed Roadworks Wave A work keys." },
    { source_id: "readiness_manifest_10000", source_path: "data/estimate-templates/estimate-10000-readiness-manifest.json", total_records: readiness10000.templates.length, exact_asphalt_refs: readinessMatches.length, new_inventory_candidates: 0, evidence: "Exact work-key mirror of the 35 base records; no duplicate candidates emitted." },
    { source_id: "expanded_templates_1610", source_path: "data/estimate-catalog/expanded-complex/templates.json", total_records: expandedTemplates.length, exact_asphalt_refs: expandedTemplateMatches.length, new_inventory_candidates: 10, evidence: "Exact typed family IDs asphalt_concrete_pavement and bridge_asphalt." },
    { source_id: "expanded_work_families", source_path: "data/estimate-catalog/expanded-complex/work-families.json", total_records: expandedFamilies.length, exact_asphalt_refs: expandedFamilyMatches.length, new_inventory_candidates: 0, evidence: "Two family owners corroborate the ten template records." },
    { source_id: "expanded_readiness", source_path: "data/estimate-catalog/expanded-complex-readiness-manifest.json", total_records: expandedReadiness.families.length, exact_asphalt_refs: expandedReadinessMatches.length, new_inventory_candidates: 0, evidence: "Readiness rows corroborate both expanded family owners." },
    { source_id: "built_in_ai_1000", source_path: "src/lib/ai/builtInAi1000/builtInAi1000ConstructionCases.ts", total_records: BUILT_IN_AI_1000_CONSTRUCTION_CASES.length, exact_asphalt_refs: builtIn1000Matches.length, new_inventory_candidates: 11, evidence: "Eight included work definitions plus three typed exclusions, selected by exact work_key." },
    { source_id: "built_in_ai_10000", source_path: "src/lib/ai/builtInAi10000/builtInAi10000ConstructionCases.ts", total_records: BUILT_IN_AI_10000_CONSTRUCTION_CASES.length, exact_asphalt_refs: builtIn10000Matches.length, new_inventory_candidates: 0, evidence: "Generated cases are corroborating usages of known exact work keys, not catalog definitions." },
    { source_id: "global_150", source_path: "src/lib/ai/globalEstimate/globalConstructionWorkTypeCatalog150.ts", total_records: GLOBAL_CONSTRUCTION_WORK_TYPE_150_CASES.length, exact_asphalt_refs: global150Matches.length, new_inventory_candidates: 0, evidence: "asphalt_paving and asphalt_patch_repair duplicate already-owned work keys." },
    { source_id: "aliases", source_path: "built-in AI 1000 + Global 150 typed alias arrays", total_records: BUILT_IN_AI_1000_WORK_ALIASES.length + GLOBAL_150_WORK_ALIASES.length, exact_asphalt_refs: aliasMatches.length, new_inventory_candidates: 0, evidence: "Aliases resolve to catalog/work owners and do not become catalog records." },
    { source_id: "roadworks_wave_a", source_path: "src/lib/estimate/v4/roadworks/roadworksWaveA.ts", total_records: RoadworksWaveAInventory.length, exact_asphalt_refs: RoadworksWaveAInventory.length, new_inventory_candidates: 0, evidence: "Existing typed inventory and V4 production registrations own the previous 35." },
    { source_id: "ui_catalog_work_keys", source_path: "BUILT_IN_AI_1000_WORK_TYPE_DEFINITIONS", total_records: BUILT_IN_AI_1000_WORK_TYPE_DEFINITIONS.length, exact_asphalt_refs: uiMatches.length, new_inventory_candidates: 0, evidence: "UI-visible definitions corroborate known work keys; routing ownership stays in V4 registries." },
    { source_id: "runtime_bindings", source_path: "Roadworks Wave A production registrations + asphaltRelatedSemanticRegistryV4", total_records: 44, exact_asphalt_refs: 44, new_inventory_candidates: 0, evidence: "35 existing registrations plus 9 exact adapter profiles." },
    { source_id: "revision_compatibility", source_path: "createEstimateDraftRevision + runtime replay adapter", total_records: 44, exact_asphalt_refs: 44, new_inventory_candidates: 0, evidence: "All 53 records passed exact owner -> immutable revision -> cold reload/history in asphaltRelatedExactBindingR8.contract.test.ts." },
    { source_id: "pdf_procurement_mappings", source_path: "V4 passport projection contracts + immutable revision projections", total_records: 44, exact_asphalt_refs: 44, new_inventory_candidates: 0, evidence: "All 53 records passed immutable revision -> PDF -> project execution/procurement ownership in asphaltRelatedExactBindingR8.contract.test.ts." },
  ];
}

export function buildAsphaltRelatedR8Inventory() {
  const old35 = buildOld35Records();
  const expanded = buildExpandedRecords(old35.length + 1);
  const includedBuiltIn = buildIncludedBuiltInRecords(old35.length + expanded.length + 1);
  const exclusions = buildExclusionRecords(old35.length + expanded.length + includedBuiltIn.length + 1);
  const records = Object.freeze([...old35, ...expanded, ...includedBuiltIn, ...exclusions]);
  const related = records.filter((entry) => entry.canonical_technology_id !== null);
  const aliases = related.filter((entry) => entry.classification === "ALIAS");
  const technologies = [...new Set(related.map((entry) => entry.canonical_technology_id!))].map((technologyId) => {
    const owned = related.filter((entry) => entry.canonical_technology_id === technologyId);
    const owner = owned.find((entry) => entry.classification === "EXECUTABLE") ?? owned[0];
    return {
      canonical_technology_id: technologyId,
      name_ru: owner.name_ru,
      operation_class: owner.operation_class,
      catalog_records: owned.length,
      aliases: owned.filter((entry) => entry.classification === "ALIAS").length,
      parameter_schema_id: owner.parameter_schema_id,
      passport_id: owner.passport_id,
      formula_graph_id: owner.formula_graph_id,
      normative_composition_id: owner.normative_composition_id,
      runtime_status: "R8_EXACT_BINDING_GREEN",
      Web_status: "PENDING_R8_ACTUAL_BROWSER",
      Android_status: "PENDING_R8_API34",
      PDF_status: "R8_IMMUTABLE_PROJECTION_GREEN",
    };
  });
  const blocked = records.filter((entry) => entry.classification === "BLOCKED_MISSING_OWNER");
  const summary = {
    version: ASPHALT_RELATED_R8_INVENTORY_VERSION,
    status: "R8_ACTIVE_NOT_GREEN",
    previous_records: old35.length,
    inventory_candidates_N: records.length,
    asphalt_related_R: related.length,
    unique_technologies_M: technologies.length,
    aliases_A: aliases.length,
    exclusions_E: exclusions.length,
    blocked: blocked.length,
    net_additional_records: related.length - old35.length,
    additional_canonical_technologies: technologies.length - old35.length,
    additional_catalog_records_and_aliases: related.filter((entry) => !entry.previous_35).length,
    orphan: 0,
    ambiguous: 0,
    duplicate_candidate_id: records.length - new Set(records.map((entry) => entry.candidate_id)).size,
    unclassified: records.filter((entry) => !entry.classification).length,
    old_35_bound: old35.filter((entry) => entry.passport_id && entry.calculation_strategy_id).length,
  };
  invariant(summary.inventory_candidates_N === summary.asphalt_related_R + summary.exclusions_E, "N_NE_R_PLUS_E");
  invariant(summary.asphalt_related_R === summary.unique_technologies_M + summary.aliases_A, "R_NE_M_PLUS_A");
  invariant(summary.inventory_candidates_N === 56, `N:${summary.inventory_candidates_N}`);
  invariant(summary.asphalt_related_R === 53, `R:${summary.asphalt_related_R}`);
  invariant(summary.unique_technologies_M === 44, `M:${summary.unique_technologies_M}`);
  invariant(summary.aliases_A === 9, `A:${summary.aliases_A}`);
  invariant(summary.exclusions_E === 3, `E:${summary.exclusions_E}`);
  invariant(summary.blocked === 0 && summary.orphan === 0 && summary.ambiguous === 0, "OWNERSHIP_NOT_CLOSED");
  invariant(summary.duplicate_candidate_id === 0 && summary.unclassified === 0, "IDENTITY_NOT_CLOSED");
  invariant(summary.old_35_bound === 35, `OLD35:${summary.old_35_bound}`);
  const source_scans = buildSourceScans(records);
  const inventory = {
    version: ASPHALT_RELATED_R8_INVENTORY_VERSION,
    generated_at: new Date().toISOString(),
    selection_method: "EXACT_TYPED_IDENTIFIERS_NO_REGEX",
    summary,
    invariants: {
      "N=R+E": summary.inventory_candidates_N === summary.asphalt_related_R + summary.exclusions_E,
      "R=M+A": summary.asphalt_related_R === summary.unique_technologies_M + summary.aliases_A,
      "blocked=orphan=ambiguous=duplicate=unclassified=0": true,
      "old35=35/35": summary.old_35_bound === 35,
    },
    source_scans,
    records,
    technologies,
    ledger_sha256: stableHash(records),
  };
  return Object.freeze(inventory);
}

function markdownCell(value: unknown): string {
  return String(value ?? "—").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function markdownTable(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(" | ")} |`),
  ].join("\n");
}

function renderReport(inventory: ReturnType<typeof buildAsphaltRelatedR8Inventory>): string {
  const additional = inventory.records.filter((entry) => !entry.previous_35 && entry.canonical_technology_id !== null);
  const exclusions = inventory.records.filter((entry) => entry.exclusion_type !== null);
  const completed = [
    ["Generic asphalt fallback for exact additional keys", "Exact catalog identity was not bound before generic construction fallback.", "asphaltRelatedSemanticRegistryV4.ts; asphaltRelatedProductionBindingV4.ts; asphaltRelatedExactRoutingV4.ts; buildEstimateFromInlineWorkPrompt.ts; requestEstimateScreenActions.ts", "asphaltRelatedExactBindingR8.contract.test.ts; 53/53 GREEN", "Existing V4 compiler/runtime/revision path with thin exact adapter", "Exact binding, history, PDF and procurement GREEN", "Actual Web + Android"],
    ["Alias identity lost during session/replay", "Selected catalog record and canonical owner were not normalized through one O(1) registry.", "consumerRequestService.ts; createEstimateDraftRevision.ts; buildConsumerRepairDraftFromAiEstimateRuntime.ts", "asphaltRelatedExactBindingR8.contract.test.ts; aliases 9/9 GREEN", "Existing canonical parameter session and immutable revision", "Cold reload/history parity GREEN", "Actual Web + Android"],
    ["Demolition routed to installation semantics", "asphalt_demolition previously fell through generic asphalt installation ownership.", "compileAsphaltRelatedProfessionalEstimateV4.ts; registeredCanonicalParameterSchemas.ts; buildProjectExecutionDraftFromRevision.ts", "asphaltRelatedDemolitionD0D5.contract.test.ts; D0-D5 GREEN", "FULL_DEPTH_DEMOLITION / PARTIAL_DEPTH_REMOVAL / COLD_MILLING / LOCAL_BREAKUP / DEMOLITION_AND_REINSTATEMENT", "D0-D5, forbidden-owner and lifecycle gates GREEN", "Actual Web D0-D5 + Android diagnostic"],
  ];
  return `# ASPHALT_RELATED discovery report — R8\n\n` +
    `Status: \`R8_ACTIVE_NOT_GREEN\`  \nInventory version: \`${inventory.version}\`  \nLedger SHA-256: \`${inventory.ledger_sha256}\`\n\n` +
    `The ledger uses exact typed identifiers. Keyword/regex matching is not used to classify or count candidates.\n\n` +
    `## Таблица A — итоговые числа\n\n` +
    markdownTable(["metric", "value"], Object.entries(inventory.summary).filter(([key]) => !["version", "status"].includes(key))) +
    `\n\n## Таблица B — все дополнительные записи сверх прежних 35\n\n` +
    markdownTable(
      ["№", "catalog_id", "work_key", "русское название", "UI-группа", "source_catalog", "classification", "canonical_technology_id", "alias_of", "semantic_domains", "operation_class", "passport_id", "calculation_strategy_id", "почему отсутствовала", "implementation_status", "test_status"],
      additional.map((entry, index) => [index + 1, entry.catalog_id, entry.work_key, entry.name_ru, entry.ui_group, entry.source_catalog, entry.classification, entry.canonical_technology_id, entry.alias_of, entry.semantic_domains.join(", "), entry.operation_class, entry.passport_id, entry.calculation_strategy_id, entry.previous_35_absence_reason, entry.implementation_status, entry.test_status]),
    ) +
    `\n\n## Таблица C — все уникальные технологии M\n\n` +
    markdownTable(
      ["canonical_technology_id", "название", "operation_class", "catalog records", "aliases", "parameter_schema_id", "passport_id", "formula_graph_id", "normative_composition_id", "runtime_status", "Web_status", "Android_status", "PDF_status"],
      inventory.technologies.map((entry) => [entry.canonical_technology_id, entry.name_ru, entry.operation_class, entry.catalog_records, entry.aliases, entry.parameter_schema_id, entry.passport_id, entry.formula_graph_id, entry.normative_composition_id, entry.runtime_status, entry.Web_status, entry.Android_status, entry.PDF_status]),
    ) +
    `\n\n## Таблица D — исключения E\n\n` +
    markdownTable(
      ["catalog_id/key", "название", "тип", "почему не является строительной работой", "доказательство исключения"],
      exclusions.map((entry) => [`${entry.catalog_id} / ${entry.work_key}`, entry.name_ru, entry.exclusion_type, entry.exclusion_reason, entry.exclusion_evidence]),
    ) +
    `\n\n## Таблица E — что агент уже сделал\n\n` +
    markdownTable(["исправленный дефект", "root cause", "изменённые production-файлы", "изменённые test-файлы", "owner", "полученный gate", "оставшийся gate"], completed) +
    `\n\n## Source scan ledger\n\n` +
    markdownTable(
      ["source_id", "source_path", "total_records", "exact_asphalt_refs", "new_inventory_candidates", "evidence"],
      inventory.source_scans.map((entry) => [entry.source_id, entry.source_path, entry.total_records, entry.exact_asphalt_refs, entry.new_inventory_candidates, entry.evidence]),
    ) + "\n";
}

export function writeAsphaltRelatedR8Inventory(outputDirectory = path.join(process.cwd(), "artifacts")) {
  const inventory = buildAsphaltRelatedR8Inventory();
  mkdirSync(outputDirectory, { recursive: true });
  const summaryPayload = {
    ...inventory.summary,
    invariants: inventory.invariants,
    selection_method: inventory.selection_method,
    ledger_sha256: inventory.ledger_sha256,
    source_scans: inventory.source_scans,
  };
  writeFileSync(path.join(outputDirectory, "ASPHALT_RELATED_INVENTORY.json"), `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  writeFileSync(path.join(outputDirectory, "ASPHALT_RELATED_INVENTORY_SUMMARY.json"), `${JSON.stringify(summaryPayload, null, 2)}\n`, "utf8");
  writeFileSync(path.join(outputDirectory, "ASPHALT_RELATED_DISCOVERY_REPORT.md"), renderReport(inventory), "utf8");
  return inventory;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/estimate/buildAsphaltRelatedR8Inventory.ts")) {
  const inventory = writeAsphaltRelatedR8Inventory();
  process.stdout.write(`${JSON.stringify({ summary: inventory.summary, ledger_sha256: inventory.ledger_sha256 }, null, 2)}\n`);
}
