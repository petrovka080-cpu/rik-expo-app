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
  });
  if (!output) return [];
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/\\/g, "/"));
}

export function expectOnlyCatalogAuditScopeChanged(): void {
  const baseline = readAuditJson<Record<string, unknown>>("baseline.json");
  const repaintGuard = readAuditJson<{
    matrix_repaint_without_proof: boolean;
    proof_sources: string[];
    fake_green_claimed: boolean;
  }>("matrix_repaint_guard.json");
  const testScan = readAuditJson<{
    scanned_scope: string[];
    test_weakening_found: boolean;
    findings: unknown[];
  }>("test_weakening_scan.json");

  expect(baseline).toMatchObject({
    head: "15c252af2adb8c75dfb59181a39af60db6bfaea0",
    status_before_audit: "",
    read_only_audit: true,
    no_db_connection_opened: true,
    fake_green_claimed: false,
  });
  expect(repaintGuard).toMatchObject({
    matrix_repaint_without_proof: false,
    fake_green_claimed: false,
  });
  expect(repaintGuard.proof_sources).toContain("baseline.json");
  expect(repaintGuard.proof_sources).toContain("repo_inventory.json");
  expect(testScan.scanned_scope).toHaveLength(17);
  expect(testScan.test_weakening_found).toBe(false);
  expect(testScan.findings).toEqual([]);
}
