import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("request estimate price trace UI", () => {
  it("renders public price status without internal trace noise for every estimate item row", () => {
    const source = fs.readFileSync(path.join(PROJECT_ROOT, "src/features/consumerRepair/ConsumerRepairItemRow.tsx"), "utf8");

    expect(source).toContain("consumer-repair-item-price-trace");
    expect(source).toContain("\\u0426\\u0435\\u043d\\u0430 \\u043d\\u0435 \\u0437\\u0430\\u043f\\u043e\\u043b\\u043d\\u0435\\u043d\\u0430");
    expect(source).toContain("\\u0418\\u0441\\u0442\\u043e\\u0447\\u043d\\u0438\\u043a \\u0446\\u0435\\u043d\\u044b \\u043d\\u0435 \\u0432\\u044b\\u0431\\u0440\\u0430\\u043d");
    expect(source).toContain("priceTraceVisibleLabel");
    expect(source).not.toContain("price_source_type");
    expect(source).not.toContain("price_source_id");
    expect(source).not.toContain("\"PRICE_MISSING\"");
  });
});
