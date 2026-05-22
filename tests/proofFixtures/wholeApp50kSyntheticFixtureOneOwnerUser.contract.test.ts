import fs from "node:fs";
import path from "node:path";

describe("whole-app 50k synthetic fixture one owner user contract", () => {
  it("selects one existing auth user and never creates real auth users", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(source).toContain("select id from auth.users order by created_at asc limit 1");
    expect(source).toContain("real_auth_users_created: 0");
    expect(source).not.toMatch(/insert\s+into\s+auth\.users/i);
  });
});
