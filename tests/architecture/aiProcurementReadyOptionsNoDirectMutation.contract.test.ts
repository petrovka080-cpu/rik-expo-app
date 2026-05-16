import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI procurement ready options no direct mutation architecture", () => {
  it("does not introduce direct order, payment, or warehouse mutation paths", () => {
    const combined = [
      "src/features/ai/procurement/aiBuyerInboxReadyBuyOptions.ts",
      "src/features/ai/procurement/aiProcurementRequestOptionHydrator.ts",
      "src/features/ai/procurement/aiProcurementReadyBuyOptionPolicy.ts",
      "src/features/ai/procurement/aiProcurementReadyBuyOptionTypes.ts",
      "src/screens/buyer/components/BuyerReadyBuyOptionsBlock.tsx",
    ].map(read).join("\n");

    expect(combined).not.toMatch(/\bcreateOrder\b|\bconfirmSupplier\b|\bcreatePayment\b|\bwarehouseMutation\b/i);
    expect(combined).not.toMatch(/directOrderAllowed:\s*true|directPaymentAllowed:\s*true|directWarehouseMutationAllowed:\s*true/i);
    expect(combined).toContain("directOrderAllowed: false");
    expect(combined).toContain("directPaymentAllowed: false");
    expect(combined).toContain("directWarehouseMutationAllowed: false");
    expect(combined).toContain("providerCallAllowed: false");
    expect(combined).toContain("dbWriteAllowed: false");
  });
});
