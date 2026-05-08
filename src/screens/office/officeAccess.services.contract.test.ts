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

    expect(source).toContain('role: OFFICE_BOOTSTRAP_ROLE');
    expect(source).toContain('status: "pending"');
    expect(source).toContain('.from("companies")');
    expect(source).toContain('.from("company_members")');
    expect(source).toContain('.from("company_invites")');
    expect(source).toContain("insertOfficeCompanyMember({");
    expect(source).toContain("insertOfficeCompanyProfile(");
    expect(source).not.toContain('supabase.from("company_members").insert');
    expect(source).not.toContain('supabase.from("company_profiles").insert');
    expect(transport).toContain('supabase.from("company_members").insert(payload)');
    expect(transport).toContain('supabase.from("company_profiles").insert(payload)');
    expect(source).toContain('{ count: "exact" }');
    expect(source).toContain(".range(");
    expect(source).not.toContain('role: "buyer"');
    expect(source).not.toContain('role: "foreman"');
    expect(source).not.toContain('role: "warehouse"');
  });
});
