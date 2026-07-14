import { readFileSync } from "node:fs";

describe("daily estimate product pilot command", () => {
  it("chains lineage, sentinel, dashboard, drift, support, feedback, and real browser smokes", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    const command = packageJson.scripts["verify:estimate-product-pilot"];
    expect(command).toContain("assertEstimateArtifactsMatchHead");
    expect(command).toContain("assertNoEstimateProductRegression");
    expect(command).toContain("buildEstimateProductHealthDashboard");
    expect(command).toContain("auditEstimateQualityDrift");
    expect(command).toContain("exportEstimateSupportPackage");
    expect(command).toContain("ingestEstimatorFeedback");
    expect(command).toContain("runEstimatePilotObservabilityWebSmoke.ts --target=web --require-real-browser");
    expect(command).toContain("runEstimatePilotObservabilityAndroidSmoke.ts --target=android-chrome --require-real-browser");
  });
});
