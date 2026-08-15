import { createHash } from "node:crypto";
import { createReadStream, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = resolve(import.meta.dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a2");
const LOWER_BOUND = Object.freeze({ L1: 40, L2: 100, L3: 200, L4: 400, L5: 700 });
const REQUIRED_ATOMIC_FIELDS = Object.freeze([
  "catalog_id", "row_id", "resource_type", "resource_code", "resource_name_ru", "uom",
  "quantity_formula_id", "formula_ast_hash", "dimension_signature", "applicability_condition_id",
  "stage_id", "semantic_owner", "norm_source_id", "norm_locator", "norm_value_or_input_rule",
  "waste_rule", "price_source_type", "price_region", "price_date", "price_status",
  "procurement_category", "supplier_specification", "revision_policy", "row_hash",
]);

function sha256(value) {
  const input = typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value);
  return createHash("sha256").update(input).digest("hex");
}

function readJson(name) {
  return JSON.parse(readFileSync(join(EVIDENCE, name), "utf8"));
}

function readJsonl(name) {
  return readFileSync(join(EVIDENCE, name), "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function atomicJson(name, value) {
  const target = join(EVIDENCE, name);
  const temporary = `${target}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flush: true });
  rmSync(target, { force: true });
  renameSync(temporary, target);
}

function atomicJsonl(name, values) {
  const target = join(EVIDENCE, name);
  const temporary = `${target}.tmp-${process.pid}`;
  writeFileSync(temporary, values.length ? `${values.map((value) => JSON.stringify(value)).join("\n")}\n` : "", { encoding: "utf8", flush: true });
  rmSync(target, { force: true });
  renameSync(temporary, target);
}

function collectConditionRefs(value, refs) {
  if (Array.isArray(value)) {
    for (const item of value) collectConditionRefs(item, refs);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (value.kind === "parameter" && typeof value.id === "string") refs.add(value.id);
  if (typeof value.parameterId === "string") refs.add(value.parameterId);
  for (const child of Object.values(value)) collectConditionRefs(child, refs);
}

async function streamJsonl(name, onRow) {
  const hash = createHash("sha256");
  const input = createReadStream(join(EVIDENCE, name), { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  let count = 0;
  for await (const line of lines) {
    if (!line) continue;
    hash.update(`${line}\n`);
    onRow(JSON.parse(line), count);
    count += 1;
  }
  return { count, sha256: hash.digest("hex") };
}

async function main() {
  const startedAt = new Date().toISOString();
  const manifest = readJson("A2_06_CLEAN_AUDIT_TARGET_MANIFEST.json");
  const definitions = readJsonl("A2_06_CLEAN_AUDIT_DEFINITIONS.jsonl");
  const expected = readJsonl("A2_03_EXPECTED_SCOPE.jsonl");
  const matrix = readJsonl("A2_03_STAGE_CATEGORY_OBLIGATION_MATRIX.jsonl");
  const perId = readJsonl("A2_04_PER_ID_BEFORE_AFTER.jsonl");
  const lowDepth = readJsonl("A2_05_LOW_DEPTH_360_BEFORE_AFTER.jsonl");
  const antiTemplate = readJson("A2_05_ANTI_TEMPLATE_REPORT.json");
  const ownerOverlap = readJson("A2_01_OWNER_OVERLAP_REPORT.json");
  const definitionById = new Map(definitions.map((row) => [row.catalog_id, row]));
  const expectedById = new Map(expected.map((row) => [row.catalog_id, row]));
  const perIdById = new Map(perId.map((row) => [row.catalog_id, row]));
  const parameterIds = new Map();
  const referencedParameterIds = new Map();
  const resourceCounts = new Map();
  const formulaCounts = new Map();
  const rowIds = new Set();
  const formulaIds = new Set();
  const failures = [];

  const parameterArtifact = await streamJsonl("A2_06_CLEAN_AUDIT_PARAMETERS.jsonl", (row) => {
    const set = parameterIds.get(row.catalog_id) ?? new Set();
    if (set.has(row.parameter_id)) failures.push(`DUPLICATE_PARAMETER:${row.catalog_id}:${row.parameter_id}`);
    set.add(row.parameter_id);
    parameterIds.set(row.catalog_id, set);
    if (!row.value_type || row.required === undefined || !row.parameter_hash) failures.push(`INVALID_PARAMETER_SCHEMA:${row.catalog_id}:${row.parameter_id}`);
    if (typeof row.default_value === "number" && row.default_value !== 0) failures.push(`INVENTED_NUMERIC_DEFAULT:${row.catalog_id}:${row.parameter_id}`);
  });
  const rowArtifact = await streamJsonl("A2_06_CLEAN_AUDIT_ROWS.jsonl", (row) => {
    const missing = REQUIRED_ATOMIC_FIELDS.filter((field) => row[field] === null || row[field] === undefined || row[field] === "");
    if (missing.length) failures.push(`ATOMIC_FIELDS_MISSING:${row.catalog_id}:${row.row_id}:${missing.join(",")}`);
    if (row.formula_output_uom !== row.uom) failures.push(`DIMENSION_OUTPUT_MISMATCH:${row.catalog_id}:${row.row_id}`);
    if (!row.formula_ast || !Array.isArray(row.formula_input_parameter_ids)) failures.push(`FORMULA_INVALID:${row.catalog_id}:${row.row_id}`);
    if (!row.norm_applicability || !/^[a-f0-9]{64}$/.test(String(row.norm_artifact_sha256))) failures.push(`NORM_BINDING_INVALID:${row.catalog_id}:${row.row_id}`);
    if (!row.price_source_id || row.hidden_price_default !== false) failures.push(`PRICE_ROUTE_INVALID:${row.catalog_id}:${row.row_id}`);
    if (row.padding_row !== false || row.miscellaneous_percentage_row !== false) failures.push(`PADDING_ROW:${row.catalog_id}:${row.row_id}`);
    if (!String(row.semantic_owner).startsWith("water:") && !String(row.semantic_owner).startsWith("typed-child:")) failures.push(`OWNER_INVALID:${row.catalog_id}:${row.row_id}`);
    if (rowIds.has(row.row_id)) failures.push(`DUPLICATE_ROW_ID:${row.row_id}`);
    if (formulaIds.has(row.quantity_formula_id)) failures.push(`DUPLICATE_FORMULA_ID:${row.quantity_formula_id}`);
    rowIds.add(row.row_id);
    formulaIds.add(row.quantity_formula_id);
    resourceCounts.set(row.catalog_id, (resourceCounts.get(row.catalog_id) ?? 0) + 1);
    formulaCounts.set(row.catalog_id, (formulaCounts.get(row.catalog_id) ?? 0) + 1);
    const refs = referencedParameterIds.get(row.catalog_id) ?? new Set();
    for (const parameterId of row.formula_input_parameter_ids) refs.add(parameterId);
    collectConditionRefs(row.inclusion_ast, refs);
    referencedParameterIds.set(row.catalog_id, refs);
  });

  if (parameterArtifact.sha256 !== manifest.artifacts["A2_06_CLEAN_AUDIT_PARAMETERS.jsonl"].sha256) failures.push("PARAMETER_TARGET_HASH_MISMATCH");
  if (rowArtifact.sha256 !== manifest.artifacts["A2_06_CLEAN_AUDIT_ROWS.jsonl"].sha256) failures.push("ROW_TARGET_HASH_MISMATCH");
  const perIdVerdicts = definitions.map((definition) => {
    const catalogId = definition.catalog_id;
    const expectedScope = expectedById.get(catalogId);
    const delta = perIdById.get(catalogId);
    const complexity = definition.applicability.complexityClass;
    const rows = resourceCounts.get(catalogId) ?? 0;
    const parameters = parameterIds.get(catalogId) ?? new Set();
    const refs = referencedParameterIds.get(catalogId) ?? new Set();
    const unreachable = [...parameters].filter((parameterId) => !refs.has(parameterId));
    const missingRefs = [...refs].filter((parameterId) => !parameters.has(parameterId));
    const categoryRows = matrix.filter((row) => row.catalog_id === catalogId);
    const categoryFailures = categoryRows.filter((row) => {
      const actual = Number(delta?.categories_after?.[row.category] ?? 0);
      return row.disposition === "APPLICABLE_WITH_ROWS" ? actual <= 0 : actual !== 0;
    });
    const reasons = [];
    if (!expectedScope) reasons.push("EXPECTED_SCOPE_MISSING");
    if (!delta) reasons.push("PER_ID_DELTA_MISSING");
    if (rows !== definition.resource_count || rows !== definition.formula_count) reasons.push("ROW_FORMULA_CARDINALITY_MISMATCH");
    if (parameters.size !== definition.parameter_count) reasons.push("PARAMETER_CARDINALITY_MISMATCH");
    if (rows < LOWER_BOUND[complexity]) reasons.push("LOW_DEPTH");
    if (unreachable.length) reasons.push(`UNREACHABLE_PARAMETERS=${unreachable.length}`);
    if (missingRefs.length) reasons.push(`UNKNOWN_PARAMETER_REFS=${missingRefs.length}`);
    if (categoryRows.length !== 15 || categoryFailures.length) reasons.push(`CATEGORY_MATRIX_FAILURES=${categoryFailures.length}`);
    if (delta?.resource_rows_removed !== 0 || delta?.parameters_removed !== 0) reasons.push("UNJUSTIFIED_REMOVAL");
    const verdict = {
      catalog_id: catalogId,
      namespace: definition.namespace,
      complexity_class: complexity,
      diagnostic_lower_bound: LOWER_BOUND[complexity],
      parameters: parameters.size,
      parameter_references: refs.size,
      unreachable_parameters: unreachable,
      missing_parameter_references: missingRefs,
      resources: rows,
      formulas: formulaCounts.get(catalogId) ?? 0,
      category_obligations: categoryRows.length,
      category_failures: categoryFailures,
      reasons,
      status: reasons.length ? "RED" : "GREEN",
    };
    return { ...verdict, verdict_hash: sha256(verdict) };
  });
  failures.push(...perIdVerdicts.filter((row) => row.status !== "GREEN").map((row) => `PER_ID_RED:${row.catalog_id}:${row.reasons.join("|")}`));
  const lowFailures = lowDepth.filter((row) => row.rows_before >= LOWER_BOUND[row.complexity_before]
    || row.rows_after < LOWER_BOUND[row.complexity_after]
    || row.rows_added <= 0 || row.rows_removed !== 0
    || row.missing_obligations_after.length !== 0
    || row.resource_ids_added.length !== row.rows_added
    || row.formula_ids_added.length !== row.rows_added
    || row.norm_locators_added.length !== row.rows_added);
  if (lowDepth.length !== 360 || lowFailures.length) failures.push(`LOW_DEPTH_REPAIR_EVIDENCE_RED:${lowDepth.length}:${lowFailures.length}`);
  if (definitions.length !== 874 || expected.length !== 874 || perId.length !== 874) failures.push("DEFINITION_DENOMINATOR_RED");
  if (definitions.filter((row) => row.namespace === "global").length !== 845 || definitions.filter((row) => row.namespace === "external").length !== 29) failures.push("NAMESPACE_DENOMINATOR_RED");
  if (parameterArtifact.count !== 180_755 || rowArtifact.count !== 232_011) failures.push("TARGET_TOTALS_RED");
  if (antiTemplate.status !== "GREEN" || antiTemplate.paddingRows !== 0 || antiTemplate.exactDuplicateDefinitionSemanticSignatures !== 0) failures.push("ANTI_TEMPLATE_RED");
  if (ownerOverlap.status !== "GREEN" || ownerOverlap.ownerOverlap !== 0) failures.push("OWNER_OVERLAP_RED");
  atomicJsonl("A2_06_FIRST_REPAIRED_ORACLE_PER_ID.jsonl", perIdVerdicts);
  const sourceText = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const report = {
    schemaVersion: "water-r6-a2-first-repaired-independent-oracle.v1",
    startedAt,
    completedAt: new Date().toISOString(),
    oracleSource: "scripts/estimate/waterBackendR3/runWaterR6A2FirstRepairedOracle.mjs",
    oracleSourceSha256: sha256(sourceText),
    productionBuilderImports: 0,
    auditTargetManifestSha256: sha256(readFileSync(join(EVIDENCE, "A2_06_CLEAN_AUDIT_TARGET_MANIFEST.json"))),
    auditTargetSourceFingerprint: manifest.sourceFingerprint,
    actual: {
      definitions: definitions.length,
      globalDefinitions: definitions.filter((row) => row.namespace === "global").length,
      externalDefinitions: definitions.filter((row) => row.namespace === "external").length,
      parameters: parameterArtifact.count,
      formulas: formulaIds.size,
      resources: rowIds.size,
      perIdGreen: perIdVerdicts.filter((row) => row.status === "GREEN").length,
      lowDepthRepaired: lowDepth.length - lowFailures.length,
      invalidAtomicRows: failures.filter((row) => row.startsWith("ATOMIC_")).length,
      duplicateRows: failures.filter((row) => row.startsWith("DUPLICATE_ROW")).length,
      duplicateFormulas: failures.filter((row) => row.startsWith("DUPLICATE_FORMULA")).length,
      paddingRows: antiTemplate.paddingRows,
      ownerOverlap: ownerOverlap.ownerOverlap,
    },
    failures: failures.slice(0, 1_000),
    failureCount: failures.length,
    status: failures.length === 0 ? "GREEN_FIRST_REPAIRED_INDEPENDENT_ORACLE" : "RED",
    nextAction: failures.length === 0 ? "RUN_SECOND_CLEAN_ORACLE_IN_FRESH_PROCESS" : "REPAIR_EXACT_FAILURES_AND_INVALIDATE_AFFECTED_EVIDENCE",
  };
  atomicJson("A2_06_FIRST_REPAIRED_ORACLE.json", report);
  process.stdout.write(`${JSON.stringify({ ...report.actual, failureCount: report.failureCount, status: report.status })}\n`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
