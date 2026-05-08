import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("supplier showcase auth transport boundary", () => {
  it("keeps current-user auth lookup behind the supplier showcase transport boundary", () => {
    const dataSource = read("src/features/supplierShowcase/supplierShowcase.data.ts");
    const authTransportSource = read("src/features/supplierShowcase/supplierShowcase.auth.transport.ts");

    expect(dataSource).toContain('from "./supplierShowcase.auth.transport"');
    expect(dataSource).not.toContain("auth.getUser");
    expect(dataSource).not.toMatch(/\bsupabase\s*\.\s*from\s*\(/);
    expect(authTransportSource).toContain("auth.getUser");
    expect(authTransportSource).toContain("loadSupplierShowcaseCurrentUserId");
  });
});
