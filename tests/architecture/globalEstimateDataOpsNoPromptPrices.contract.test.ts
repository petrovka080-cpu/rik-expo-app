import fs from "node:fs";
import path from "node:path";

describe("architecture: Global Estimate Data Ops no prompt prices", () => {
  it("keeps price and tax governance in backend services, not prompt text", () => {
    const root = path.resolve(__dirname, "../..");
    const dataOps = fs.readFileSync(
      path.join(root, "src/lib/ai/globalEstimate/globalEstimateDataOpsAdmin.ts"),
      "utf8",
    );
    const toolSchema = fs.readFileSync(
      path.join(root, "src/lib/ai/globalEstimate/globalEstimateToolSchema.ts"),
      "utf8",
    );

    expect(dataOps).not.toMatch(/prompt.*price|price.*prompt/i);
    expect(toolSchema).not.toMatch(/НДС\s*20|VAT\s*20|sales tax.*8/i);
  });
});
