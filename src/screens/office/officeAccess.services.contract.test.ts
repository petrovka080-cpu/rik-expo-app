import fs from "fs";
import path from "path";

describe("officeAccess.services source contract", () => {
  it("keeps bootstrap and explicit assignment semantics narrow", () => {
    const filePath = path.join(
      process.cwd(),
      "src/screens/office/officeAccess.services.ts",
    );
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain('role: OFFICE_BOOTSTRAP_ROLE');
    expect(source).toContain('status: "pending"');
    expect(source).toContain('.from("companies")');
    expect(source).toContain('.from("company_profiles")');
    expect(source).toContain('.from("company_members")');
    expect(source).toContain('.from("company_invites")');
    expect(source).toContain('{ count: "exact" }');
    expect(source).toContain(".range(");
    expect(source).not.toContain('role: "buyer"');
    expect(source).not.toContain('role: "foreman"');
    expect(source).not.toContain('role: "warehouse"');
  });
});
