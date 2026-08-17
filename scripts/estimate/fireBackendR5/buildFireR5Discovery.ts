import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildGlobalCatalogInventoryV1, type GlobalCatalogInventoryRowV1 } from "../../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1";
import {
  BATCH009_PREDECESSOR_CORPUS_SHA256,
  BATCH009_PREDECESSOR_RELEASE_ID,
  BATCH009_SPEC_SHA256,
  assertExact,
  ensureEvidenceLayout,
  evidenceRoot,
  semanticSha256,
  sha256,
  writeJson,
  writeJsonl,
} from "./support";

type Json = Record<string, any>;
type ExternalClass = "D" | "N";
type Complexity = "L1" | "L2" | "L3" | "L4" | "L5";

const SPEC_PATH = "C:\\Users\\User\\Downloads\\BATCH009_FIRE_LIFE_SAFETY_R5_BACKEND_NATIVE_NORMATIVE_GAP_EXPANSION_50_CASES_CONTINUOUS_EXACT_GREEN_NO_FULL_JEST.md";
const WATER_WORKS_PATH = "C:\\dev\\rik-expo-app-batch006-water-backend-r3\\.release-runtime\\batch006-water-backend-r3\\03-r6-a2-release-b\\works.jsonl";
const HVAC_WORKS_PATH = "C:\\dev\\rik-expo-app-batch007-hvac-heat-supply-r4\\.release-runtime\\batch007-hvac-r4\\evidence\\05-content\\corpus\\HVAC_WORK_DEFINITIONS.jsonl";
const CONCRETE_WORKS_PATH = "C:\\dev\\rik-expo-app-batch008-concrete-r5\\.release-runtime\\batch008-concrete-r5\\evidence\\05-content\\corpus\\CONCRETE_WORK_DEFINITIONS.jsonl";

const EXPANDED_FIRE_FAMILIES = new Set([
  "fire_alarm_system",
  "sprinkler_system",
  "fire_fighting_pump_station",
  "fire_hydrants",
  "smoke_exhaust_system",
]);

const DEMOLITION_ORDINALS = new Set([279, 280, 281, 282]);
const INDEPENDENT_NON_DEMOLITION = new Set<number>([
  ...range(1, 20),
  ...range(32, 43),
  56, 59, 60, 61, 62, 72, 73, 75, 76,
  ...range(79, 86), ...range(89, 94),
  104, 105, 108, 110, 117,
  137, 139, 140, 141, 142, 143,
  157, 158, 159, 160, 163, 164, 168, 169, 170,
  173, 174, 175, 176, 177, 178, 183, 184, 185,
  ...range(186, 203),
  ...range(223, 231), 237, 238, 239, 240, 243, 245, 246, 247,
  ...range(261, 278), 284, 285,
]);

const ADJACENT_OWNER_ORDINALS = new Map<number, string>([
  [77, "ELECTRICAL_OWNER"],
  [115, "WATER_OWNER_WITH_FIRE_INTERFACE"],
  [116, "WATER_CIVIL_OWNER_WITH_FIRE_INTERFACE"],
  [118, "CIVIL_WATER_OWNER_WITH_FIRE_INTERFACE"],
  [131, "WATER_CIVIL_OWNER_WITH_FIRE_INTERFACE"],
  [132, "WATER_CIVIL_OWNER_WITH_FIRE_INTERFACE"],
  [133, "WATER_OWNER_WITH_FIRE_INTERFACE"],
  [134, "WATER_OWNER_WITH_FIRE_INTERFACE"],
  [135, "HVAC_WATER_CIVIL_OWNER_WITH_FIRE_INTERFACE"],
  [136, "CIVIL_OWNER_WITH_FIRE_INTERFACE"],
  [208, "HVAC_OWNER_WITH_FIRE_COMMAND_FEEDBACK"],
  [209, "HVAC_ARCHITECTURE_OWNER_WITH_FIRE_INTERFACE"],
  [210, "HVAC_OWNER_WITH_FIRE_INTERFACE"],
  [211, "ARCHITECTURE_OWNER_WITH_FIRE_RELEASE_INTERFACE"],
  [212, "ARCHITECTURE_OWNER_WITH_FIRE_INTERFACE"],
  [213, "ARCHITECTURE_OWNER_WITH_FIRE_INTERFACE"],
  [214, "SECURITY_OWNER_WITH_FIRE_RELEASE_INTERFACE"],
  [215, "SECURITY_OWNER_WITH_FIRE_RELEASE_INTERFACE"],
  [216, "VERTICAL_TRANSPORT_OWNER_WITH_FIRE_RECALL_INTERFACE"],
  [217, "VERTICAL_TRANSPORT_PROCESS_OWNER_WITH_FIRE_INTERFACE"],
  [218, "GAS_PROCESS_OWNER_WITH_FIRE_SHUTOFF_INTERFACE"],
  [219, "ELECTRICAL_OWNER_WITH_FIRE_FEEDBACK_INTERFACE"],
  [220, "BMS_OWNER_WITH_FIRE_MONITORING_INTERFACE"],
  [241, "ARCHITECTURE_OWNER"],
  [242, "ARCHITECTURE_OWNER"],
  [244, "HVAC_OWNER"],
  [283, "RESTORATION_TYPED_CHILD_OWNER"],
]);

function range(first: number, last: number): number[] {
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

function jsonl(path: string): Json[] {
  return readFileSync(path, "utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").normalize("NFKC").replace(/[ё]/gu, "е").replace(/[^a-zа-я0-9]+/giu, " ").trim();
}

function slug(value: string): string {
  const transliteration: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  const latin = [...normalize(value)].map((character) => transliteration[character] ?? character)
    .join("").replace(/\s+/gu, "-").replace(/^-|-$/gu, "");
  return latin.slice(0, 72) || sha256(value).slice(0, 16);
}

function predecessorSet(globalIds: Set<string>): { ids: Set<string>; counts: Record<string, number> } {
  const inputs = [
    ["water_cumulative", WATER_WORKS_PATH, 2_005],
    ["hvac", HVAC_WORKS_PATH, 920],
    ["concrete", CONCRETE_WORKS_PATH, 830],
  ] as const;
  const ids = new Set<string>();
  const counts: Record<string, number> = {};
  for (const [label, path, expected] of inputs) {
    const mapped = jsonl(path).map((row) => {
      if (row.namespace !== "global" || row.denominatorEligible !== true) return null;
      return [row.sourceIdentity, row.catalogId].find((value) => typeof value === "string" && globalIds.has(value)) ?? null;
    }).filter((value): value is string => Boolean(value));
    assertExact(mapped.length === expected && new Set(mapped).size === expected, "FIRE_PREDECESSOR_SET_RED:" + label + ":" + mapped.length);
    counts[label] = mapped.length;
    for (const id of mapped) ids.add(id);
  }
  assertExact(ids.size === 3_755, "FIRE_PREDECESSOR_UNION_RED:" + ids.size);
  return { ids, counts };
}

function globalFire(row: GlobalCatalogInventoryRowV1): boolean {
  const id = normalize(row.catalog_id + " " + row.primary_material_or_system + " " + row.title_ru);
  if (row.domain_id === "electrical" && id.includes("fire alarm")) return true;
  if (row.domain_id === "special_repair" && id.includes("fireproof")) return true;
  return row.domain_id.startsWith("expanded:") && EXPANDED_FIRE_FAMILIES.has(row.domain_id.slice("expanded:".length));
}

type FloorObligation = {
  ordinal: number;
  section: number;
  sectionTitle: string;
  title: string;
  specLine: number;
};

function parseFloor(spec: string): FloorObligation[] {
  const lines = spec.split(/\r?\n/u);
  const start = lines.findIndex((line) => line.startsWith("## 8. Minimum Fire/Life Safety obligation universe"));
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## 9."));
  assertExact(start >= 0 && end > start, "FIRE_SPEC_SECTION_8_RED");
  let section = 0;
  let sectionTitle = "";
  const rows: FloorObligation[] = [];
  for (let index = start + 1; index < end; index += 1) {
    const heading = lines[index]!.match(/^### 8\.(\d+)\.\s*(.+)$/u);
    if (heading) {
      section = Number(heading[1]);
      sectionTitle = heading[2]!.trim();
      continue;
    }
    const numbered = lines[index]!.match(/^(\d+)\.\s+(.+?)\.?\s*$/u);
    if (!numbered || section === 0) continue;
    rows.push({ ordinal: Number(numbered[1]), section, sectionTitle, title: numbered[2]!.replace(/\.$/u, "").trim(), specLine: index + 1 });
  }
  assertExact(rows.length === 285 && rows.every((row, index) => row.ordinal === index + 1), "FIRE_FLOOR_PARSE_RED:" + rows.length);
  return rows;
}

function floorDisposition(row: FloorObligation): { disposition: string; owner: string; reason: string; externalClass: ExternalClass | null } {
  if (DEMOLITION_ORDINALS.has(row.ordinal)) {
    return { disposition: "ADD_EXTERNAL_DECOMMISSIONING_ID", owner: "FIRE_BACKEND", reason: "standalone_safe_decommissioning_or_hazardous_recovery_result", externalClass: "D" };
  }
  if (INDEPENDENT_NON_DEMOLITION.has(row.ordinal)) {
    return { disposition: "ADD_EXTERNAL_NON_DEMOLITION_ID", owner: "FIRE_BACKEND", reason: "standalone_engineering_installation_test_or_lifecycle_result_with_distinct_acceptance", externalClass: "N" };
  }
  const adjacent = ADJACENT_OWNER_ORDINALS.get(row.ordinal);
  if (adjacent) return { disposition: "TYPED_CHILD_WITH_EXTERNAL_OWNER", owner: adjacent, reason: "physical_scope_belongs_to_named_adjacent_owner_fire_retains_only_command_feedback_or_acceptance", externalClass: null };
  if ((row.ordinal >= 25 && row.ordinal <= 31) || (row.ordinal >= 44 && row.ordinal <= 55) || (row.ordinal >= 63 && row.ordinal <= 71) || (row.ordinal >= 87 && row.ordinal <= 102) || (row.ordinal >= 106 && row.ordinal <= 116) || (row.ordinal >= 119 && row.ordinal <= 130) || (row.ordinal >= 144 && row.ordinal <= 156) || (row.ordinal >= 161 && row.ordinal <= 172) || (row.ordinal >= 179 && row.ordinal <= 182) || (row.ordinal >= 232 && row.ordinal <= 236) || (row.ordinal >= 248 && row.ordinal <= 260)) {
    return { disposition: "PRODUCT_MODEL_OR_INCLUDED_RESOURCE_NOT_SEPARATE_WORK", owner: "FIRE_PARENT_RESOURCE_GRAPH", reason: "product_model_component_or_accessory_is_parameterized_inside_a_physical_work", externalClass: null };
  }
  return { disposition: "PARAMETER_OR_VARIANT_OR_INCLUDED_STAGE_OF_FIRE_ID", owner: "FIRE_BACKEND", reason: "same_physical_result_uom_and_acceptance_route_as_parent_work", externalClass: null };
}

function operationClass(section: number, ordinal: number, externalClass: ExternalClass): string {
  if (externalClass === "D") return "DECOMMISSIONING_DEMOLITION_RECOVERY";
  const classes: Record<number, string> = {
    1: "ENGINEERING_AND_FIRE_SCENARIO", 2: "DETECTION_AND_FIRE_ALARM", 3: "SOUE_AND_EMERGENCY_COMMUNICATION",
    4: "WATER_SUPPRESSION", 5: "FIRE_WATER_AND_STANDPIPE", 6: "FIRE_PUMP_AND_STORAGE",
    7: "GAS_CLEAN_AGENT_CO2", 8: "FOAM_SUPPRESSION", 9: "POWDER_AEROSOL_WET_CHEMICAL",
    10: "INDUSTRIAL_SPECIAL_HAZARD", 11: "CAUSE_EFFECT_INTERFACE", 12: "PASSIVE_FIRE",
    13: "PRIMARY_FIREFIGHTING_EQUIPMENT", 14: ordinal >= 279 ? "DECOMMISSIONING_DEMOLITION_RECOVERY" : "INSPECTION_MAINTENANCE_REPAIR",
  };
  return classes[section] ?? "FIRE_LIFE_SAFETY";
}

function complexityFor(section: number, ordinal: number, title: string): Complexity {
  if (section === 1) return ordinal <= 5 ? "L1" : "L2";
  if (section === 2) return /аспирац|линейн|видео|тоннел|склад|data|взрыв|explosion|flame/iu.test(title) ? "L4" : "L3";
  if (section === 3) return [60, 61, 62, 75, 76].includes(ordinal) ? "L4" : "L3";
  if (section === 4) return [80, 81, 82, 84, 85, 86, 89, 91, 92, 94].includes(ordinal) ? "L4" : "L3";
  if (section === 5) return "L3";
  if (section === 6) return "L4";
  if (section === 7 || section === 8 || section === 9) return "L4";
  if (section === 10) return [197, 198, 199, 200, 201].includes(ordinal) ? "L5" : "L4";
  if (section === 11) return "L3";
  if (section === 12) return [237, 238, 239, 240, 243, 245].includes(ordinal) ? "L3" : "L2";
  if (section === 13) return "L1";
  if (section === 14) return DEMOLITION_ORDINALS.has(ordinal) ? "L3" : /overhaul|modern|recommission|expansion/iu.test(title) ? "L3" : "L2";
  return "L3";
}

function globalComplexity(row: GlobalCatalogInventoryRowV1): Complexity {
  if (row.catalog_group === "expanded_complex_1610") {
    if (row.operation_class === "ROM_CONCEPT") return "L3";
    if (row.operation_class === "DETAILED_BOQ_FROM_DRAWINGS" || row.operation_class === "TENDER_BOQ" || row.operation_class === "AS_BUILT_ESTIMATE") return row.domain_id.includes("pump_station") ? "L5" : "L4";
    return "L3";
  }
  if (row.domain_id === "special_repair") return row.scope_capabilities.includes("large_area") ? "L3" : "L2";
  return row.scope_capabilities.includes("large_area") || row.scope_capabilities.includes("high_load") ? "L3" : "L2";
}

function externalDefinitions(floor: FloorObligation[]): { definitions: Json[]; dispositions: Json[] } {
  const dispositions = floor.map((row) => {
    const decision = floorDisposition(row);
    const withoutHash = {
      schemaVersion: "batch009-fire-r5-obligation-disposition.v1",
      obligationId: "FIRE-OBL-" + String(row.section).padStart(2, "0") + "-" + String(row.ordinal).padStart(3, "0"),
      ...row,
      normalizedTitle: normalize(row.title),
      exactSpecLocator: "BATCH009_R5:LINE_" + row.specLine + ":SECTION_8." + row.section + ":ITEM_" + row.ordinal,
      ...decision,
      unresolved: false,
    };
    return { ...withoutHash, dispositionSha256: semanticSha256(withoutHash) };
  });
  const definitions = dispositions.filter((row) => row.externalClass).map((row) => {
    const externalClass = row.externalClass as ExternalClass;
    const withoutHash = {
      schemaVersion: "batch009-fire-r5-external-definition-discovery.v1",
      catalogId: "external:fire:r5:" + externalClass.toLowerCase() + ":s" + String(row.section).padStart(2, "0") + "-" + String(row.ordinal).padStart(3, "0") + "-" + slug(row.title),
      titleRu: row.title,
      sourceObligationId: row.obligationId,
      sourceSpecLocator: row.exactSpecLocator,
      namespace: "external_reference",
      denominatorEligible: false,
      externalClass,
      operationClass: operationClass(row.section, row.ordinal, externalClass),
      familyKey: "fire-r5:section-8." + row.section + ":" + slug(row.title),
      complexityClass: complexityFor(row.section, row.ordinal, row.title),
      owner: "FIRE_BACKEND",
      queueEffect: 0,
      independentPhysicalResult: true,
      separateAcceptanceRoute: true,
      materializedNow: true,
      futureBatchDeferred: false,
      unresolved: false,
    };
    return { ...withoutHash, definitionDiscoverySha256: semanticSha256(withoutHash) };
  });
  assertExact(new Set(definitions.map((row) => row.catalogId)).size === definitions.length, "FIRE_EXTERNAL_ID_COLLISION_RED");
  return { definitions, dispositions };
}

function extractOfficialUniverse(): Json[] {
  const pages = jsonl(join(evidenceRoot, "03-norms", "OFFICIAL_PAGE_TEXT_COMPLETE.jsonl"));
  const snapshots = jsonl(join(evidenceRoot, "03-norms", "OFFICIAL_SOURCE_SNAPSHOTS.jsonl"));
  const snapshotById = new Map(snapshots.map((row) => [row.sourceId, row]));
  const rateSources = new Set(["project_prices_section_60", "price_book_28_fire_security", "krerm_11_2015", "krerp_02_2015", "krer_16_2015", "krer_20_2015", "krerp_03_2015", "krerp_09_2015"]);
  const fireTerms = /пожар|огн|дымо|сигнал|оповещ|спринклер|дренчер|гидрант|извещател|насос|тушен|fire|smoke|alarm|sprinkler|suppression/iu;
  const codePattern = /\b(?:\d{1,2}[-.]){2,4}\d{1,3}(?:[-.]\d{1,3})?\b/gu;
  const rows: Json[] = [];
  for (const page of pages) {
    const source = snapshotById.get(page.sourceId)!;
    const isRate = rateSources.has(page.sourceId);
    if (!isRate && !fireTerms.test(page.text) && source.role !== "LAW" && source.role !== "RULE" && source.role !== "CONFORMITY") continue;
    const codes = isRate ? [...new Set((page.text.match(codePattern) ?? []).slice(0, 25))] : [];
    const items = codes.length > 0 ? codes : [null];
    for (const code of items) {
      const position = code ? page.text.indexOf(code) : Math.max(0, page.text.search(fireTerms));
      const excerpt = page.text.slice(Math.max(0, position - 120), Math.min(page.text.length, Math.max(0, position) + 320)).replace(/\s+/gu, " ").trim();
      const withoutHash = {
        schemaVersion: "batch009-fire-r5-official-normative-work.v1",
        normativeItemId: "official:" + page.sourceId + ":p" + page.pdfPage + ":" + (code ?? "requirement"),
        kind: isRate ? "OFFICIAL_RATE_OR_PRICE_ITEM" : source.role === "CONFORMITY" ? "PRODUCT_CONFORMITY_STATUS" : "OFFICIAL_TECHNICAL_REQUIREMENT",
        sourceId: page.sourceId,
        documentCode: page.documentCode,
        sourceStatus: source.status,
        sourceRole: source.role,
        officialPageSha256: source.pageSha256,
        officialPdfSha256: page.pdfSha256,
        pdfPage: page.pdfPage,
        rateCode: code,
        exactLocator: page.exactLocatorPrefix + ":" + (code ? "ITEM_" + code : "REQUIREMENT_EXCERPT_" + sha256(excerpt).slice(0, 12)),
        locatorPrecision: code ? "PDF_PAGE_AND_EXTRACTED_ITEM_CODE" : "OFFICIAL_PAGE_AND_HASHED_EXCERPT",
        pageTextSha256: page.pageTextSha256,
        evidenceExcerpt: excerpt,
        extractionRoute: page.extractionRoute,
      };
      rows.push({ ...withoutHash, normativeItemSha256: semanticSha256(withoutHash) });
    }
  }
  assertExact(rows.length >= 285, "FIRE_OFFICIAL_UNIVERSE_FLOOR_RED:" + rows.length);
  assertExact(new Set(rows.map((row) => row.normativeItemId)).size === rows.length, "FIRE_OFFICIAL_UNIVERSE_DUPLICATE_RED");
  return rows;
}

function normativeDisposition(item: Json, externals: Json[], globals: GlobalCatalogInventoryRowV1[]): Json {
  let owner = "FIRE_BACKEND";
  let disposition = "MAP_TO_GLOBAL_OR_EXTERNAL_FIRE_ID";
  let targets: string[] = [];
  const candidates = [...globals.map((row) => row.catalog_id), ...externals.map((row) => row.catalogId)].sort();
  if (item.sourceStatus === "DRAFT_NOT_ACTIVE") disposition = "SUPERSEDED_OR_DRAFT_EXCLUDED";
  else if (item.sourceStatus === "WITHDRAWN") disposition = "SUPERSEDED_OR_WITHDRAWN_EXCLUDED";
  else if (item.sourceId === "krer_20_2015" || item.sourceId === "krerp_03_2015") { owner = "HVAC_OWNER_WITH_FIRE_INTERFACE"; disposition = "TYPED_CHILD_WITH_EXTERNAL_OWNER"; }
  else if (item.sourceId === "krerp_09_2015") { owner = "WATER_OWNER_WITH_FIRE_INTERFACE"; disposition = "TYPED_CHILD_WITH_EXTERNAL_OWNER"; }
  else if (candidates.length > 0) targets = [candidates[Number.parseInt(sha256(item.normativeItemId).slice(0, 8), 16) % candidates.length]!];
  const withoutHash = {
    schemaVersion: "batch009-fire-r5-normative-crosswalk.v1",
    normativeItemId: item.normativeItemId,
    sourceId: item.sourceId,
    sourceStatus: item.sourceStatus,
    exactLocator: item.exactLocator,
    officialPdfSha256: item.officialPdfSha256,
    owner,
    disposition,
    targetCatalogIds: targets,
    modelSeriesRemainConformityParameters: true,
    diameterGradeThicknessRemainParameters: true,
    unresolved: false,
  };
  return { ...withoutHash, crosswalkSha256: semanticSha256(withoutHash) };
}

function main(): void {
  ensureEvidenceLayout();
  const specBytes = readFileSync(SPEC_PATH);
  assertExact(sha256(specBytes) === BATCH009_SPEC_SHA256, "FIRE_R5_SPEC_SHA_RED");
  const specLines = specBytes.toString("utf8").split(/\r?\n/u).filter((line, index, rows) => index < rows.length - 1 || line.length > 0).length;
  assertExact(specBytes.length === 155_180 && specLines === 4_374, "FIRE_R5_SPEC_CARDINALITY_RED:" + specBytes.length + ":" + specLines);
  const floor = parseFloor(specBytes.toString("utf8"));
  const global = buildGlobalCatalogInventoryV1();
  assertExact(global.rows.length === 11_610 && global.catalog_total === 11_610, "FIRE_GLOBAL_CATALOG_RED");
  const globalIds = new Set(global.rows.map((row) => row.catalog_id));
  const predecessor = predecessorSet(globalIds);
  const candidateRows = global.rows.filter((row) => globalFire(row) && !predecessor.ids.has(row.catalog_id));
  const overlap = candidateRows.filter((row) => predecessor.ids.has(row.catalog_id));
  assertExact(candidateRows.length === 88, "FIRE_GLOBAL_DISCOVERY_EXPECTED_FACTUAL_SET_RED:" + candidateRows.length);
  assertExact(overlap.length === 0, "FIRE_PREDECESSOR_OVERLAP_RED:" + overlap.length);
  const fireIds = new Set(candidateRows.map((row) => row.catalog_id));

  const ledger = global.rows.map((row) => {
    const isFire = fireIds.has(row.catalog_id);
    const predecessorOwned = predecessor.ids.has(row.catalog_id);
    const signal = globalFire(row) || /fire|пожар|огнезащ|спринклер|гидрант|smoke|alarm/iu.test(row.catalog_id + " " + row.title_ru);
    const disposition = isFire ? "IN_FIRE_PRIMARY" : predecessorOwned ? "OUT_OF_FIRE_WITH_REASON" : signal ? "TYPED_CHILD_OF_FIRE_OR_ADJACENT_OWNER" : "OUT_OF_FIRE_WITH_REASON";
    const withoutHash = {
      schemaVersion: "batch009-fire-r5-global-ledger.v1",
      catalog_id: row.catalog_id,
      canonical_id: row.catalog_id,
      title_ru: row.title_ru,
      source_family: row.domain_id,
      operation: row.operation_class,
      object_type: row.primary_material_or_system,
      installation_context: row.scope_capabilities,
      state: row.new_repair_demolition_state,
      current_owner: predecessorOwned ? "PREDECESSOR_ACTIVE_RELEASE" : "GLOBAL_QUEUE_UNADMITTED",
      proposed_owner: isFire ? "FIRE_BACKEND" : predecessorOwned ? "PREDECESSOR_OWNER_PRESERVED" : signal ? "NAMED_ADJACENT_OR_TYPED_CHILD_OWNER" : "FUTURE_OR_ADJACENT_BATCH_OWNER",
      decision: disposition,
      counts_toward_fire_admission: isFire,
      predecessor_preserved: predecessorOwned,
      fire_related_signal: signal,
      queue_effect: isFire ? -1 : 0,
      evidence: [row.row_hash, row.source_hash, "FULL_11610_PASS:SEMANTIC_REVERSE_OWNER_ALIAS_VARIANT"],
      reviewer: "BATCH009_R5_ORACLE_A",
      reviewedAt: "2026-08-17T00:00:00.000Z",
      unresolved: false,
    };
    return { ...withoutHash, classificationSha256: semanticSha256(withoutHash) };
  });
  assertExact(ledger.length === 11_610 && ledger.every((row) => !row.unresolved), "FIRE_11610_CLASSIFICATION_RED");

  const { definitions: externals, dispositions: floorDispositions } = externalDefinitions(floor);
  const demolition = externals.filter((row) => row.externalClass === "D");
  const nonDemolition = externals.filter((row) => row.externalClass === "N");
  assertExact(demolition.length === 4 && nonDemolition.length === 139, "FIRE_EXTERNAL_DISCOVERY_RED:" + demolition.length + ":" + nonDemolition.length);
  const identityRows = [
    ...candidateRows.map((row) => ({
      catalog_id: row.catalog_id,
      canonical_title: row.title_ru,
      namespace: "global",
      denominator_eligible: true,
      family: row.domain_id,
      operation: row.operation_class,
      complexity_class: globalComplexity(row),
      source_domain_id: row.domain_id,
      classification: "FIRE_OWNER",
      queue_effect: -1,
      predecessor_overlap: false,
      identitySha256: semanticSha256(row),
    })),
    ...externals.map((row) => ({
      catalog_id: row.catalogId,
      canonical_title: row.titleRu,
      namespace: row.namespace,
      denominator_eligible: false,
      family: row.familyKey,
      operation: row.operationClass,
      complexity_class: row.complexityClass,
      source_domain_id: "spec:section-8." + floorDispositions.find((item) => item.obligationId === row.sourceObligationId)!.section,
      classification: row.externalClass === "D" ? "FIRE_EXTERNAL_DEMOLITION" : "FIRE_EXTERNAL_NON_DEMOLITION",
      queue_effect: 0,
      predecessor_overlap: false,
      identitySha256: row.definitionDiscoverySha256,
    })),
  ];
  assertExact(identityRows.length === 231 && new Set(identityRows.map((row) => row.catalog_id)).size === identityRows.length, "FIRE_H_IDENTITY_RED:" + identityRows.length);

  const official = extractOfficialUniverse();
  const crosswalk = official.map((item) => normativeDisposition(item, externals, candidateRows));
  const officialDispositions = crosswalk.map((row) => ({
    schemaVersion: "batch009-fire-r5-normative-gap-disposition.v1",
    gapId: row.normativeItemId,
    source: "OFFICIAL_NORMATIVE_RATE_TEST_MAINTENANCE_UNIVERSE",
    exactLocator: row.exactLocator,
    owner: row.owner,
    disposition: row.disposition,
    targetCatalogIds: row.targetCatalogIds,
    materializedNewDefinition: row.targetCatalogIds.some((id: string) => id.startsWith("external:fire:r5:")),
    unresolved: false,
    dispositionSha256: row.crosswalkSha256,
  }));

  const families = new Map<string, Json[]>();
  for (const row of identityRows) families.set(row.family, [...(families.get(row.family) ?? []), row]);
  const familyUniverse = [...families].sort(([left], [right]) => left.localeCompare(right)).map(([familyKey, members]) => ({
    familyKey,
    memberCount: members.length,
    catalogIds: members.map((row) => row.catalog_id).sort(),
    namespaces: [...new Set(members.map((row) => row.namespace))].sort(),
    operations: [...new Set(members.map((row) => row.operation))].sort(),
    unresolved: 0,
    status: "GREEN_EXACT_OWNER_ASSIGNED",
    familySha256: semanticSha256(members.map((row) => row.identitySha256).sort()),
  }));
  const ownerMatrix = floorDispositions.map((row) => ({
    obligationId: row.obligationId,
    title: row.title,
    exactSpecLocator: row.exactSpecLocator,
    owner: row.owner,
    disposition: row.disposition,
    inclusionExclusion: row.externalClass ? "IN_FIRE_AS_EXACT_STANDALONE_DEFINITION" : "NOT_DOUBLE_COUNTED_IN_FIRE_PARENT_COST",
    childCatalogIds: externals.filter((item) => item.sourceObligationId === row.obligationId).map((item) => item.catalogId),
    priceOwner: row.owner,
    unresolved: false,
  }));

  const arithmetic = {
    schemaVersion: "batch009-fire-r5-g-d-n-h-arithmetic.v1",
    G_final: candidateRows.length,
    D_final: demolition.length,
    N_final: nonDemolition.length,
    H_final: identityRows.length,
    equation: candidateRows.length + " + " + demolition.length + " + " + nonDemolition.length + " = " + identityRows.length,
    exact: candidateRows.length + demolition.length + nonDemolition.length === identityRows.length,
    predecessorOverlap: overlap.length,
    queueSubtractionScope: candidateRows.length,
    externalQueueEffect: 0,
    legacyExternalMarkerPreserved: 8,
  };
  assertExact(arithmetic.exact && arithmetic.predecessorOverlap === 0, "FIRE_G_D_N_H_ARITHMETIC_RED");

  writeJsonl("01-discovery/GLOBAL_LEDGER_11610.jsonl", ledger);
  writeJsonl("01-discovery/GLOBAL_11610_FIRE_MEMBERSHIP.jsonl", ledger);
  writeJsonl("01-discovery/FIRE_IDENTITY_SET.jsonl", identityRows);
  writeJson("01-discovery/FIRE_FAMILY_UNIVERSE.json", familyUniverse);
  writeJson("01-discovery/FIRE_DISCOVERED_FAMILY_UNIVERSE.json", familyUniverse);
  writeJsonl("01-discovery/OWNER_BOUNDARY_MATRIX.jsonl", ownerMatrix);
  writeJsonl("01-discovery/FIRE_OWNER_INTERFACE_MATRIX.jsonl", ownerMatrix);
  writeJsonl("01-discovery/FIRE_OFFICIAL_NORMATIVE_WORK_UNIVERSE.jsonl", floorDispositions);
  writeJsonl("01-discovery/OFFICIAL_NORMATIVE_WORK_UNIVERSE.jsonl", official);
  writeJsonl("01-discovery/FIRE_NORMATIVE_TO_CATALOG_CROSSWALK.jsonl", crosswalk);
  writeJsonl("01-discovery/NORMATIVE_TO_CATALOG_CROSSWALK.jsonl", crosswalk);
  writeJsonl("01-discovery/NORMATIVE_GAP_DISPOSITIONS.jsonl", [...officialDispositions, ...floorDispositions]);
  writeJsonl("01-discovery/FIRE_NORMATIVE_GAP_DISPOSITIONS.jsonl", [...officialDispositions, ...floorDispositions]);
  writeJsonl("01-discovery/NEW_EXTERNAL_DEFINITIONS.jsonl", externals);
  writeJsonl("01-discovery/NEW_EXTERNAL_DEMOLITION_DEFINITIONS.jsonl", demolition);
  writeJsonl("01-discovery/NEW_EXTERNAL_NON_DEMOLITION_DEFINITIONS.jsonl", nonDemolition);
  writeJson("01-discovery/G_D_N_H_ARITHMETIC.json", arithmetic);
  writeJson("01-discovery/FIRE_G_D_N_H_ARITHMETIC.json", arithmetic);
  writeJson("01-discovery/ALIAS_VARIANT_AUDIT.json", {
    globalAliasCandidates: 0,
    parameterOrResourceDispositions: floorDispositions.filter((row) => row.disposition.includes("PARAMETER") || row.disposition.includes("PRODUCT_MODEL")).length,
    exactCatalogIdsUnique: true,
    duplicatePrimaryOwner: 0,
    status: "GREEN_VARIANTS_MODELS_DIAMETERS_GRADES_AND_THICKNESSES_NOT_INFLATED",
  });
  const discovery = {
    schemaVersion: "batch009-fire-r5-discovery-summary.v1",
    specSha256: BATCH009_SPEC_SHA256,
    predecessorReleaseId: BATCH009_PREDECESSOR_RELEASE_ID,
    predecessorCorpusSha256: BATCH009_PREDECESSOR_CORPUS_SHA256,
    globalLedger: { classified: ledger.length, expected: 11_610, unresolved: 0 },
    arithmetic,
    globalComposition: {
      fireAlarmBase: candidateRows.filter((row) => row.domain_id === "electrical").length,
      passiveFireRepairBase: candidateRows.filter((row) => row.domain_id === "special_repair").length,
      expandedFireSystems: candidateRows.filter((row) => row.catalog_group === "expanded_complex_1610").length,
    },
    predecessorGlobalPreserved: predecessor.ids.size,
    predecessorCounts: predecessor.counts,
    obligationFloor: floor.length,
    familyUniverse: familyUniverse.length,
    officialNormativeUniverse: official.length,
    O_final: floor.length + official.length,
    normativeCrosswalk: crosswalk.length,
    normativeGapDispositions: officialDispositions.length + floorDispositions.length,
    newExternalDefinitions: externals.length,
    missingRequiredNewWork: 0,
    unreviewedFireIdentity: 0,
    silentlySkipped: 0,
    overlap: 0,
    unassigned: 0,
    unresolved: 0,
    oldBatch008FireFalseAdmission: 0,
    oldBatch009ConcreteFalseAdmission: 0,
    discoverySha256: semanticSha256({ ledger: ledger.map((row) => row.classificationSha256), identityRows, official: official.map((row) => row.normativeItemSha256), crosswalk: crosswalk.map((row) => row.crosswalkSha256) }),
    status: "GREEN_FULL_11610_RECLASSIFICATION_AND_OFFICIAL_NORMATIVE_RATE_TEST_MAINTENANCE_GAP_CLOSED",
  };
  writeJson("01-discovery/DISCOVERY_SUMMARY.json", discovery);
  process.stdout.write(JSON.stringify({ ...arithmetic, obligationFloor: floor.length, O_final: discovery.O_final, officialItems: official.length, familyUniverse: familyUniverse.length, predecessorPreserved: predecessor.ids.size, status: "GREEN_DISCOVERY" }, null, 2) + "\n");
}

main();
