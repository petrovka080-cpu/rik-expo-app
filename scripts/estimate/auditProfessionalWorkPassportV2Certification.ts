import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { loadEstimateSourceRegistry } from "../../src/lib/estimate/sourceRegistry";
import { listProfessionalWorkPassportV2TemplateIds } from "../../src/lib/estimate/buildProfessionalWorkPassportV2";
import {
  auditProfessionalWorkPassportV2Certification,
  GREEN_AI_ESTIMATE_11610_PROFESSIONAL_WORK_PASSPORTS_AND_RESOURCE_COMPOSITION_SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW_NO_RELEASE,
} from "../../src/lib/estimate/validateProfessionalWorkPassportV2";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-11610-professional-work-passports-v2");

function gitOutput(args: string[], fallback = ""): string {
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

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export function auditProfessionalWorkPassportV2CertificationCloseout(input: {
  writeSummary?: boolean;
  writeLedger?: boolean;
  writeCases?: boolean;
  writePreviews?: boolean;
} = {}) {
  const result = auditProfessionalWorkPassportV2Certification();
  const outDir = input.writeSummary || input.writeLedger || input.writeCases || input.writePreviews
    ? path.join(RUNTIME_ROOT, timestampForPath())
    : null;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "professional-work-passport-v2-ledger.jsonl") : null;
  const casesPath = outDir && input.writeCases ? path.join(outDir, "professional-work-passport-v2-cases.jsonl") : null;
  const previewPath = outDir && input.writePreviews ? path.join(outDir, "professional-work-passport-v2-preview-sample.json") : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "professional-work-passport-v2-summary.json") : null;
  const manifestHash = estimateDeterministicHash({
    template_ids: listProfessionalWorkPassportV2TemplateIds(),
    expected_total: 11610,
    contract: "ProfessionalWorkPassportV2",
  });
  const sourceRegistryHash = estimateDeterministicHash(loadEstimateSourceRegistry());
  const compiledAssemblyHash = estimateDeterministicHash({
    ledger: result.ledger.map((row) => ({
      work_id: row.work_id,
      family_id: row.family_id,
      semantic_signature_hash: row.semantic_signature_hash,
      parameter_count: row.parameter_count,
      material_count: row.material_count,
      operation_count: row.operation_count,
      service_count: row.service_count,
      equipment_count: row.equipment_count,
      formula_count: row.formula_count,
      source_count: row.source_count,
    })),
    cases_ready: result.summary.passport_cases_ready,
  });
  const summary = {
    ...result.summary,
    source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "HEAD...@{u}"], "unknown").replace(/\s+/g, " "),
    worktree_clean: gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "",
    manifest_hash: manifestHash,
    source_registry_hash: sourceRegistryHash,
    compiled_assembly_hash: compiledAssemblyHash,
    release_started: false,
    deploy_started: false,
    eas_started: false,
    native_build_started: false,
    production_db_touched: false,
    main_changed: false,
    pr44_changed: false,
    fake_expert_validation_claimed: false,
    expert_validated_status_claimed: false,
    ledger_artifact: ledgerPath,
    cases_artifact: casesPath,
    preview_artifact: previewPath,
    summary_artifact: summaryPath,
  };
  if (ledgerPath) writeJsonl(ledgerPath, result.ledger);
  if (casesPath) writeJsonl(casesPath, result.cases);
  if (previewPath) writeJson(previewPath, result.preview_samples);
  if (summaryPath) writeJson(summaryPath, summary);
  return {
    summary,
    ledger: result.ledger,
    cases: result.cases,
    preview_samples: result.preview_samples,
    outDir,
    ledgerPath,
    casesPath,
    previewPath,
    summaryPath,
  };
}

if (require.main === module) {
  const result = auditProfessionalWorkPassportV2CertificationCloseout({
    writeSummary: hasFlag("write-summary") || hasFlag("json"),
    writeLedger: hasFlag("write-ledger"),
    writeCases: hasFlag("write-cases"),
    writePreviews: hasFlag("write-previews"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    source_sha: result.summary.source_sha,
    branch: result.summary.branch,
    upstream_sync: result.summary.upstream_sync,
    worktree_clean: result.summary.worktree_clean,
    manifest_hash: result.summary.manifest_hash,
    source_registry_hash: result.summary.source_registry_hash,
    compiled_assembly_hash: result.summary.compiled_assembly_hash,
    catalog_total: result.summary.catalog_total,
    resolved_passports: result.summary.resolved_passports,
    passport_cases_ready: `${result.summary.passport_cases_ready}/${result.summary.passport_cases_total}`,
    generic_passports: result.summary.generic_passports,
    cross_family_cloned_passports: result.summary.cross_family_cloned_passports,
    wrong_units: result.summary.wrong_units,
    formula_trace_missing: result.summary.formula_trace_missing,
    blocked_passports: result.summary.blocked_passports,
    ledger_artifact: result.summary.ledger_artifact,
    cases_artifact: result.summary.cases_artifact,
    preview_artifact: result.summary.preview_artifact,
    summary_artifact: result.summary.summary_artifact,
    blockers: result.summary.blocking_reasons.slice(0, 20),
  }, null, 2));
  if (
    hasFlag("fail-on-blocker") &&
    result.summary.final_status !== GREEN_AI_ESTIMATE_11610_PROFESSIONAL_WORK_PASSPORTS_AND_RESOURCE_COMPOSITION_SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW_NO_RELEASE
  ) {
    process.exitCode = 1;
  }
}
