import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI ready proposals no direct mutation architecture", () => {
  it("does not introduce order, payment, or warehouse mutation paths", () => {
    const combined = [
      "src/features/ai/screenProposals/aiScreenReadyProposalEngine.ts",
      "src/features/ai/screenProposals/aiScreenReadyProposalPolicy.ts",
      "src/features/ai/procurement/aiApprovedRequestSupplierProposalHydrator.ts",
      "src/features/ai/procurement/aiSupplierProposalReadinessPolicy.ts",
    ].map(read).join("\n");

    expect(combined).not.toMatch(/\bcreateOrder\b|\bconfirmSupplier\b|\bcreatePayment\b|\bwarehouseMutation\b/i);
    expect(combined).not.toMatch(/directOrderAllowed:\s*true|directPaymentAllowed:\s*true|directWarehouseMutationAllowed:\s*true/i);
    expect(combined).toContain("directOrderAllowed: false");
    expect(combined).toContain("requiresApprovalForOrder: true");
    expect(combined).toContain("fakeSuppliersAllowed: false");
  });
});
