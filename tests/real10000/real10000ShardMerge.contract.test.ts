import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  REAL_10000_ACCEPTANCE_CONTRACT,
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import {
  buildReal10000ArtifactIdentity,
  hashReal10000WorkIds,
  sha256File,
  summarizeReal10000RuntimeIntegrity,
} from "../../scripts/e2e/real10000AcceptanceCore";
import {
  validateReal10000ShardCoverage,
  validateReal10000ShardEvidence,
} from "../../scripts/e2e/runReal10000DiverseConstructionWorksShardMerge";

function runtimeIntegrity() {
  return {
    nonFiniteValueCount: 0,
    negativeQuantityCount: 0,
    negativeTotalCount: 0,
    unknownUnitCount: 0,
    silentPriceFallbackCount: 0,
    unconfirmedContractTotalClaimCount: 0,
    passed: true,
  };
}

function validShard(index = 0) {
  const cases = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.slice(
    index * REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard,
    (index + 1) * REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard,
  );
  const workIds = cases.map((item) => item.caseId);
  const runtimeResults = workIds.map((caseId) => ({
    caseId,
    failures: [],
    requiredRowsMissing: [],
    runtimeIntegrity: runtimeIntegrity(),
  }));
  const matrix = {
    ...buildReal10000ArtifactIdentity(),
    shard_index: index,
    work_id_range: { first: workIds[0], last: workIds.at(-1) },
    work_ids: workIds,
    work_ids_hash: hashReal10000WorkIds(workIds),
    started_at: "2026-07-30T00:00:00.000Z",
    finished_at: "2026-07-30T00:00:01.000Z",
    duration_ms: 1000,
    exit_code: 0,
    final_status: "REAL_10000_SHARD_OK",
    cases_total: 100,
    cases_passed: 100,
    cases_failed: 0,
    pdf_extraction_cases_total: cases.filter((item) => item.pdfRequired).length,
    pdf_extraction_cases_passed: cases.filter((item) => item.pdfRequired).length,
    runtime_integrity: summarizeReal10000RuntimeIntegrity(runtimeResults),
    errors: [],
    placeholder: false,
    single_shard_green_claimed: false,
    fake_green_claimed: false,
    writer_complete: true,
    writer: {
      kind: "independent-process-orchestrator",
      completed_at: "2026-07-30T00:00:01.000Z",
      command: ["node", "runReal10000DiverseConstructionWorksShardProof.ts", `--worker-shard=${index}`],
      stdout_path: "stdout.log",
      stderr_path: "stderr.log",
      artifact_hashes: {},
    },
  };
  return { matrix, runtimeResults };
}

function classifications(
  evidence: ReturnType<typeof validShard>,
): string[] {
  return validateReal10000ShardEvidence({
    index: evidence.matrix.shard_index,
    matrix: evidence.matrix,
    runtimeResults: evidence.runtimeResults,
  }).map((failure) => failure.classification);
}

test("real 10000 shard validator accepts a complete v3 shard but never declares corpus green", () => {
  const evidence = validShard();
  expect(classifications(evidence)).toEqual([]);
  expect(evidence.matrix.final_status).toBe("REAL_10000_SHARD_OK");
  expect(evidence.matrix.final_status).not.toContain("GREEN_REAL_10000");
});

test.each([
  ["other SHA", (evidence: ReturnType<typeof validShard>) => { evidence.matrix.subject_sha = "a".repeat(40); }, "REAL_10000_SHARD_IDENTITY_MISMATCH"],
  ["old schema", (evidence: ReturnType<typeof validShard>) => { evidence.matrix.artifact_schema_version = "real10000-shard-evidence:2026-07.v2" as never; }, "REAL_10000_SHARD_IDENTITY_MISMATCH"],
  ["99 works", (evidence: ReturnType<typeof validShard>) => { evidence.matrix.work_ids.pop(); evidence.runtimeResults.pop(); evidence.matrix.work_ids_hash = hashReal10000WorkIds(evidence.matrix.work_ids); }, "REAL_10000_SHARD_WORK_IDS_MISMATCH"],
  ["101 works", (evidence: ReturnType<typeof validShard>) => { evidence.matrix.work_ids.push(evidence.matrix.work_ids[0]); evidence.runtimeResults.push(evidence.runtimeResults[0]); evidence.matrix.work_ids_hash = hashReal10000WorkIds(evidence.matrix.work_ids); }, "REAL_10000_SHARD_WORK_IDS_MISMATCH"],
  ["NaN", (evidence: ReturnType<typeof validShard>) => { evidence.runtimeResults[0].runtimeIntegrity.nonFiniteValueCount = Number.NaN; }, "REAL_10000_RUNTIME_INTEGRITY_FAILED"],
  ["Infinity", (evidence: ReturnType<typeof validShard>) => { evidence.runtimeResults[0].runtimeIntegrity.nonFiniteValueCount = Number.POSITIVE_INFINITY; }, "REAL_10000_RUNTIME_INTEGRITY_FAILED"],
  ["negative quantity", (evidence: ReturnType<typeof validShard>) => { evidence.runtimeResults[0].runtimeIntegrity.negativeQuantityCount = 1; evidence.runtimeResults[0].runtimeIntegrity.passed = false; }, "REAL_10000_RUNTIME_INTEGRITY_FAILED"],
  ["negative total", (evidence: ReturnType<typeof validShard>) => { evidence.runtimeResults[0].runtimeIntegrity.negativeTotalCount = 1; evidence.runtimeResults[0].runtimeIntegrity.passed = false; }, "REAL_10000_RUNTIME_INTEGRITY_FAILED"],
  ["unknown unit", (evidence: ReturnType<typeof validShard>) => { evidence.runtimeResults[0].runtimeIntegrity.unknownUnitCount = 1; evidence.runtimeResults[0].runtimeIntegrity.passed = false; }, "REAL_10000_RUNTIME_INTEGRITY_FAILED"],
  ["hidden price fallback", (evidence: ReturnType<typeof validShard>) => { evidence.runtimeResults[0].runtimeIntegrity.silentPriceFallbackCount = 1; evidence.runtimeResults[0].runtimeIntegrity.passed = false; }, "REAL_10000_RUNTIME_INTEGRITY_FAILED"],
  ["missing compiler version", (evidence: ReturnType<typeof validShard>) => { delete (evidence.matrix as Partial<typeof evidence.matrix>).compiler_version; }, "REAL_10000_SHARD_IDENTITY_MISMATCH"],
  ["unfinished writer", (evidence: ReturnType<typeof validShard>) => { evidence.matrix.writer_complete = false; }, "REAL_10000_SHARD_WRITER_INCOMPLETE"],
  ["manual incomplete matrix", (evidence: ReturnType<typeof validShard>) => { evidence.matrix.writer.artifact_hashes = null as never; }, "REAL_10000_SHARD_WRITER_INCOMPLETE"],
])("real 10000 shard validator rejects %s", (_label, mutate, expected) => {
  const evidence = validShard();
  mutate(evidence);
  expect(classifications(evidence)).toContain(expected);
});

function coverageEntries() {
  return Array.from({ length: REAL_10000_ACCEPTANCE_CONTRACT.requiredShards }, (_, index) => ({
    index,
    matrix: {
      work_ids: REAL_DIVERSE_10000_CONSTRUCTION_WORKS.slice(index * 100, (index + 1) * 100)
        .map((item) => item.caseId),
    },
  }));
}

test("real 10000 coverage validator rejects a missing shard and missing work IDs", () => {
  const failures = validateReal10000ShardCoverage(coverageEntries().slice(0, 99));
  expect(failures.map((failure) => failure.classification)).toEqual(
    expect.arrayContaining(["REAL_10000_SHARD_MISSING", "REAL_10000_MISSING_CASE_IDS"]),
  );
});

test("real 10000 coverage validator rejects duplicate shard indices and intersections", () => {
  const entries = coverageEntries();
  entries[1].index = 0;
  entries[1].matrix.work_ids[0] = entries[0].matrix.work_ids[0];
  const failures = validateReal10000ShardCoverage(entries);
  expect(failures.map((failure) => failure.classification)).toEqual(
    expect.arrayContaining(["REAL_10000_DUPLICATE_SHARD_INDEX", "REAL_10000_SHARD_WORK_ID_INTERSECTION"]),
  );
});

test("real 10000 shard validator rejects a post-writer artifact mutation", () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "real10000-shard-contract-"));
  const names = [
    "runtime_results.json",
    "semantic_frame_results.json",
    "work_plan_results.json",
    "formula_results.json",
    "boq_quality_results.json",
    "catalog_binding_results.json",
    "source_tax_results.json",
    "unit_semantics.json",
    "pdf_files_manifest.json",
    "pdf_text_extract.json",
    "pdf_parity.json",
    "failures.json",
    "stdout.log",
    "stderr.log",
    "execution.json",
  ];
  try {
    for (const name of names) {
      fs.writeFileSync(path.join(outputDir, name), `${name}\n`, "utf8");
    }
    const evidence = validShard();
    evidence.matrix.writer.artifact_hashes = Object.fromEntries(
      names.map((name) => [name, sha256File(path.join(outputDir, name))]),
    );
    expect(validateReal10000ShardEvidence({
      index: 0,
      matrix: evidence.matrix,
      runtimeResults: evidence.runtimeResults,
      dir: outputDir,
    })).toEqual([]);
    fs.appendFileSync(path.join(outputDir, "stdout.log"), "tampered\n", "utf8");
    expect(validateReal10000ShardEvidence({
      index: 0,
      matrix: evidence.matrix,
      runtimeResults: evidence.runtimeResults,
      dir: outputDir,
    }).map((failure) => failure.classification)).toContain(
      "REAL_10000_SHARD_ARTIFACT_HASH_MISMATCH",
    );
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});
