import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("request estimate price UI", () => {
  it("shows one clean empty-price affordance without internal trace noise", () => {
    const source = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/features/consumerRepair/ConsumerRepairItemRow.tsx"),
      "utf8",
    );

    expect(source).toContain('placeholder="Укажите цену"');
    expect(source).toContain('"\\u2014"');
    expect(source).not.toContain("consumer-repair-item-price-trace");
    expect(source).not.toContain("priceTraceVisibleLabel");
    expect(source).not.toContain("price_source_type");
    expect(source).not.toContain("price_source_id");
    expect(source).not.toContain("\"PRICE_MISSING\"");
  });
});
