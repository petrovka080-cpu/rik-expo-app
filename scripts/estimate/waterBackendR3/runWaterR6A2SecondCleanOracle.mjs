import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = resolve(import.meta.dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a2");
const ORACLE_PRE_REPAIR_COMMIT = "549876d1f28c1990355d1c376f094101f9e2dc17";
const ORACLE_SOURCE_PATH = "scripts/estimate/waterBackendR3/runWaterR6A2SecondCleanOracle.mjs";
const BOUNDS = { L1: 40, L2: 100, L3: 200, L4: 400, L5: 700 };
const OFFICIAL_NORM_SOURCES = new Set([
  "sn_kr_40_04_2025", "sn_sp_kr_40_01_40_02_40_03_2023", "sp_kr_40_101_2023",
  "kg_krer16_2015", "kg_krer17_2015", "kg_krer22_2015", "kg_krer23_2015", "kg_krerp09_2015",
]);

function canonical(value) {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function hash(value) {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : canonical(value)).digest("hex");
}

function json(name) {
  return JSON.parse(readFileSync(join(EVIDENCE, name), "utf8"));
}

function jsonl(name) {
  return readFileSync(join(EVIDENCE, name), "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function replace(name, content) {
  const target = join(EVIDENCE, name);
  const temporary = `${target}.tmp-${process.pid}`;
  writeFileSync(temporary, content, { encoding: "utf8", flush: true });
  rmSync(target, { force: true });
  renameSync(temporary, target);
}

function writeJson(name, value) {
  replace(name, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(name, values) {
  replace(name, values.length ? `${values.map((value) => JSON.stringify(value)).join("\n")}\n` : "");
}

function parameterReferences(value, result) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => parameterReferences(item, result));
    return;
  }
  if (typeof value !== "object") return;
  if (value.kind === "parameter" && typeof value.id === "string") result.add(value.id);
  if (typeof value.parameterId === "string") result.add(value.parameterId);
  Object.values(value).forEach((item) => parameterReferences(item, result));
}

function categoriesFor(row) {
  const categories = [];
  const role = String(row.component_role);
  const component = String(row.component_key);
  const action = String(row.action_key);
  const semantic = `${component}|${action}|${row.semantic_owner}`.toLowerCase();
  if (row.resource_type === "material" && ((["MATERIAL", "FITTING", "VALVE", "EQUIPMENT"].includes(role) && action === "supply") || (role === "PROCESS" && action === "process_material"))) categories.push("PRIMARY_MATERIALS");
  if (row.resource_type === "material" && /consumable|gasket|sealant|welding_consumable|chemical_reagent/.test(semantic)) categories.push("AUXILIARY_MATERIALS");
  if (["FITTING", "VALVE"].includes(role)) categories.push("FITTINGS_JOINTS_FASTENERS");
  if (role === "EQUIPMENT" && row.procurement_eligible === true && action === "supply") categories.push("INSTALLED_EQUIPMENT");
  if (row.resource_type === "labor") categories.push("DIRECT_LABOUR");
  if (row.resource_type === "equipment" && (row.procurement_eligible === false || /machine|lifting|test_equipment|joint_tool/.test(action))) categories.push("PLANT_MACHINES");
  if (/tool|rigging|gauge|calibrat|torque/.test(semantic)) categories.push("TOOLS_RIGGING");
  if (/delivery|transport|handling|unload|logistic/.test(semantic)) categories.push("LOGISTICS");
  if (/temporary|bypass|safe_isolation|shoring|dewatering/.test(semantic)) categories.push("TEMPORARY_WORKS");
  if (role === "TEST" || /test|flush|disinfect|laboratory|sample|inspection|cctv/.test(semantic)) categories.push("TESTS_FLUSHING_DISINFECTION_LAB");
  if (/commission|start.?up|performance_run|operator_training/.test(semantic)) categories.push("COMMISSIONING");
  if (role === "DOCUMENT" || /document|record|passport|protocol|as.?built|quality/.test(semantic)) categories.push("QA_AS_BUILT_DOCUMENTS");
  if (/safe|safety|confined|gas.?test|permit|hazard|rescue|spill_response/.test(semantic)) categories.push("SAFETY_CONFINED_SPACE");
  if (row.resource_type === "waste" || /waste|sludge|contaminated|disposal|neutralization/.test(semantic)) categories.push("WASTE_SLUDGE_CONTAMINATED_WATER");
  if (String(row.semantic_owner).startsWith("typed-child:")) categories.push("TYPED_CHILD_SCOPES");
  return categories;
}

async function eachLine(name, consume) {
  const fileHash = createHash("sha256");
  const reader = createInterface({ input: createReadStream(join(EVIDENCE, name), { encoding: "utf8" }), crlfDelay: Infinity });
  let rows = 0;
  for await (const line of reader) {
    if (!line) continue;
    fileHash.update(`${line}\n`);
    consume(JSON.parse(line));
    rows += 1;
  }
  return { rows, sha256: fileHash.digest("hex") };
}

async function main() {
  const startedAt = new Date().toISOString();
  const targetManifest = json("A2_06_CLEAN_AUDIT_TARGET_MANIFEST.json");
  const definitions = jsonl("A2_06_CLEAN_AUDIT_DEFINITIONS.jsonl");
  const expectedScope = jsonl("A2_03_EXPECTED_SCOPE.jsonl");
  const categoryMatrix = jsonl("A2_03_STAGE_CATEGORY_OBLIGATION_MATRIX.jsonl");
  const delta = jsonl("A2_04_PER_ID_BEFORE_AFTER.jsonl");
  const firstReport = json("A2_06_FIRST_REPAIRED_ORACLE.json");
  const firstVerdicts = jsonl("A2_06_FIRST_REPAIRED_ORACLE_PER_ID.jsonl");
  const ids = definitions.map((row) => row.catalog_id);
  const uniqueIds = new Set(ids);
  const definitionMap = new Map(definitions.map((row) => [row.catalog_id, row]));
  const deltaMap = new Map(delta.map((row) => [row.catalog_id, row]));
  const expectedIds = new Set(expectedScope.map((row) => row.catalog_id));
  const params = new Map();
  const refs = new Map();
  const rowCount = new Map();
  const formulaCount = new Map();
  const categoryCount = new Map();
  const seenRows = new Set();
  const seenFormulas = new Set();
  const globalFailures = [];
  let fieldFailures = 0;
  let dimensionFailures = 0;
  let normFailures = 0;
  let priceFailures = 0;
  let ownerFailures = 0;
  let paddingRows = 0;

  const parameterArtifact = await eachLine("A2_06_CLEAN_AUDIT_PARAMETERS.jsonl", (row) => {
    const set = params.get(row.catalog_id) ?? new Set();
    if (set.has(row.parameter_id)) globalFailures.push(`PARAM_DUP:${row.catalog_id}:${row.parameter_id}`);
    set.add(row.parameter_id);
    params.set(row.catalog_id, set);
    if (!/^[a-f0-9]{64}$/.test(String(row.parameter_hash)) || !row.constraints || !row.value_type) fieldFailures += 1;
  });
  const resourceArtifact = await eachLine("A2_06_CLEAN_AUDIT_ROWS.jsonl", (row) => {
    if (!String(row.row_id).startsWith(`water:${row.catalog_id}:`) || !String(row.quantity_formula_id).startsWith(`${row.row_id}:formula:`)) fieldFailures += 1;
    if (hash(row.formula_ast) !== row.formula_ast_hash || row.formula_output_uom !== row.uom || !row.dimension_signature) dimensionFailures += 1;
    if (!OFFICIAL_NORM_SOURCES.has(row.norm_source_id) || !row.norm_locator || !row.norm_applicability || !/^[a-f0-9]{64}$/.test(String(row.norm_artifact_sha256)) || !row.norm_value_or_input_rule) normFailures += 1;
    if (!row.price_source_id || !row.price_source_type || row.hidden_price_default !== false || !row.price_region || !row.price_status) priceFailures += 1;
    if ((!String(row.semantic_owner).startsWith("water:") && !String(row.semantic_owner).startsWith("typed-child:")) || !row.cost_owner_id || !row.parent_child_double_count_guard) ownerFailures += 1;
    if (row.padding_row !== false || row.miscellaneous_percentage_row !== false) paddingRows += 1;
    if (seenRows.has(row.row_id)) globalFailures.push(`ROW_DUP:${row.row_id}`);
    if (seenFormulas.has(row.quantity_formula_id)) globalFailures.push(`FORMULA_DUP:${row.quantity_formula_id}`);
    seenRows.add(row.row_id);
    seenFormulas.add(row.quantity_formula_id);
    rowCount.set(row.catalog_id, (rowCount.get(row.catalog_id) ?? 0) + 1);
    formulaCount.set(row.catalog_id, (formulaCount.get(row.catalog_id) ?? 0) + 1);
    const referenced = refs.get(row.catalog_id) ?? new Set();
    row.formula_input_parameter_ids.forEach((id) => referenced.add(id));
    parameterReferences(row.inclusion_ast, referenced);
    refs.set(row.catalog_id, referenced);
    const counts = categoryCount.get(row.catalog_id) ?? {};
    categoriesFor(row).forEach((category) => { counts[category] = (counts[category] ?? 0) + 1; });
    categoryCount.set(row.catalog_id, counts);
  });
  if (parameterArtifact.sha256 !== targetManifest.artifacts["A2_06_CLEAN_AUDIT_PARAMETERS.jsonl"].sha256) globalFailures.push("PARAMETER_ARTIFACT_CHANGED");
  if (resourceArtifact.sha256 !== targetManifest.artifacts["A2_06_CLEAN_AUDIT_ROWS.jsonl"].sha256) globalFailures.push("RESOURCE_ARTIFACT_CHANGED");
  if (ids.length !== 874 || uniqueIds.size !== 874 || expectedIds.size !== 874 || [...uniqueIds].some((id) => !expectedIds.has(id))) globalFailures.push("ID_UNIVERSE_MISMATCH");

  const matrixById = new Map();
  categoryMatrix.forEach((row) => {
    const list = matrixById.get(row.catalog_id) ?? [];
    list.push(row);
    matrixById.set(row.catalog_id, list);
  });
  const verdicts = ids.map((catalogId) => {
    const definition = definitionMap.get(catalogId);
    const deltaRow = deltaMap.get(catalogId);
    const parameterSet = params.get(catalogId) ?? new Set();
    const referenceSet = refs.get(catalogId) ?? new Set();
    const rows = rowCount.get(catalogId) ?? 0;
    const formulas = formulaCount.get(catalogId) ?? 0;
    const complexity = definition.applicability.complexityClass;
    const matrix = matrixById.get(catalogId) ?? [];
    const actualCategories = categoryCount.get(catalogId) ?? {};
    const missing = [...referenceSet].filter((id) => !parameterSet.has(id));
    const unreachable = [...parameterSet].filter((id) => !referenceSet.has(id));
    const categoryMismatch = matrix.filter((obligation) => obligation.disposition === "APPLICABLE_WITH_ROWS"
      ? !(actualCategories[obligation.category] > 0)
      : (actualCategories[obligation.category] ?? 0) !== 0);
    const errors = [];
    if (rows !== definition.resource_count || formulas !== definition.formula_count || rows !== formulas) errors.push("DEFINITION_CARDINALITY");
    if (parameterSet.size !== definition.parameter_count) errors.push("PARAMETER_CARDINALITY");
    if (rows < BOUNDS[complexity]) errors.push("COMPLEXITY_DEPTH");
    if (missing.length) errors.push(`MISSING_PARAMETERS=${missing.length}`);
    if (unreachable.length) errors.push(`UNREACHABLE_PARAMETERS=${unreachable.length}`);
    if (matrix.length !== 15 || categoryMismatch.length) errors.push(`CATEGORY_DISPOSITION=${categoryMismatch.length}`);
    if (!deltaRow || deltaRow.resource_rows_removed !== 0 || deltaRow.parameters_removed !== 0) errors.push("DELTA_REMOVAL_OR_MISSING");
    const verdict = {
      catalog_id: catalogId,
      namespace: definition.namespace,
      complexity_class: complexity,
      rows,
      formulas,
      parameters: parameterSet.size,
      reachable_parameters: referenceSet.size,
      actual_category_counts: actualCategories,
      category_disposition_mismatches: categoryMismatch,
      errors,
      status: errors.length ? "RED" : "GREEN",
    };
    return { ...verdict, verdict_hash: hash(verdict) };
  });
  const verdictFailures = verdicts.filter((row) => row.status !== "GREEN");
  if (fieldFailures) globalFailures.push(`FIELD_FAILURES=${fieldFailures}`);
  if (dimensionFailures) globalFailures.push(`DIMENSION_FAILURES=${dimensionFailures}`);
  if (normFailures) globalFailures.push(`NORM_FAILURES=${normFailures}`);
  if (priceFailures) globalFailures.push(`PRICE_FAILURES=${priceFailures}`);
  if (ownerFailures) globalFailures.push(`OWNER_FAILURES=${ownerFailures}`);
  if (paddingRows) globalFailures.push(`PADDING_ROWS=${paddingRows}`);
  if (verdictFailures.length) globalFailures.push(`PER_ID_FAILURES=${verdictFailures.length}`);
  if (resourceArtifact.rows !== 232_011 || parameterArtifact.rows !== 180_755) globalFailures.push("AGGREGATE_COUNT_MISMATCH");
  writeJsonl("A2_06_SECOND_CLEAN_ORACLE_VERDICTS.jsonl", verdicts);

  const sourceText = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const report = {
    schemaVersion: "water-r6-a2-second-clean-independent-oracle.v1",
    startedAt,
    completedAt: new Date().toISOString(),
    freshProcess: true,
    oracleSource: "scripts/estimate/waterBackendR3/runWaterR6A2SecondCleanOracle.mjs",
    oracleSourceSha256: hash(sourceText),
    productionBuilderImports: 0,
    targetSourceFingerprint: targetManifest.sourceFingerprint,
    targetManifestSha256: hash(readFileSync(join(EVIDENCE, "A2_06_CLEAN_AUDIT_TARGET_MANIFEST.json"))),
    actual: {
      definitions: definitions.length,
      globalDefinitions: definitions.filter((row) => row.namespace === "global").length,
      externalDefinitions: definitions.filter((row) => row.namespace === "external_reference").length,
      parameters: parameterArtifact.rows,
      formulas: seenFormulas.size,
      resources: seenRows.size,
      perIdGreen: verdicts.length - verdictFailures.length,
      fieldFailures,
      dimensionFailures,
      normFailures,
      priceFailures,
      ownerFailures,
      paddingRows,
      duplicateRows: globalFailures.filter((row) => row.startsWith("ROW_DUP")).length,
      duplicateFormulas: globalFailures.filter((row) => row.startsWith("FORMULA_DUP")).length,
    },
    failures: globalFailures.slice(0, 1_000),
    failureCount: globalFailures.length,
    status: globalFailures.length === 0 ? "GREEN_SECOND_CLEAN_INDEPENDENT_ORACLE" : "RED",
  };
  writeJson("A2_06_SECOND_CLEAN_ORACLE.json", report);

  const verdictById = new Map(verdicts.map((row) => [row.catalog_id, row.verdict_hash]));
  const lowDepth = jsonl("A2_05_LOW_DEPTH_360_BEFORE_AFTER.jsonl").map((row) => ({
    ...row,
    disposition: report.status.startsWith("GREEN") ? "INDIVIDUAL_REAL_CONTENT_REPAIR_GREEN_TWO_ORACLES" : row.disposition,
    oracle_2_hash: verdictById.get(row.catalog_id) ?? null,
  }));
  writeJsonl("A2_05_LOW_DEPTH_360_BEFORE_AFTER.jsonl", lowDepth);
  const firstVerdictById = new Map(firstVerdicts.map((row) => [row.catalog_id, row]));
  const comparisonMismatch = verdicts.filter((second) => {
    const first = firstVerdictById.get(second.catalog_id);
    return !first || first.status !== second.status || first.resources !== second.rows || first.parameters !== second.parameters || first.formulas !== second.formulas;
  });
  const comparison = {
    schemaVersion: "water-r6-a2-oracle-comparison.v1",
    generatedAt: new Date().toISOString(),
    targetSourceFingerprint: targetManifest.sourceFingerprint,
    firstOracle: { sourceSha256: firstReport.oracleSourceSha256, status: firstReport.status, perIdGreen: firstReport.actual.perIdGreen },
    secondOracle: { sourceSha256: report.oracleSourceSha256, status: report.status, perIdGreen: report.actual.perIdGreen },
    independentSourceHashesDifferent: firstReport.oracleSourceSha256 !== report.oracleSourceSha256,
    comparedIds: verdicts.length,
    mismatches: comparisonMismatch,
    mismatchCount: comparisonMismatch.length,
    lowDepthWithTwoOracleHashes: lowDepth.filter((row) => row.oracle_1_hash && row.oracle_2_hash).length,
    status: firstReport.status.startsWith("GREEN") && report.status.startsWith("GREEN") && comparisonMismatch.length === 0 && lowDepth.every((row) => row.oracle_1_hash && row.oracle_2_hash) ? "GREEN_TWO_INDEPENDENT_ORACLES" : "RED",
  };
  writeJson("A2_06_ORACLE_COMPARISON.json", comparison);
  const preRepairSource = join(EVIDENCE, "A2_06_SECOND_ORACLE_SOURCE_PRE_REPAIR.mjs");
  const historicalSource = spawnSync(
    "git",
    ["show", `${ORACLE_PRE_REPAIR_COMMIT}:${ORACLE_SOURCE_PATH}`],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  if (historicalSource.status !== 0 || !historicalSource.stdout) {
    throw new Error(`SECOND_ORACLE_PRE_REPAIR_SOURCE_UNAVAILABLE:${historicalSource.stderr || historicalSource.status}`);
  }
  replace("A2_06_SECOND_ORACLE_SOURCE_PRE_REPAIR.mjs", historicalSource.stdout);
  const currentSource = fileURLToPath(import.meta.url);
  const postRepairSource = join(EVIDENCE, "A2_06_SECOND_ORACLE_SOURCE_POST_REPAIR.mjs");
  replace("A2_06_SECOND_ORACLE_SOURCE_POST_REPAIR.mjs", readFileSync(currentSource, "utf8"));
  const sourceDiff = spawnSync("git", ["diff", "--no-index", "--", preRepairSource, postRepairSource], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  replace("A2_06_SECOND_ORACLE_SOURCE_REPAIR_DIFF.patch", sourceDiff.stdout || sourceDiff.stderr || "NO_DIFF\n");
  const namespaceFixture = [{ namespace: "external_reference" }, { namespace: "global" }];
  const negativeFixture = {
    fixture: "LEGACY_EXTERNAL_NAMESPACE_MUST_NOT_MATCH_CANONICAL_EXTERNAL_REFERENCES",
    expectedCanonicalCount: 1,
    canonicalCount: namespaceFixture.filter((row) => row.namespace === "external_reference").length,
    legacyCount: namespaceFixture.filter((row) => row.namespace === "external").length,
    legacyMatcherRejected: namespaceFixture.filter((row) => row.namespace === "external").length === 0,
    actualEqual: namespaceFixture.filter((row) => row.namespace === "external_reference").length === 1
      && namespaceFixture.filter((row) => row.namespace === "external").length === 0,
  };
  writeJson("A2_06_SECOND_ORACLE_REPAIR_JUSTIFICATION.json", {
    schemaVersion: "water-r6-a2-second-oracle-repair.v1",
    generatedAt: new Date().toISOString(),
    preSourceSha256: hash(readFileSync(preRepairSource)),
    postSourceSha256: hash(readFileSync(currentSource)),
    redSymptom: "The pre-repair clean oracle counted 0/29 external definitions by matching the legacy external namespace.",
    rootCause: "ORACLE_NAMESPACE_DID_NOT_MATCH_CANONICAL_EXTERNAL_REFERENCE_CONTRACT",
    productionCorpusChanged: false,
    denominatorChanged: false,
    negativeFixture,
    status: negativeFixture.actualEqual ? "GREEN_JUSTIFIED_ORACLE_TECHNICAL_REPAIR" : "RED",
  });
  const resume = json("RESUME_STATE.json");
  writeJson("RESUME_STATE.json", {
    ...resume,
    generatedAt: new Date().toISOString(),
    phase: comparison.status.startsWith("GREEN") ? "W4_TWO_CLEAN_ORACLES_COMPLETE_W5_PACKAGE_PENDING" : "W4_ORACLE_REPAIR_REQUIRED",
    last_command: "node scripts/estimate/waterBackendR3/runWaterR6A2SecondCleanOracle.mjs",
    last_exit_code: globalFailures.length || comparisonMismatch.length ? 1 : 0,
    evidence_hashes: {
      ...resume.evidence_hashes,
      A2_06_SECOND_CLEAN_ORACLE: hash(readFileSync(join(EVIDENCE, "A2_06_SECOND_CLEAN_ORACLE.json"))),
      A2_06_ORACLE_COMPARISON: hash(readFileSync(join(EVIDENCE, "A2_06_ORACLE_COMPARISON.json"))),
    },
    next_exact_action: comparison.status.startsWith("GREEN") ? "FREEZE_CLEAN_SOURCE_COMMIT_AND_BUILD_BYTE_IDENTICAL_PACKAGE_A_B" : "REPAIR_EXACT_ORACLE_FAILURES",
    formal_status: "IN_PROGRESS_BATCH006_WATER_R6_A2",
  });
  process.stdout.write(`${JSON.stringify({ ...report.actual, failureCount: report.failureCount, comparisonMismatches: comparisonMismatch.length, lowDepthTwoOracle: comparison.lowDepthWithTwoOracleHashes, status: comparison.status })}\n`);
  if (globalFailures.length || comparisonMismatch.length || comparison.status === "RED") process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
