import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(filePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, filePath), "utf8");
}

function requiredReleaseGateSection(source: string): string {
  const start = source.indexOf("export const REQUIRED_RELEASE_GATES");
  const end = source.indexOf("export const FINAL_50K_92_GREEN_STATUS");
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("release verify read-only contract", () => {
  it("routes release proof gates through current-candidate read-only verification", () => {
    const guard = read("scripts/release/releaseGuard.shared.ts");
    const requiredGates = requiredReleaseGateSection(guard);
    const runGuard = read("scripts/release/run-release-guard.ts");

    expect(guard).toContain("runLiveBoqProductGate.ts --mode=verify-runtime");
    expect(requiredGates).toContain("scripts/release/android/verifyProof.ts");
    expect(guard).toContain("verifyExistingProofArtifact.ts");
    expect(runGuard).toContain("S_RELEASE_PROOF_PIPELINE_STABILIZATION");
    expect(guard).not.toContain("runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts --mode=verify");
    expect(requiredGates).not.toContain("runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts --mode=verify");
    expect(requiredGates).not.toContain("S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX/matrix.json");
  });

  it("keeps the executable read-only assertion available for full release verification", () => {
    const source = read("scripts/release/assertReleaseVerifyIsReadOnly.ts");

    expect(source).toContain("git status");
    expect(source).toContain("npm");
    expect(source).toContain("release:verify");
    expect(source).toContain("GREEN_RELEASE_VERIFY_READ_ONLY");
    expect(source).toContain("fake_green_claimed: false");
  });

  it("can run the full read-only release verify gate when explicitly requested", () => {
    if (process.env.RUN_RELEASE_VERIFY_READONLY_CONTRACT !== "1") {
      expect(process.env.RUN_RELEASE_VERIFY_READONLY_CONTRACT).not.toBe("1");
      return;
    }

    const result = spawnSync("node", ["node_modules/tsx/dist/cli.mjs", "scripts/release/assertReleaseVerifyIsReadOnly.ts"], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      shell: process.platform === "win32",
      timeout: 30 * 60 * 1000,
    });
    expect(result.status).toBe(0);
  });
});
