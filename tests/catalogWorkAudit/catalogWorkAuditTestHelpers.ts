import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const AUDIT_DIR = path.join(process.cwd(), "artifacts", "S_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT");
export const RESTORE_DIR = path.join(process.cwd(), "artifacts", "S_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH");

export function readAuditJson<T = Record<string, unknown>>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, fileName), "utf8")) as T;
}

export function readAuditText(fileName: string): string {
  return fs.readFileSync(path.join(AUDIT_DIR, fileName), "utf8");
}

export function auditFileExists(fileName: string): boolean {
  return fs.existsSync(path.join(AUDIT_DIR, fileName));
}

export function changedFiles(): string[] {
  const output = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
  if (!output) return [];
  return output.split(/\r?\n/).map((line) => line.slice(3).replace(/\\/g, "/"));
}

export function expectOnlyCatalogAuditScopeChanged(): void {
  const forbidden = changedFiles().filter((file) =>
    file !== "scripts/audit/runCatalogWorkPlatformArchitectureAudit.ts" &&
    file !== "artifacts/S_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH/release_verify.json" &&
    !file.startsWith("tests/catalogWorkAudit/") &&
    !file.startsWith("artifacts/S_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT/"),
  );
  expect(forbidden).toEqual([]);
}
