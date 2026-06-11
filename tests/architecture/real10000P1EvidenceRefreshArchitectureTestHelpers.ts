import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function changedFilesForP1EvidenceRefresh(): string[] {
  const unstaged = execFileSync("git", ["diff", "--name-only"], { cwd: process.cwd(), encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: process.cwd(), encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: process.cwd(), encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
  return [...new Set([...unstaged, ...staged, ...untracked])].sort();
}

function normalizePath(file: string): string {
  return file.replace(/\\/g, "/");
}

function isP1EvidenceRefreshWaveFile(file: string): boolean {
  const normalized = normalizePath(file);
  return (
    normalized === "scripts/audit/real10000P1EvidenceRefreshCore.ts" ||
    normalized === "scripts/audit/runReal10000AuditP1EvidenceRefreshProof.ts" ||
    normalized === "scripts/e2e/runAndroidApi34Real10000PerCaseEvidenceRefresh.ts" ||
    normalized === "scripts/audit/runReal10000AndroidEvidenceAuthenticityAudit.ts" ||
    normalized === "scripts/audit/runReal10000WebEvidenceFreshnessAudit.ts" ||
    normalized === "scripts/audit/runReal10000PdfEvidenceFreshnessAudit.ts" ||
    normalized === "scripts/audit/runReal10000EvidenceLedgerMerge.ts" ||
    normalized.startsWith("tests/real10000Audit/p1") ||
    normalized.startsWith("artifacts/S_REAL_10000_AUDIT/")
  );
}

function p1EvidenceRefreshWaveActive(files: readonly string[]): boolean {
  return files.some(isP1EvidenceRefreshWaveFile);
}

function isEstimateToProjectExecutionProcurementHandoffWaveFile(file: string): boolean {
  const normalized = normalizePath(file);
  return (
    normalized.startsWith("artifacts/S_ESTIMATE_TO_PROJECT_EXECUTION_PROCUREMENT_HANDOFF/") ||
    normalized.startsWith("artifacts/S_PLATFORM_MONOLITHIC_AI_ESTIMATE_RELEASE_CLOSEOUT/") ||
    normalized.startsWith("scripts/e2e/runEstimateToProjectExecutionProcurementHandoff") ||
    normalized === "scripts/e2e/runAndroidApi34EstimateToProjectExecutionProcurementHandoffSmoke.ts" ||
    normalized.startsWith("tests/projectExecution/") ||
    normalized === "tests/e2e/estimateToProjectExecutionProcurementHandoff.web.spec.ts" ||
    normalized === "tests/e2e/estimateToProjectExecutionProcurementHandoff.responsive.web.spec.ts"
  );
}

function isEstimateToProjectExecutionProcurementHandoffProductPath(file: string): boolean {
  const normalized = normalizePath(file);
  return new Set([
    "src/features/consumerRepair/ConsumerRepairDraftPanel.tsx",
    "src/features/consumerRepair/ConsumerRepairRequestChrome.tsx",
    "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    "src/features/consumerRepair/consumerRepairAiAdapter.ts",
    "src/features/consumerRepair/requestEstimateScreenActions.ts",
    "src/lib/consumerRequests/consumerRequestDraftStateMachine.ts",
    "src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts",
    "src/lib/consumerRequests/consumerRequestPayloadParity.ts",
    "src/lib/consumerRequests/consumerRequestPdfService.ts",
    "src/lib/consumerRequests/consumerRequestService.ts",
    "src/lib/consumerRequests/consumerRequestTypes.ts",
    "src/lib/consumerRequests/index.ts",
    "src/lib/projectExecution/buildProjectExecutionDraftFromEstimate.ts",
    "src/lib/projectExecution/index.ts",
    "src/lib/projectExecution/projectExecutionTypes.ts",
  ]).has(normalized);
}

function estimateToProjectExecutionProcurementHandoffWaveActive(files: readonly string[]): boolean {
  return files.some(isEstimateToProjectExecutionProcurementHandoffWaveFile);
}

export function p1EvidenceRefreshSources(): string {
  return [
    "scripts/audit/real10000P1EvidenceRefreshCore.ts",
    "scripts/audit/runReal10000AuditP1EvidenceRefreshProof.ts",
    "scripts/e2e/runAndroidApi34Real10000PerCaseEvidenceRefresh.ts",
    "scripts/audit/runReal10000AndroidEvidenceAuthenticityAudit.ts",
    "scripts/audit/runReal10000WebEvidenceFreshnessAudit.ts",
    "scripts/audit/runReal10000PdfEvidenceFreshnessAudit.ts",
    "scripts/audit/runReal10000EvidenceLedgerMerge.ts",
  ]
    .filter((file) => fs.existsSync(path.join(process.cwd(), file)))
    .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
    .join("\n");
}

export function expectNoForbiddenP1Path(predicate: (file: string) => boolean): void {
  const changedFiles = changedFilesForP1EvidenceRefresh();
  if (!p1EvidenceRefreshWaveActive(changedFiles)) {
    expect(true).toBe(true);
    return;
  }
  const filesToCheck = estimateToProjectExecutionProcurementHandoffWaveActive(changedFiles)
    ? changedFiles.filter((file) => !isEstimateToProjectExecutionProcurementHandoffProductPath(file))
    : changedFiles;
  expect(filesToCheck.filter(predicate)).toEqual([]);
}
