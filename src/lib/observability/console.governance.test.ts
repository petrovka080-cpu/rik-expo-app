/**
 * Console Governance — Guards against raw console.* in production code.
 *
 * Rules:
 * 1. All raw console.* calls in non-test runtime code MUST be gated by __DEV__
 *    or be inside an approved boundary file.
 * 2. Approved boundary files are explicitly listed below — these files ARE the
 *    logging/observability layer and own the console output contract.
 * 3. New raw console calls outside approved boundaries will fail this test.
 *
 * If you need to add a new logging call:
 *   - Use `logger.info/warn/error(tag, ...args)` from `src/lib/logger.ts`
 *   - Or wrap in `if (__DEV__)` guard for dev-only diagnostics
 */

import * as fs from "fs";
import * as path from "path";

const SRC = path.resolve(__dirname, "..", "..");

/**
 * Approved boundary files — these files own console output.
 * logger.ts, logError.ts, catchDiscipline.ts, etc.
 */
const APPROVED_BOUNDARY_FILES = new Set([
  "lib/logger.ts",
  "lib/logError.ts",
  "lib/observability/catchDiscipline.ts",
  "lib/observability/platformObservability.ts",
  "lib/observability/swallowedError.ts",
  "lib/observability/platformGuardDiscipline.ts",
  "screens/foreman/foreman.debug.ts",
]);

const CONSOLE_RE = /console\.(log|warn|error|info|debug)\s*\(/;
const DEV_GUARD_RE = /__DEV__/;

function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.includes(".test.") &&
      !entry.name.includes(".spec.")
    ) {
      results.push(full);
    }
  }
  return results;
}

type ConsoleSite = {
  file: string;
  line: number;
  text: string;
};

/**
 * Checks if a console call at lineIndex is guarded by __DEV__.
 * Supports:
 * - Same-line guard: `if (__DEV__) console.warn(...)`
 * - Previous-line guard: `if (__DEV__) {` on line above
 * - Function-level guard: `if (!__DEV__) return;` within 5 lines above
 * - Block-level guard: enclosing `if (__DEV__) {` block
 */
function isDevGuarded(lines: string[], lineIndex: number): boolean {
  const currentLine = lines[lineIndex];
  // Same-line __DEV__ check
  if (DEV_GUARD_RE.test(currentLine)) return true;
  // Previous line __DEV__ check
  if (lineIndex > 0 && DEV_GUARD_RE.test(lines[lineIndex - 1])) return true;

  // Scan up for early-return guard: `if (!__DEV__) return;`
  for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 8); i--) {
    const line = lines[i].trim();
    if (/if\s*\(\s*!__DEV__\s*\)\s*return/.test(line)) return true;
    // Block-level: `if (__DEV__) {`
    if (/if\s*\(\s*__DEV__\s*\)\s*\{/.test(line)) {
      // Check we haven't passed a closing brace
      let openBraces = 0;
      for (let j = i; j <= lineIndex; j++) {
        for (const ch of lines[j]) {
          if (ch === "{") openBraces++;
          if (ch === "}") openBraces--;
        }
      }
      if (openBraces > 0) return true;
    }
  }

  return false;
}

function findUnguardedConsoleCalls(): ConsoleSite[] {
  const files = walk(SRC);
  const violations: ConsoleSite[] = [];

  for (const filePath of files) {
    const rel = path.relative(SRC, filePath).replace(/\\/g, "/");
    if (APPROVED_BOUNDARY_FILES.has(rel)) continue;

    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (CONSOLE_RE.test(lines[i]) && !isDevGuarded(lines, i)) {
        violations.push({
          file: rel,
          line: i + 1,
          text: lines[i].trim(),
        });
      }
    }
  }

  return violations;
}

describe("Console Governance", () => {
  it("has no raw console.* calls outside approved boundaries without __DEV__ guard", () => {
    const violations = findUnguardedConsoleCalls();

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line}: ${v.text}`)
        .join("\n");
      fail(
        `Found ${violations.length} unguarded console call(s) in production code:\n${report}\n\n` +
          "Fix: Use logger.info/warn/error() from src/lib/logger.ts, " +
          "or wrap in if (__DEV__) guard.",
      );
    }
  });

  it("approved boundary files exist", () => {
    for (const relPath of APPROVED_BOUNDARY_FILES) {
      const full = path.join(SRC, relPath);
      expect(fs.existsSync(full)).toBe(true);
    }
  });

  it("logger.ts is the canonical logging boundary", () => {
    const loggerPath = path.join(SRC, "lib/logger.ts");
    const content = fs.readFileSync(loggerPath, "utf8");
    // logger must export info, warn, error
    expect(content).toContain("info(");
    expect(content).toContain("warn(");
    expect(content).toContain("error(");
    // logger must gate on __DEV__ / isDev
    expect(content).toMatch(/__DEV__|isDev/);
  });

  it("counts total non-test console calls for baseline tracking", () => {
    const files = walk(SRC);
    let total = 0;
    for (const f of files) {
      const lines = fs.readFileSync(f, "utf8").split("\n");
      for (const line of lines) {
        if (CONSOLE_RE.test(line)) total++;
      }
    }

    // Baseline: ~325 calls (all guarded or in boundary files).
    // If this grows significantly, investigate.
    // This is informational, not a hard test — just log it.
     
    if (__DEV__) console.info(`[console-governance] total non-test console calls: ${total}`);
    expect(total).toBeGreaterThan(0); // sanity: we do have some console calls
    expect(total).toBeLessThan(500); // ceiling: don't let it grow unbounded
  });
});
