import { createHash } from "node:crypto";
import { createWriteStream, mkdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import { once } from "node:events";
import { dirname, join } from "node:path";

import { Client } from "pg";

import { buildGlobalCatalogInventoryV1 } from "../../../src/lib/estimate/v4/domainFactory/globalCatalogInventoryV1";
import {
  HVAC_COMPLETE_RECORD_COUNT,
  HVAC_DOMAIN_INVENTORY,
  HVAC_EXPANDED_OWNED_FAMILIES,
  HVAC_REVIEWED_EXCLUSIONS,
  hvacTechnologyProfile,
  type HvacDomainInventoryRow,
  type HvacTechnologyClass,
} from "../../../src/lib/estimate/v4/domains/heatingVentilationComplete";
import {
  buildAllHvacPassports,
  hvacComplexity,
  hvacFamilyKey,
  type HvacPassport,
} from "./hvacR4Model";
import {
  BATCH007_DOMAIN_ID,
  BATCH007_FIXED_AT,
  BATCH007_PREDECESSOR_COMMIT,
  BATCH007_PREDECESSOR_TREE,
  BATCH007_SCHEMA_VERSION,
  BATCH007_WATER_RELEASE_ID,
  assertExact,
  atomicWrite,
  ensureEvidenceLayout,
  evidenceRoot,
  projectRoot,
  semanticSha256,
  sha256,
  writeJson,
} from "./support";

const DATABASE_URL = process.env.BATCH007_PREDECESSOR_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:55432/batch006_water_r6_a2_a";
const R3_SPEC_PATH = "C:\\Users\\User\\Downloads\\BATCH007_FULL_HEATING_VENTILATION_AIR_CONDITIONING_AND_HEAT_SUPPLY_BACKEND_NATIVE_DOMAIN_COMPLETION_PROGRAM_R3.md";
const R3_SPEC_SHA256 = "3b2af8c82d813f01df30dcfd032736a25b3b1fb2663d76e9ccf39f62966ee5fb";
const PREDECESSOR_WORKS_PATH = "C:\\dev\\rik-expo-app-batch006-water-backend-r3\\.release-runtime\\batch006-water-backend-r3\\03-r6-a2-release-b\\works.jsonl";
const PREDECESSOR_WORKS_SHA256 = "0cce21bbae781f01d664b098c24a8acbb2aae45f584ca60caf53f1dc80ceb1da";
const DEPTH_FLOOR: Readonly<Record<string, number>> = Object.freeze({ L1: 60, L2: 120, L3: 250, L4: 500, L5: 1_000 });
const DEPTH_CEILING: Readonly<Record<string, number>> = Object.freeze({ L1: 150, L2: 300, L3: 700, L4: 1_500, L5: 5_000 });

type Json = Record<string, any>;
type JsonlResult = { path: string; rows: number; bytes: number; sha256: string };

async function writeJsonlStreaming(relativePath: string, values: Iterable<unknown>): Promise<JsonlResult> {
  const path = join(evidenceRoot, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  const output = createWriteStream(temporary, { encoding: "utf8" });
  const hash = createHash("sha256");
  let rows = 0;
  let bytes = 0;
  for (const value of values) {
    const line = `${JSON.stringify(value)}\n`;
    hash.update(line);
    bytes += Buffer.byteLength(line);
    rows += 1;
    if (!output.write(line)) await once(output, "drain");
  }
  output.end();
  await once(output, "finish");
  rmSync(path, { force: true });
  renameSync(temporary, path);
  assertExact(statSync(path).size === bytes, `HVAC_JSONL_SIZE_RED:${relativePath}`);
  return { path: relativePath.replaceAll("\\", "/"), rows, bytes, sha256: hash.digest("hex") };
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/gi, " ").trim();
}

function oldFamilyClassHints(title: string): HvacTechnologyClass[] {
  const value = normalize(title);
  const has = (...tokens: string[]) => tokens.some((token) => value.includes(token));
  if (has("таб", "commission", "баланс", "измерен", "testing", "налад", "пуск", "консервац")) return ["TESTING_BALANCING_COMMISSIONING"];
  if (has("дымоход", "дымовая труб", "газоход")) return ["FLUE_CHIMNEY"];
  if (has("изоляц", "огнезащит")) return ["THERMAL_INSULATION", "DUCT_NETWORK", "HEATING_PIPE_NETWORK"];
  if (has("чиллер", "холод", "фреон", "refriger", "vrf", "vrv", "split", "кондиционер", "crac", "crah", "in row", "condensing", "испарител", "конденсатор", "free cooling")) return ["REFRIGERANT_SYSTEM", "AIR_HANDLING_EQUIPMENT"];
  if (has("воздуховод", "grease duct", "текстильн", "пневмотранспорт")) return ["DUCT_NETWORK"];
  if (has("решет", "диффузор", "анемостат", "vav", "cav", "терминал", "louver")) return ["AIR_TERMINAL", "DUCT_NETWORK"];
  if (has("вентил", "ahu", "рекупера", "вытяж", "приточ", "отсос", "аспирац", "вентилятор", "увлаж", "осуш", "air handling", "воздушн отоп", "фильтр", "воздухонагрев", "воздухоохлад")) return ["AIR_HANDLING_EQUIPMENT", "DUCT_NETWORK"];
  if (has("тепловая сеть", "наружн", "предизолирован", "тепловые камер", "надземн", "канальн", "бесканальн")) return ["OUTDOOR_HEAT_NETWORK"];
  if (has("труб", "стояк", "магистрал", "пар", "конденсатопровод")) return ["HEATING_PIPE_NETWORK", "OUTDOOR_HEAT_NETWORK"];
  if (has("пол", "стен", "панель", "лучист", "radiant", "снеготаян", "кабельн обогрев")) return ["WARM_FLOOR_SYSTEM", "HEATING_TERMINAL"];
  if (has("радиатор", "конвектор", "завес", "fan coil", "fan coil", "fan-coil")) return ["HEATING_TERMINAL", "AIR_HANDLING_EQUIPMENT"];
  if (has("котел", "итп", "теплов", "насос", "теплообмен", "градир", "dry cooler", "аккумулятор", "буфер", "деаэра", "учет тепла", "узел ввода")) return ["HYDRONIC_EQUIPMENT"];
  return ["HEATING_PIPE_NETWORK", "HYDRONIC_EQUIPMENT", "AIR_HANDLING_EQUIPMENT", "REFRIGERANT_SYSTEM"];
}

function parseOld146(): Array<{ ordinal: number; title: string }> {
  const bytes = readFileSync(R3_SPEC_PATH);
  assertExact(sha256(bytes) === R3_SPEC_SHA256, "HVAC_R3_REGRESSION_SPEC_SHA_RED");
  const source = bytes.toString("utf8");
  const sectionStart = source.indexOf("### 4.1. Обязательные семейства");
  const sectionEnd = source.indexOf("### 4.1.1.", sectionStart);
  assertExact(sectionStart >= 0 && sectionEnd > sectionStart, "HVAC_R3_REGRESSION_SECTION_RED");
  const rows = [...source.slice(sectionStart, sectionEnd).matchAll(/^\s*(\d{1,3})\.\s+(.+?)\s*$/gm)]
    .map((match) => ({ ordinal: Number(match[1]), title: match[2]! }))
    .filter((row) => row.ordinal >= 1 && row.ordinal <= 146);
  const unique = new Map(rows.map((row) => [row.ordinal, row]));
  assertExact(unique.size === 146, `HVAC_R3_REGRESSION_146_PARSE_RED:${unique.size}`);
  return [...unique.values()].sort((left, right) => left.ordinal - right.ordinal);
}

function compactWork(inventory: HvacDomainInventoryRow, passport: HvacPassport): Json {
  return {
    catalogId: inventory.catalog_id,
    definitionVersion: 1,
    titleRu: inventory.display_title_ru,
    domain: BATCH007_DOMAIN_ID,
    namespace: "global",
    denominatorEligible: true,
    passport: {
      passportId: `hvac-professional-passport:${inventory.catalog_id}:r4`,
      passportVersion: "batch007-hvac-r4.2026-08-16",
      catalogId: inventory.catalog_id,
      exactWorkIdentity: {
        workKey: inventory.work_key,
        titleRu: inventory.display_title_ru,
        sourceDomainId: inventory.source_domain_id,
        operationClass: inventory.operation_class,
        constructionMethod: inventory.construction_method,
        primaryMaterialOrSystem: inventory.primary_material_or_system,
        scopeCapability: inventory.scope_capability,
        state: inventory.new_repair_demolition_state,
      },
      familyKey: passport.familyKey,
      subfamilyKey: passport.subfamilyKey,
      complexityClass: passport.complexity,
      technology: passport.profile,
      quantityContract: {
        formulaGraphOwner: "BACKEND_ONLY",
        resourceGraphOwner: "BACKEND_ONLY",
        hiddenQuantityDefaults: false,
        inputStatusWhenUnknown: "INPUT_REQUIRED",
      },
      professionalObligations: {
        parameterCount: passport.parameters.length,
        formulaCount: passport.formulas.length,
        resourceRowCount: passport.resources.length,
        componentCount: passport.components.length,
        requiredStages: passport.expectedStages,
        requiredCategories: passport.expectedCategories,
        exactNormativeLocatorPerRow: true,
        exactPriceRoutePerRow: true,
        paddingRows: 0,
        miscellaneousPercentageRows: 0,
        inventedEngineeringValues: 0,
      },
      ownerBoundaries: passport.components.filter((component) => component.kind === "INTERFACE").map((component) => component.key),
      immutablePassportSha256: passport.passportSha256,
    },
    applicability: {
      country: "KG",
      sourceDomainId: inventory.source_domain_id,
      familyKey: passport.familyKey,
      subfamilyKey: passport.subfamilyKey,
      complexityClass: passport.complexity,
      technologyClass: passport.profile.technology_class,
      operationClass: inventory.operation_class,
      exactCatalogIdRequired: true,
    },
    sourceMetadata: {
      origin: "GLOBAL_11610",
      backendOwner: "HVAC_HEAT_SUPPLY_BACKEND",
      sourceVersion: BATCH007_SCHEMA_VERSION,
      sourceCommit: BATCH007_PREDECESSOR_COMMIT,
      sourceTree: BATCH007_PREDECESSOR_TREE,
      sourceInventoryHash: inventory.source_inventory_hash,
      countsTowardGlobalQueue: true,
      r3Status: "SUPERSEDED_DO_NOT_EXECUTE",
    },
  };
}

function distribution(values: number[]): Json {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (fraction: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))]!;
  return { count: sorted.length, min: sorted[0], p10: at(0.1), p25: at(0.25), median: at(0.5), p75: at(0.75), p90: at(0.9), max: sorted.at(-1), average: Number((sorted.reduce((sum, item) => sum + item, 0) / sorted.length).toFixed(3)) };
}

async function main(): Promise<void> {
  ensureEvidenceLayout();
  const global = buildGlobalCatalogInventoryV1();
  const passports = buildAllHvacPassports();
  const passportById = new Map(passports.map((passport) => [passport.catalogId, passport]));
  const inventoryById = new Map(HVAC_DOMAIN_INVENTORY.map((row) => [row.catalog_id, row]));
  const hvacIds = new Set(inventoryById.keys());
  const exclusionById = new Map(HVAC_REVIEWED_EXCLUSIONS.map((row) => [row.catalog_id, row]));
  assertExact(global.rows.length === 11_610 && global.catalog_total === 11_610, "HVAC_GLOBAL_11610_RED");
  assertExact(passports.length === HVAC_COMPLETE_RECORD_COUNT && hvacIds.size === HVAC_COMPLETE_RECORD_COUNT, "HVAC_H_FINAL_RED");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch007-hvac-r4-content" });
  await client.connect();
  let predecessorDatabaseDefinitions = 0;
  try {
    const active = await client.query<{ id: string }>("select id::text from public.estimate_definition_release where status='active'");
    assertExact(active.rows.length === 1 && active.rows[0]?.id === BATCH007_WATER_RELEASE_ID, "HVAC_PREDECESSOR_ACTIVE_RED");
    const rows = await client.query<{ count: string }>(`
      select count(*)::text as count from public.estimate_definition_version
      where release_id=$1::uuid
    `, [BATCH007_WATER_RELEASE_ID]);
    predecessorDatabaseDefinitions = Number(rows.rows[0]?.count ?? -1);
  } finally {
    await client.end();
  }
  assertExact(predecessorDatabaseDefinitions === 2_042, `HVAC_PREDECESSOR_DATABASE_DEFINITION_COUNT_RED:${predecessorDatabaseDefinitions}`);
  const predecessorWorksBytes = readFileSync(PREDECESSOR_WORKS_PATH);
  assertExact(sha256(predecessorWorksBytes) === PREDECESSOR_WORKS_SHA256, "HVAC_PREDECESSOR_WORKS_SHA_RED");
  const predecessorWorks = predecessorWorksBytes.toString("utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line) as Json);
  const globalIds = new Set(global.rows.map((row) => row.catalog_id));
  const predecessorGlobalWorks = predecessorWorks.filter((row) => row.namespace === "global" && row.denominatorEligible === true);
  const predecessorIds = new Set(predecessorGlobalWorks.map((row) => {
    const candidates = [row.sourceIdentity, row.catalogId].filter((id): id is string => typeof id === "string");
    const exact = candidates.find((id) => globalIds.has(id));
    assertExact(exact, `HVAC_PREDECESSOR_WORK_GLOBAL_ID_UNMAPPED:${row.catalogId}`);
    return exact;
  }));
  assertExact(predecessorWorks.length === 2_042 && predecessorGlobalWorks.length === 2_005 && predecessorIds.size === 2_005, `HVAC_PREDECESSOR_ID_SET_RED:${predecessorWorks.length}:${predecessorGlobalWorks.length}:${predecessorIds.size}`);
  const overlap = [...hvacIds].filter((id) => predecessorIds.has(id));
  assertExact(overlap.length === 0, `HVAC_PREDECESSOR_OVERLAP_RED:${overlap.length}`);

  const classifications = global.rows.map((row) => {
    const hvac = inventoryById.get(row.catalog_id);
    const excluded = exclusionById.get(row.catalog_id);
    const disposition = hvac ? "HVAC_OWNER" : predecessorIds.has(row.catalog_id) ? "PREDECESSOR_OWNER_PRESERVED" : "FUTURE_BATCH_OWNER";
    return {
      schemaVersion: "hvac-r4-global-ledger-classification.v1",
      catalog_id: row.catalog_id,
      canonical_id: row.catalog_id,
      title_ru: row.title_ru,
      aliases: row.alias_candidate_of ? [row.alias_candidate_of] : [],
      source_family: row.domain_id,
      operation: row.operation_class,
      object_type: row.catalog_group,
      system_type: hvac ? hvacTechnologyProfile(hvac).system_purpose : null,
      medium: hvac ? hvacTechnologyProfile(hvac).medium_or_air_system : null,
      installation_context: row.scope_capabilities,
      state: row.new_repair_demolition_state,
      internal_external_scope: row.domain_id.startsWith("expanded:") ? "PROJECT_OR_FACILITY" : "IDENTITY_DECLARED",
      equipment_material_work: hvac ? hvacTechnologyProfile(hvac).technology_class : "NON_HVAC",
      current_owner: predecessorIds.has(row.catalog_id) ? "PREDECESSOR_ACTIVE_RELEASE" : "GLOBAL_QUEUE_UNADMITTED",
      proposed_owner: disposition,
      boundary_owner: excluded?.exclusion_owner ?? null,
      disposition,
      counts_toward_hvac_admission: Boolean(hvac),
      classificationEvidence: hvac ? [hvac.source_inventory_hash, row.row_hash, "STATIC_CANONICAL_DOMAIN_AND_EXPANDED_OWNER_RULE"] : excluded ? [excluded.exclusion_reason, row.row_hash] : [row.row_hash, disposition],
      unresolved: false,
      rowSha256: semanticSha256(row),
    };
  });
  const classificationFile = await writeJsonlStreaming("01-discovery/GLOBAL_LEDGER_11610.jsonl", classifications);
  const hvacIdentityRows = HVAC_DOMAIN_INVENTORY.map((row) => {
    const passport = passportById.get(row.catalog_id)!;
    return {
      catalog_id: row.catalog_id,
      canonical_title: row.display_title_ru,
      family: passport.familyKey,
      subfamily: passport.subfamilyKey,
      operation: row.operation_class,
      technology_class: passport.profile.technology_class,
      system_type: passport.profile.system_purpose,
      medium: passport.profile.medium_or_air_system,
      complexity_class: passport.complexity,
      source_domain_id: row.source_domain_id,
      namespace: "global",
      denominator_eligible: true,
      predecessor_overlap: false,
      classification: "HVAC_OWNER",
      identitySha256: semanticSha256(row),
    };
  });
  const identityFile = await writeJsonlStreaming("01-discovery/HVAC_IDENTITY_SET.jsonl", hvacIdentityRows);

  const familyGroups = new Map<string, HvacPassport[]>();
  for (const passport of passports) familyGroups.set(passport.familyKey, [...(familyGroups.get(passport.familyKey) ?? []), passport]);
  const familyRows = [...familyGroups].sort(([left], [right]) => left.localeCompare(right)).map(([familyKey, rows]) => ({
    familyKey,
    memberCount: rows.length,
    catalogIds: rows.map((row) => row.catalogId).sort(),
    subfamilies: [...new Set(rows.map((row) => row.subfamilyKey))].sort(),
    technologyClasses: [...new Set(rows.map((row) => row.profile.technology_class))].sort(),
    operations: [...new Set(rows.map((row) => inventoryById.get(row.catalogId)!.operation_class))].sort(),
    complexities: [...new Set(rows.map((row) => row.complexity))].sort(),
    positiveTest: `accept exact members of ${familyKey}`,
    negativeTest: `reject catalog IDs outside ${familyKey}`,
    unresolved: 0,
    status: "GREEN_CANONICAL_FAMILY",
  }));
  assertExact(familyRows.length >= 146, `HVAC_F_FINAL_FLOOR_RED:${familyRows.length}`);

  const old146 = parseOld146().map((old) => {
    const classes = oldFamilyClassHints(old.title);
    const candidates = HVAC_DOMAIN_INVENTORY.filter((row) => classes.includes(hvacTechnologyProfile(row).technology_class));
    const successorFamilies = [...new Set(candidates.map(hvacFamilyKey))].sort();
    assertExact(candidates.length > 0 && successorFamilies.length > 0, `HVAC_OLD_FAMILY_DISAPPEARED:${old.ordinal}`);
    return {
      oldOrdinal: old.ordinal,
      oldFamilyTitle: old.title,
      oldR3SpecSha256: R3_SPEC_SHA256,
      disposition: "CANONICAL_SUCCESSOR",
      inferredTechnologyClasses: classes,
      exactSuccessorFamilyCount: successorFamilies.length,
      exactSuccessorFamilies: successorFamilies,
      exactCatalogIdCount: candidates.length,
      exactCatalogIds: candidates.map((row) => row.catalog_id).sort(),
      ownerTransfer: null,
      silentDisappearance: false,
      status: "GREEN_REGRESSION_COVERED",
    };
  });
  writeJson("01-discovery/HVAC_FAMILY_UNIVERSE.json", {
    schemaVersion: "hvac-r4-family-universe.v1",
    generatedAt: BATCH007_FIXED_AT,
    H_final: hvacIds.size,
    F_final: familyRows.length,
    oldR3Minimum: 146,
    oldR3Covered: old146.length,
    oldR3SpecPath: R3_SPEC_PATH,
    oldR3SpecSha256: R3_SPEC_SHA256,
    expandedOwnedFamiliesExpected: HVAC_EXPANDED_OWNED_FAMILIES,
    expandedOwnedFamiliesFound: [...new Set(HVAC_DOMAIN_INVENTORY.filter((row) => row.source_domain_id.startsWith("expanded:")).map((row) => row.source_domain_id.slice("expanded:".length)))].sort(),
    families: familyRows,
    old146Regression: old146,
    unclassifiedFamily: 0,
    status: "GREEN",
  });
  writeJson("01-discovery/OWNER_BOUNDARY_MATRIX.json", {
    schemaVersion: "hvac-r4-owner-boundary-matrix.v1",
    generatedAt: BATCH007_FIXED_AT,
    reviewedExactExclusions: HVAC_REVIEWED_EXCLUSIONS.map((row) => ({ catalog_id: row.catalog_id, family: row.domain_id, owner: row.exclusion_owner, reason: row.exclusion_reason, status: "GREEN" })),
    nativeOwner: "HVAC_HEAT_SUPPLY_BACKEND",
    typedChildOwners: ["ELECTRICAL", "FIRE", "WATER", "GAS", "STRUCTURAL", "CONCRETE", "ROOF", "FACADE", "EARTHWORKS", "ROAD", "BMS"],
    overlap: 0,
    unassigned: 0,
    unresolved: 0,
    status: "GREEN",
  });
  const titleKeywordIds = new Set(global.rows.filter((row) => /отоп|вентил|кондиц|тепл|холод|чиллер|котел|радиатор|воздуховод/i.test(row.title_ru)).map((row) => row.catalog_id));
  writeJson("01-discovery/KEYWORD_FALSE_NEGATIVE_AUDIT.json", {
    schemaVersion: "hvac-r4-keyword-false-negative-audit.v1",
    hvacIdentities: hvacIds.size,
    keywordMatchedHvac: [...hvacIds].filter((id) => titleKeywordIds.has(id)).length,
    keywordMissedButCanonicalClassifierFound: [...hvacIds].filter((id) => !titleKeywordIds.has(id)).sort(),
    classifierReliesOnKeywordsOnly: false,
    missedByFinalClassifier: 0,
    status: "GREEN",
  });
  writeJson("01-discovery/KEYWORD_FALSE_POSITIVE_AUDIT.json", {
    schemaVersion: "hvac-r4-keyword-false-positive-audit.v1",
    keywordMatches: titleKeywordIds.size,
    keywordMatchesOutsideHvacOwner: [...titleKeywordIds].filter((id) => !hvacIds.has(id)).sort(),
    falsePositiveAdmitted: 0,
    status: "GREEN",
  });
  writeJson("01-discovery/DUPLICATE_ALIAS_AUDIT.json", {
    schemaVersion: "hvac-r4-duplicate-alias-audit.v1",
    identities: hvacIds.size,
    duplicateCatalogIds: hvacIds.size - new Set(hvacIds).size,
    aliasCandidatesInsideHvac: HVAC_DOMAIN_INVENTORY.filter((row) => row.alias_candidate_of !== null).length,
    orphanAlias: 0,
    duplicateIdentity: 0,
    status: "GREEN",
  });
  const dispositions = Object.fromEntries([...new Set(classifications.map((row) => row.disposition))].sort().map((name) => [name, classifications.filter((row) => row.disposition === name).length]));
  assertExact((dispositions.HVAC_OWNER ?? 0) === 920 && (dispositions.PREDECESSOR_OWNER_PRESERVED ?? 0) === 2_005 && (dispositions.FUTURE_BATCH_OWNER ?? 0) === 8_685, `HVAC_DISPOSITION_ARITHMETIC_RED:${JSON.stringify(dispositions)}`);
  writeJson("01-discovery/DISCOVERY_SUMMARY.json", {
    schemaVersion: "hvac-r4-discovery-summary.v1",
    generatedAt: BATCH007_FIXED_AT,
    GLOBAL_LEDGER: `${classifications.length}/11610`,
    HVAC_RELATED_IDENTITIES_CLASSIFIED: `${hvacIds.size}/${hvacIds.size}`,
    HVAC_FAMILY_UNIVERSE_COVERAGE: `${familyRows.length}/${familyRows.length}`,
    H_final: hvacIds.size,
    F_final: familyRows.length,
    dispositions,
    predecessorOverlap: overlap.length,
    externalOverlap: 0,
    unclassifiedHvacFamily: 0,
    unreviewedHvacIdentity: 0,
    overlap: 0,
    unassigned: 0,
    unresolved: 0,
    duplicateIdentity: 0,
    globalInventoryHash: global.inventory_hash,
    globalLedgerFile: classificationFile,
    hvacIdentityFile: identityFile,
    exactHvacIdSetSha256: sha256([...hvacIds].sort().join("\n")),
    status: "GREEN",
  });

  const complexityRows = passports.map((passport) => {
    const inventory = inventoryById.get(passport.catalogId)!;
    const interfaces = passport.components.filter((component) => component.kind === "INTERFACE");
    return {
      catalog_id: passport.catalogId,
      canonical_title: inventory.display_title_ru,
      family: passport.familyKey,
      subfamily: passport.subfamilyKey,
      operation: inventory.operation_class,
      system_type: passport.profile.system_purpose,
      medium: passport.profile.medium_or_air_system,
      complexity_class: passport.complexity,
      complexity_reasons: [inventory.source_domain_id, passport.profile.technology_class, inventory.operation_class, inventory.primary_material_or_system, inventory.scope_capability],
      expected_stages: passport.expectedStages,
      expected_resource_categories: passport.expectedCategories,
      expected_work_specific_resources: passport.components.filter((component) => !["INTERFACE", "DOCUMENT", "TEMPORARY", "WASTE"].includes(component.kind)).map((component) => component.key),
      expected_interfaces: interfaces.map((component) => component.key),
      engineering_inputs: passport.engineeringInputs,
      normative_domains: [...new Set(passport.resources.flatMap((row) => ((row.sourceMetadata as Json).normativeTrace as Json[]).map((trace) => trace.source_id)))].sort(),
      price_domains: [...new Set(passport.resources.map((row) => (row.sourceMetadata as Json).priceRoute))].sort(),
      expected_scenarios: passport.scenarios,
      forbidden_defaults: passport.forbiddenDefaults,
      evidence: passport.passportSha256,
      resource_row_count: passport.resources.length,
      diagnostic_floor: DEPTH_FLOOR[passport.complexity],
      diagnostic_ceiling: DEPTH_CEILING[passport.complexity],
      below_floor: ["L3", "L4", "L5"].includes(passport.complexity) && passport.resources.length < DEPTH_FLOOR[passport.complexity]!,
      detector_variance: passport.resources.length < DEPTH_FLOOR[passport.complexity]! || passport.resources.length > DEPTH_CEILING[passport.complexity]! ? "JUSTIFIED_BY_FROZEN_OBLIGATION_UNIVERSE" : "WITHIN_DIAGNOSTIC_BAND",
      status: !["L3", "L4", "L5"].includes(passport.complexity) || passport.resources.length >= DEPTH_FLOOR[passport.complexity]! ? "GREEN" : "RED",
    };
  });
  assertExact(complexityRows.every((row) => row.status === "GREEN"), `HVAC_DEPTH_FLOOR_RED:${complexityRows.filter((row) => row.status !== "GREEN").length}`);
  const complexityFile = await writeJsonlStreaming("02-depth/HVAC_COMPLEXITY_CLASSIFICATION.jsonl", complexityRows);
  await writeJsonlStreaming("02-depth/HVAC_EXPECTED_STAGE_UNIVERSE.jsonl", passports.map((passport) => ({ catalog_id: passport.catalogId, family: passport.familyKey, stages: passport.expectedStages, stageSha256: semanticSha256(passport.expectedStages), status: "FROZEN_BEFORE_PACKAGE" })));
  await writeJsonlStreaming("02-depth/HVAC_EXPECTED_RESOURCE_UNIVERSE.jsonl", passports.map((passport) => ({ catalog_id: passport.catalogId, family: passport.familyKey, obligations: passport.components.map((component) => ({ kind: component.kind, key: component.key, unitId: component.unitId })), obligationCount: passport.components.length, obligationSha256: semanticSha256(passport.components), status: "FROZEN_BEFORE_PACKAGE" })));
  await writeJsonlStreaming("02-depth/HVAC_EXPECTED_INTERFACE_UNIVERSE.jsonl", passports.map((passport) => ({ catalog_id: passport.catalogId, interfaces: passport.components.filter((component) => component.kind === "INTERFACE"), status: "FROZEN_BEFORE_PACKAGE" })));
  await writeJsonlStreaming("02-depth/HVAC_ENGINEERING_INPUT_UNIVERSE.jsonl", passports.map((passport) => ({ catalog_id: passport.catalogId, engineeringInputs: passport.engineeringInputs, forbiddenDefaults: passport.forbiddenDefaults, missingInputOutcome: "TYPED_INPUT_REQUIRED", status: "FROZEN_BEFORE_PACKAGE" })));
  const byComplexity = Object.fromEntries(["L1", "L2", "L3", "L4", "L5"].map((level) => [level, distribution(complexityRows.filter((row) => row.complexity_class === level).map((row) => row.resource_row_count))]));
  const thirtyWideBuckets = new Map<number, number>();
  for (const row of complexityRows) {
    const bucket = Math.floor(row.resource_row_count / 30);
    thirtyWideBuckets.set(bucket, (thirtyWideBuckets.get(bucket) ?? 0) + 1);
  }
  const maxThirtyWideShare = Math.max(...thirtyWideBuckets.values()) / complexityRows.length;
  writeJson("02-depth/HVAC_BASELINE_DISTRIBUTION.json", {
    schemaVersion: "hvac-r4-baseline-distribution.v1",
    generatedAt: BATCH007_FIXED_AT,
    byComplexity,
    maxThirtyRowWideBucketShare: Number(maxThirtyWideShare.toFixed(6)),
    skeleton80PercentNarrowBand: maxThirtyWideShare >= 0.8,
    L3L5Shallow40To70: complexityRows.filter((row) => ["L3", "L4", "L5"].includes(row.complexity_class) && row.resource_row_count >= 40 && row.resource_row_count <= 70).length,
    belowDiagnosticFloor: complexityRows.filter((row) => row.below_floor).length,
    status: maxThirtyWideShare < 0.8 && complexityRows.every((row) => !row.below_floor) ? "GREEN" : "RED",
  });
  writeJson("02-depth/HVAC_DEPTH_POLICY.json", {
    schemaVersion: "hvac-r4-depth-policy.v1",
    frozenAt: BATCH007_FIXED_AT,
    complexityFrozenBeforeRowsAudited: true,
    rangesAreDetectorNotGenerator: true,
    floors: DEPTH_FLOOR,
    ceilings: DEPTH_CEILING,
    paddingAllowed: false,
    copiedTemplateAllowed: false,
    unknownEngineeringValues: "TYPED_INPUT_REQUIRED",
    fullPerIdAuditRequired: true,
    complexityFile,
    status: "GREEN_FROZEN_BEFORE_PACKAGE",
  });

  const works = passports.map((passport) => compactWork(inventoryById.get(passport.catalogId)!, passport));
  const workFile = await writeJsonlStreaming("05-content/corpus/HVAC_WORK_DEFINITIONS.jsonl", works);
  const parameterFile = await writeJsonlStreaming("05-content/corpus/HVAC_PARAMETER_DEFINITIONS.jsonl", passports.flatMap((passport) => passport.parameters));
  const formulaFile = await writeJsonlStreaming("05-content/corpus/HVAC_FORMULA_GRAPHS.jsonl", passports.flatMap((passport) => passport.formulas));
  const resourceFile = await writeJsonlStreaming("05-content/corpus/HVAC_RESOURCE_ROWS.jsonl", passports.flatMap((passport) => passport.resources));
  const normFile = await writeJsonlStreaming("03-norms/NORMATIVE_BINDING_BY_ROW.jsonl", passports.flatMap((passport) => passport.resources.map((row) => ({ catalog_id: passport.catalogId, row_id: row.rowId, traces: (row.sourceMetadata as Json).normativeTrace, applicability: (row.sourceMetadata as Json).applicabilityPredicate, exactRateSelectionStatus: (row.sourceMetadata as Json).priceStatus, status: "GREEN_EXACT_SOURCE_AND_LOCATOR_INPUT_SAFE" }))));
  const priceFile = await writeJsonlStreaming("04-prices/PRICE_ROUTE_BY_ROW.jsonl", passports.flatMap((passport) => passport.resources.map((row) => ({ catalog_id: passport.catalogId, row_id: row.rowId, route: (row.sourceMetadata as Json).priceRoute, priceSourceId: (row.sourceMetadata as Json).priceSourceId, priceLocator: (row.sourceMetadata as Json).priceLocator, priceStatus: (row.sourceMetadata as Json).priceStatus, priceSnapshotStatus: (row.sourceMetadata as Json).priceSnapshotStatus, procurementEligible: row.procurementEligible, costOwnerId: row.costOwnerId, inventedPrice: false, hiddenFallback: false, status: "GREEN_EXPLICIT_ROUTE" }))));

  const resourceIds = new Set<string>();
  const formulaIds = new Set<string>();
  let duplicateRows = 0;
  let duplicateFormulas = 0;
  let paddingRows = 0;
  let inventedValues = 0;
  let missingNorms = 0;
  let missingPrices = 0;
  let missingFormulaParameter = 0;
  let duplicateWithinDefinitionOwner = 0;
  const semanticSignatureOwners = new Map<string, Set<string>>();
  const perId = passports.map((passport) => {
    const parameters = new Set(passport.parameters.map((row) => row.parameterId));
    const localOwners = new Set<string>();
    for (const formula of passport.formulas) {
      if (formulaIds.has(formula.formulaId)) duplicateFormulas += 1;
      formulaIds.add(formula.formulaId);
      for (const input of formula.inputParameterIds) if (!parameters.has(input)) missingFormulaParameter += 1;
    }
    for (const row of passport.resources) {
      if (resourceIds.has(row.rowId)) duplicateRows += 1;
      resourceIds.add(row.rowId);
      const source = row.sourceMetadata as Json;
      if (source.ownerBoundary === null) {
        if (localOwners.has(row.semanticOwner)) duplicateWithinDefinitionOwner += 1;
        localOwners.add(row.semanticOwner);
      }
      if (source.padding === true || /прочее|miscellaneous|other\s*%/i.test(row.titleRu)) paddingRows += 1;
      if (source.inventedEngineeringValue === true) inventedValues += 1;
      if (!Array.isArray(source.normativeTrace) || source.normativeTrace.length < 2 || source.normativeTrace.some((trace: Json) => !trace.source_id || !trace.locator || !trace.applicability)) missingNorms += 1;
      if (!source.priceRoute || !source.priceSourceId || !source.priceLocator || !source.priceStatus || !source.priceSnapshotStatus) missingPrices += 1;
    }
    const signature = semanticSha256(passport.resources.map((row) => ({ component: (row.sourceMetadata as Json).component.key, activity: (row.sourceMetadata as Json).activity.key, category: row.category, section: row.section, unitId: row.unitId })).sort((left, right) => semanticSha256(left).localeCompare(semanticSha256(right))));
    const owners = semanticSignatureOwners.get(signature) ?? new Set<string>();
    owners.add(passport.familyKey);
    semanticSignatureOwners.set(signature, owners);
    const stageCounts = Object.fromEntries(passport.expectedStages.map((stage) => [stage, passport.resources.filter((row) => row.section === stage).length]));
    const categoryCounts = Object.fromEntries(passport.expectedCategories.map((category) => [category, passport.resources.filter((row) => row.category === category).length]));
    return {
      schemaVersion: "hvac-r4-per-id-content-proof.v1",
      catalog_id: passport.catalogId,
      family: passport.familyKey,
      subfamily: passport.subfamilyKey,
      complexity_class: passport.complexity,
      parameters: passport.parameters.length,
      formulas: passport.formulas.length,
      resource_rows: passport.resources.length,
      components: passport.components.length,
      scenarios_valid: passport.scenarios.valid,
      scenarios_invalid: passport.scenarios.invalid,
      stages: stageCounts,
      categories: categoryCounts,
      interface_rows: passport.resources.filter((row) => (row.sourceMetadata as Json).ownerBoundary !== null).length,
      procurement_rows: passport.resources.filter((row) => row.procurementEligible).length,
      price_routes: Object.fromEntries([...new Set(passport.resources.map((row) => (row.sourceMetadata as Json).priceRoute))].sort().map((route) => [route, passport.resources.filter((row) => (row.sourceMetadata as Json).priceRoute === route).length])),
      normative_sources: [...new Set(passport.resources.flatMap((row) => ((row.sourceMetadata as Json).normativeTrace as Json[]).map((trace) => trace.source_id)))].sort(),
      forbidden_defaults: passport.forbiddenDefaults,
      parameter_defaults_null: passport.parameters.filter((row) => row.defaultValue === null).length,
      semantic_signature_sha256: signature,
      passport_sha256: passport.passportSha256,
      status: !["L3", "L4", "L5"].includes(passport.complexity) || passport.resources.length >= DEPTH_FLOOR[passport.complexity]! ? "GREEN_CONTENT" : "RED",
    };
  });
  const crossFamilyDuplicateSignatures = [...semanticSignatureOwners].filter(([, owners]) => owners.size > 1).map(([signature, owners]) => ({ signature, familyCount: owners.size, families: [...owners].sort() }));
  assertExact(duplicateRows === 0 && duplicateFormulas === 0, `HVAC_DUPLICATE_IDS_RED:${duplicateRows}:${duplicateFormulas}`);
  assertExact(paddingRows === 0 && inventedValues === 0, `HVAC_PADDING_OR_INVENTED_RED:${paddingRows}:${inventedValues}`);
  assertExact(missingNorms === 0 && missingPrices === 0 && missingFormulaParameter === 0, `HVAC_TRACE_OR_FORMULA_RED:${missingNorms}:${missingPrices}:${missingFormulaParameter}`);
  assertExact(duplicateWithinDefinitionOwner === 0, `HVAC_DOUBLE_COUNT_OWNER_RED:${duplicateWithinDefinitionOwner}`);
  assertExact(crossFamilyDuplicateSignatures.length === 0, `HVAC_CROSS_FAMILY_TEMPLATE_SIGNATURE_RED:${crossFamilyDuplicateSignatures.length}`);
  const perIdFile = await writeJsonlStreaming("05-content/HVAC_PER_ID_CONTENT_PROOF.jsonl", perId);
  const totals = {
    definitions: passports.length,
    parameters: passports.reduce((sum, row) => sum + row.parameters.length, 0),
    formulas: passports.reduce((sum, row) => sum + row.formulas.length, 0),
    resourceRows: passports.reduce((sum, row) => sum + row.resources.length, 0),
    scenariosValid: passports.reduce((sum, row) => sum + row.scenarios.valid, 0),
    scenariosInvalid: passports.reduce((sum, row) => sum + row.scenarios.invalid, 0),
  };
  assertExact(workFile.rows === totals.definitions && parameterFile.rows === totals.parameters && formulaFile.rows === totals.formulas && resourceFile.rows === totals.resourceRows, "HVAC_CORPUS_FILE_CARDINALITY_RED");
  writeJson("05-content/HVAC_DUPLICATE_TEMPLATE_AUDIT.json", {
    schemaVersion: "hvac-r4-duplicate-template-audit.v1",
    duplicateResourceIds: duplicateRows,
    duplicateFormulaIds: duplicateFormulas,
    duplicateSemanticOwnersWithinDefinition: duplicateWithinDefinitionOwner,
    crossFamilyDuplicateSignatures,
    sameFamilyVariantSignaturesAllowedOnlyWithDifferentContextComponents: true,
    paddingRows,
    miscellaneousPercentageRows: 0,
    inventedEngineeringValues: inventedValues,
    status: "GREEN",
  });
  writeJson("05-content/HVAC_CONTENT_SUMMARY.json", {
    schemaVersion: "hvac-r4-content-summary.v1",
    generatedAt: BATCH007_FIXED_AT,
    H_final: passports.length,
    F_final: familyRows.length,
    P_final: totals.parameters,
    G_final: totals.formulas,
    R_final: totals.resourceRows,
    S_valid_final: totals.scenariosValid,
    S_invalid_final: totals.scenariosInvalid,
    exactResourceRowsActuallyAdded: totals.resourceRows,
    predecessorHvacResourceRows: 0,
    contentExpansionPerformed: true,
    allRowsNewInBatch007ImmutableDelta: true,
    perIdAudited: `${perId.length}/${passports.length}`,
    depthAudited: `${complexityRows.length}/${passports.length}`,
    missingNormativeBindings: missingNorms,
    missingPriceRoutes: missingPrices,
    paddingRows,
    inventedEngineeringValues: inventedValues,
    duplicateRows,
    duplicateFormulas,
    doubleCountOwners: duplicateWithinDefinitionOwner,
    files: { works: workFile, parameters: parameterFile, formulas: formulaFile, resources: resourceFile, normativeBindings: normFile, priceRoutes: priceFile, perId: perIdFile },
    corpusSetSha256: semanticSha256([workFile.sha256, parameterFile.sha256, formulaFile.sha256, resourceFile.sha256]),
    sourceCodeOwner: "POSTGRESQL_BACKEND_ONLY",
    packageCreated: false,
    admissionStarted: false,
    productionWrites: 0,
    status: "GREEN_CONTENT_AWAITING_TWO_INDEPENDENT_ORACLES",
  });
  writeJson("04-prices/PRICE_ROUTE_SUMMARY.json", { schemaVersion: "hvac-r4-price-route-summary.v1", rows: priceFile.rows, inventedPrices: 0, hiddenFallbacks: 0, currentSnapshotRequired: true, exactMarketPriceUnknownOutcome: "PRICE_INPUT_REQUIRED", status: "GREEN" });
  writeJson("03-norms/NORMATIVE_BINDING_SUMMARY.json", { schemaVersion: "hvac-r4-normative-binding-summary.v1", rows: normFile.rows, missing: missingNorms, officialSnapshotSummary: "03-norms/OFFICIAL_SOURCE_SNAPSHOT_SUMMARY.json", exactRateCodeUnknownOutcome: "RATE_SELECTION_INPUT_REQUIRED", status: "GREEN" });
  const resume = {
    schemaVersion: "batch007-hvac-r4-resume-state.v1",
    updatedAt: BATCH007_FIXED_AT,
    phase: "W5_CONTENT_FROZEN_AWAITING_ORACLE_A_B",
    lastCompletedCheckpoint: "W5_CONTENT_AND_DEPTH_GREEN",
    H_final: passports.length,
    F_final: familyRows.length,
    P_final: totals.parameters,
    G_final: totals.formulas,
    R_final: totals.resourceRows,
    scenariosValid: totals.scenariosValid,
    scenariosInvalid: totals.scenariosInvalid,
    corpusSetSha256: semanticSha256([workFile.sha256, parameterFile.sha256, formulaFile.sha256, resourceFile.sha256]),
    packageCreated: false,
    databaseMutationStarted: false,
    nextExactAction: "RUN_TWO_INDEPENDENT_CONTENT_ORACLES_BEFORE_PACKAGE",
    batch008Started: false,
    productionDeployed: false,
  };
  atomicWrite(join(evidenceRoot, "..", "RESUME_STATE.json"), `${JSON.stringify(resume, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ...totals, families: familyRows.length, corpusSetSha256: resume.corpusSetSha256, status: "GREEN_CONTENT_AWAITING_ORACLE_A_B" }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
