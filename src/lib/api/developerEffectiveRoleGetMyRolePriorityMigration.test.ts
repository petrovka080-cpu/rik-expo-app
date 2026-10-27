import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  __dirname,
  "../../../supabase/migrations/20260922030000_developer_effective_role_get_my_role_priority.sql",
);
const source = fs.readFileSync(migrationPath, "utf8").toLowerCase();

describe("developer effective-role get_my_role priority migration", () => {
  it("keeps denied canonical principals fail-closed before override resolution", () => {
    const revoked = source.indexOf("if v_base_role = 'revoked'");
    const crossTenant = source.indexOf("if v_base_role = 'cross_tenant'");
    const overrideLoad = source.indexOf("public.developer_override_context_v1()");

    expect(revoked).toBeGreaterThan(-1);
    expect(crossTenant).toBeGreaterThan(revoked);
    expect(overrideLoad).toBeGreaterThan(crossTenant);
  });

  it("requires the active override to belong to the actor and allow the role", () => {
    for (const clause of [
      "v_override ->> 'actoruserid' = v_actor_id::text",
      "v_override ->> 'isenabled' = 'true'",
      "v_override ->> 'isactive' = 'true'",
      "v_override ->> 'canaccessallofficeroutes' = 'true'",
      "v_override ->> 'canimpersonateformutations' = 'true'",
      "jsonb_array_elements_text",
      "lower(trim(allowed.role_name)) = v_effective_role",
    ]) {
      expect(source).toContain(clause);
    }
  });

  it("gives the authorized effective role priority over contractor compatibility", () => {
    const effectiveRoleReturn = source.indexOf("return v_effective_role;");
    const contractorLookup = source.indexOf("from public.user_profiles up");
    const contractorReturn = source.indexOf("return 'contractor';");

    expect(effectiveRoleReturn).toBeGreaterThan(-1);
    expect(contractorLookup).toBeGreaterThan(effectiveRoleReturn);
    expect(contractorReturn).toBeGreaterThan(contractorLookup);
  });

  it("does not broaden execution and contains no entitlement data mutation", () => {
    expect(source).toContain(
      "revoke all on function public.get_my_role() from public, anon",
    );
    expect(source).toContain(
      "grant execute on function public.get_my_role() to authenticated, service_role",
    );
    expect(source).not.toMatch(/(?:insert\s+into|update|delete\s+from)\s+public\.developer_access_overrides/);
    expect(source).not.toMatch(/(?:insert\s+into|update|delete\s+from)\s+public\.company_members/);
    expect(source).not.toMatch(/(?:insert\s+into|update|delete\s+from)\s+public\.user_profiles/);
  });
});
