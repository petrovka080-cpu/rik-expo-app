import fs from "node:fs";
import path from "node:path";

import { DEVELOPER_OVERRIDE_ROLES } from "../../src/lib/developerOverride";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260928120000_platform_developer_estimator_full_access.sql",
);
const source = fs.readFileSync(migrationPath, "utf8").toLowerCase();

describe("platform developer all-role entitlement migration", () => {
  it("aligns the protected server catalog with every selectable developer role", () => {
    for (const role of DEVELOPER_OVERRIDE_ROLES) {
      expect(source).toContain(`'${role}'`);
    }
    expect(source).toContain("developer_access_overrides_allowed_roles_check");
    expect(source).toContain("allowed_roles <@ array[");
  });

  it("updates only existing platform-developer entitlements", () => {
    expect(source).toContain("update public.developer_access_overrides");
    expect(source).toContain("where entitlement = 'platform_developer'");
    expect(source).toContain("column_name = 'entitlement'");
    expect(source).toContain("where is_enabled = true");
    expect(source).toContain("and can_access_all_office_routes = true");
    expect(source).toContain("and can_impersonate_for_mutations = true");
    expect(source).toContain("and allowed_roles @> array[");
    expect(source).not.toMatch(
      /(?:insert\s+into|update|delete\s+from)\s+public\.company_members/,
    );
    expect(source).not.toMatch(
      /(?:insert\s+into|update|delete\s+from)\s+public\.user_profiles/,
    );
    expect(source).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(source).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    );
  });
});
