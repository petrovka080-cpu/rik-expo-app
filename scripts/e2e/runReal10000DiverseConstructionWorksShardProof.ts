import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  REAL_10000_ACCEPTANCE_CONTRACT,
  REAL_DIVERSE_10000_CONSTRUCTION_WORKS,
} from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";
import {
  evaluateReal10000Cases,
  buildReal10000ArtifactIdentity,
  hashReal10000WorkIds,
  REAL10000_SHARDS_DIR,
  sha256File,
  slimResult,
  summarizeReal10000,
  summarizeReal10000RuntimeIntegrity,
  writeJsonFile,
} from "./real10000AcceptanceCore";

const SHARD_ARTIFACT_NAMES = [
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
] as const;

function shardDir(index: number): string {
  return path.join(REAL10000_SHARDS_DIR, `shard_${String(index).padStart(3, "0")}`);
}

function shardCases(index: number) {
  const start = index * REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard;
  return REAL_DIVERSE_10000_CONSTRUCTION_WORKS.slice(start, start + REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard);
}

export function runReal10000DiverseConstructionWorksShardProof(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= REAL_10000_ACCEPTANCE_CONTRACT.requiredShards) {
    throw new Error(`REAL10000_INVALID_SHARD:${index}`);
  }
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const cases = shardCases(index);
  const evaluation = evaluateReal10000Cases(cases, { includePdf: true });
  const summary = summarizeReal10000(evaluation);
  const failures = [...evaluation.failures];
  const caseIds = evaluation.cases.map((item) => item.caseId);
  if (cases.length !== REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard) {
    failures.push({ classification: "REAL_10000_SHARD_CASE_COUNT_FAILED", reason: `${cases.length}` });
  }
  if (new Set(caseIds).size !== caseIds.length) {
    failures.push({ classification: "REAL_10000_SHARD_DUPLICATE_CASE_IDS", reason: String(index) });
  }
  const dir = shardDir(index);
  fs.mkdirSync(dir, { recursive: true });
  const runtimeResults = evaluation.cases.map(slimResult);
  writeJsonFile(path.join(dir, "runtime_results.json"), runtimeResults);
  writeJsonFile(path.join(dir, "semantic_frame_results.json"), evaluation.cases.map((item) => ({ caseId: item.caseId, semanticFrame: item.semanticFrame, failures: item.failures })));
  writeJsonFile(path.join(dir, "work_plan_results.json"), evaluation.cases.map((item) => ({ caseId: item.caseId, constructionWorkPlan: item.constructionWorkPlan })));
  writeJsonFile(path.join(dir, "formula_results.json"), evaluation.cases.map((item) => ({ caseId: item.caseId, formulaResult: item.formulaResult })));
  writeJsonFile(path.join(dir, "boq_quality_results.json"), evaluation.cases.map((item) => ({ caseId: item.caseId, rowCount: item.rowCount, requiredRowsFound: item.requiredRowsFound, forbiddenRowsFound: item.forbiddenRowsFound })));
  writeJsonFile(path.join(dir, "catalog_binding_results.json"), { passed: evaluation.cases.every((item) => item.catalogBindingPassed), cases: evaluation.cases.map((item) => ({ caseId: item.caseId, passed: item.catalogBindingPassed })) });
  writeJsonFile(path.join(dir, "source_tax_results.json"), { sourcePassed: evaluation.cases.every((item) => item.sourceEvidencePassed), taxPassed: evaluation.cases.every((item) => item.taxWarningPassed) });
  writeJsonFile(path.join(dir, "unit_semantics.json"), { passed: evaluation.cases.every((item) => item.unitSemanticsPassed), cases: evaluation.cases.map((item) => ({ caseId: item.caseId, passed: item.unitSemanticsPassed })) });
  writeJsonFile(
    path.join(dir, "pdf_files_manifest.json"),
    evaluation.cases
      .filter((item) => item.pdfChecked)
      .map((item) => {
        const absolutePdfPath = item.pdfFile ? path.join(process.cwd(), item.pdfFile) : null;
        return {
          caseId: item.caseId,
          pdfFile: item.pdfFile,
          passed: item.pdfPassed,
          bytes: absolutePdfPath && fs.existsSync(absolutePdfPath) ? fs.statSync(absolutePdfPath).size : 0,
          sha256: absolutePdfPath && fs.existsSync(absolutePdfPath) ? sha256File(absolutePdfPath) : null,
        };
      }),
  );
  writeJsonFile(path.join(dir, "pdf_text_extract.json"), evaluation.cases.filter((item) => item.pdfChecked).map((item) => ({ caseId: item.caseId, text: item.pdfText })));
  writeJsonFile(path.join(dir, "pdf_parity.json"), evaluation.cases.filter((item) => item.pdfChecked).map((item) => ({ caseId: item.caseId, pdfRowsMatchUiRows: item.pdfPassed })));
  writeJsonFile(path.join(dir, "failures.json"), failures);
  const matrix = {
    ...buildReal10000ArtifactIdentity(),
    wave: "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_ACCEPTANCE_POINT_OF_NO_RETURN",
    shard_index: index,
    work_id_range: {
      first: caseIds[0] ?? null,
      last: caseIds.at(-1) ?? null,
    },
    work_ids: caseIds,
    work_ids_hash: hashReal10000WorkIds(caseIds),
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAtMs,
    exit_code: failures.length === 0 ? 0 : 1,
    final_status: failures.length === 0 ? "REAL_10000_SHARD_OK" : "BLOCKED_REAL_10000_SHARD",
    cases_total: summary.cases_total,
    cases_passed: summary.cases_passed,
    cases_failed: summary.cases_failed,
    pdf_extraction_cases_total: summary.pdf_extraction_cases_total,
    pdf_extraction_cases_passed: summary.pdf_extraction_cases_passed,
    domains_covered: summary.domains_covered,
    macro_domains_total: summary.macro_domains_total,
    runtime_integrity: summarizeReal10000RuntimeIntegrity(evaluation.cases),
    errors: failures,
    placeholder: false,
    single_shard_green_claimed: false,
    fake_green_claimed: false,
    writer_complete: false,
    writer: {
      kind: "independent-process-orchestrator",
      completed_at: null,
      command: null,
      stdout_path: null,
      stderr_path: null,
      artifact_hashes: null,
    },
  };
  writeJsonFile(path.join(dir, "matrix.json"), matrix);
  if (failures.length > 0) {
    throw new Error(`REAL10000_SHARD_${index}_FAILED:${failures.map((item) => `${item.caseId ?? "global"}:${item.classification}`).join(";")}`);
  }
  return { matrix, evaluation };
}

function cleanShardOutput(index: number): void {
  const dir = path.resolve(shardDir(index));
  const shardsRoot = `${path.resolve(REAL10000_SHARDS_DIR)}${path.sep}`;
  if (!dir.startsWith(shardsRoot)) {
    throw new Error(`REAL10000_UNSAFE_SHARD_OUTPUT_PATH:${dir}`);
  }
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

export function runReal10000DiverseConstructionWorksShardProcess(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= REAL_10000_ACCEPTANCE_CONTRACT.requiredShards) {
    throw new Error(`REAL10000_INVALID_SHARD:${index}`);
  }
  cleanShardOutput(index);
  const dir = shardDir(index);
  const stdoutPath = path.join(dir, "stdout.log");
  const stderrPath = path.join(dir, "stderr.log");
  const executionPath = path.join(dir, "execution.json");
  const matrixPath = path.join(dir, "matrix.json");
  const tsxCli = require.resolve("tsx/cli");
  const args = [tsxCli, __filename, `--worker-shard=${index}`];
  const command = [process.execPath, ...args];
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  });
  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startedAtMs;
  fs.writeFileSync(stdoutPath, result.stdout ?? "", "utf8");
  fs.writeFileSync(stderrPath, result.stderr ?? "", "utf8");
  const exitCode = typeof result.status === "number" ? result.status : -1;
  const execution = {
    command,
    command_display: command.map((part) => JSON.stringify(part)).join(" "),
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: durationMs,
    exit_code: exitCode,
    signal: result.signal ?? null,
    spawn_error: result.error?.message ?? null,
    stdout_path: path.relative(process.cwd(), stdoutPath).replace(/\\/g, "/"),
    stderr_path: path.relative(process.cwd(), stderrPath).replace(/\\/g, "/"),
    stdout_sha256: sha256File(stdoutPath),
    stderr_sha256: sha256File(stderrPath),
  };
  writeJsonFile(executionPath, execution);

  if (!fs.existsSync(matrixPath)) {
    throw new Error(`REAL10000_SHARD_${index}_MATRIX_NOT_WRITTEN:exit=${exitCode}`);
  }
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as Record<string, unknown>;
  const artifactHashes = Object.fromEntries(
    SHARD_ARTIFACT_NAMES.map((name) => {
      const filePath = path.join(dir, name);
      if (!fs.existsSync(filePath)) {
        throw new Error(`REAL10000_SHARD_${index}_ARTIFACT_MISSING:${name}`);
      }
      return [name, sha256File(filePath)];
    }),
  );
  const workerErrors = Array.isArray(matrix.errors) ? matrix.errors : [];
  const runnerErrors = [
    ...(result.error ? [{ classification: "REAL_10000_SHARD_SPAWN_FAILED", reason: result.error.message }] : []),
    ...(exitCode !== 0 ? [{ classification: "REAL_10000_SHARD_TERMINAL_EXIT_NONZERO", reason: String(exitCode) }] : []),
  ];
  const finalizedMatrix = {
    ...matrix,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: durationMs,
    exit_code: exitCode,
    errors: [...workerErrors, ...runnerErrors],
    final_status: exitCode === 0 && workerErrors.length === 0
      ? "REAL_10000_SHARD_OK"
      : "BLOCKED_REAL_10000_SHARD",
    writer_complete: true,
    writer: {
      kind: "independent-process-orchestrator",
      completed_at: finishedAt,
      command,
      stdout_path: execution.stdout_path,
      stderr_path: execution.stderr_path,
      artifact_hashes: artifactHashes,
    },
  };
  writeJsonFile(matrixPath, finalizedMatrix);
  if (exitCode !== 0 || workerErrors.length > 0) {
    throw new Error(`REAL10000_SHARD_${index}_PROCESS_FAILED:exit=${exitCode}`);
  }
  return finalizedMatrix;
}

export function runAllReal10000DiverseConstructionWorksShards() {
  const failures: string[] = [];
  for (let index = 0; index < REAL_10000_ACCEPTANCE_CONTRACT.requiredShards; index += 1) {
    try {
      runReal10000DiverseConstructionWorksShardProcess(index);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (failures.length > 0) throw new Error(`REAL10000_SHARDS_FAILED:${failures.join(";")}`);
}

if (require.main === module) {
  const all = process.argv.includes("--all");
  const workerShardArg = process.argv.find((arg) => arg.startsWith("--worker-shard="));
  const shardArg = process.argv.find((arg) => arg.startsWith("--shard="));
  if (all) {
    runAllReal10000DiverseConstructionWorksShards();
  } else if (workerShardArg) {
    runReal10000DiverseConstructionWorksShardProof(Number(workerShardArg.split("=")[1]));
  } else if (shardArg) {
    runReal10000DiverseConstructionWorksShardProcess(Number(shardArg.split("=")[1]));
  } else {
    throw new Error("REAL10000_SHARD_PROOF_REQUIRES_--all_OR_--shard=N");
  }
}
