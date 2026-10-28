import fs from "fs";
import path from "path";

describe("officeAccess.services source contract", () => {
  it("keeps bootstrap and explicit assignment semantics narrow", () => {
    const servicePath = path.join(
      process.cwd(),
      "src/screens/office/officeAccess.services.ts",
    );
    const transportPath = path.join(
      process.cwd(),
      "src/screens/office/officeAccess.transport.ts",
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const transport = fs.readFileSync(transportPath, "utf8");

    expect(source).toContain('status: "pending"');
    expect(source).toContain('.from("companies")');
    expect(source).toContain('.from("company_members")');
    expect(source).toContain('.from("company_invites")');
    expect(source).not.toContain("insertOfficeCompanyMember(");
    expect(source).not.toContain("insertOfficeCompanyProfile(");
    expect(source).not.toContain('supabase.from("company_members").insert');
    expect(source).not.toContain('supabase.from("company_profiles").insert');
    expect(transport).not.toContain('.from("company_members")');
    expect(transport).not.toContain('.from("company_profiles")');
    expect(source).toContain('{ count: "exact" }');
    expect(source).toContain(".range(");
    expect(source).not.toContain('role: "buyer"');
    expect(source).not.toContain('role: "foreman"');
    expect(source).not.toContain('role: "warehouse"');
  });
});
