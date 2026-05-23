import fs from "node:fs";
import path from "node:path";

const files = [
  ["warehouse recipient modal", "src/screens/warehouse/components/WarehouseRecipientModal.tsx"],
  ["buyer rework sheet body", "src/screens/buyer/components/BuyerReworkSheetBody.tsx"],
  ["accountant active payment form", "src/screens/accountant/components/ActivePaymentForm.tsx"],
  ["contractor screen controller", "src/screens/contractor/useContractorScreenController.ts"],
] as const;

describe("UI unused variable suppression discipline", () => {
  it.each(files)("does not suppress unused vars in %s", (_label, relativePath) => {
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

    expect(source).not.toContain("@typescript-eslint/no-unused-vars");
    expect(source).not.toContain("eslint-disable-next-line @typescript-eslint/no-unused-vars");
  });
});
