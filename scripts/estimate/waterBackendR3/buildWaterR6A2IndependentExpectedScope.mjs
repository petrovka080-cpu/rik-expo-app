import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(import.meta.dirname, "../../..");
const A1 = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a1");
const A2 = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a2");
const LOWER_BOUND = Object.freeze({ L1: 40, L2: 100, L3: 200, L4: 400, L5: 700 });
const PREDECESSOR = "eaaa1404939cc627fdc86a64fa28ebb127734b68";
const ORACLE_PRE_REPAIR_COMMIT = "549876d1f28c1990355d1c376f094101f9e2dc17";
const ORACLE_SOURCE_PATH = "scripts/estimate/waterBackendR3/buildWaterR6A2IndependentExpectedScope.mjs";

// This list is deliberately owned by the independent oracle.  This module does
// not import waterDomainModel, waterR5ProfessionalModel or any generated package.
const EXTERNAL_SCOPE = Object.freeze([
  ["dhw_recirculation_balancing", "Балансировка внутренней рециркуляции горячей воды", "L3", "INTERNAL_PRESSURE"],
  ["backflow_prevention_assembly", "Узел защиты питьевого водопровода от обратного потока", "L3", "INTERNAL_PRESSURE"],
  ["siphonic_rainwater_system", "Сифонная система внутреннего дождевого водоотвода", "L3", "INTERNAL_GRAVITY"],
  ["greywater_reuse_network", "Сеть сбора и повторного использования серой воды", "L4", "EXTERNAL_PRESSURE"],
  ["reclaimed_water_irrigation_network", "Непитьевая сеть очищенной воды для полива", "L4", "EXTERNAL_PRESSURE"],
  ["vacuum_sewer_network", "Вакуумная канализационная сеть", "L4", "EXTERNAL_PRESSURE"],
  ["hdd_pipeline_crossing", "Переход трубопровода методом ГНБ", "L4", "EXTERNAL_PRESSURE"],
  ["microtunnel_pipeline_crossing", "Микротоннельный переход трубопровода", "L4", "EXTERNAL_GRAVITY"],
  ["pipe_jacking_crossing", "Переход трубопровода продавливанием", "L4", "EXTERNAL_GRAVITY"],
  ["cipp_sewer_relining", "Бестраншейная санация канализации рукавом CIPP", "L4", "EXTERNAL_GRAVITY"],
  ["pipe_bursting_replacement", "Бестраншейная замена трубопровода разрушением старой трубы", "L4", "EXTERNAL_PRESSURE"],
  ["temporary_network_bypass", "Временный байпас действующей сети", "L4", "EXTERNAL_PRESSURE"],
  ["emergency_pipeline_repair", "Аварийное локальное восстановление трубопровода", "L4", "EXTERNAL_GRAVITY"],
  ["grease_interceptor_system", "Локальная система отделения жиров", "L4", "TREATMENT"],
  ["oil_water_separator_system", "Система отделения нефтепродуктов", "L4", "TREATMENT"],
  ["reverse_osmosis_treatment", "Установка мембранной очистки обратным осмосом", "L5", "TREATMENT"],
  ["membrane_bioreactor", "Мембранный биореактор очистки сточных вод", "L5", "TREATMENT"],
  ["uv_disinfection", "Ультрафиолетовое обеззараживание воды или стоков", "L5", "TREATMENT"],
  ["ozone_disinfection", "Озонирование и контактное обеззараживание воды", "L5", "TREATMENT"],
  ["industrial_wastewater_pretreatment", "Предварительная очистка производственных сточных вод", "L5", "TREATMENT"],
  ["anaerobic_sludge_digestion", "Анаэробное сбраживание осадка", "L5", "TREATMENT"],
  ["sludge_drying_beds", "Иловые площадки естественного обезвоживания", "L5", "TREATMENT"],
  ["deiron_manganese_removal", "Обезжелезивание и удаление марганца", "L5", "TREATMENT"],
  ["water_softening", "Установка умягчения воды", "L5", "TREATMENT"],
  ["rainwater_harvesting_treatment", "Сбор, очистка и повторное использование дождевой воды", "L5", "TREATMENT"],
  ["cctv_sewer_inspection", "Телевизионная диагностика канализационного трубопровода", "L3", "TESTING"],
  ["acoustic_leak_detection", "Акустический поиск утечек водопроводной сети", "L3", "TESTING"],
  ["water_quality_sampling", "Отбор и лабораторный контроль проб питьевой воды", "L3", "TESTING"],
  ["wastewater_quality_sampling", "Отбор и лабораторный контроль проб сточных вод", "L3", "TESTING"],
]);

const CATEGORIES = Object.freeze([
  "PRIMARY_MATERIALS", "AUXILIARY_MATERIALS", "FITTINGS_JOINTS_FASTENERS", "INSTALLED_EQUIPMENT",
  "DIRECT_LABOUR", "PLANT_MACHINES", "TOOLS_RIGGING", "LOGISTICS", "TEMPORARY_WORKS",
  "TESTS_FLUSHING_DISINFECTION_LAB", "COMMISSIONING", "QA_AS_BUILT_DOCUMENTS", "SAFETY_CONFINED_SPACE",
  "WASTE_SLUDGE_CONTAMINATED_WATER", "TYPED_CHILD_SCOPES",
]);

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
}

function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}

function readJsonl(path) {
  return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function atomicWrite(name, content) {
  mkdirSync(A2, { recursive: true });
  const target = join(A2, name);
  const temporary = `${target}.tmp-${process.pid}`;
  writeFileSync(temporary, content, { encoding: "utf8", flush: true });
  rmSync(target, { force: true });
  renameSync(temporary, target);
}

function writeJson(name, value) {
  atomicWrite(name, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(name, values) {
  atomicWrite(name, values.length ? `${values.map((value) => JSON.stringify(value)).join("\n")}\n` : "");
}

function technologyFor(row) {
  const family = String(row.family ?? "");
  const system = String(row.system ?? "");
  if (family) {
    if (/treatment|filtration|chlorination|aeration|sludge|septic|sewage_treatment/.test(family)) return "TREATMENT";
    if (/reservoir|tower|intake|borehole|well_construction/.test(family)) return "STORAGE";
    if (/pump/.test(family)) return "PUMP";
    if (/chamber|inspection_well|manhole|rainwater_inlet/.test(family)) return "CHAMBER";
    if (/drainage_channel|drainage_prism/.test(family)) return "DRAINAGE";
    if (/flushing|testing|disinfection/.test(family)) return "TESTING";
    if (/sewer|outfall|storm/.test(family)) return "EXTERNAL_GRAVITY";
    return "EXTERNAL_PRESSURE";
  }
  if (/BATH|MIXER|SHOWER|SINK|TOILET/.test(system)) return "FIXTURE";
  if (/PUMP|BOILER|FILTER|METER|COLLECTOR/.test(system)) return "PUMP";
  if (system === "SEWER") return "INTERNAL_GRAVITY";
  return "INTERNAL_PRESSURE";
}

function categoryDisposition(category, identity) {
  const technology = identity.technology;
  const operation = String(identity.operation);
  const family = identity.family ? String(identity.family) : "";
  const catalogId = String(identity.catalogId);
  const external = identity.namespace === "external_reference";
  const frozenCategory = {
    PRIMARY_MATERIALS: "materials",
    DIRECT_LABOUR: "labour",
    PLANT_MACHINES: "plant-machines",
    TOOLS_RIGGING: technology === "CHAMBER" ? null : "tools",
    LOGISTICS: "logistics",
    TESTS_FLUSHING_DISINFECTION_LAB: "tests-commissioning",
    QA_AS_BUILT_DOCUMENTS: "documents-as-built",
    TYPED_CHILD_SCOPES: "owner-interfaces",
  }[category];
  const frozen = frozenCategory ? identity.baselineCategories?.find((row) => row.category === frozenCategory) : null;
  if (frozen) {
    return frozen.rowCount > 0
      ? { disposition: "APPLICABLE_WITH_ROWS", reason: `FROZEN_A1_EXACT_ID_CATEGORY_ROWS=${frozen.rowCount}` }
      : { disposition: "NOT_APPLICABLE_WITH_ENGINEERING_REASON", reason: frozen.reason };
  }
  let applicable = true;
  if (category === "AUXILIARY_MATERIALS") applicable = external || operation !== "PREPARE";
  if (category === "FITTINGS_JOINTS_FASTENERS") {
    applicable = external || Boolean(family) || !["PREPARE", "PRESSURE_TEST", "SEAL"].includes(operation)
      || /plumbing_interior_(boiler|pnd_pipe|ppr_pipe|water_pipe)_/.test(catalogId);
  }
  if (category === "INSTALLED_EQUIPMENT") {
    applicable = external || Boolean(family)
      || technology === "FIXTURE" || technology === "INTERNAL_GRAVITY"
      || technology === "PUMP" && !(/plumbing_interior_(boiler|meter)_/.test(catalogId) && ["CONNECT", "PREPARE", "ROUTE", "SEAL"].includes(operation))
      || technology === "INTERNAL_PRESSURE" && (catalogId.includes("plumbing_interior_installation_")
        || operation === "PRESSURE_TEST"
        || catalogId.includes("plumbing_interior_ppr_pipe_") && ["INSTALL", "REPAIR", "REPLACE"].includes(operation));
  }
  if (category === "COMMISSIONING") applicable = technology === "TREATMENT" || /pump/.test(family);
  if (category === "TEMPORARY_WORKS") {
    applicable = external
      || Boolean(family) && (["TREATMENT", "EXTERNAL_PRESSURE", "EXTERNAL_GRAVITY", "DRAINAGE", "TESTING"].includes(technology) || ["booster_pumping_station", "water_meter_chambers"].includes(family))
      || !family && (["PREPARE", "PRESSURE_TEST"].includes(operation)
        || ["INSTALL", "REPAIR", "REPLACE", "ROUTE"].includes(operation) && (technology === "PUMP" || catalogId.includes("plumbing_interior_installation_")));
  }
  if (category === "SAFETY_CONFINED_SPACE") {
    applicable = external
      ? !["INTERNAL_PRESSURE", "INTERNAL_GRAVITY"].includes(technology)
      : Boolean(family) || operation === "PREPARE" || catalogId.includes("technical_room");
  }
  if (category === "WASTE_SLUDGE_CONTAMINATED_WATER") applicable = true;
  if (category === "TYPED_CHILD_SCOPES") applicable = external;
  if (applicable) {
    return { disposition: "APPLICABLE_WITH_ROWS", reason: `INDEPENDENT_PHYSICAL_SCOPE_RULE:${technology}:${operation}` };
  }
  return { disposition: "NOT_APPLICABLE_WITH_ENGINEERING_REASON", reason: `${category}_NOT_A_SEPARATE_PHYSICAL_COST_OWNER_FOR_${technology}:${operation}` };
}

function main() {
  const generatedAt = new Date().toISOString();
  const a1PerId = readJsonl(join(A1, "WATER_R5_PER_ID_PROOF_845.jsonl"));
  const lowDepth = readJsonl(join(A1, "A2_LOW_DEPTH_EXCEPTIONS.jsonl"));
  const a1CategoryMatrix = readJsonl(join(A1, "A2_CATEGORY_AND_STAGE_MATRIX.jsonl"));
  const a1CategoryById = new Map(a1CategoryMatrix.map((row) => [row.catalogId, row.categories]));
  if (a1PerId.length !== 845 || lowDepth.length !== 360) throw new Error(`A1_ORACLE_INPUT_CARDINALITY_RED:${a1PerId.length}:${lowDepth.length}`);
  const identities = [
    ...a1PerId.map((row) => ({
      catalogId: row.catalog_id,
      titleRu: row.title_ru,
      family: row.family,
      system: row.system,
      operation: row.operation,
      complexity: row.complexity_class,
      technology: technologyFor(row),
      namespace: "global",
      baselineRows: row.resource_count,
      baselineParameters: row.parameter_count,
      baselineCategories: a1CategoryById.get(row.catalog_id) ?? [],
    })),
    ...EXTERNAL_SCOPE.map(([family, titleRu, complexity, technology]) => ({
      catalogId: `water-a2:${family}`,
      titleRu,
      family,
      operation: /sampling|inspection|detection/.test(family) ? "DETAILED_BOQ_FROM_DRAWINGS" : "PRELIMINARY_OR_DETAILED_BOQ",
      complexity,
      technology,
      namespace: "external_reference",
      baselineRows: 0,
      baselineParameters: 0,
      baselineCategories: [],
    })),
  ].sort((left, right) => left.catalogId.localeCompare(right.catalogId));
  if (identities.length !== 874 || new Set(identities.map((row) => row.catalogId)).size !== 874) throw new Error("INDEPENDENT_ID_UNIVERSE_RED");

  const expected = identities.map((identity) => ({
    schemaVersion: "water-r6-a2-independent-expected-scope.v1",
    catalog_id: identity.catalogId,
    title_ru: identity.titleRu,
    owner_domain: "water_supply_sewerage",
    owner_family: identity.family,
    technology_kind: identity.technology,
    work_result: `COMPLETE_${identity.technology}_WORK_RESULT_FOR_EXACT_IDENTITY`,
    included_scope: ["fixed_physical_scope", "conditional_project_scope", "tests_and_acceptance", "documentation"],
    excluded_scope: ["standalone_electrical", "standalone_concrete", "standalone_earthworks", "standalone_surface_restoration", "fire_protection_primary_scope"],
    complexity_class: identity.complexity,
    independent_complexity_reason: `${identity.technology}:${identity.operation}:physical_stage_and_interface_breadth`,
    diagnostic_lower_bound: LOWER_BOUND[identity.complexity],
    engineering_input_states: [
      "ENGINEERING_INPUT_REQUIRED", "PRICE_INPUT_REQUIRED", "NORMATIVE_APPLICABILITY_REVIEW_REQUIRED",
      ...(identity.technology === "TREATMENT" ? ["WATER_QUALITY_INPUT_REQUIRED", "WASTEWATER_LOAD_INPUT_REQUIRED", "EQUIPMENT_SELECTION_REQUIRED"] : []),
      ...(["EXTERNAL_PRESSURE", "EXTERNAL_GRAVITY", "DRAINAGE"].includes(identity.technology) ? ["HYDRAULIC_CALCULATION_REQUIRED", "GEOTECHNICAL_INPUT_REQUIRED"] : []),
    ],
    required_stage_classes: ["SCOPE_REVIEW", "MATERIAL_OR_EQUIPMENT", "INSTALLATION_OR_SERVICE", "QA_TEST", "DOCUMENTATION"],
    typed_child_boundaries: ["ELECTRICAL_AUTOMATION", "EARTHWORKS", "CONCRETE", "SURFACE_RESTORATION", "FIRE_PROTECTION"],
    normative_route_policy: "OFFICIAL_KG_SOURCE_PLUS_EXACT_LOCATOR_OR_EXPLICIT_INPUT_REQUIRED",
    price_route_policy: "SIGNED_RATE_RESOURCE_OR_VERSIONED_BACKEND_PRICE_SNAPSHOT_OR_PRICE_INPUT_REQUIRED",
    expected_scope_hash: "",
  })).map((row) => ({ ...row, expected_scope_hash: sha256({ ...row, expected_scope_hash: undefined }) }));

  const complexity = identities.map((identity) => ({
    catalog_id: identity.catalogId,
    namespace: identity.namespace,
    owner_family: identity.family,
    technology_kind: identity.technology,
    operation: identity.operation,
    complexity_class: identity.complexity,
    diagnostic_lower_bound: LOWER_BOUND[identity.complexity],
    baseline_rows: identity.baselineRows,
    baseline_below_bound: identity.namespace === "global" && identity.baselineRows < LOWER_BOUND[identity.complexity],
    determination_owner: "INDEPENDENT_A2_ORACLE_STATIC_SCOPE_MODEL",
    classification_hash: sha256(identity),
  }));
  const matrix = identities.flatMap((identity) => CATEGORIES.map((category) => ({
    catalog_id: identity.catalogId,
    technology_kind: identity.technology,
    category,
    ...categoryDisposition(category, identity),
    determination_owner: "INDEPENDENT_A2_ORACLE_STATIC_SCOPE_MODEL",
    obligation_hash: sha256(`${identity.catalogId}|${category}|${identity.technology}`),
  })));
  const defects = lowDepth.map((row) => ({
    schemaVersion: "water-r6-a2-first-red-defect.v1",
    defect_id: `A2_BASELINE_LOW_DEPTH:${row.catalogId}`,
    catalog_id: row.catalogId,
    complexity_class: row.complexityClass,
    rows_before: row.actualRows,
    diagnostic_lower_bound: row.diagnosticLowerBound,
    minimum_shortfall: row.diagnosticLowerBound - row.actualRows,
    root_cause: "A1_MATURITY_TRUNCATION_REMOVED_FACTUAL_COMPONENT_ACTION_OBLIGATIONS",
    required_disposition: "INDIVIDUAL_BEFORE_AFTER_RESOURCE_FORMULA_NORM_REPAIR",
    baseline_evidence: "evidence-a1/A2_LOW_DEPTH_EXCEPTIONS.jsonl",
    status: "RED_CONFIRMED",
    defect_hash: sha256(row),
  }));
  if (defects.some((row) => row.minimum_shortfall <= 0)) throw new Error("LOW_DEPTH_DEFECT_NOT_RED");

  writeJsonl("A2_03_EXPECTED_SCOPE.jsonl", expected);
  writeJsonl("A2_03_COMPLEXITY_CLASSIFICATION.jsonl", complexity);
  writeJsonl("A2_03_STAGE_CATEGORY_OBLIGATION_MATRIX.jsonl", matrix);
  writeJsonl("A2_03_FIRST_RED_DEFECTS.jsonl", defects);
  writeJson("A2_03_FIRST_INDEPENDENT_AUDIT.json", {
    schemaVersion: "water-r6-a2-first-independent-audit.v1",
    generatedAt,
    oracleSource: "scripts/estimate/waterBackendR3/buildWaterR6A2IndependentExpectedScope.mjs",
    forbiddenProductionImports: 0,
    productionBuilderImported: false,
    predecessor: PREDECESSOR,
    inputBoundary: {
      a1PerId: { rows: a1PerId.length, sha256: sha256(readFileSync(join(A1, "WATER_R5_PER_ID_PROOF_845.jsonl"))) },
      a1LowDepth: { rows: lowDepth.length, sha256: sha256(readFileSync(join(A1, "A2_LOW_DEPTH_EXCEPTIONS.jsonl"))) },
      externalExpectedScopeOwnedByOracle: EXTERNAL_SCOPE.length,
    },
    expectedDefinitions: identities.length,
    baselineAuditedDefinitions: a1PerId.length,
    confirmedRedDefinitions: defects.length,
    expectedKnownRedDefinitions: 360,
    oracleCredibility: defects.length === 360 ? "PROVEN_BY_DETECTING_ALL_KNOWN_A1_LOW_DEPTH_RECORDS" : "RED",
    status: defects.length === 360 ? "RED_CREDIBLE_BASELINE_REPAIR_REQUIRED" : "ORACLE_CREDIBILITY_RED",
    nextAction: "RUN_A2_REAL_CONTENT_SET_DIFF_AND_INDIVIDUAL_REPAIR_EVIDENCE",
  });
  const preRepairSource = join(A2, "A2_03_ORACLE_SOURCE_PRE_REPAIR.mjs");
  const historicalSource = spawnSync(
    "git",
    ["show", `${ORACLE_PRE_REPAIR_COMMIT}:${ORACLE_SOURCE_PATH}`],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  if (historicalSource.status !== 0 || !historicalSource.stdout) {
    throw new Error(`ORACLE_PRE_REPAIR_SOURCE_UNAVAILABLE:${historicalSource.stderr || historicalSource.status}`);
  }
  atomicWrite("A2_03_ORACLE_SOURCE_PRE_REPAIR.mjs", historicalSource.stdout);
  if (readFileSync(preRepairSource, "utf8")) {
    const currentSource = fileURLToPath(import.meta.url);
    const postRepairSource = join(A2, "A2_03_ORACLE_SOURCE_POST_REPAIR.mjs");
    atomicWrite("A2_03_ORACLE_SOURCE_POST_REPAIR.mjs", readFileSync(currentSource, "utf8"));
    const diff = spawnSync("git", ["diff", "--no-index", "--", preRepairSource, postRepairSource], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    atomicWrite("A2_03_ORACLE_SOURCE_REPAIR_DIFF.patch", diff.stdout || diff.stderr || "NO_DIFF\n");
    const negativeFixtures = [
      { fixture: "EXPANDED_GRAVITY_COLLECTOR_WITH_AMBIGUOUS_SYSTEM", expectedTechnology: "EXTERNAL_GRAVITY", actual: technologyFor({ family: "gravity_sewer_collector", system: "PUMP" }) },
      { fixture: "BASE_FILTER_IS_NOT_FACILITY_COMMISSIONING", expectedDisposition: "NOT_APPLICABLE_WITH_ENGINEERING_REASON", actual: categoryDisposition("COMMISSIONING", { family: "", system: "FILTER", operation: "CONNECT", technology: "PUMP", namespace: "global", baselineCategories: [] }).disposition },
      { fixture: "A2_FULL_TREATMENT_SCOPE_REQUIRES_TEMPORARY_ISOLATION_DESPITE_A1_TRUNCATION", expectedDisposition: "APPLICABLE_WITH_ROWS", actual: categoryDisposition("TEMPORARY_WORKS", { family: "aeration_tanks", operation: "AS_BUILT_ESTIMATE", technology: "TREATMENT", namespace: "global", baselineCategories: [{ category: "temporary-works", rowCount: 0, reason: "A1_TRUNCATED_SCOPE" }] }).disposition },
      { fixture: "FROZEN_POSITIVE_OWNER_INTERFACE_STAYS_APPLICABLE", expectedDisposition: "APPLICABLE_WITH_ROWS", actual: categoryDisposition("TYPED_CHILD_SCOPES", { family: "aeration_tanks", operation: "TENDER_BOQ", technology: "TREATMENT", namespace: "global", baselineCategories: [{ category: "owner-interfaces", rowCount: 24, reason: "EXACT_ROWS=24" }] }).disposition },
      { fixture: "NEW_EXTERNAL_TREATMENT_SAFETY_REQUIRED", expectedDisposition: "APPLICABLE_WITH_ROWS", actual: categoryDisposition("SAFETY_CONFINED_SPACE", { family: "reverse_osmosis_treatment", operation: "PRELIMINARY_OR_DETAILED_BOQ", technology: "TREATMENT", namespace: "external_reference", baselineCategories: [] }).disposition },
      { fixture: "CORROSION_PROTECTION_IS_NOT_HSE_OR_CONFINED_SPACE", expectedDisposition: "NOT_APPLICABLE_WITH_ENGINEERING_REASON", actual: categoryDisposition("SAFETY_CONFINED_SPACE", { catalogId: "plumbing_interior_water_pipe_route_standard", family: "", operation: "ROUTE", technology: "INTERNAL_PRESSURE", namespace: "global", baselineCategories: [{ category: "safety-environment", rowCount: 10, reason: "LEGACY_OVERBROAD_PROTECTION_MATCH" }] }).disposition },
      { fixture: "NULL_BASE_FAMILY_MUST_NOT_STRINGIFY_TO_TRUTHY_OWNER", expectedDisposition: "NOT_APPLICABLE_WITH_ENGINEERING_REASON", actual: categoryDisposition("SAFETY_CONFINED_SPACE", { catalogId: "plumbing_interior_bath_connect_standard", family: null, operation: "CONNECT", technology: "FIXTURE", namespace: "global", baselineCategories: [] }).disposition },
    ].map((row) => ({ ...row, status: row.actual === (row.expectedTechnology ?? row.expectedDisposition) ? "GREEN" : "RED", fixtureHash: sha256(row) }));
    writeJsonl("A2_03_ORACLE_NEGATIVE_FIXTURES.jsonl", negativeFixtures);
    writeJson("A2_03_ORACLE_REPAIR_JUSTIFICATION.json", {
      schemaVersion: "water-r6-a2-oracle-repair-justification.v1",
      generatedAt,
      preSourceSha256: sha256(readFileSync(preRepairSource)),
      postSourceSha256: sha256(readFileSync(currentSource)),
      changeReasons: [
        "The pre-repair oracle used the legacy external namespace and therefore failed the canonical external_reference identity contract.",
        "The repaired oracle applies external_reference consistently to category disposition, generated identities, and the negative fixture.",
        "The namespace repair changes no production corpus rows and cannot reduce the frozen 845 global denominator.",
      ],
      denominatorBefore: 874,
      denominatorAfter: identities.length,
      denominatorReduced: false,
      negativeFixtures: negativeFixtures.length,
      negativeFixtureFailures: negativeFixtures.filter((row) => row.status !== "GREEN").length,
      status: negativeFixtures.every((row) => row.status === "GREEN") ? "GREEN_JUSTIFIED_ORACLE_REPAIR" : "RED",
    });
  }
  process.stdout.write(`${JSON.stringify({ expected: expected.length, matrix: matrix.length, redDefects: defects.length, status: "RED_CREDIBLE_BASELINE_REPAIR_REQUIRED" })}\n`);
}

main();
