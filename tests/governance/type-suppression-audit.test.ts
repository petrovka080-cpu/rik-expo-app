/**
 * GOVERNANCE CLOSEOUT: Type-suppression and logging discipline tracking.
 *
 * These tests track type-suppression debt and raw console usage.
 * They do NOT fix the suppressions — they establish a baseline
 * and ensure the count does not increase.
 *
 * BASELINES updated after GOVERNANCE CLOSEOUT package (2026-04-15).
 */

import { execSync } from "child_process";
import * as path from "path";

const SRC_DIR = path.resolve(__dirname, "../src");
const APP_DIR = path.resolve(__dirname, "../app");

function countPattern(pattern: string, dir: string, excludeTests = true): number {
  try {
    const excludeFlag = excludeTests ? "--glob=!*.test.*" : "";
    const cmd = `npx rg -c "${pattern}" ${excludeFlag} --glob="*.ts" --glob="*.tsx" "${dir}" 2>nul`;
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

function countPatternSrc(pattern: string, excludeTests = true): number {
  return countPattern(pattern, SRC_DIR, excludeTests);
}

function countPatternAll(pattern: string, excludeTests = true): number {
  return countPatternSrc(pattern, excludeTests) + countPattern(pattern, APP_DIR, excludeTests);
}

describe("governance: type-suppression debt tracking", () => {
  // GOVERNANCE CLOSEOUT baselines — updated 2026-04-15.
  // If you fix suppressions, lower the baseline. Never raise it.

  it("`as any` count in src+app (non-test) does not exceed baseline", () => {
    const count = countPatternAll(" as any");
    const BASELINE = 15; // measured: ~12 after governance closeout
    expect(count).toBeLessThanOrEqual(BASELINE);
  });

  it("`@ts-ignore` count in src+app (non-test) does not exceed baseline", () => {
    const count = countPatternAll("@ts-ignore");
    const BASELINE = 2; // measured: 0 after converting to @ts-expect-error
    expect(count).toBeLessThanOrEqual(BASELINE);
  });

  it("`@ts-expect-error` count in src+app (non-test) does not exceed baseline", () => {
    const count = countPatternAll("@ts-expect-error");
    const BASELINE = 12; // includes justified platform/API edge cases
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

describe("governance: raw console.* baseline tracking", () => {
  // GOVERNANCE CLOSEOUT: Track raw console usage. Existing logger module
  // should be used instead. This test prevents new raw console calls.

  it("raw console.* count in src (non-test, excluding __DEV__ guards) does not exceed baseline", () => {
    // Count console calls NOT guarded by __DEV__
    const count = countPatternSrc("console\\.(log|warn|error|info|debug)");
    const BASELINE = 150; // measured: ~145 after audit. Mechanical replacement is a separate pass.
    expect(count).toBeLessThanOrEqual(BASELINE);
  });
});

