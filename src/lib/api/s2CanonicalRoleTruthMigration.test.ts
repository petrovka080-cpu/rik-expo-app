import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416183000_s2_canonical_role_truth.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("S2 canonical role truth migration", () => {
  it("introduces one membership-first role context helper with hardened search path", () => {
    expect(source).toContain("create or replace function public.app_actor_role_context_v1");
    expect(source).toContain("set search_path = ''");
    expect(source).toContain("from public.company_members cm");
    expect(source).toContain("from public.profiles p");
    expect(source).toContain("auth.jwt() -> 'app_metadata' ->> 'role'");
    expect(source).toContain("public.get_my_role()");

    const membershipIndex = source.indexOf("from public.company_members cm");
    const profileIndex = source.indexOf("from public.profiles p");
    const appMetadataIndex = source.indexOf("auth.jwt() -> 'app_metadata' ->> 'role'");
    const getMyRoleIndex = source.indexOf("public.get_my_role()");

    expect(membershipIndex).toBeGreaterThan(-1);
    expect(profileIndex).toBeGreaterThan(membershipIndex);
    expect(appMetadataIndex).toBeGreaterThan(profileIndex);
    expect(getMyRoleIndex).toBeGreaterThan(appMetadataIndex);
  });

  it("does not let lower priority fallbacks override explicit source denial", () => {
    expect(source).toContain("source_role_forbidden");
    expect(source).toContain("Lower-priority sources do not override explicit higher-priority DB truth");
  });

  it("keeps RFQ buyer-only through the canonical role helper", () => {
    expect(source).toContain("create or replace function public.buyer_rfq_actor_is_buyer_v1()");
    expect(source).toContain("public.app_actor_role_context_v1(array['buyer'])");
    expect(source).toContain("and coalesce(v_context ->> 'role', '') = 'buyer'");
    expect(source).not.toContain("array['buyer', 'contractor']");
  });

  it("keeps proposal attachment business allow-lists outside the resolver", () => {
    expect(source).toContain("create or replace function public.proposal_attachment_actor_role_v1");
    expect(source).toContain("public.app_actor_role_context_v1(array['buyer', 'director', 'accountant'])");
    expect(source).not.toContain("array['buyer', 'director', 'accountant', 'contractor']");
  });
});
