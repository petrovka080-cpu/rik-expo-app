import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416124500_attachment_role_priority_submit_conflict_recovery_h1_4.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("attachment role priority recovery migration", () => {
  it("keeps the attachment role helper scoped to buyer/director/accountant first", () => {
    expect(source).toContain("create or replace function public.proposal_attachment_actor_role_v1");
    expect(source).toContain("from public.profiles p");
    expect(source).toContain("from public.company_members cm");
    expect(source).toContain("in ('buyer', 'director', 'accountant')");
  });

  it("uses get_my_role only after explicit app role sources", () => {
    const profileIndex = source.indexOf("from public.profiles p");
    const membershipIndex = source.indexOf("from public.company_members cm");
    const getMyRoleIndex = source.indexOf("public.get_my_role()");

    expect(profileIndex).toBeGreaterThan(-1);
    expect(membershipIndex).toBeGreaterThan(profileIndex);
    expect(getMyRoleIndex).toBeGreaterThan(membershipIndex);
  });

  it("documents that contractor is compatibility fallback, not an allow-list role", () => {
    expect(source).toContain("contractor compatibility fallback");
    expect(source).not.toContain("in ('buyer', 'accountant', 'contractor')");
  });
});
