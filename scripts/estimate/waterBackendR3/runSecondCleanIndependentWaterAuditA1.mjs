import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const TARGET = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a1");
const OUTPUT = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a1");

const hash = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) => Array.isArray(value)
  ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`
    : JSON.stringify(value);
const readLines = (name) => readFileSync(join(TARGET, name), "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const writeJson = (name, value) => writeFileSync(join(OUTPUT, name), `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flush: true });
const writeJsonl = (name, values) => writeFileSync(join(OUTPUT, name), `${values.map((value) => JSON.stringify(value)).join("\n")}\n`, { encoding: "utf8", flush: true });

const FACILITY_TYPES = Object.freeze({
  aeration_tanks: "TREATMENT",
  booster_pumping_station: "PUMP",
  borehole_water_supply: "STORAGE",
  chlorination_station: "TREATMENT",
  distribution_pipeline: "EXTERNAL_PRESSURE",
  drainage_channel: "DRAINAGE",
  drainage_prism: "DRAINAGE",
  filtration_station: "TREATMENT",
  flushing_disinfection: "TESTING",
  gravity_sewer_collector: "EXTERNAL_GRAVITY",
  house_connection_water: "EXTERNAL_PRESSURE",
  inspection_chambers: "CHAMBER",
  inspection_wells: "CHAMBER",
  manholes: "CHAMBER",
  outfall_structure: "EXTERNAL_GRAVITY",
  pressure_pipeline: "EXTERNAL_PRESSURE",
  pressure_sewer_pipeline: "EXTERNAL_PRESSURE",
  pressure_testing_disinfection: "TESTING",
  pumping_station: "PUMP",
  rainwater_inlets: "CHAMBER",
  reservoir_clean_water: "STORAGE",
  septic_treatment_facility: "TREATMENT",
  settlement_water_network: "EXTERNAL_PRESSURE",
  sewage_treatment_tanks: "TREATMENT",
  sewer_pumping_station: "PUMP",
  site_sewer_connection: "EXTERNAL_GRAVITY",
  site_water_connection: "EXTERNAL_PRESSURE",
  sludge_dewatering: "TREATMENT",
  stormwater_drainage: "EXTERNAL_GRAVITY",
  valves_chambers: "CHAMBER",
  village_sewer_network: "EXTERNAL_GRAVITY",
  village_water_supply: "EXTERNAL_PRESSURE",
  wastewater_treatment_plant: "TREATMENT",
  water_intake: "STORAGE",
  water_meter_chambers: "CHAMBER",
  water_reservoir: "STORAGE",
  water_tower: "STORAGE",
  water_treatment_plant: "TREATMENT",
  well_construction: "STORAGE",
});

function parseOperation(catalogId) {
  for (const value of ["as_built_estimate", "detailed_boq_from_drawings", "preliminary_boq", "rom_concept", "tender_boq"]) {
    if (catalogId.includes(`_${value}_expanded_complex_v1`)) return value.toUpperCase();
  }
  for (const value of ["pressure_test", "connect", "install", "prepare", "repair", "replace", "route", "seal"]) {
    if (catalogId.includes(`_${value}_`)) return value.toUpperCase();
  }
  return "UNRESOLVED";
}

function parseSystem(identity) {
  const source = String(identity.source_domain_id);
  if (source.startsWith("expanded:")) {
    const value = FACILITY_TYPES[source.slice("expanded:".length)];
    if (!value) throw new Error(`SECOND_ORACLE_FACILITY_UNKNOWN:${identity.catalog_id}`);
    return value;
  }
  const id = `_${String(identity.catalog_id).toLowerCase()}_`;
  if (id.includes("_sewer_") || id.includes("_drain_") || id.includes("_wastewater_")) return "INTERNAL_GRAVITY";
  if (id.includes("_pipe_") || id.includes("_pipeline_") || id.includes("_riser_") || id.includes("_water_line_")) return "INTERNAL_PRESSURE";
  if (/_(bath|bidet|basin|faucet|fixture|mixer|shower|sink|toilet|urinal|washbasin|wc)_/.test(id)) return "FIXTURE";
  return "PUMP";
}

function parseComplexity(catalogId, systemType, operation) {
  if (catalogId.startsWith("expanded-template:")) {
    if (systemType === "TREATMENT") return operation === "ROM_CONCEPT" ? "L4" : "L5";
    if (systemType === "PUMP" || systemType === "STORAGE") return operation === "DETAILED_BOQ_FROM_DRAWINGS" || operation === "AS_BUILT_ESTIMATE" ? "L5" : "L4";
    return operation === "DETAILED_BOQ_FROM_DRAWINGS" || operation === "AS_BUILT_ESTIMATE" ? "L4" : "L3";
  }
  if (["CONNECT", "PREPARE", "PRESSURE_TEST", "SEAL"].includes(operation)) return "L1";
  if (/(?:_boiler_|_collector_|_filter_|_installation_|_meter_|_pump_)/.test(catalogId) && ["INSTALL", "REPAIR", "REPLACE"].includes(operation)) return "L3";
  return "L2";
}

function isWaterDocument(row) {
  const owner = String(row.semantic_owner);
  if (!owner.startsWith("water:")) return false;
  const category = String(row.category ?? "");
  const unit = String(row.unit_id ?? "");
  const title = String(row.title_ru ?? "");
  return (/:(?:protocol|test_protocol|process_protocol|interface_protocol)$/.test(owner) && category === "protocol" && unit === "set" && /^Протокол(?:\b|:)/u.test(title))
    || (/:passport$/.test(owner) && category === "passport" && unit === "set")
    || (/:(?:record|joint_record|interface_record|demolition_record)$/.test(owner) && category === "record" && unit === "set")
    || (/:document$/.test(owner) && category === "document" && unit === "set")
    || (/:as_built_trace$/.test(owner) && category === "as_built_trace" && unit === "set");
}

function rule(id, expectedStage, expectedResourceCategory, expectedSemanticSignature, predicate) {
  return { id, expectedStage, expectedResourceCategory, expectedSemanticSignature, predicate };
}

function predict(identity) {
  const catalogId = String(identity.catalog_id);
  const operation = parseOperation(catalogId);
  const systemType = parseSystem(identity);
  const complexity = parseComplexity(catalogId, systemType, operation);
  const rules = [
    rule("water-owner", "ALL", "backend-owner", "semantic_owner starts water:", (row) => String(row.semantic_owner).startsWith("water:")),
    rule("physical-material", "SUPPLY_OR_PROCESS", "material-or-equipment", "supply/process_material/test_consumable", (row) => /:supply(?:_|$)|:process_material$|:test_consumable$/.test(String(row.semantic_owner))),
    rule("direct-labor", "EXECUTION", "labour", "install/joint/process/test/dismantling labour", (row) => /:(?:install_labor|joint_labor|process_labor|test_labor|dismantling_labor|logistics_handling)$/.test(String(row.semantic_owner))),
    rule("construction-equipment", "EXECUTION", "plant-machines-tools", "installation/joint/lifting/process/test machine", (row) => /:(?:installation_machine|joint_tool|lifting|process_equipment|test_equipment|dismantling_machine)$/.test(String(row.semantic_owner))),
    rule("logistics", "LOGISTICS", "logistics", "delivery/handling/logistics/waste haul", (row) => /:(?:delivery|handling|logistics_service|waste_haul)$/.test(String(row.semantic_owner))),
    rule("documentation", "DOCUMENTATION", "documents-as-built", "typed Water document action + matching category/unit/title", isWaterDocument),
  ];
  if (["EXTERNAL_PRESSURE", "EXTERNAL_GRAVITY", "DRAINAGE", "CHAMBER", "STORAGE"].includes(systemType)) {
    rules.push(rule("typed-child-boundary", "OWNER_INTERFACE", "owner-interface", "semantic_owner starts typed-child:", (row) => String(row.semantic_owner).startsWith("typed-child:")));
  }
  if (systemType === "TREATMENT") {
    rules.push(rule("process-operation", "PROCESS", "process", "process scope/material/labour/control/equipment/protocol/waste", (row) => /:process_(?:scope|material|labor|control|equipment|protocol|waste)$/.test(String(row.semantic_owner))));
  }
  if (systemType === "TESTING") {
    rules.push(rule("test-service", "TESTING", "tests-commissioning", "test_service", (row) => /:test_service$/.test(String(row.semantic_owner))));
  }
  if (systemType === "PUMP" && operation !== "PREPARE" && operation !== "SEAL") {
    const standalone = operation === "CONNECT" || operation === "ROUTE";
    rules.push(rule(
      "individual-equipment-test",
      "TESTING_COMMISSIONING",
      "tests-commissioning",
      standalone ? "water:equipment_individual_test:test_service + category=testing + unit=test" : "water:<equipment-component>:individual_test + category=individual_test + unit=test",
      standalone
        ? (row) => row.semantic_owner === "water:equipment_individual_test:test_service" && row.category === "testing" && row.unit_id === "test" && /^Выполнение: Индивидуальное испытание/u.test(String(row.title_ru ?? ""))
        : (row) => String(row.semantic_owner).startsWith("water:") && /:[^:]+:individual_test$/.test(String(row.semantic_owner)) && row.category === "individual_test" && row.unit_id === "test" && /^Индивидуальное испытание/u.test(String(row.title_ru ?? "")),
    ));
  }
  if (complexity !== "L1" && operation !== "ROM_CONCEPT") {
    rules.push(rule("actual-waste-route", "WASTE", "waste-disposal", "explicit non-percentage waste row", (row) => /:.*waste$/.test(String(row.semantic_owner))));
  }
  if (!(systemType === "DRAINAGE" && operation === "ROM_CONCEPT")) {
    rules.push(rule("quality-test", "QUALITY", "tests-commissioning", "inspection/test/alignment/process control", (row) => /:(?:.*inspection|.*test|alignment|process_control)$/.test(String(row.semantic_owner))));
  }
  return { operation, systemType, complexity, rules };
}

const membership = readLines("GLOBAL_11610_WATER_DOMAIN_MEMBERSHIP.jsonl")
  .filter((row) => row.counts_toward_water_admission)
  .sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id)));
const targetRows = readLines("WATER_BACKEND_BOQ_ROW_LEDGER.jsonl");
const rowsByIdentity = new Map();
for (const row of targetRows) {
  if (!rowsByIdentity.has(row.catalog_id)) rowsByIdentity.set(row.catalog_id, []);
  rowsByIdentity.get(row.catalog_id).push(row);
}

const verdicts = [];
for (const identity of membership) {
  const predicted = predict(identity);
  const rows = rowsByIdentity.get(identity.catalog_id) ?? [];
  for (const expected of predicted.rules) {
    const reached = rows.filter(expected.predicate).map((row) => row.row_id).sort();
    verdicts.push({
      catalogId: identity.catalog_id,
      systemType: predicted.systemType,
      operation: predicted.operation,
      obligationId: expected.id,
      expectedStage: expected.expectedStage,
      expectedResourceCategory: expected.expectedResourceCategory,
      expectedSemanticSignature: expected.expectedSemanticSignature,
      reachedRowIds: reached,
      disposition: reached.length > 0 ? "INCLUDED_WITH_BACKEND_ROW_IDS" : "UNRESOLVED",
    });
  }
}
verdicts.sort((left, right) => `${left.catalogId}\0${left.obligationId}`.localeCompare(`${right.catalogId}\0${right.obligationId}`));
const missing = verdicts.filter((row) => row.reachedRowIds.length === 0);
const semanticVerdictSha256 = hash(canonical(verdicts));
const source = readFileSync(fileURLToPath(import.meta.url), "utf8");
const importedSpecifiers = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g), (match) => match[1]).sort();
const nonBuiltinImports = importedSpecifiers.filter((value) => !value.startsWith("node:"));
const report = {
  schemaVersion: "water-r5-a1-second-clean-independent-audit.v1",
  generatedAt: new Date().toISOString(),
  process: { pid: process.pid, node: process.version, execPath: process.execPath, argv: process.argv },
  cleanBoundary: "NEW_DIRECT_NODE_PROCESS_NO_TSX_NO_PROJECT_DEPENDENCY_IMPORTS",
  implementation: "scripts/estimate/waterBackendR3/runSecondCleanIndependentWaterAuditA1.mjs",
  implementationSha256: hash(source),
  readsFirstAuditOutput: false,
  productionRowsUsedOnlyAsTarget: true,
  productionRowsUsedAsExpectations: false,
  importedSpecifiers,
  nonBuiltinImports,
  oracleProductionImports: nonBuiltinImports.length,
  catalogIds: `${membership.length}/845`,
  expectedObligationMatch: `${verdicts.length - missing.length}/${verdicts.length}`,
  missing: missing.length,
  unresolved: missing.length,
  semanticVerdictSha256,
  status: membership.length === 845 && verdicts.length === 6774 && missing.length === 0 && nonBuiltinImports.length === 0 ? "GREEN" : "RED",
};
writeJsonl("A3_SECOND_CLEAN_ORACLE_VERDICTS.jsonl", verdicts);
writeJson("A3_SECOND_CLEAN_AUDIT.json", report);
process.stdout.write(`${JSON.stringify(report)}\n`);
if (report.status !== "GREEN") throw new Error(`SECOND_CLEAN_ORACLE_RED:${JSON.stringify(report)}`);
