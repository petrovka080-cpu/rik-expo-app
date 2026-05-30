import fs from "node:fs";
import path from "node:path";

export const INTERNAL_CANARY_ARCHITECTURE_ROOTS = [
  "src/lib/ai/productionCanary",
  "src/lib/ai/observability",
  "src/lib/ai/killSwitch",
  "src/lib/ai/rollback",
  "scripts/e2e/aiEstimateInternalCanaryCore.ts",
  "scripts/e2e/runAiEstimateInternalCanaryReplay.ts",
  "scripts/e2e/runAiEstimateInternalCanaryExecutionProof.ts",
  "scripts/e2e/runAiEstimateKillSwitchDrill.ts",
  "scripts/e2e/runAiEstimateRollbackDrill.ts",
  "scripts/e2e/runAndroidApi34AiEstimateInternalCanarySmoke.ts",
  "scripts/audit/runAiEstimateCanaryTelemetryAudit.ts",
  "tests/e2e/aiEstimateInternalCanary.web.spec.ts",
];

export function internalCanaryFiles(): string[] {
  const files: string[] = [];
  const walk = (relativePath: string): void => {
    const absolutePath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(absolutePath)) return;
    if (fs.statSync(absolutePath).isFile()) {
      if (/\.(ts|tsx)$/.test(relativePath)) files.push(relativePath.replace(/\\/g, "/"));
      return;
    }
    for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
      walk(path.join(relativePath, entry.name));
    }
  };
  INTERNAL_CANARY_ARCHITECTURE_ROOTS.forEach(walk);
  return [...new Set(files)].sort();
}

export function expectNoInternalCanaryPattern(pattern: RegExp, label: string): void {
  const findings = internalCanaryFiles()
    .filter((file) => pattern.test(fs.readFileSync(path.join(process.cwd(), file), "utf8")))
    .map((file) => `${file}:${label}`);
  expect(findings).toEqual([]);
}
