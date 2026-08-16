import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

const root = process.cwd();
const evidence = join(root, ".release-runtime", "batch008-concrete-r5", "evidence");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function stable(value) {
  if (value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function semantic(value) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

async function scan(relative, consume) {
  const path = join(evidence, relative);
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  stream.on("data", (chunk) => hash.update(chunk));
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  let rows = 0;
  for await (const line of reader) {
    if (!line) continue;
    rows += 1;
    consume(JSON.parse(line), rows);
  }
  return { path: relative, rows, bytes: stream.bytesRead, sha256: hash.digest("hex") };
}

function astIdentifiers(node, result = new Set()) {
  invariant(node && typeof node === "object" && typeof node.kind === "string", "ORACLE_B_AST_NODE_INVALID");
  if (node.kind === "parameter") {
    invariant(typeof node.id === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/u.test(node.id), "ORACLE_B_AST_IDENTIFIER_INVALID");
    result.add(node.id);
  } else if (node.kind === "literal") {
    invariant(typeof node.value === "string" && /^\d+(?:\.\d+)?$/u.test(node.value), "ORACLE_B_AST_NUMBER_INVALID");
  } else if (node.kind === "unary") {
    invariant(["+", "-"].includes(node.operator), "ORACLE_B_AST_UNARY_INVALID");
    astIdentifiers(node.operand, result);
  } else if (node.kind === "binary") {
    invariant(["+", "-", "*", "/"].includes(node.operator), "ORACLE_B_AST_OPERATOR_INVALID");
    astIdentifiers(node.left, result);
    astIdentifiers(node.right, result);
  } else if (node.kind === "call") {
    invariant(["ceil", "min", "max"].includes(node.function) && Array.isArray(node.arguments), "ORACLE_B_AST_CALL_INVALID");
    node.arguments.forEach((item) => astIdentifiers(item, result));
  } else {
    throw new Error(`ORACLE_B_AST_KIND_INVALID:${node.kind}`);
  }
  return result;
}

const manifest = JSON.parse(readFileSync(join(evidence, "05-content", "CORPUS_MANIFEST.json"), "utf8"));
const expected = new Map(manifest.files.map((row) => [row.path, row]));
const work = new Map();
const parameter = new Map();
const formula = new Map();
const resourceCounts = new Map();
const scenarioCounts = new Map();
const failures = [];
const passportHashes = new Set();
const boqSignatures = new Set();
const branchSignatures = new Set();

const works = await scan("05-content/corpus/CONCRETE_WORK_DEFINITIONS.jsonl", (row) => {
  if (work.has(row.catalogId)) failures.push(`duplicate_work:${row.catalogId}`);
  work.set(row.catalogId, row);
  if (passportHashes.has(row.passport.immutablePassportSha256)) failures.push(`passport_collision:${row.catalogId}`);
  passportHashes.add(row.passport.immutablePassportSha256);
  if (row.namespace === "global" && row.denominatorEligible !== true) failures.push(`global_denominator:${row.catalogId}`);
  if (row.namespace === "external_reference" && row.denominatorEligible !== false) failures.push(`external_denominator:${row.catalogId}`);
});

const parameters = await scan("05-content/corpus/CONCRETE_PARAMETER_DEFINITIONS.jsonl", (row) => {
  const key = `${row.catalogId}\u0000${row.parameterId}`;
  if (parameter.has(key)) failures.push(`duplicate_parameter:${key}`);
  parameter.set(key, row);
  if (row.required !== true || row.defaultValue !== null || row.constraints.hiddenDefault !== false) failures.push(`parameter_default:${key}`);
});

const formulas = await scan("05-content/corpus/CONCRETE_FORMULA_GRAPHS.jsonl", (row) => {
  if (formula.has(row.formulaId)) failures.push(`duplicate_formula:${row.formulaId}`);
  const identifiers = [...astIdentifiers(row.ast)].sort();
  if (semantic(identifiers) !== semantic([...row.inputParameterIds].sort())) failures.push(`ast_inputs:${row.formulaId}`);
  if (!/^[A-Za-z0-9_+*/().\s-]+$/u.test(row.expressionSource)) failures.push(`formula_source_charset:${row.formulaId}`);
  for (const input of row.inputParameterIds) if (!parameter.has(`${row.catalogId}\u0000${input}`)) failures.push(`formula_input:${row.formulaId}:${input}`);
  formula.set(row.formulaId, row);
  branchSignatures.add(`${row.dimensionalSignature}:${row.expressionSource.replace(/[A-Za-z_][A-Za-z0-9_]*/gu, "ID")}`);
});

const resources = await scan("05-content/corpus/CONCRETE_RESOURCE_ROWS.jsonl", (row) => {
  if (!formula.has(row.formulaId)) failures.push(`resource_formula:${row.rowId}`);
  if (!work.has(row.catalogId)) failures.push(`resource_work:${row.rowId}`);
  if (row.resourceGraph.catalogId !== row.catalogId || row.resourceGraph.formulaId !== row.formulaId || row.resourceGraph.owner !== "CONCRETE_BACKEND") failures.push(`resource_graph:${row.rowId}`);
  if (!row.sourceMetadata.normative.exactLocator || !/^[a-f0-9]{64}$/u.test(row.sourceMetadata.normative.officialPdfSha256)) failures.push(`normative:${row.rowId}`);
  if (!row.sourceMetadata.price.route || row.sourceMetadata.price.amountMinor !== null || row.sourceMetadata.price.inventedPrice !== false || row.sourceMetadata.price.zeroPrice !== false) failures.push(`price:${row.rowId}`);
  const signature = semantic([row.catalogId, row.resourceGraph.componentKey, row.resourceGraph.operation, row.resourceGraph.stage, row.resourceGraph.category, row.formulaId]);
  if (boqSignatures.has(signature)) failures.push(`resource_signature:${row.rowId}`);
  boqSignatures.add(signature);
  resourceCounts.set(row.catalogId, (resourceCounts.get(row.catalogId) ?? 0) + 1);
});

const scenarios = await scan("05-content/corpus/CONCRETE_SCENARIOS.jsonl", (row) => {
  const counts = scenarioCounts.get(row.catalogId) ?? { valid: 0, invalid: 0, names: new Set() };
  row.valid ? counts.valid += 1 : counts.invalid += 1;
  if (counts.names.has(row.name)) failures.push(`scenario_duplicate:${row.catalogId}:${row.name}`);
  counts.names.add(row.name);
  scenarioCounts.set(row.catalogId, counts);
});

const files = [works, parameters, formulas, resources, scenarios];
for (const actual of files) {
  const wanted = expected.get(actual.path);
  if (!wanted || wanted.rows !== actual.rows || wanted.bytes !== actual.bytes || wanted.sha256 !== actual.sha256) failures.push(`manifest:${actual.path}`);
}
const floor = { L1: 80, L2: 180, L3: 350, L4: 700, L5: 1500 };
const scenarioMinimums = { L1: { valid: 4, invalid: 5 }, L2: { valid: 6, invalid: 8 }, L3: { valid: 10, invalid: 12 }, L4: { valid: 15, invalid: 18 }, L5: { valid: 22, invalid: 25 } };
for (const [catalogId, row] of work) {
  const actual = resourceCounts.get(catalogId) ?? 0;
  if (actual !== row.passport.professionalObligations.resourceRowCount || actual < floor[row.passport.complexityClass]) failures.push(`depth:${catalogId}:${actual}`);
  const scenario = scenarioCounts.get(catalogId);
  const required = scenarioMinimums[String(row.passport.complexityClass)];
  if (!required || !scenario || scenario.valid !== required.valid || scenario.invalid !== required.invalid || scenario.names.size !== required.valid + required.invalid) failures.push(`scenario:${catalogId}`);
}
invariant(works.rows === 1218 && work.size === 1218, `ORACLE_B_H_RED:${works.rows}:${work.size}`);
invariant(formulas.rows === resources.rows && formula.size === resources.rows, `ORACLE_B_BRANCH_RED:${formulas.rows}:${resources.rows}`);
invariant(failures.length === 0, `ORACLE_B_FAILURES:${failures.slice(0, 20).join("|")}`);

const result = {
  schemaVersion: "batch008-concrete-r5-content-oracle-b.v1",
  implementation: "INDEPENDENT_NODE_ESM_STREAMING_AST_AND_GRAPH_AUDIT",
  works: works.rows,
  parameters: parameters.rows,
  formulas: formulas.rows,
  resources: resources.rows,
  scenarios: scenarios.rows,
  compile: { passed: work.size, expected: 1218 },
  strictDepth: { passed: work.size, belowFloor: 0 },
  astTopologyValidated: formulas.rows,
  inputClosureValidated: formulas.rows,
  normativeRoutes: resources.rows,
  priceRoutes: resources.rows,
  uniquePassports: passportHashes.size,
  uniqueBoqSignatures: boqSignatures.size,
  branchSignatureClasses: branchSignatures.size,
  failures: 0,
  oracleDigest: semantic({ files, works: [...work].map(([id, row]) => [id, row.workDefinitionSha256]).sort(), resources: [...resourceCounts].sort(), scenarios: [...scenarioCounts].map(([id, row]) => [id, row.valid, row.invalid]).sort() }),
  status: "GREEN_ORACLE_B",
};
writeFileSync(join(evidence, "06-oracle", "CONTENT_ORACLE_B.json"), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
