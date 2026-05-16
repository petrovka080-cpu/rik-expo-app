import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI procurement ready options no fake suppliers architecture", () => {
  it("requires supplier evidence and keeps no-options copy explicit", () => {
    const combined = [
      "src/features/ai/procurement/aiBuyerInboxReadyBuyOptions.ts",
      "src/features/ai/procurement/aiProcurementRequestOptionHydrator.ts",
      "src/features/ai/procurement/aiProcurementReadyBuyOptionPolicy.ts",
      "src/features/ai/procurement/aiProcurementReadyBuyOptionTypes.ts",
    ].map(read).join("\n");

    expect(combined).toContain("hasReadyBuyInternalSupplierEvidence");
    expect(combined).toContain("hasCitedExternalReadyBuyPreview");
    expect(combined).toContain("Готовых внутренних поставщиков не найдено");
    expect(combined).toContain("fakeSuppliersAllowed: false");
    expect(combined).toContain("fakePricesAllowed: false");
    expect(combined).toContain("fakeAvailabilityAllowed: false");
    expect(combined).not.toMatch(/supplierName:\s*["']Supplier A["']|supplierName:\s*["']Supplier B["']/);
    expect(combined).not.toMatch(/priceSignal:\s*["']\d+|deliverySignal:\s*["']\d+\s*(day|дн)/i);
  });
});
