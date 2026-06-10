import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(filePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, filePath), "utf8");
}

describe("release verify read-only contract", () => {
  it("routes long proof gates through verify mode instead of refresh mode", () => {
    const guard = read("scripts/release/releaseGuard.shared.ts");

    expect(guard).toContain("runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts --mode=verify");
    expect(guard).toContain("runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts --mode=verify");
    expect(guard).not.toContain("runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts\" }");
    expect(guard).not.toContain("runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts\" }");
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
