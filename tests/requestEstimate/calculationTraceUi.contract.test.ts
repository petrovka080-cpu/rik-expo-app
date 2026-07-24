import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("request estimate calculation trace UI", () => {
  it("keeps raw calculation provenance out of the production item row", () => {
    const source = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/features/consumerRepair/ConsumerRepairItemRow.tsx"),
      "utf8",
    );

    expect(source).not.toContain("consumer-repair-item-calculation-toggle");
    expect(source).not.toContain("consumer-repair-item-calculation-trace");
    expect(source).not.toContain("formula_id");
    expect(source).not.toContain("template_version");
    expect(source).not.toContain("source_parameters");
  });
});
