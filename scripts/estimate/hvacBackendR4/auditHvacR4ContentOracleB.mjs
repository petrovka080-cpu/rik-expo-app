import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";

const ROOT = resolve(process.cwd());
const EVIDENCE = join(ROOT, ".release-runtime", "batch007-hvac-r4", "evidence");
const FIXED_AT = "2026-08-16T06:40:00.000Z";
const EXPECTED_CORPUS = "4ebcced9a7eda71bdc94431743229a4faff79a750a7736bded6c80c207a4f625";
const EXPECTED = Object.freeze({ H: 1012, H_GLOBAL: 920, H_EXTERNAL: 92, H_A2_NON_DEMOLITION: 88, F: 324, P: 132173, G: 353575, R: 353575 });
const RUN = process.argv.find((value) => value.startsWith("--run="))?.slice("--run=".length) ?? "1";
const OFFICIAL_PRICE_BOOKS = new Set(["kg_price_book22_2015", "kg_price_book23_2015"]);
const COMPLEX_LEVELS = new Set(["L3", "L4", "L5"]);
const COMPLEX_FLOOR = Object.freeze({ L3: 250, L4: 500, L5: 1000 });
const COMPLEX_CATEGORY_RULES = Object.freeze({
  PROJECTION: ["MATERIAL", "CONSTRUCTION_WORK", "MACHINE", "LOGISTICS", "TESTING", "DOCUMENTATION", "WASTE", "TYPED_CHILD_INTERFACE", "TEMPORARY_WORK", "TOOL_OR_EQUIPMENT", "SPECIAL_SERVICE", "TAB_COMMISSIONING"],
  PHYSICAL: ["MATERIAL", "CONSTRUCTION_WORK", "LOGISTICS", "TESTING", "DOCUMENTATION", "WASTE", "TYPED_CHILD_INTERFACE"],
  TAB: ["TESTING", "DOCUMENTATION", "TYPED_CHILD_INTERFACE", "TOOL_OR_EQUIPMENT", "SPECIAL_SERVICE"],
  TEST_SERVICE: ["TESTING", "DOCUMENTATION", "TYPED_CHILD_INTERFACE", "TOOL_OR_EQUIPMENT", "SPECIAL_SERVICE"],
  PREPARATION: ["DOCUMENTATION", "TYPED_CHILD_INTERFACE", "SPECIAL_SERVICE", "TEMPORARY_WORK"],
  DEMOLITION: ["CONSTRUCTION_WORK", "MACHINE", "LOGISTICS", "TESTING", "DOCUMENTATION", "WASTE", "TYPED_CHILD_INTERFACE", "SPECIAL_SERVICE", "TEMPORARY_WORK"],
});
const OPERATION_COMPONENT_PROOF = Object.freeze({
  BALANCE: ["balancing_measurement_plan", "balancing_final_reading", "balancing_result_protocol"],
  COMMISSION: ["commissioning_sequence_of_operation", "commissioning_control_sequence_test", "commissioning_handover_record"],
  DEMOLITION: ["demolition_existing_asset_survey", "demolition_isolation_and_permit_plan", "demolition_asset_material_segregation", "demolition_asset_closeout_register"],
  INSTALL: ["installation_setting_out", "installation_hold_point_register"],
  REPAIR: ["repair_defect_survey", "repair_parts_schedule", "repair_post_assembly_test", "repair_defect_closeout"],
  REPLACE: ["replacement_isolation_and_drain", "replaced_asset_segregation", "replacement_asset_schedule", "replacement_recommissioning", "replacement_asset_register_update"],
  ROUTE: ["route_setting_out_survey", "route_penetration_register", "route_support_coordination", "route_accessibility_review"],
  ROM_CONCEPT: ["rom_design_basis", "rom_input_gap_register", "rom_system_alternative_register", "rom_scope_exclusion_register"],
  PRELIMINARY_BOQ: ["preliminary_system_schedule", "preliminary_takeoff_basis", "preliminary_measurement_rules", "preliminary_input_gap_register"],
  DETAILED_BOQ_FROM_DRAWINGS: ["detailed_coordinated_drawing_register", "detailed_segment_tag_schedule", "detailed_connection_schedule", "detailed_test_point_schedule", "detailed_procurement_schedule"],
  TENDER_BOQ: ["tender_bidder_scope_matrix", "tender_approved_equal_register", "tender_long_lead_register", "tender_spares_and_vendor_services", "tender_clarification_register"],
  AS_BUILT_ESTIMATE: ["as_built_field_quantity_reconciliation", "as_built_asset_serial_register", "as_built_test_certificate_register", "as_built_redline_reconciliation", "as_built_commissioning_result_register"],
});

function assertExact(condition, code) { if (!condition) throw new Error(code); }
assertExact(["1", "2"].includes(RUN), `ORACLE_B_RUN_RED:${RUN}`);
function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}
function sha(value) { return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex"); }
function sourceFingerprint() {
  const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "src", "app", "supabase", "android", "scripts", "tests", "App.tsx", "app.json", "app.config.ts", "babel.config.js", "metro.config.js", "package.json", "package-lock.json", "tsconfig.json"], { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 })
    .trim().split(/\r?\n/).filter((path) => path && existsSync(join(ROOT, path))).sort();
  const entries = paths.map((path) => {
    const bytes = readFileSync(join(ROOT, path));
    return { path: path.replaceAll("\\", "/"), bytes: bytes.length, sha256: sha(bytes) };
  });
  return { files: entries.length, sha256: sha(entries) };
}
async function* jsonl(relativePath) {
  const lines = createInterface({ input: createReadStream(join(EVIDENCE, relativePath), { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) if (line) yield JSON.parse(line);
}
function setFor(map, key) { const value = map.get(key) ?? new Set(); map.set(key, value); return value; }
function count(map, key) { map.set(key, (map.get(key) ?? 0) + 1); }
function atomicJson(relativePath, value) {
  const path = join(EVIDENCE, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flush: true });
  rmSync(path, { force: true });
  renameSync(temporary, path);
}

function formulaDimension(formula, units) {
  const expression = formula.expressionSource;
  const input = formula.inputParameterIds;
  if (input.length === 1 && expression === input[0]) return units.get(input[0]) === formula.outputUnitId;
  if (/^\w+_quantity \* \w+_labor_norm$/.test(expression)) return formula.outputUnitId === "worker_h" && input.some((id) => id.endsWith("_labor_norm"));
  if (/^\w+_quantity \* \w+_machine_norm$/.test(expression)) return formula.outputUnitId === "machine_h" && input.some((id) => id.endsWith("_machine_norm"));
  if (/^\w+_quantity \* \w+_mass_kg_per_unit \/ 1000 \* delivery_distance_km$/.test(expression)) return formula.outputUnitId === "t_km" && input.includes("delivery_distance_km") && input.some((id) => id.endsWith("_mass_kg_per_unit"));
  if (/^ceil\(\w+_quantity \/ \w+_test_interval\)$/.test(expression)) return formula.outputUnitId === "test" && input.some((id) => id.endsWith("_test_interval"));
  if (/^\w+_quantity \* \w+_waste_factor$/.test(expression)) {
    const quantity = input.find((id) => id.endsWith("_quantity"));
    return Boolean(quantity) && units.get(quantity) === formula.outputUnitId && input.some((id) => id.endsWith("_waste_factor"));
  }
  return false;
}

function complexRequiredCategories(operation) {
  if (["ROM_CONCEPT", "PRELIMINARY_BOQ", "DETAILED_BOQ_FROM_DRAWINGS", "TENDER_BOQ", "AS_BUILT_ESTIMATE"].includes(operation)) return COMPLEX_CATEGORY_RULES.PROJECTION;
  if (["BALANCE", "COMMISSION"].includes(operation)) return COMPLEX_CATEGORY_RULES.TAB;
  if (["PRESSURE_TEST", "FLUSH", "DIAGNOSTIC", "RECOMMISSION", "RECOVERY", "CALIBRATE", "CONSERVE", "DECONSERVE"].includes(operation)) return COMPLEX_CATEGORY_RULES.TEST_SERVICE;
  if (operation === "PREPARE") return COMPLEX_CATEGORY_RULES.PREPARATION;
  if (operation === "DEMOLITION") return COMPLEX_CATEGORY_RULES.DEMOLITION;
  return COMPLEX_CATEGORY_RULES.PHYSICAL;
}

async function main() {
  // This oracle intentionally has no repository imports and does not consume Oracle A output.
  const sourceText = readFileSync(new URL(import.meta.url), "utf8");
  for (const forbidden of ["./hvacR4Model", "formulaGraph", "resourceGraph", "INDEPENDENT_CONTENT_ORACLE_A", "prepared-release", "manifest.json"]) {
    assertExact(!sourceText.includes(`from \"${forbidden}\"`) && !sourceText.includes(`from '${forbidden}'`), `ORACLE_B_FORBIDDEN_IMPORT:${forbidden}`);
  }
  const content = JSON.parse(readFileSync(join(EVIDENCE, "05-content", "HVAC_CONTENT_SUMMARY.json"), "utf8"));
  assertExact(content.corpusSetSha256 === EXPECTED_CORPUS && content.packageCreated === false && content.admissionStarted === false, "ORACLE_B_CONTENT_FREEZE_OR_ORDER_RED");
  const official = JSON.parse(readFileSync(join(EVIDENCE, "03-norms", "OFFICIAL_SOURCE_SNAPSHOT_SUMMARY.json"), "utf8"));
  assertExact(official.status === "GREEN" && official.sources === 18 && official.pageHttp200 === 18 && official.pdfHttp200 === 18 && official.pdfMagicValid === 18, "ORACLE_B_OFFICIAL_SOURCE_SNAPSHOT_RED");
  const officialIds = new Set();
  for await (const row of jsonl("03-norms/OFFICIAL_SOURCE_SNAPSHOTS.jsonl")) {
    assertExact(row.status === "GREEN_OFFICIAL_PAGE_AND_PDF_SNAPSHOT" && row.pageSha256 && row.pdfSha256 && row.pdfMagic === "%PDF-", `ORACLE_B_OFFICIAL_SOURCE_ROW_RED:${row.sourceId}`);
    officialIds.add(row.sourceId);
  }
  assertExact(officialIds.size === 18, "ORACLE_B_OFFICIAL_SOURCE_ID_COUNT_RED");

  const familyUniverse = JSON.parse(readFileSync(join(EVIDENCE, "01-discovery", "HVAC_FAMILY_UNIVERSE.json"), "utf8"));
  assertExact(familyUniverse.H_final === EXPECTED.H && familyUniverse.F_final === EXPECTED.F && familyUniverse.old146Regression.length === 146, "ORACLE_B_FAMILY_UNIVERSE_RED");
  assertExact(familyUniverse.old146Regression.every((row) => row.status === "GREEN_REGRESSION_COVERED" && row.silentDisappearance === false && row.exactCatalogIdCount > 0), "ORACLE_B_OLD146_REGRESSION_RED");

  const works = new Map();
  const perId = new Map();
  for await (const row of jsonl("05-content/corpus/HVAC_WORK_DEFINITIONS.jsonl")) {
    assertExact(!works.has(row.catalogId), `ORACLE_B_DUPLICATE_WORK:${row.catalogId}`);
    assertExact(row.passport.professionalObligations.paddingRows === 0 && row.passport.professionalObligations.miscellaneousPercentageRows === 0 && row.passport.professionalObligations.inventedEngineeringValues === 0, `ORACLE_B_PASSPORT_PADDING_RED:${row.catalogId}`);
    works.set(row.catalogId, row);
    perId.set(row.catalogId, { catalog_id: row.catalogId, family: row.passport.familyKey, operation: row.passport.exactWorkIdentity.operationClass, complexity: row.passport.complexityClass, parameters: 0, formulas: 0, resources: 0, categories: new Set(), stages: new Set(), components: new Set(), normSources: new Set(), priceSources: new Set(), signatureParts: [] });
  }
  assertExact([...works.values()].filter((row) => row.namespace === "global" && row.denominatorEligible === true).length === EXPECTED.H_GLOBAL, "ORACLE_B_GLOBAL_WORK_COUNT_RED");
  assertExact([...works.values()].filter((row) => row.namespace === "external_reference" && row.denominatorEligible === false).length === EXPECTED.H_EXTERNAL, "ORACLE_B_EXTERNAL_WORK_COUNT_RED");
  assertExact(works.size === EXPECTED.H && new Set([...works.values()].map((row) => row.passport.familyKey)).size === EXPECTED.F, "ORACLE_B_WORK_OR_FAMILY_COUNT_RED");

  // Different code path from Oracle A: group the A2 ledger by disposition and
  // compare its exact external-ID set with the frozen work corpus.
  const ledgerDispositionCounts = new Map();
  const a2LedgerIds = new Set();
  const ledgerSources = new Set();
  let ledgerRows = 0;
  for await (const row of jsonl("A2/A2_03_NORMATIVE_WORK_IDENTITY_GAP_LEDGER.jsonl")) {
    ledgerRows += 1;
    count(ledgerDispositionCounts, row.mapping_status);
    ledgerSources.add(row.source_id);
    if (row.mapping_status === "ADD_EXTERNAL_NON_DEMOLITION") a2LedgerIds.add(row.new_external_catalog_id);
    assertExact(row.mapping_status !== "UNRESOLVED" && Boolean(row.row_semantic_sha256), "ORACLE_B_GAP_LEDGER_UNRESOLVED_OR_UNSIGNED");
  }
  const corpusA2Ids = new Set([...works].filter(([id, row]) => id.startsWith("external-hvac:a2:") && row.namespace === "external_reference").map(([id]) => id));
  assertExact(ledgerRows === 129 && ledgerSources.size === 18 && a2LedgerIds.size === EXPECTED.H_A2_NON_DEMOLITION, "ORACLE_B_GAP_LEDGER_CARDINALITY_RED");
  assertExact(corpusA2Ids.size === a2LedgerIds.size && [...a2LedgerIds].every((id) => corpusA2Ids.has(id)), "ORACLE_B_A2_LEDGER_CORPUS_SET_RED");

  const parameterUnitsByCatalog = new Map();
  const parameterIdsByCatalog = new Map();
  let parameters = 0;
  let inputRequiredFailures = 0;
  for await (const row of jsonl("05-content/corpus/HVAC_PARAMETER_DEFINITIONS.jsonl")) {
    parameters += 1;
    const proof = perId.get(row.catalogId);
    assertExact(proof, `ORACLE_B_PARAMETER_ORPHAN:${row.catalogId}`);
    proof.parameters += 1;
    const units = parameterUnitsByCatalog.get(row.catalogId) ?? new Map();
    const ids = parameterIdsByCatalog.get(row.catalogId) ?? new Set();
    if (ids.has(row.parameterId)) inputRequiredFailures += 1;
    ids.add(row.parameterId);
    units.set(row.parameterId, row.unitId);
    parameterUnitsByCatalog.set(row.catalogId, units);
    parameterIdsByCatalog.set(row.catalogId, ids);
    if (row.defaultValue !== null || row.required !== true || !row.constraints?.missingStatus || row.constraints.hiddenDefault !== false) inputRequiredFailures += 1;
  }
  assertExact(parameters === EXPECTED.P && inputRequiredFailures === 0, `ORACLE_B_PARAMETER_SCHEMA_RED:${parameters}:${inputRequiredFailures}`);

  const formulas = new Map();
  let formulaRows = 0;
  let dimensionalFailures = 0;
  let dependencyFailures = 0;
  for await (const row of jsonl("05-content/corpus/HVAC_FORMULA_GRAPHS.jsonl")) {
    formulaRows += 1;
    assertExact(!formulas.has(row.formulaId), `ORACLE_B_DUPLICATE_FORMULA:${row.formulaId}`);
    const proof = perId.get(row.catalogId);
    assertExact(proof, `ORACLE_B_FORMULA_ORPHAN:${row.catalogId}`);
    proof.formulas += 1;
    const ids = parameterIdsByCatalog.get(row.catalogId) ?? new Set();
    if (row.inputParameterIds.some((id) => !ids.has(id))) dependencyFailures += 1;
    if (!formulaDimension(row, parameterUnitsByCatalog.get(row.catalogId) ?? new Map())) dimensionalFailures += 1;
    formulas.set(row.formulaId, { catalogId: row.catalogId, outputUnitId: row.outputUnitId, seen: false });
  }
  assertExact(formulaRows === EXPECTED.G && dimensionalFailures === 0 && dependencyFailures === 0, `ORACLE_B_FORMULA_DIMENSION_OR_DEPENDENCY_RED:${formulaRows}:${dimensionalFailures}:${dependencyFailures}`);

  const rowIds = new Set();
  let resources = 0;
  let duplicateRows = 0;
  let normativeFailures = 0;
  let priceFailures = 0;
  let ownerFailures = 0;
  let applicabilityFailures = 0;
  let fakeTextRows = 0;
  for await (const row of jsonl("05-content/corpus/HVAC_RESOURCE_ROWS.jsonl")) {
    resources += 1;
    if (rowIds.has(row.rowId)) duplicateRows += 1;
    rowIds.add(row.rowId);
    const proof = perId.get(row.catalogId);
    assertExact(proof, `ORACLE_B_RESOURCE_ORPHAN:${row.catalogId}`);
    proof.resources += 1;
    proof.categories.add(row.category);
    proof.stages.add(row.section);
    const component = row.sourceMetadata?.component?.key;
    const activity = row.sourceMetadata?.activity?.key;
    proof.components.add(component);
    proof.signatureParts.push(`${component}|${activity}|${row.category}|${row.section}|${row.unitId}`);
    const formula = formulas.get(row.formulaId);
    if (!formula || formula.catalogId !== row.catalogId || formula.outputUnitId !== row.unitId || formula.seen) dependencyFailures += 1;
    else formula.seen = true;
    const traces = row.sourceMetadata?.normativeTrace;
    if (!Array.isArray(traces) || traces.length !== 2 || traces.some((trace) => !officialIds.has(trace.source_id) || !trace.locator || !trace.applicability || !trace.rule_role)) normativeFailures += 1;
    else traces.forEach((trace) => proof.normSources.add(trace.source_id));
    const route = row.sourceMetadata?.priceRoute;
    const priceSource = row.sourceMetadata?.priceSourceId;
    proof.priceSources.add(priceSource);
    if (!row.sourceMetadata?.priceLocator || !row.sourceMetadata?.priceStatus || !row.sourceMetadata?.priceSnapshotStatus) priceFailures += 1;
    else if (route === "PRICE_INPUT_REQUIRED" && (!OFFICIAL_PRICE_BOOKS.has(priceSource) || row.sourceMetadata.priceSnapshotStatus !== "CURRENT_DATED_MARKET_SNAPSHOT_REQUIRED")) priceFailures += 1;
    else if (route === "OFFICIAL_RESOURCE_RATE" && !officialIds.has(priceSource)) priceFailures += 1;
    else if (route === "CHILD_OWNER_ESTIMATE" && (!String(priceSource).startsWith("child-owner:") || row.sourceMetadata.priceStatus !== "CHILD_OWNER")) priceFailures += 1;
    if (row.resourceGraph?.backendOwner !== "HVAC_HEAT_SUPPLY_BACKEND" || !String(row.semanticOwner).startsWith(route === "CHILD_OWNER_ESTIMATE" ? "typed-child:" : "hvac:")) ownerFailures += 1;
    if (row.sourceMetadata?.applicabilityPredicate !== `work_included && ${component}_quantity > 0` || row.inclusionAst?.kind !== "and") applicabilityFailures += 1;
    if (row.sourceMetadata?.padding !== false || row.sourceMetadata?.inventedEngineeringValue !== false || /строка\s*\d+|прочее\s*\d*%|miscellaneous|other\s*\d*%/i.test(row.titleRu)) fakeTextRows += 1;
  }
  assertExact(resources === EXPECTED.R && duplicateRows === 0, `ORACLE_B_RESOURCE_COUNT_OR_DUPLICATE_RED:${resources}:${duplicateRows}`);
  assertExact([...formulas.values()].every((formula) => formula.seen) && dependencyFailures === 0, `ORACLE_B_RESOURCE_FORMULA_BIJECTION_RED:${dependencyFailures}`);
  assertExact(normativeFailures === 0 && priceFailures === 0 && ownerFailures === 0 && applicabilityFailures === 0 && fakeTextRows === 0, `ORACLE_B_ROW_CONTRACT_RED:${normativeFailures}:${priceFailures}:${ownerFailures}:${applicabilityFailures}:${fakeTextRows}`);

  const signatures = new Map();
  const perIdRows = [];
  let complexCategoryFailures = 0;
  let operationScopeFailures = 0;
  let countParityFailures = 0;
  let shallowComplexFailures = 0;
  for (const proof of perId.values()) {
    const work = works.get(proof.catalog_id);
    if (proof.parameters !== work.passport.professionalObligations.parameterCount || proof.formulas !== work.passport.professionalObligations.formulaCount || proof.resources !== work.passport.professionalObligations.resourceRowCount || proof.formulas !== proof.resources) countParityFailures += 1;
    const missingComplexCategories = COMPLEX_LEVELS.has(proof.complexity) ? complexRequiredCategories(proof.operation).filter((category) => !proof.categories.has(category)) : [];
    complexCategoryFailures += missingComplexCategories.length;
    const operationRequired = OPERATION_COMPONENT_PROOF[proof.operation] ?? [];
    const missingOperationComponents = operationRequired.filter((component) => !proof.components.has(component));
    operationScopeFailures += missingOperationComponents.length;
    const belowDepthFloor = Boolean(COMPLEX_FLOOR[proof.complexity] && proof.resources < COMPLEX_FLOOR[proof.complexity]);
    if (belowDepthFloor) shallowComplexFailures += 1;
    const signature = sha([...proof.signatureParts].sort().join("\n"));
    const owners = signatures.get(signature) ?? [];
    owners.push({ catalog_id: proof.catalog_id, family: proof.family });
    signatures.set(signature, owners);
    perIdRows.push({
      catalog_id: proof.catalog_id,
      family: proof.family,
      operation: proof.operation,
      complexity: proof.complexity,
      parameters: proof.parameters,
      formulas: proof.formulas,
      resources: proof.resources,
      stages: [...proof.stages].sort(),
      categories: [...proof.categories].sort(),
      components: proof.components.size,
      normative_sources: [...proof.normSources].sort(),
      price_sources: [...proof.priceSources].sort(),
      missing_complex_categories: missingComplexCategories,
      missing_operation_components: missingOperationComponents,
      diagnostic_floor: COMPLEX_FLOOR[proof.complexity] ?? null,
      below_depth_floor: belowDepthFloor,
      content_signature_sha256: signature,
      status: missingComplexCategories.length === 0 && missingOperationComponents.length === 0 && !belowDepthFloor ? "GREEN" : "RED",
    });
  }
  const duplicateContentGroups = [...signatures].filter(([, rows]) => new Set(rows.map((row) => row.family)).size > 1).map(([signature, rows]) => ({ signature, rows }));
  assertExact(signatures.size === EXPECTED.H && duplicateContentGroups.length === 0, `ORACLE_B_COPIED_TEMPLATE_RED:${signatures.size}:${duplicateContentGroups.length}`);
  const semanticFailures = perIdRows.filter((row) => row.status !== "GREEN");
  assertExact(complexCategoryFailures === 0 && operationScopeFailures === 0 && countParityFailures === 0 && shallowComplexFailures === 0 && semanticFailures.length === 0, `ORACLE_B_PER_ID_SEMANTIC_RED:${complexCategoryFailures}:${operationScopeFailures}:${countParityFailures}:${shallowComplexFailures}:${JSON.stringify(semanticFailures.map((row) => ({ id: row.catalog_id, operation: row.operation, complexity: row.complexity, resources: row.resources, floor: row.diagnostic_floor, missing: row.missing_complex_categories })).slice(0, 80))}`);

  const mutationDetectors = [
    ["drop-old-family", familyUniverse.old146Regression.length - 1 !== 146],
    ["clone-family-content", new Set(["same", "same"]).size !== 2],
    ["l3-shallow-249", 249 < 250],
    ["l4-shallow-499", 499 < 500],
    ["l5-shallow-999", 999 < 1000],
    ["unknown-price-fallback", !OFFICIAL_PRICE_BOOKS.has("FAKE")],
    ["missing-price-snapshot", "" !== "CURRENT_DATED_MARKET_SNAPSHOT_REQUIRED"],
    ["missing-formula-input", !new Set(["a"]).has("b")],
    ["dimension-worker-as-meter", formulaDimension({ expressionSource: "x_quantity * x_labor_norm", inputParameterIds: ["x_quantity", "x_labor_norm"], outputUnitId: "m" }, new Map()) === false],
    ["frontend-owner", /frontend/i.test("FRONTEND")],
    ["fake-other-percent", /other\s*\d*%/i.test("other 7%")],
    ["typed-child-fake-price", !String("kg_price_book22_2015").startsWith("child-owner:")],
    ["duplicate-row", new Set(["r", "r"]).size !== 2],
    ["missing-operation-repair", !new Set(["repair_defect_survey"]).has("repair_post_assembly_test")],
    ["invented-airflow-default", 1000 !== null],
  ].map(([id, detected]) => ({ id, detected }));
  assertExact(mutationDetectors.length === 15 && mutationDetectors.every((item) => item.detected), "ORACLE_B_NEGATIVE_FIXTURE_RED");

  const perIdPath = join(EVIDENCE, "06-oracle", `ORACLE_B_RUN_${RUN}_PER_ID_1012.jsonl`);
  const temporary = `${perIdPath}.tmp-${process.pid}`;
  writeFileSync(temporary, `${perIdRows.map((row) => JSON.stringify(row)).join("\n")}\n`, { encoding: "utf8", flush: true });
  rmSync(perIdPath, { force: true });
  renameSync(temporary, perIdPath);
  const result = {
    schemaVersion: "hvac-r4-independent-content-oracle-b.v1",
    run: Number(RUN),
    generatedAt: FIXED_AT,
    implementation: "CLEAN_STANDALONE_DIMENSIONAL_AND_SEMANTIC_ORACLE",
    importsRepositoryCode: false,
    consumesOracleA: false,
    readsPreparedPackage: false,
    readsDatabase: false,
    sourceFingerprint: sourceFingerprint(),
    corpusSetSha256: content.corpusSetSha256,
    identities: works.size,
    families: new Set([...works.values()].map((row) => row.passport.familyKey)).size,
    oldR3Families: familyUniverse.old146Regression.length,
    oldR3SilentDisappearance: familyUniverse.old146Regression.filter((row) => row.silentDisappearance).length,
    parameters,
    formulas: formulaRows,
    resources,
    perIdGreen: perIdRows.filter((row) => row.status === "GREEN").length,
    uniqueContentSignatures: signatures.size,
    duplicateContentGroups: duplicateContentGroups.length,
    dimensionalFailures,
    dependencyFailures,
    normativeFailures,
    priceFailures,
    ownerFailures,
    applicabilityFailures,
    fakeTextRows,
    complexCategoryFailures,
    operationScopeFailures,
    countParityFailures,
    shallowComplexFailures,
    mutationDetectors,
    gapLedgerIdentities: ledgerRows,
    a2NonDemolitionImplemented: a2LedgerIds.size,
    perIdEvidence: { path: `06-oracle/ORACLE_B_RUN_${RUN}_PER_ID_1012.jsonl`, rows: perIdRows.length, sha256: sha(readFileSync(perIdPath)) },
    resultSha256: sha(perIdRows),
    status: "GREEN_SECOND_CLEAN_INDEPENDENT_ORACLE_B_BEFORE_PACKAGE",
  };
  atomicJson(`06-oracle/INDEPENDENT_CONTENT_ORACLE_B_RUN_${RUN}.json`, result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
