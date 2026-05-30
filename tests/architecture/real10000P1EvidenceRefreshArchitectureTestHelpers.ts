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
  expect(changedFilesForP1EvidenceRefresh().filter(predicate)).toEqual([]);
}
