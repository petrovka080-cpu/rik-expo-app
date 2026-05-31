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
  expect(changedFiles.filter(predicate)).toEqual([]);
}
