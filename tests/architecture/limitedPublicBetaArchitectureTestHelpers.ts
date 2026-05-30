import fs from "node:fs";
import path from "node:path";

export const LIMITED_PUBLIC_BETA_ARCHITECTURE_ROOTS = [
  "src/lib/ai/productionCanary",
  "src/lib/ai/observability",
  "src/lib/ai/killSwitch",
  "src/lib/ai/rollback",
  "scripts/e2e/aiEstimateLimitedPublicBetaExecutionCore.ts",
  "scripts/e2e/runAiEstimateLimitedPublicBetaExecutionReplay.ts",
  "scripts/e2e/runAiEstimateLimitedPublicBetaExecutionProof.ts",
  "scripts/e2e/runAndroidApi34AiEstimateLimitedPublicBetaSmoke.ts",
  "scripts/e2e/runAiEstimateLimitedPublicBetaPdfProof.ts",
  "scripts/e2e/runAiEstimateLimitedPublicBetaKillSwitchDrill.ts",
  "scripts/e2e/runAiEstimateLimitedPublicBetaRollbackDrill.ts",
  "scripts/e2e/runAiEstimateLimitedPublicBetaAllowlistProof.ts",
  "scripts/e2e/runAiEstimateLimitedPublicBetaAllowlistCloseoutProof.ts",
  "scripts/audit/runAiEstimateLimitedPublicBetaDailyMonitor.ts",
  "scripts/release/runReleaseVerifyWithStepTiming.ts",
  "tests/e2e/aiEstimateLimitedPublicBeta.web.spec.ts",
];

export function limitedPublicBetaFiles(): string[] {
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
  LIMITED_PUBLIC_BETA_ARCHITECTURE_ROOTS.forEach(walk);
  return [...new Set(files)].sort();
}

export function readLimitedPublicBetaSources(): string {
  return limitedPublicBetaFiles()
    .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
    .join("\n");
}

export function expectNoLimitedPublicBetaPattern(pattern: RegExp, label: string): void {
  const findings = limitedPublicBetaFiles()
    .filter((file) => pattern.test(fs.readFileSync(path.join(process.cwd(), file), "utf8")))
    .map((file) => `${file}:${label}`);
  expect(findings).toEqual([]);
}
