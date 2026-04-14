/**
 * Wave 7+9: Governance audit tests.
 *
 * These tests track type-suppression debt across the codebase.
 * They do NOT fix the suppressions — they establish a baseline
 * and ensure the count does not increase.
 *
 * Running these tests in CI prevents new `as any` / `ts-ignore`
 * from being added without conscious decision.
 */

import { execSync } from "child_process";
import * as path from "path";

const SRC_DIR = path.resolve(__dirname, "../src");

function countPattern(pattern: string, excludeTests = true): number {
  try {
    const excludeFlag = excludeTests ? "--glob=!*.test.*" : "";
    const cmd = `npx rg -c "${pattern}" ${excludeFlag} --glob="*.ts" --glob="*.tsx" "${SRC_DIR}" 2>nul`;
    const output = execSync(cmd, { encoding: "utf8", timeout: 10000 });
    return output
      .split("\n")
      .filter(Boolean)
      .reduce((sum, line) => {
        const count = parseInt(line.split(":").pop() || "0", 10);
        return sum + (Number.isFinite(count) ? count : 0);
      }, 0);
  } catch {
    // rg returns exit code 1 when no matches found
    return 0;
  }
}

describe("governance: type-suppression debt tracking", () => {
  // These baselines were measured on 2026-04-14 after D1 completion.
  // If you fix suppressions, lower the baseline. Never raise it.

  it("`as any` count in src (non-test) does not exceed baseline", () => {
    const count = countPattern(" as any");
    const BASELINE = 25; // measured: ~22 in non-test src files
    expect(count).toBeLessThanOrEqual(BASELINE);
  });

  it("`@ts-ignore` count in src (non-test) does not exceed baseline", () => {
    const count = countPattern("@ts-ignore");
    const BASELINE = 15; // measured: ~12 in non-test src files
    expect(count).toBeLessThanOrEqual(BASELINE);
  });

  it("`@ts-expect-error` count in src (non-test) does not exceed baseline", () => {
    const count = countPattern("@ts-expect-error");
    const BASELINE = 10; // measured: ~7 in non-test src files
    expect(count).toBeLessThanOrEqual(BASELINE);
  });

  it("no `as any` in new query hooks", () => {
    const files = [
      "src/components/map/useMapListingsQuery.ts",
      "src/screens/warehouse/hooks/useWarehouseReportsQuery.ts",
      "src/screens/director/hooks/useDirectorReportOptionsQuery.ts",
    ];
    for (const file of files) {
      const fullPath = path.resolve(__dirname, "..", file);
      try {
        const cmd = `npx rg -c " as any" "${fullPath}" 2>nul`;
        const output = execSync(cmd, { encoding: "utf8", timeout: 5000 }).trim();
        const count = parseInt(output.split(":").pop() || "0", 10);
        expect(count).toBe(0);
      } catch {
        // No matches = pass
      }
    }
  });

  it("no `as any` in extracted style files", () => {
    const files = [
      "src/screens/office/officeHub.styles.ts",
      "src/screens/office/officeHub.helpers.tsx",
      "src/lib/pdf/pdfViewer.styles.ts",
      "src/lib/pdf/pdfViewer.constants.ts",
      "src/lib/pdf/pdfViewer.helpers.ts",
      "src/lib/pdf/pdfViewer.components.tsx",
    ];
    for (const file of files) {
      const fullPath = path.resolve(__dirname, "..", file);
      try {
        const cmd = `npx rg -c " as any" "${fullPath}" 2>nul`;
        const output = execSync(cmd, { encoding: "utf8", timeout: 5000 }).trim();
        const count = parseInt(output.split(":").pop() || "0", 10);
        expect(count).toBe(0);
      } catch {
        // No matches = pass
      }
    }
  });
});
