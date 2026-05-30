import fs from "node:fs";
import path from "node:path";

export const OWNER_REPLAY_ARCHITECTURE_ROOTS = [
  "src/lib/ai/productionCanary/ownerAccountReplayTypes.ts",
  "src/lib/ai/productionCanary/resolveOwnerAccountReplayEligibility.ts",
  "src/lib/ai/productionCanary/validateOwnerAccountReplayPolicy.ts",
  "scripts/e2e/aiEstimateOwnerAccountLiveReplayCore.ts",
  "scripts/e2e/runAiEstimateOwnerAccountLiveReplayProof.ts",
  "scripts/e2e/runAiEstimateOwnerAccountKillSwitchProof.ts",
  "scripts/e2e/runAndroidApi34AiEstimateOwnerAccountLiveReplay.ts",
  "scripts/audit/runAiEstimateOwnerAccountTelemetryPrivacyAudit.ts",
  "scripts/release/releaseGuard.shared.ts",
  "scripts/release/run-release-guard.ts",
  "scripts/release/runReleaseVerifyWithStepTiming.ts",
  "tests/e2e/aiEstimateOwnerAccountLiveReplay.web.spec.ts",
];

export function ownerReplayFiles(): string[] {
  return OWNER_REPLAY_ARCHITECTURE_ROOTS.filter((relativePath) =>
    fs.existsSync(path.join(process.cwd(), relativePath)),
  );
}

export function readOwnerReplaySources(): string {
  return ownerReplayFiles()
    .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
    .join("\n");
}

export function expectNoOwnerReplayPattern(pattern: RegExp, label: string): void {
  const findings = ownerReplayFiles()
    .filter((file) => pattern.test(fs.readFileSync(path.join(process.cwd(), file), "utf8")))
    .map((file) => `${file}:${label}`);
  expect(findings).toEqual([]);
}
