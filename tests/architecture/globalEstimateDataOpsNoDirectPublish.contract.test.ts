import fs from "node:fs";

describe("global estimate data ops no direct publish", () => {
  it("requires approval and backend apply instead of direct UI publish", () => {
    const source = fs.readFileSync("src/lib/ai/globalEstimate/globalEstimateDataOpsAdmin.ts", "utf8");

    expect(source).toContain("requiresApprovedChange: true");
    expect(source).toContain("requiresBackendService: true");
    expect(source).toContain("directUiWrite: false");
    expect(source).not.toMatch(/from\(["']global_(?:rate|tax|estimate|work)/);
  });
});
