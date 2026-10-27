import fs from "fs";
import path from "path";

describe("SupplierShowcaseScreen seller boundary contract", () => {
  it("does not depend on profile semantics for seller owner actions", () => {
    const filePath = path.join(
      process.cwd(),
      "src/features/supplierShowcase/SupplierShowcaseScreen.tsx",
    );
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain('context: payload.isOwnerView ? "seller" : "market"');
    expect(source).toContain("router.push(SELLER_ROUTE)");
    expect(source).toContain("Кабинет продавца");

    expect(source).not.toContain('context: "profile"');
    expect(source).not.toContain("Read-only");
    expect(source).not.toContain("seller-контур");
    expect(source).not.toContain("Seller Area");
  });
});
