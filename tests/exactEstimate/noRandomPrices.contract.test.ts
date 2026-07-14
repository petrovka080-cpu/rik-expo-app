import fs from "node:fs";

import { resolveExactMaterialRate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { exactEstimateSourceFiles } from "./exactEstimateTestHelpers";

describe("no random price policy", () => {
  it("does not use random/date fallback or unknown-material default prices", () => {
    const source = exactEstimateSourceFiles().map((file) => fs.readFileSync(file, "utf8")).join("\n");

    expect(source).not.toMatch(/Math\.random\s*\(/);
    expect(source).not.toMatch(/Date\.now\s*\(/);
    expect(source).not.toMatch(/fallback\s*price/i);

    const unknown = resolveExactMaterialRate({
      materialId: "unknown_material_for_contract",
      rateKey: "unknown_material_for_contract",
      unit: "sq_m",
      region: "KG-Bishkek",
      priceDate: "2026-06-12",
      currency: "KGS",
    });
    expect(unknown.price_status).toBe("PRICE_MISSING");
    expect(unknown.price_value).toBeNull();
  });
});
