import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_OUTPUT = path.resolve(
  ".release-runtime/master-11610-group-batches-r1/03-m1-asphalt-five-p0-remediation-r1/cohorts/r4-r8-working-v3",
);
const OUTPUT = path.resolve(process.env.M1_ASPHALT_R4_R8_OUTPUT ?? DEFAULT_OUTPUT);

function readJson<T = Record<string, unknown>>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(OUTPUT, relativePath), "utf8")) as T;
}

function readJsonl<T = Record<string, unknown>>(relativePath: string): T[] {
  return readFileSync(path.join(OUTPUT, relativePath), "utf8")
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function csvDataLines(relativePath: string): string[] {
  return readFileSync(path.join(OUTPUT, relativePath), "utf8").trim().split(/\r?\n/u).slice(1);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, stableValue(record[key])]));
  }
  return value;
}

function decisionHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

describe("M1 Asphalt remediation R4-R8 exact evidence contracts", () => {
  test("m1R63ExactIdentityAndScope.contract.test", () => {
    const summary = readJson<{
      cases: Array<{ caseId: string; finalRows: number; tracedRows: number; coverage: number }>;
      originalRows: number;
      finalRows: number;
    }>("rows/R63_ROW_TRACE_COVERAGE_SUMMARY.json");
    expect(summary.cases).toHaveLength(63);
    expect(new Set(summary.cases.map((entry) => entry.caseId)).size).toBe(63);
    expect(summary.cases.every((entry) => entry.finalRows > 0 && entry.finalRows === entry.tracedRows && entry.coverage === 1)).toBe(true);
    expect(summary.originalRows).toBe(3_709);
    expect(summary.finalRows).toBe(3_709);
  });

  test("m1R63RowDisposition3709.contract.test", () => {
    const rows = csvDataLines("rows/R63_BEFORE_AFTER_ROW_RECONCILIATION.csv");
    expect(rows).toHaveLength(3_709);
    expect(rows.every((line) => line.includes(",MODIFIED_PROVEN,"))).toBe(true);
    expect(new Set(rows.map((line) => line.split(",", 1)[0])).size).toBe(63);
  });

  test("m1R63FinalRowTrace100Pct.contract.test", () => {
    const traces = readJsonl<Record<string, unknown> & {
      traceHash: string;
      rowHash: string;
      WHY_EXISTS: string;
      HOW_MUCH: string;
      constructionNormLocators: unknown[];
      sourceRoleDecisions: unknown[];
      substitutions: unknown[];
      formula: { formulaId: string; expression: string };
    }>("rows/R63_FINAL_ROW_NORMATIVE_FORMULA_TRACE.jsonl");
    expect(traces).toHaveLength(3_709);
    expect(new Set(traces.map((entry) => entry.traceHash)).size).toBe(3_709);
    expect(traces.every((entry) => {
      const { traceHash, ...core } = entry;
      return decisionHash(core) === traceHash && entry.rowHash.length === 64 && entry.WHY_EXISTS.length > 0 && entry.HOW_MUCH.length > 0 &&
        entry.constructionNormLocators.length > 0 && entry.sourceRoleDecisions.length > 0 && entry.formula.formulaId.length > 0 &&
        entry.formula.expression.length > 0 && Array.isArray(entry.substitutions);
    })).toBe(true);
  });

  test("m1R63Jurisdiction693.contract.test", () => {
    const summary = readJson<{
      cellsTotal: number;
      cellsReviewed: number;
      missingCells: number;
      officialSearchProofMissing: number;
      laneCounts: Record<string, number>;
    }>("jurisdiction/R63_JURISDICTION_CROSSWALK_SUMMARY.json");
    expect(csvDataLines("jurisdiction/R63_JURISDICTION_CROSSWALK_693.csv")).toHaveLength(693);
    expect(summary.cellsTotal).toBe(693);
    expect(summary.cellsReviewed).toBe(693);
    expect(summary.missingCells).toBe(0);
    expect(summary.officialSearchProofMissing).toBe(0);
    expect(Object.keys(summary.laneCounts)).toHaveLength(11);
    expect(Object.values(summary.laneCounts).every((count) => count === 63)).toBe(true);
  });

  test("m1Road0701Routing.contract.test", () => {
    const proof = readJson<{
      roadReferenceAssembly: { canonicalOwner: string; boqRows: number; pdfRows: number; procurementRows: number };
      catalog0701: { requestedIdentity: string; boqRows: number };
      referenceProofAliasTo0701: boolean;
      internalCatalogAliasIsNotReferenceProofAlias: boolean;
      requestedIdentityPreserved: boolean;
      duplicateCostOwners: number;
    }>("routing/ROAD_REFERENCE_VS_0701_OWNER_PROOF.json");
    expect(proof.roadReferenceAssembly).toMatchObject({
      canonicalOwner: "asphalt_concrete_pavement",
      boqRows: 304,
      pdfRows: 304,
      procurementRows: 112,
    });
    expect(proof.catalog0701.requestedIdentity).toBe("built-in-ai-1000:0701");
    expect(proof.catalog0701.boqRows).toBe(147);
    expect(proof.referenceProofAliasTo0701).toBe(false);
    expect(proof.internalCatalogAliasIsNotReferenceProofAlias).toBe(true);
    expect(proof.requestedIdentityPreserved).toBe(true);
    expect(proof.duplicateCostOwners).toBe(0);
  });

  test("m1R63DurableProjection63.contract.test", () => {
    const proof = readJson<{
      cases: Array<{
        coldRestart: boolean;
        editParameterRecompute: boolean;
        formulaSourceIdentityPreserved: boolean;
        manualPricePreservation: boolean;
        rowLoss: number;
        projectionMismatch: number;
      }>;
      durableHistory: number;
      pdf: number;
      procurement: number;
      resourceBalance: number;
      requestedIdentity: number;
    }>("durable/R63_DURABLE_HISTORY_PDF_PROCUREMENT_PARITY.json");
    expect(proof.cases).toHaveLength(63);
    expect(proof).toMatchObject({ durableHistory: 63, pdf: 63, procurement: 63, resourceBalance: 63, requestedIdentity: 63 });
    expect(proof.cases.every((entry) => entry.coldRestart === true && entry.editParameterRecompute === true &&
      entry.formulaSourceIdentityPreserved === true && entry.manualPricePreservation === true &&
      entry.rowLoss === 0 && entry.projectionMismatch === 0)).toBe(true);
  });

  test("m1R63Global55External8Partition.contract.test", () => {
    const proof = readJson<{
      asphaltGlobalIds: string[];
      externalEntrypointIds: string[];
      cumulativeGlobalIds: string[];
      remainingGlobalIds: string[];
      externalCountedInGlobal11610: number;
    }>("arithmetic/M1_R63_GLOBAL_DENOMINATOR_PARTITION_PROOF.json");
    expect(proof.asphaltGlobalIds).toHaveLength(55);
    expect(proof.externalEntrypointIds).toHaveLength(8);
    expect(proof.externalCountedInGlobal11610).toBe(0);
    expect(proof.externalEntrypointIds.some((id) => proof.cumulativeGlobalIds.includes(id) || proof.remainingGlobalIds.includes(id))).toBe(false);
  });

  test("master11610Arithmetic4060And7550.contract.test", () => {
    const proof = readJson<{
      cumulativeGlobalIds: string[];
      remainingGlobalIds: string[];
      cumulativeGlobalCount: number;
      remainingGlobalCount: number;
    }>("arithmetic/M1_R63_GLOBAL_DENOMINATOR_PARTITION_PROOF.json");
    const source = readFileSync("scripts/estimate/auditCompletedDomainsDepthBaseline.ts", "utf8");
    expect(proof.cumulativeGlobalCount).toBe(4_060);
    expect(proof.remainingGlobalCount).toBe(7_550);
    expect(proof.cumulativeGlobalIds).toHaveLength(4_060);
    expect(proof.remainingGlobalIds).toHaveLength(7_550);
    expect(new Set([...proof.cumulativeGlobalIds, ...proof.remainingGlobalIds]).size).toBe(11_610);
    expect(source).not.toContain("owners.size === 4_068");
    expect(source).not.toContain("sum: 4_068");
    expect(source).toContain("owners.size === 4_060");
  });

  test("m1R63NoPaddingCloneDoubleCount.contract.test", () => {
    const summary = readJson<{
      paddingRows: number;
      crossWorkClones: number;
      duplicateCostOwners: number;
      inventedLocators: number;
      bulkGenericSourceAssignments: number;
    }>("rows/R63_ROW_TRACE_COVERAGE_SUMMARY.json");
    expect(summary).toMatchObject({
      paddingRows: 0,
      crossWorkClones: 0,
      duplicateCostOwners: 0,
      inventedLocators: 0,
      bulkGenericSourceAssignments: 0,
    });
  });

  test("m1R63NoTestWeakening.contract.test", () => {
    const mutations = readJson<{
      controlledDefects: number;
      detected: number;
      mutationResidue: number;
      results: Array<{ id: string; detected: boolean; detectedCodes: string[] }>;
    }>("tests/MUTATION_TEST_RESULTS.json");
    expect(mutations.controlledDefects).toBe(36);
    expect(mutations.detected).toBe(36);
    expect(mutations.mutationResidue).toBe(0);
    expect(mutations.results).toHaveLength(36);
    expect(mutations.results.every((entry) => entry.detected && entry.detectedCodes.length > 0)).toBe(true);
  });

  test("m1R63NoOutsideScopeMutation.contract.test", () => {
    const changed = execFileSync("git", ["diff", "--name-only", "HEAD", "--"], { encoding: "utf8" })
      .trim()
      .split(/\r?\n/u)
      .filter(Boolean);
    const allowedProduction = [
      "src/lib/estimate/buildEstimateFromInlineWorkPrompt.ts",
      "src/lib/estimate/v4/asphalt/",
      "src/lib/estimate/v4/roadworks/roadworksWaveAProductionBinding.ts",
      "scripts/estimate/auditCompletedDomainsDepthBaseline.ts",
    ];
    const protectedEvidenceOverlay = new Set([
      "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_api34_results.json",
      "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_screenshots.json",
      "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_ui_dumps.json",
    ]);
    const outside = changed.filter((file) =>
      !protectedEvidenceOverlay.has(file) &&
      !file.startsWith("tests/") &&
      !/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(file) &&
      !file.startsWith("scripts/estimate/") &&
      !allowedProduction.some((allowed) => allowed.endsWith("/") ? file.startsWith(allowed) : file === allowed));
    expect(outside).toEqual([]);
  });
});
