import fs from "node:fs";
import path from "node:path";

export const CANARY_EVALUATION_ARCHITECTURE_ROOTS = [
  "src/lib/ai/productionCanary",
  "scripts/e2e/aiEstimateCanaryEvaluationCore.ts",
  "scripts/e2e/runAiEstimateCanaryEvaluationProof.ts",
  "scripts/e2e/runAiEstimateCanaryEvaluationRollbackRedrill.ts",
  "scripts/e2e/runAndroidApi34AiEstimateCanaryEvaluationSmoke.ts",
  "scripts/audit/runAiEstimateCanaryEvidenceLedgerAudit.ts",
  "scripts/audit/runAiEstimateCanaryFeedbackEvaluation.ts",
  "scripts/audit/runAiEstimateCanaryRolloutDecision.ts",
  "scripts/audit/runAiEstimateManualEstimatorReviewSample.ts",
  "scripts/audit/runAiEstimateRealUsageEvaluation.ts",
  "tests/e2e/aiEstimateCanaryEvaluation.web.spec.ts",
];

export function canaryEvaluationFiles(): string[] {
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
  CANARY_EVALUATION_ARCHITECTURE_ROOTS.forEach(walk);
  return [...new Set(files)].sort();
}

export function expectNoCanaryEvaluationPattern(pattern: RegExp, label: string): void {
  const findings = canaryEvaluationFiles()
    .filter((file) => pattern.test(fs.readFileSync(path.join(process.cwd(), file), "utf8")))
    .map((file) => `${file}:${label}`);
  expect(findings).toEqual([]);
}
