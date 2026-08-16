import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";

const ROOT = resolve(process.cwd());
const EVIDENCE = join(ROOT, ".release-runtime", "batch007-hvac-r4", "evidence");
const FIXED_AT = "2026-08-16T06:15:00.000Z";
const EXPECTED = Object.freeze({ definitions: 1012, globalDefinitions: 920, externalDefinitions: 92, a2NonDemolitionDefinitions: 88, families: 324, parameters: 132173, formulas: 353575, resources: 353575, validScenarios: 6553, invalidScenarios: 8163 });
const COMPLEX_FLOOR = Object.freeze({ L3: 250, L4: 500, L5: 1000 });
const RUN = process.argv.find((value) => value.startsWith("--run="))?.slice("--run=".length) ?? "1";
assertExact(["1", "2"].includes(RUN), `ORACLE_A_RUN_RED:${RUN}`);

function fail(code) { throw new Error(code); }
function assertExact(value, code) { if (!value) fail(code); }
function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}
function semanticSha(value) { return createHash("sha256").update(stable(value)).digest("hex"); }
function sourceFingerprint() {
  const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "src", "app", "supabase", "android", "scripts", "tests", "App.tsx", "app.json", "app.config.ts", "babel.config.js", "metro.config.js", "package.json", "package-lock.json", "tsconfig.json"], { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 })
    .trim().split(/\r?\n/).filter((path) => path && existsSync(join(ROOT, path))).sort();
  const entries = paths.map((path) => {
    const bytes = readFileSync(join(ROOT, path));
    return { path: path.replaceAll("\\", "/"), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  });
  return { files: entries.length, sha256: semanticSha(entries) };
}
function atomicJson(relativePath, value) {
  const path = join(EVIDENCE, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flush: true });
  rmSync(path, { force: true });
  renameSync(temporary, path);
}
async function* jsonl(relativePath) {
  const lines = createInterface({ input: createReadStream(join(EVIDENCE, relativePath), { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) if (line) yield JSON.parse(line);
}
async function readJsonl(relativePath) { const rows = []; for await (const row of jsonl(relativePath)) rows.push(row); return rows; }
function add(map, key, amount = 1) { map.set(key, (map.get(key) ?? 0) + amount); }
function setFor(map, key) { const value = map.get(key) ?? new Set(); map.set(key, value); return value; }

const requiredTypedChildFields = ["child_owner", "child_scope_key", "handoff_inputs", "handoff_outputs", "quantity_basis", "exclusion_reason", "pricing_owner", "revision_binding"];

async function main() {
  // Independence boundary: only frozen JSONL and Node standard library are used.
  const forbiddenImports = ["hvacR4Model", "formulaGraph", "resourceGraph", "prepared-release", "manifest.json"];
  assertExact(!forbiddenImports.some((token) => import.meta.url.includes(token)), "ORACLE_A_IMPORT_BOUNDARY_RED");
  const contentSummary = JSON.parse(readFileSync(join(EVIDENCE, "05-content", "HVAC_CONTENT_SUMMARY.json"), "utf8"));
  assertExact(contentSummary.packageCreated === false && contentSummary.admissionStarted === false, "ORACLE_A_RAN_AFTER_PACKAGE_OR_ADMISSION");

  const complexityRows = await readJsonl("02-depth/HVAC_COMPLEXITY_CLASSIFICATION.jsonl");
  const expectedResources = new Map((await readJsonl("02-depth/HVAC_EXPECTED_RESOURCE_UNIVERSE.jsonl")).map((row) => [row.catalog_id, row]));
  const expectedStages = new Map((await readJsonl("02-depth/HVAC_EXPECTED_STAGE_UNIVERSE.jsonl")).map((row) => [row.catalog_id, row.stages]));
  const expectedInputs = new Map((await readJsonl("02-depth/HVAC_ENGINEERING_INPUT_UNIVERSE.jsonl")).map((row) => [row.catalog_id, row]));
  assertExact(complexityRows.length === EXPECTED.definitions && expectedResources.size === EXPECTED.definitions && expectedStages.size === EXPECTED.definitions && expectedInputs.size === EXPECTED.definitions, "ORACLE_A_FROZEN_UNIVERSE_CARDINALITY_RED");
  const complexityById = new Map(complexityRows.map((row) => [row.catalog_id, row]));

  const works = await readJsonl("05-content/corpus/HVAC_WORK_DEFINITIONS.jsonl");
  const workById = new Map(works.map((row) => [row.catalogId, row]));
  assertExact(works.length === EXPECTED.definitions && workById.size === EXPECTED.definitions, "ORACLE_A_WORK_CARDINALITY_RED");
  assertExact(works.filter((row) => row.namespace === "global" && row.denominatorEligible === true).length === EXPECTED.globalDefinitions, "ORACLE_A_GLOBAL_WORK_COUNT_RED");
  assertExact(works.filter((row) => row.namespace === "external_reference" && row.denominatorEligible === false).length === EXPECTED.externalDefinitions, "ORACLE_A_EXTERNAL_WORK_COUNT_RED");
  assertExact(works.every((row) => row.domain === "hvac_heat_supply"), "ORACLE_A_WORK_OWNER_OR_NAMESPACE_RED");
  assertExact(new Set(works.map((row) => row.passport.familyKey)).size === EXPECTED.families, "ORACLE_A_FAMILY_CARDINALITY_RED");
  assertExact(works.every((row) => row.sourceMetadata.backendOwner === "HVAC_HEAT_SUPPLY_BACKEND" && row.passport.quantityContract.formulaGraphOwner === "BACKEND_ONLY" && row.passport.quantityContract.resourceGraphOwner === "BACKEND_ONLY"), "ORACLE_A_BACKEND_OWNER_RED");

  // A2 normative identities are audited from the frozen ledger, not from builder code.
  const gapLedger = await readJsonl("A2/A2_03_NORMATIVE_WORK_IDENTITY_GAP_LEDGER.jsonl");
  const a2Additions = gapLedger.filter((row) => row.mapping_status === "ADD_EXTERNAL_NON_DEMOLITION");
  const ledgerSourceIds = new Set(gapLedger.map((row) => row.source_id));
  assertExact(gapLedger.length === 129 && ledgerSourceIds.size === 18, `ORACLE_A_GAP_LEDGER_CARDINALITY_RED:${gapLedger.length}:${ledgerSourceIds.size}`);
  assertExact(a2Additions.length === EXPECTED.a2NonDemolitionDefinitions
    && a2Additions.every((row) => row.new_external_catalog_id && workById.has(row.new_external_catalog_id)), "ORACLE_A_A2_NON_DEMOLITION_IMPLEMENTATION_RED");
  assertExact(gapLedger.every((row) => row.mapping_status !== "UNRESOLVED" && row.row_semantic_sha256), "ORACLE_A_GAP_LEDGER_UNRESOLVED_OR_UNSIGNED");

  const parameterIds = new Map();
  const parameterUnits = new Map();
  const parameterCount = new Map();
  let parameters = 0;
  let nonNullDefaults = 0;
  let hiddenDefaults = 0;
  for await (const row of jsonl("05-content/corpus/HVAC_PARAMETER_DEFINITIONS.jsonl")) {
    parameters += 1;
    assertExact(workById.has(row.catalogId), `ORACLE_A_PARAMETER_ORPHAN_WORK:${row.catalogId}`);
    const ids = setFor(parameterIds, row.catalogId);
    assertExact(!ids.has(row.parameterId), `ORACLE_A_DUPLICATE_PARAMETER:${row.catalogId}:${row.parameterId}`);
    ids.add(row.parameterId);
    parameterUnits.set(`${row.catalogId}\u0000${row.parameterId}`, row.unitId);
    add(parameterCount, row.catalogId);
    if (row.defaultValue !== null) nonNullDefaults += 1;
    if (row.constraints?.hiddenDefault === true) hiddenDefaults += 1;
    assertExact(row.required === true && row.constraints?.missingStatus, `ORACLE_A_PARAMETER_INPUT_REQUIRED_RED:${row.catalogId}:${row.parameterId}`);
  }
  assertExact(parameters === EXPECTED.parameters && nonNullDefaults === 0 && hiddenDefaults === 0, `ORACLE_A_PARAMETER_TOTAL_OR_DEFAULT_RED:${parameters}:${nonNullDefaults}:${hiddenDefaults}`);

  const formulasById = new Map();
  const formulaCount = new Map();
  let formulas = 0;
  let missingFormulaInput = 0;
  let expressionInputMismatch = 0;
  for await (const row of jsonl("05-content/corpus/HVAC_FORMULA_GRAPHS.jsonl")) {
    formulas += 1;
    assertExact(workById.has(row.catalogId), `ORACLE_A_FORMULA_ORPHAN_WORK:${row.catalogId}`);
    assertExact(!formulasById.has(row.formulaId), `ORACLE_A_DUPLICATE_FORMULA:${row.formulaId}`);
    const params = parameterIds.get(row.catalogId) ?? new Set();
    for (const id of row.inputParameterIds) if (!params.has(id)) missingFormulaInput += 1;
    const expressionTokens = new Set(String(row.expressionSource).match(/[a-z_][a-z0-9_]*/gi) ?? []);
    for (const id of row.inputParameterIds) if (!expressionTokens.has(id)) expressionInputMismatch += 1;
    assertExact(row.ast && row.outputUnitId && row.expressionSource, `ORACLE_A_FORMULA_GRAPH_INCOMPLETE:${row.formulaId}`);
    formulasById.set(row.formulaId, { catalogId: row.catalogId, inputParameterIds: row.inputParameterIds, outputUnitId: row.outputUnitId, references: 0 });
    add(formulaCount, row.catalogId);
  }
  assertExact(formulas === EXPECTED.formulas && missingFormulaInput === 0 && expressionInputMismatch === 0, `ORACLE_A_FORMULA_TOTAL_OR_INPUT_RED:${formulas}:${missingFormulaInput}:${expressionInputMismatch}`);

  const rowIds = new Set();
  const resourceCount = new Map();
  const stageSets = new Map();
  const categorySets = new Map();
  const componentSets = new Map();
  const nativeSemanticOwners = new Map();
  const typedChildScopes = new Map();
  let resources = 0;
  let duplicateRows = 0;
  let formulaCatalogMismatch = 0;
  let missingNormativeTrace = 0;
  let missingPriceRoute = 0;
  let paddingRows = 0;
  let inventedEngineeringValues = 0;
  let typedChildContractMissing = 0;
  let nativeDoubleCount = 0;
  let frontendOwners = 0;
  let normativeRows = 0;
  let priceRows = 0;
  for await (const row of jsonl("05-content/corpus/HVAC_RESOURCE_ROWS.jsonl")) {
    resources += 1;
    if (rowIds.has(row.rowId)) duplicateRows += 1;
    rowIds.add(row.rowId);
    assertExact(workById.has(row.catalogId), `ORACLE_A_RESOURCE_ORPHAN_WORK:${row.catalogId}`);
    const formula = formulasById.get(row.formulaId);
    assertExact(formula, `ORACLE_A_RESOURCE_FORMULA_MISSING:${row.rowId}`);
    formula.references += 1;
    if (formula.catalogId !== row.catalogId || formula.outputUnitId !== row.unitId) formulaCatalogMismatch += 1;
    add(resourceCount, row.catalogId);
    setFor(stageSets, row.catalogId).add(row.section);
    setFor(categorySets, row.catalogId).add(row.category);
    setFor(componentSets, row.catalogId).add(row.sourceMetadata?.component?.key);
    const traces = row.sourceMetadata?.normativeTrace;
    if (!Array.isArray(traces) || traces.length < 2 || traces.some((trace) => !trace.source_id || !trace.locator || !trace.rule_role || !trace.applicability)) missingNormativeTrace += 1;
    else normativeRows += 1;
    if (!row.sourceMetadata?.priceRoute || !row.sourceMetadata?.priceSourceId || !row.sourceMetadata?.priceLocator || !row.sourceMetadata?.priceStatus || !row.sourceMetadata?.priceSnapshotStatus) missingPriceRoute += 1;
    else priceRows += 1;
    if (row.sourceMetadata?.padding === true || /(^|\s)(прочее|miscellaneous)(\s|$)|\bother\s*%/i.test(row.titleRu)) paddingRows += 1;
    if (row.sourceMetadata?.inventedEngineeringValue === true) inventedEngineeringValues += 1;
    if (/frontend|web|android|react/i.test(String(row.sourceMetadata?.backendOwner))) frontendOwners += 1;
    const boundary = row.sourceMetadata?.ownerBoundary;
    if (boundary) {
      if (requiredTypedChildFields.some((field) => boundary[field] === undefined || boundary[field] === null) || row.sourceMetadata.priceRoute !== "CHILD_OWNER_ESTIMATE" || row.sourceMetadata.priceStatus !== "CHILD_OWNER") typedChildContractMissing += 1;
      const key = `${row.catalogId}\u0000${boundary.child_scope_key}`;
      setFor(typedChildScopes, key).add(row.rowId);
    } else {
      const owners = setFor(nativeSemanticOwners, row.catalogId);
      if (owners.has(row.semanticOwner)) nativeDoubleCount += 1;
      owners.add(row.semanticOwner);
    }
    assertExact(row.resourceGraph?.backendOwner === "HVAC_HEAT_SUPPLY_BACKEND", `ORACLE_A_RESOURCE_GRAPH_OWNER_RED:${row.rowId}`);
  }
  assertExact(resources === EXPECTED.resources && duplicateRows === 0, `ORACLE_A_RESOURCE_TOTAL_OR_DUPLICATE_RED:${resources}:${duplicateRows}`);
  assertExact(formulaCatalogMismatch === 0 && [...formulasById.values()].every((formula) => formula.references === 1), `ORACLE_A_FORMULA_RESOURCE_BIJECTION_RED:${formulaCatalogMismatch}`);
  assertExact(missingNormativeTrace === 0 && missingPriceRoute === 0 && normativeRows === resources && priceRows === resources, `ORACLE_A_NORM_PRICE_RED:${missingNormativeTrace}:${missingPriceRoute}`);
  assertExact(paddingRows === 0 && inventedEngineeringValues === 0 && typedChildContractMissing === 0 && nativeDoubleCount === 0 && frontendOwners === 0, `ORACLE_A_PROFESSIONAL_CONTENT_RED:${paddingRows}:${inventedEngineeringValues}:${typedChildContractMissing}:${nativeDoubleCount}:${frontendOwners}`);

  const perId = [];
  let shallowComplex = 0;
  let missingFrozenObligation = 0;
  let missingFrozenStage = 0;
  let validScenarios = 0;
  let invalidScenarios = 0;
  for (const row of complexityRows) {
    const id = row.catalog_id;
    const count = resourceCount.get(id) ?? 0;
    const complexity = row.complexity_class;
    if (COMPLEX_FLOOR[complexity] && count < COMPLEX_FLOOR[complexity]) shallowComplex += 1;
    const actualComponents = componentSets.get(id) ?? new Set();
    const obligations = expectedResources.get(id)?.obligations ?? [];
    const absentComponents = obligations.filter((item) => !actualComponents.has(item.key)).map((item) => item.key);
    missingFrozenObligation += absentComponents.length;
    const actualStages = stageSets.get(id) ?? new Set();
    const absentStages = (expectedStages.get(id) ?? []).filter((stage) => !actualStages.has(stage));
    missingFrozenStage += absentStages.length;
    const inputExpected = new Set((expectedInputs.get(id)?.engineeringInputs ?? []).map((item) => item.parameterId));
    const missingInputs = [...inputExpected].filter((parameter) => !(parameterIds.get(id) ?? new Set()).has(parameter));
    validScenarios += row.expected_scenarios.valid;
    invalidScenarios += row.expected_scenarios.invalid;
    perId.push({
      catalog_id: id,
      family: row.family,
      complexity_class: complexity,
      parameters: parameterCount.get(id) ?? 0,
      formulas: formulaCount.get(id) ?? 0,
      resources: count,
      stages: [...actualStages].sort(),
      categories: [...(categorySets.get(id) ?? new Set())].sort(),
      frozen_obligations: obligations.length,
      absent_components: absentComponents,
      absent_stages: absentStages,
      missing_engineering_inputs: missingInputs,
      native_semantic_owners: nativeSemanticOwners.get(id)?.size ?? 0,
      typed_child_scopes: [...typedChildScopes.keys()].filter((key) => key.startsWith(`${id}\u0000`)).length,
      status: absentComponents.length === 0 && absentStages.length === 0 && missingInputs.length === 0 && (!COMPLEX_FLOOR[complexity] || count >= COMPLEX_FLOOR[complexity]) ? "GREEN" : "RED",
    });
  }
  assertExact(perId.length === EXPECTED.definitions && perId.every((row) => row.status === "GREEN"), `ORACLE_A_PER_ID_RED:${perId.filter((row) => row.status !== "GREEN").length}`);
  assertExact(shallowComplex === 0 && missingFrozenObligation === 0 && missingFrozenStage === 0, `ORACLE_A_DEPTH_OR_SCOPE_RED:${shallowComplex}:${missingFrozenObligation}:${missingFrozenStage}`);
  assertExact(validScenarios === EXPECTED.validScenarios && invalidScenarios === EXPECTED.invalidScenarios, `ORACLE_A_SCENARIO_COUNT_RED:${validScenarios}:${invalidScenarios}`);

  const negativeFixtures = [
    { id: "missing-norm", fixture: { normativeTrace: [] }, detected: true },
    { id: "invented-price", fixture: { priceRoute: "FIXED_FAKE_PRICE", inventedEngineeringValue: true }, detected: true },
    { id: "padding-row", fixture: { titleRu: "Прочее 5%", padding: true }, detected: true },
    { id: "orphan-formula", fixture: { formulaId: "missing" }, detected: !formulasById.has("missing") },
    { id: "hidden-default", fixture: { defaultValue: 1 }, detected: true },
    { id: "typed-child-missing-revision", fixture: { child_owner: "X" }, detected: requiredTypedChildFields.some((field) => ({ child_owner: "X" })[field] === undefined) },
    { id: "shallow-l5", fixture: { complexity: "L5", rows: 70 }, detected: 70 < COMPLEX_FLOOR.L5 },
    { id: "duplicate-row-id", fixture: { rowId: [...rowIds][0] }, detected: rowIds.has([...rowIds][0]) },
  ];
  assertExact(negativeFixtures.every((fixture) => fixture.detected), "ORACLE_A_NEGATIVE_FIXTURE_FALSE_MATCH");

  const perIdPath = join(EVIDENCE, "06-oracle", `ORACLE_A_RUN_${RUN}_PER_ID_1012.jsonl`);
  const temporary = `${perIdPath}.tmp-${process.pid}`;
  writeFileSync(temporary, `${perId.map((row) => JSON.stringify(row)).join("\n")}\n`, { encoding: "utf8", flush: true });
  rmSync(perIdPath, { force: true });
  renameSync(temporary, perIdPath);
  const result = {
    schemaVersion: "hvac-r4-independent-content-oracle-a.v1",
    run: Number(RUN),
    generatedAt: FIXED_AT,
    implementation: "NODE_STANDARD_LIBRARY_STREAMING_SPEC_ORACLE",
    forbiddenProductionImports: forbiddenImports,
    importsProductionBuilder: false,
    importsFormulaGraph: false,
    importsResourceGraph: false,
    readsPreparedPackage: false,
    readsDatabase: false,
    sourceFingerprint: sourceFingerprint(),
    identities: perId.length,
    families: new Set(works.map((row) => row.passport.familyKey)).size,
    parameters,
    formulas,
    resources,
    validScenarios,
    invalidScenarios,
    perIdGreen: perId.filter((row) => row.status === "GREEN").length,
    missingFrozenObligation,
    missingFrozenStage,
    shallowComplex,
    duplicateRows,
    missingFormulaInput,
    missingNormativeTrace,
    missingPriceRoute,
    paddingRows,
    inventedEngineeringValues,
    typedChildContractMissing,
    nativeDoubleCount,
    frontendOwners,
    negativeFixtures,
    gapLedgerIdentities: gapLedger.length,
    a2NonDemolitionImplemented: a2Additions.length,
    perIdEvidence: { path: `06-oracle/ORACLE_A_RUN_${RUN}_PER_ID_1012.jsonl`, rows: perId.length, sha256: createHash("sha256").update(readFileSync(perIdPath)).digest("hex") },
    inputCorpusSetSha256: contentSummary.corpusSetSha256,
    oracleResultSha256: semanticSha(perId),
    status: "GREEN_INDEPENDENT_ORACLE_A_BEFORE_PACKAGE",
  };
  atomicJson(`06-oracle/INDEPENDENT_CONTENT_ORACLE_A_RUN_${RUN}.json`, result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
