import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("controlled pilot daily verifier command", () => {
  it("runs dashboard, web smoke, Android emulator smoke, lineage, support dry-run, and secret scan", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"));
    const command = packageJson.scripts["verify:estimate-controlled-pilot"];
    expect(command).toEqual(expect.any(String));
    expect(command).toContain("scripts/estimate/buildControlledPilotHealthDashboard.ts --verify-policy");
    expect(command).toContain("scripts/e2e/runControlledPilotWebSmoke.ts --target=web --cases=pilot-critical --require-real-browser");
    expect(command).toContain("scripts/e2e/runControlledPilotAndroidEmulatorSmoke.ts --target=android-chrome --cases=pilot-critical --require-real-browser --require-emulator");
    expect(command).toContain("scripts/estimate/buildControlledPilotHealthDashboard.ts --verify");
    expect(command).toContain("scripts/estimate/assertNoEstimateProductRegression.ts");
    expect(command).toContain("scripts/estimate/assertEstimateArtifactsMatchHead.ts");
    expect(command).toContain("scripts/estimate/exportControlledPilotSupportPackage.ts --verify");
    expect(command).toContain("scripts/release/scanCloseoutArtifactsForSecrets.ts artifacts .release-runtime");
    expect(command).toContain("&&");
  });
});
