import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, writeFileSync, writeSync } from "node:fs";
import path from "node:path";

import {
  auditProfessionalEstimateV4Phase0,
  GREEN_V4_PHASE0_ARCHITECTURE_AND_GAP_LEDGER_READY,
} from "../../src/lib/estimate/v4/truthLedgersV4";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-v4-phase0");

function gitOutput(args: string[], fallback = "unknown"): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  const descriptor = openSync(filePath, "w");
  try {
    for (const row of rows) writeSync(descriptor, `${JSON.stringify(row)}\n`, undefined, "utf8");
  } finally {
    closeSync(descriptor);
  }
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export function auditProfessionalEstimateV4Phase0Closeout(input: { writeEvidence?: boolean } = {}) {
  const result = auditProfessionalEstimateV4Phase0();
  const generatedAt = new Date().toISOString();
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const outDir = input.writeEvidence ? path.join(RUNTIME_ROOT, timestampForPath()) : null;
  const paths = outDir ? {
    work_passport: path.join(outDir, "WorkPassportTruthLedger11610.jsonl"),
    parameter_and_unit: path.join(outDir, "ParameterAndUnitTruthLedger11610.jsonl"),
    formula_and_quantity: path.join(outDir, "FormulaAndQuantityTruthLedger11610.jsonl"),
    source_coverage: path.join(outDir, "SourceCoverageLedger11610.jsonl"),
    user_facing_clarity: path.join(outDir, "UserFacingClarityLedger11610.jsonl"),
    summary: path.join(outDir, "summary.json"),
  } : null;
  if (outDir && paths) {
    mkdirSync(outDir, { recursive: true });
    writeJsonl(paths.work_passport, result.work_passport);
    writeJsonl(paths.parameter_and_unit, result.parameter_and_unit);
    writeJsonl(paths.formula_and_quantity, result.formula_and_quantity);
    writeJsonl(paths.source_coverage, result.source_coverage);
    writeJsonl(paths.user_facing_clarity, result.user_facing_clarity);
  }
  const ledgerEvidence = Object.fromEntries(Object.entries(result.summary.ledger_completeness).map(([ledger, completeness]) => [
    ledger,
    {
      ...completeness,
      source_sha: sourceSha,
      generated_at: generatedAt,
      artifact_path: paths?.[ledger as keyof Omit<typeof paths, "summary">] ?? null,
    },
  ]));
  const summary = {
    ...result.summary,
    generated_at: generatedAt,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    worktree_clean: gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "",
    migration_plan: "docs/ai-estimate-v4-phase0-migration-plan.md",
    evidence_paths: paths,
    ledger_evidence: ledgerEvidence,
    release_started: false,
    deploy_started: false,
    phase_1_started: false,
  };
  if (paths) writeFileSync(paths.summary, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return { ...result, summary, outDir, paths };
}

if (require.main === module) {
  const result = auditProfessionalEstimateV4Phase0Closeout({ writeEvidence: hasFlag("write-evidence") || hasFlag("all") });
  console.info(JSON.stringify({
    final_status: result.summary.final_status,
    source_sha: result.summary.source_sha,
    branch: result.summary.branch,
    catalog_total: result.summary.catalog_total,
    ledger_rows: result.summary.ledger_rows,
    works_with_blockers: result.summary.works_with_blockers,
    blocker_counters: result.summary.blocker_counters,
    diagnostic_gap_counters: result.summary.diagnostic_gap_counters,
    manifest_hashes: result.summary.manifest_hashes,
    ledger_evidence: result.summary.ledger_evidence,
    evidence_paths: result.summary.evidence_paths,
    full_software_acceptance_claimed: result.summary.full_software_acceptance_claimed,
    phase_1_started: result.summary.phase_1_started,
  }, null, 2));
  if (result.summary.final_status !== GREEN_V4_PHASE0_ARCHITECTURE_AND_GAP_LEDGER_READY) process.exitCode = 1;
}
