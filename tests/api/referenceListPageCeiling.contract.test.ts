import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S-REFERENCE-LISTS-PAGE-CEILING-1 contract", () => {
  it("routes remaining reference list page-through readers through max row ceilings", () => {
    const calcFields = read("src/components/foreman/useCalcFields.ts");
    expect(calcFields).toContain("const CALC_FIELDS_PAGE_DEFAULTS = {");
    expect(calcFields).toContain("maxRows: 5000");
    expect(calcFields).toContain("loadPagedRowsWithCeiling<unknown>");
    expect(calcFields).toContain(".order(\"sort_order\",");
    expect(calcFields).toContain(".order(\"basis_key\",");
    expect(calcFields).not.toContain("while (true)");

    const foremanDicts = read("src/screens/foreman/foreman.dicts.repo.ts");
    expect(foremanDicts).toContain("const FOREMAN_DICT_LIST_PAGE_DEFAULTS = {");
    expect(foremanDicts).toContain("maxRows: 5000");
    expect(foremanDicts).toContain("loadPagedRowsWithCeiling<T>");
    expect(foremanDicts).toContain(".order(\"code\",");
    expect(foremanDicts).toContain(".order(\"app_code\",");
    expect(foremanDicts).not.toContain("while (true)");

    const profileMembershipTransport = read(
      "src/screens/profile/profile.membership.transport.ts",
    );
    expect(profileMembershipTransport).toContain(
      "const PROFILE_MEMBERSHIP_PAGE_DEFAULTS = {",
    );
    expect(profileMembershipTransport).toContain("maxRows: 5000");
    expect(profileMembershipTransport).toContain(
      "loadPagedRowsWithCeiling<CompanyMembershipRow>",
    );
    expect(profileMembershipTransport).toContain(".eq(\"user_id\", userId)");
    expect(profileMembershipTransport).toContain(".order(\"company_id\",");
  });
});
