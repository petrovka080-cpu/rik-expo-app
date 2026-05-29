import fs from "node:fs";
import path from "node:path";

export const PERFORMANCE_GUARD_ROOTS = [
  "src/lib/ai/performance",
  "src/lib/ai/cost",
  "src/lib/ai/rateLimit",
  "src/lib/estimatePdf",
  "scripts/e2e/runAiEstimateLoadPerformanceCostProof.ts",
  "scripts/e2e/runAndroidApi34AiEstimatePerformanceCostSmoke.ts",
  "scripts/e2e/runAiEstimateProofRunnerIsolationCheck.ts",
  "scripts/audit/runAiEstimatePerformanceCloseoutAudit.ts",
];

export function sourceFilesUnder(relativePath: string): string[] {
  const absolute = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolute)) return [];
  if (fs.statSync(absolute).isFile()) return [relativePath.replace(/\\/g, "/")];
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(child);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(path.relative(process.cwd(), child).replace(/\\/g, "/"));
      }
    }
  };
  walk(absolute);
  return files.sort();
}

export function performanceGuardFiles(): string[] {
  return Array.from(new Set(PERFORMANCE_GUARD_ROOTS.flatMap(sourceFilesUnder))).sort();
}

export function read(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

export function expectNoPattern(pattern: RegExp, label: string): void {
  const findings = performanceGuardFiles()
    .filter((file) => pattern.test(read(file)))
    .map((file) => `${file}:${label}`);
  expect(findings).toEqual([]);
}
