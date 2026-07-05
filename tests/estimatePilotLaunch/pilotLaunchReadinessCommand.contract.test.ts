import fs from "node:fs";

describe("pilot launch readiness command", () => {
  it("chains preconditions, real web/android smokes, rehearsals, defect validation, secret scan, lineage, and policy", () => {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const command = packageJson.scripts["verify:estimate-pilot-launch-readiness"];

    expect(command).toContain("scripts/estimate/validatePilotDefectBurndown.ts --verify-preconditions");
    expect(command).toContain("scripts/e2e/runPilotLaunchReadinessWebSmoke.ts --target=web --cases=pilot-launch --require-real-browser");
    expect(command).toContain("scripts/e2e/runPilotLaunchReadinessAndroidSmoke.ts --target=android-chrome --cases=pilot-launch --require-real-browser --require-emulator");
    expect(command).toContain("scripts/estimate/buildPilotDefectBurndown.ts --verify-kill-switch");
    expect(command).toContain("scripts/estimate/rehearseEstimatePilotRollback.ts");
    expect(command).toContain("scripts/estimate/validatePilotDefectBurndown.ts --verify-defects");
    expect(command).toContain("scripts/release/scanCloseoutArtifactsForSecrets.ts artifacts .release-runtime");
    expect(command).toContain("scripts/estimate/validatePilotDefectBurndown.ts --verify-lineage");
    expect(command).toContain("scripts/estimate/validatePilotDefectBurndown.ts --verify-policy");
    expect(command).toContain("scripts/estimate/validatePilotDefectBurndown.ts --verify-readiness");
    expect(command).toContain("&&");
  });
});
