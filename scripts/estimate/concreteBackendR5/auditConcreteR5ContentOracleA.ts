import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { assertExact, evidenceRoot, semanticSha256, sha256, writeJson } from "./support";

type Json = Record<string, any>;

async function eachJsonl(relative: string, consume: (row: Json, line: number) => void | Promise<void>): Promise<{ rows: number; bytes: number; sha256: string }> {
  const path = join(evidenceRoot, relative);
  const fileHash = createHash("sha256");
  const input = createReadStream(path);
  input.on("data", (chunk) => fileHash.update(chunk));
  const reader = createInterface({ input, crlfDelay: Infinity });
  let rows = 0;
  for await (const line of reader) {
    if (!line) continue;
    rows += 1;
    await consume(JSON.parse(line) as Json, rows);
  }
  return { rows, bytes: input.bytesRead, sha256: fileHash.digest("hex") };
}

async function main(): Promise<void> {
  const manifest = JSON.parse(readFileSync(join(evidenceRoot, "05-content", "CORPUS_MANIFEST.json"), "utf8")) as Json;
  const expectedFiles = new Map((manifest.files as Json[]).map((row) => [row.path, row]));
  const workIds = new Set<string>();
  const workHashById = new Map<string, string>();
  const complexityById = new Map<string, string>();
  const expectedRowsById = new Map<string, number>();
  const parameterIds = new Map<string, Set<string>>();
  const formulaIds = new Set<string>();
  const formulaInputs = new Map<string, string[]>();
  const formulaCatalog = new Map<string, string>();
  const resourceCounts = new Map<string, number>();
  const scenarioCounts = new Map<string, { valid: number; invalid: number }>();
  const semanticOwners = new Set<string>();
  const resourceGraphHashes = new Set<string>();
  const rowIds = new Set<string>();
  const failures: string[] = [];

  const works = await eachJsonl("05-content/corpus/CONCRETE_WORK_DEFINITIONS.jsonl", (row) => {
    assertExact(!workIds.has(row.catalogId), `ORACLE_A_DUPLICATE_WORK:${row.catalogId}`);
    workIds.add(row.catalogId);
    workHashById.set(row.catalogId, row.workDefinitionSha256);
    complexityById.set(row.catalogId, row.applicability.complexityClass);
    expectedRowsById.set(row.catalogId, row.passport.professionalObligations.resourceRowCount);
    assertExact(row.domain === "concrete" && row.passport.backendOwner === "CONCRETE_BACKEND", `ORACLE_A_OWNER_RED:${row.catalogId}`);
    assertExact(row.passport.professionalObligations.paddingRows === 0 && row.passport.professionalObligations.inventedPrices === 0, `ORACLE_A_CONTENT_POLICY_RED:${row.catalogId}`);
  });

  const parameters = await eachJsonl("05-content/corpus/CONCRETE_PARAMETER_DEFINITIONS.jsonl", (row) => {
    const ids = parameterIds.get(row.catalogId) ?? new Set<string>();
    if (ids.has(row.parameterId)) failures.push(`duplicate_parameter:${row.catalogId}:${row.parameterId}`);
    ids.add(row.parameterId);
    parameterIds.set(row.catalogId, ids);
    if (row.defaultValue !== null || row.constraints?.hiddenDefault !== false || !row.constraints?.missingStatus) failures.push(`parameter_contract:${row.catalogId}:${row.parameterId}`);
  });

  const formulas = await eachJsonl("05-content/corpus/CONCRETE_FORMULA_GRAPHS.jsonl", (row) => {
    if (formulaIds.has(row.formulaId)) failures.push(`duplicate_formula:${row.formulaId}`);
    formulaIds.add(row.formulaId);
    formulaInputs.set(row.formulaId, row.inputParameterIds);
    formulaCatalog.set(row.formulaId, row.catalogId);
    const compiled = compileFormulaGraph(row.expressionSource);
    if (semanticSha256(compiled.ast) !== semanticSha256(row.ast)) failures.push(`ast_mismatch:${row.formulaId}`);
    if (semanticSha256(compiled.inputParameterIds) !== semanticSha256(row.inputParameterIds)) failures.push(`input_mismatch:${row.formulaId}`);
  });

  const resources = await eachJsonl("05-content/corpus/CONCRETE_RESOURCE_ROWS.jsonl", (row) => {
    if (rowIds.has(row.rowId)) failures.push(`duplicate_row:${row.rowId}`);
    rowIds.add(row.rowId);
    if (semanticOwners.has(row.semanticOwner)) failures.push(`duplicate_semantic_owner:${row.semanticOwner}`);
    semanticOwners.add(row.semanticOwner);
    const graphHash = semanticSha256(row.resourceGraph);
    if (resourceGraphHashes.has(graphHash)) failures.push(`duplicate_resource_graph:${row.rowId}`);
    resourceGraphHashes.add(graphHash);
    resourceCounts.set(row.catalogId, (resourceCounts.get(row.catalogId) ?? 0) + 1);
    if (!formulaIds.has(row.formulaId)) failures.push(`orphan_formula:${row.rowId}`);
    if (!row.sourceMetadata?.normative?.exactLocator || !row.sourceMetadata?.normative?.officialPdfSha256) failures.push(`normative_route:${row.rowId}`);
    if (!row.sourceMetadata?.price?.route || row.sourceMetadata?.price?.inventedPrice !== false || row.sourceMetadata?.price?.zeroPrice !== false) failures.push(`price_route:${row.rowId}`);
    if (row.costOwnerId !== null || row.resourceGraph?.typedChild !== false) failures.push(`typed_child_parent_cost:${row.rowId}`);
  });

  const scenarios = await eachJsonl("05-content/corpus/CONCRETE_SCENARIOS.jsonl", (row) => {
    const count = scenarioCounts.get(row.catalogId) ?? { valid: 0, invalid: 0 };
    row.valid ? count.valid += 1 : count.invalid += 1;
    scenarioCounts.set(row.catalogId, count);
  });

  for (const [formulaId, inputs] of formulaInputs) {
    const catalogId = formulaCatalog.get(formulaId)!;
    const ids = parameterIds.get(catalogId) ?? new Set<string>();
    for (const input of inputs) if (!ids.has(input)) failures.push(`formula_input_orphan:${formulaId}:${input}`);
  }
  const floors: Record<string, number> = { L1: 80, L2: 180, L3: 350, L4: 700, L5: 1_500 };
  const scenarioMinimums: Record<string, { valid: number; invalid: number }> = { L1: { valid: 4, invalid: 5 }, L2: { valid: 6, invalid: 8 }, L3: { valid: 10, invalid: 12 }, L4: { valid: 15, invalid: 18 }, L5: { valid: 22, invalid: 25 } };
  for (const id of workIds) {
    const actual = resourceCounts.get(id) ?? 0;
    const expected = expectedRowsById.get(id) ?? -1;
    const complexity = complexityById.get(id)!;
    if (actual !== expected || actual < floors[complexity]!) failures.push(`depth:${id}:${complexity}:${actual}:${expected}`);
    const scenario = scenarioCounts.get(id);
    const required = scenarioMinimums[complexity];
    if (!required || scenario?.valid !== required.valid || scenario.invalid !== required.invalid) failures.push(`scenario:${id}:${scenario?.valid}:${scenario?.invalid}`);
  }
  const actualFiles = [
    ["05-content/corpus/CONCRETE_WORK_DEFINITIONS.jsonl", works],
    ["05-content/corpus/CONCRETE_PARAMETER_DEFINITIONS.jsonl", parameters],
    ["05-content/corpus/CONCRETE_FORMULA_GRAPHS.jsonl", formulas],
    ["05-content/corpus/CONCRETE_RESOURCE_ROWS.jsonl", resources],
    ["05-content/corpus/CONCRETE_SCENARIOS.jsonl", scenarios],
  ] as const;
  for (const [path, actual] of actualFiles) {
    const expected = expectedFiles.get(path);
    if (!expected || expected.rows !== actual.rows || expected.bytes !== actual.bytes || expected.sha256 !== actual.sha256) failures.push(`corpus_manifest:${path}`);
  }
  assertExact(works.rows === 1_218 && workIds.size === 1_218, `ORACLE_A_H_RED:${works.rows}:${workIds.size}`);
  assertExact(formulas.rows === resources.rows && formulaIds.size === resources.rows, `ORACLE_A_BRANCH_RED:${formulas.rows}:${resources.rows}:${formulaIds.size}`);
  assertExact(failures.length === 0, `ORACLE_A_FAILURES:${failures.slice(0, 20).join("|")}`);
  const result = {
    schemaVersion: "batch008-concrete-r5-content-oracle-a.v1",
    implementation: "TYPESCRIPT_STREAMING_FORMULA_RECOMPILE",
    works: works.rows,
    parameters: parameters.rows,
    formulas: formulas.rows,
    resources: resources.rows,
    scenarios: scenarios.rows,
    compile: { passed: workIds.size, expected: 1_218 },
    strictDepth: { passed: workIds.size, belowFloor: 0 },
    formulaAstRecompiled: formulas.rows,
    formulaInputClosure: formulas.rows,
    normativeRoutes: resources.rows,
    priceRoutes: resources.rows,
    uniqueRowIds: rowIds.size,
    uniqueSemanticOwners: semanticOwners.size,
    uniqueResourceGraphs: resourceGraphHashes.size,
    failures: 0,
    oracleDigest: semanticSha256({ files: actualFiles, workHashes: [...workHashById].sort(), resourceCounts: [...resourceCounts].sort(), scenarioCounts: [...scenarioCounts].sort() }),
    status: "GREEN_ORACLE_A",
  };
  writeJson("06-oracle/CONTENT_ORACLE_A.json", result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
