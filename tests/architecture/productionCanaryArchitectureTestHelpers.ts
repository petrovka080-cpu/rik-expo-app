import fs from "node:fs";
import path from "node:path";

export const PRODUCTION_CANARY_ARCHITECTURE_ROOTS = [
  "src/lib/ai/productionCanary",
  "src/lib/ai/observability",
  "src/lib/ai/killSwitch",
  "src/lib/ai/rollback",
  "scripts/e2e/aiEstimateProductionCanaryCore.ts",
  "scripts/e2e/runAiEstimateProductionCanaryReplay.ts",
  "scripts/e2e/runAiEstimateProductionCanaryProof.ts",
  "scripts/e2e/runAndroidApi34AiEstimateProductionCanarySmoke.ts",
  "scripts/audit/runAiEstimateRollbackAudit.ts",
  "tests/e2e/aiEstimateProductionCanary.web.spec.ts",
];

export function productionCanaryFiles(): string[] {
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
  PRODUCTION_CANARY_ARCHITECTURE_ROOTS.forEach(walk);
  return [...new Set(files)].sort();
}

export function readProductionCanarySources(): string {
  return productionCanaryFiles()
    .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
    .join("\n");
}

export function expectNoProductionCanaryPattern(pattern: RegExp, label: string): void {
  const findings = productionCanaryFiles()
    .filter((file) => pattern.test(fs.readFileSync(path.join(process.cwd(), file), "utf8")))
    .map((file) => `${file}:${label}`);
  expect(findings).toEqual([]);
}
