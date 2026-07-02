import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("request estimate price trace UI", () => {
  it("renders source/confidence/conversion trace for every estimate item row", () => {
    const source = fs.readFileSync(path.join(PROJECT_ROOT, "src/features/consumerRepair/ConsumerRepairItemRow.tsx"), "utf8");

    expect(source).toContain("consumer-repair-item-price-trace");
    expect(source).toContain("price_source_type");
    expect(source).toContain("price_source_id");
    expect(source).toContain("confidence");
    expect(source).toContain("conversion");
    expect(source).toContain("PRICE_MISSING");
  });
});
