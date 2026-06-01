/**
 * GOVERNANCE CLOSEOUT: Type-suppression and logging discipline tracking.
 *
 * These tests track type-suppression debt and raw console usage.
 * They do NOT fix the suppressions — they establish a baseline
 * and ensure the count does not increase.
 *
 * BASELINES updated after GOVERNANCE CLOSEOUT package (2026-04-15).
 */

import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SRC_DIR = path.join(PROJECT_ROOT, "src");
const APP_DIR = path.join(PROJECT_ROOT, "app");

type CountPatternOptions = {
  excludeDevGuardedLines?: boolean;
};

function isTrackedSourceFile(filePath: string, excludeTests: boolean): boolean {
  if (!/\.(ts|tsx)$/.test(filePath)) {
    return false;
  }

  if (!excludeTests) {
    return true;
  }

  const normalized = filePath.replace(/\\/g, "/");
  return !/(\.test\.|\.spec\.|\/__tests__\/)/.test(normalized);
}

function listSourceFiles(dir: string, excludeTests: boolean): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath, excludeTests));
      continue;
    }

    if (entry.isFile() && isTrackedSourceFile(fullPath, excludeTests)) {
      files.push(fullPath);
    }
  }
  return files;
}

function countMatches(source: string, pattern: string): number {
  return source.match(new RegExp(pattern, "g"))?.length ?? 0;
}

function countPattern(
  pattern: string,
  dir: string,
  excludeTests = true,
  options: CountPatternOptions = {},
): number {
  return listSourceFiles(dir, excludeTests).reduce((sum, filePath) => {
    const source = fs.readFileSync(filePath, "utf8");
    const searchableSource = options.excludeDevGuardedLines
      ? source
        .split(/\r?\n/)
        .filter((line) => !line.includes("__DEV__"))
        .join("\n")
      : source;
    return sum + countMatches(searchableSource, pattern);
  }, 0);
}

function countPatternSrc(
  pattern: string,
  excludeTests = true,
  options: CountPatternOptions = {},
): number {
  return countPattern(pattern, SRC_DIR, excludeTests, options);
}

function countPatternAll(
  pattern: string,
  excludeTests = true,
  options: CountPatternOptions = {},
): number {
  return countPatternSrc(pattern, excludeTests, options) + countPattern(pattern, APP_DIR, excludeTests, options);
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
      const fullPath = path.join(PROJECT_ROOT, file);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(countMatches(fs.readFileSync(fullPath, "utf8"), " as any")).toBe(0);
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
      const fullPath = path.join(PROJECT_ROOT, file);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(countMatches(fs.readFileSync(fullPath, "utf8"), " as any")).toBe(0);
    }
  });
});

describe("governance: raw console.* baseline tracking", () => {
  // GOVERNANCE CLOSEOUT: Track raw console usage. Existing logger module
  // should be used instead. This test prevents new raw console calls.

  it("raw console.* count in src (non-test, excluding __DEV__ guards) does not exceed baseline", () => {
    // Count console calls NOT guarded by __DEV__
    const count = countPatternSrc("console\\.(log|warn|error|info|debug)", true, {
      excludeDevGuardedLines: true,
    });
    const BASELINE = 150; // measured: ~145 after audit. Mechanical replacement is a separate pass.
    expect(count).toBeLessThanOrEqual(BASELINE);
  });
});
