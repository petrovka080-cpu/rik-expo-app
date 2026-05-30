import fs from "node:fs";
import path from "node:path";

export const REAL10000_AUDIT_FILES = [
  "scripts/audit/real10000EstimateAuditCore.ts",
  "scripts/audit/runReal10000EstimateProvenanceAudit.ts",
  "scripts/audit/runReal10000DiversityAudit.ts",
  "scripts/audit/runReal10000ShardRuntimeEvidenceAudit.ts",
  "scripts/audit/runReal10000OutputQualitySampleAudit.ts",
  "scripts/audit/runReal10000P0RegressionAudit.ts",
  "scripts/audit/runReal10000UiPdfParityAudit.ts",
  "scripts/audit/runReal10000LiveEvidenceAudit.ts",
  "scripts/audit/runReal10000AntiFakeGreenAudit.ts",
  "scripts/audit/runReal10000EstimateAudit.ts",
  "scripts/release/releaseGuard.shared.ts",
];

export function readReal10000AuditSources(): string {
  return REAL10000_AUDIT_FILES
    .filter((file) => fs.existsSync(path.join(process.cwd(), file)))
    .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
    .join("\n");
}

export function expectNoReal10000AuditPattern(pattern: RegExp, label: string): void {
  const findings = REAL10000_AUDIT_FILES
    .filter((file) => fs.existsSync(path.join(process.cwd(), file)))
    .filter((file) => pattern.test(fs.readFileSync(path.join(process.cwd(), file), "utf8")))
    .map((file) => `${file}:${label}`);
  expect(findings).toEqual([]);
}
