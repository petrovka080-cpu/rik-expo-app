import fs from "node:fs";

describe("global estimate data ops no destructive operations", () => {
  it("does not contain destructive SQL or hard-delete admin operations", () => {
    const source = fs.readFileSync("src/lib/ai/globalEstimate/globalEstimateDataOpsAdmin.ts", "utf8");

    expect(source).not.toMatch(/\bdrop\s+table\b/i);
    expect(source).not.toMatch(/\btruncate\s+table\b/i);
    expect(source).not.toMatch(/\bdelete\s+from\b/i);
    expect(source).toContain("GLOBAL_ESTIMATE_DATA_OPS_DESTRUCTIVE_OPERATION_BLOCKED");
  });
});
