import fs from "fs";
import path from "path";

const migrationPath = path.join(
  __dirname,
  "../../../supabase/migrations/20260416165000_buyer_rfq_actor_role_priority_h1_7.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("buyer RFQ actor role priority migration", () => {
  it("keeps RFQ publish buyer-only while resolving canonical buyer before contractor override", () => {
    expect(source).toContain("create or replace function public.buyer_rfq_actor_is_buyer_v1()");
    expect(source).toContain("from public.profiles p");
    expect(source).toContain("lower(trim(coalesce(p.role, ''))) = 'buyer'");
    expect(source).toContain("from public.company_members cm");
    expect(source).toContain("lower(trim(coalesce(cm.role, ''))) = 'buyer'");
    expect(source).toContain("auth.jwt() -> 'app_metadata' ->> 'role'");
    expect(source).toContain("public.get_my_role()");

    const profileIndex = source.indexOf("from public.profiles p");
    const membershipIndex = source.indexOf("from public.company_members cm");
    const appMetadataIndex = source.indexOf("auth.jwt() -> 'app_metadata' ->> 'role'");
    const getMyRoleIndex = source.indexOf("public.get_my_role()");

    expect(profileIndex).toBeGreaterThan(-1);
    expect(membershipIndex).toBeGreaterThan(profileIndex);
    expect(appMetadataIndex).toBeGreaterThan(membershipIndex);
    expect(getMyRoleIndex).toBeGreaterThan(appMetadataIndex);
    expect(source).not.toContain("in ('buyer', 'director'");
    expect(source).not.toContain("in ('buyer', 'contractor'");
  });

  it("keeps invalid actors forbidden and exposes the rejected server role for diagnostics", () => {
    expect(source).toContain("v_actor_is_buyer boolean := public.buyer_rfq_actor_is_buyer_v1()");
    expect(source).toContain("if not v_actor_is_buyer then");
    expect(source).toContain("buyer_rfq_create_and_publish_v1: forbidden actor role");
    expect(source).toContain("using errcode = '42501'");
    expect(source).toContain("detail = coalesce(v_actor_role, 'unknown')");
  });
});
