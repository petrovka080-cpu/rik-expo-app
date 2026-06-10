import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(filePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, filePath), "utf8");
}

function gitStatus(): string {
  const result = spawnSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  expect(result.status).toBe(0);
  return result.stdout.replace(/\r\n/g, "\n");
}

describe("release verify does not write tracked artifacts", () => {
  it("uses read-only artifact verification for known tracked-artifact repaint gates", () => {
    const guard = read("scripts/release/releaseGuard.shared.ts");
    const refreshRunners = [
      "scripts/e2e/runAiEstimateCoreCompletionProof.ts --require-live",
      "scripts/e2e/runAiEstimatePdfTabularRegressionProof.ts",
      "scripts/e2e/runBuiltInAi10000PostBoqCatalogProof.ts",
      "scripts/e2e/runCatalogItemsGlobalEstimateBindingProof.ts",
      "scripts/e2e/runRequestEstimateDraftStatePayloadProof.ts",
      "scripts/e2e/runRequestEstimateStateMachineProof.ts",
      "scripts/e2e/runSourceGovernanceProof.ts",
      "scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate.ts",
      "scripts/e2e/runEnterpriseVisible1000StructuredEstimateRealInputAcceptance.ts",
    ];

    expect(guard).toContain("verifyExistingProofArtifact.ts");
    for (const runner of refreshRunners) {
      expect(guard).not.toContain(`npx tsx ${runner}`);
    }
  });

  it("keeps the artifact verifier itself read-only", () => {
    const before = gitStatus();
    const result = spawnSync(
      "node",
      [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/release/verifyExistingProofArtifact.ts",
        "--artifact",
        "artifacts/S_AI_ESTIMATE_CORE_COMPLETION_matrix.json",
        "--expect-status",
        "GREEN_AI_ESTIMATE_CORE_COMPLETION_READY",
        "--expect-fake-green",
        "false",
      ],
      {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        shell: process.platform === "win32",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60_000,
      },
    );
    const after = gitStatus();

    expect(result.status).toBe(0);
    expect(after).toBe(before);
  });
});
