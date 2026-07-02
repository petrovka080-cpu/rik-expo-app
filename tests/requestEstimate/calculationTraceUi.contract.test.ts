import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("request estimate calculation trace UI", () => {
  it("keeps a collapsible calculation trace control for every traceable item row", () => {
    const source = fs.readFileSync(path.join(PROJECT_ROOT, "src/features/consumerRepair/ConsumerRepairItemRow.tsx"), "utf8");

    expect(source).toContain("consumer-repair-item-calculation-toggle");
    expect(source).toContain("consumer-repair-item-calculation-trace");
    expect(source).toContain("formula_id");
    expect(source).toContain("template_version");
    expect(source).toContain("source_parameters");
  });
});
