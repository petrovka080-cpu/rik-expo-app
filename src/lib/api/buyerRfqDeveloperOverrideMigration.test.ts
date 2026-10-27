import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416202000_h1_8b_buyer_rfq_override_publish.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("H1.8b buyer RFQ developer override migration", () => {
  it("connects RFQ actor resolution to the override-aware server helper", () => {
    expect(source).toContain("create or replace function public.buyer_rfq_actor_context_v1()");
    expect(source).toContain("public.app_actor_role_context_v1(array['buyer'])");
    expect(source).toContain("'source', coalesce(v_context ->> 'source', 'none')");
    expect(source).toContain("'override', coalesce((v_context ->> 'override')::boolean, false)");
  });

  it("keeps publish buyer-only instead of allowing contractor directly", () => {
    expect(source).toContain("nullif(lower(trim(coalesce(v_context ->> 'role', ''))), '') = 'buyer'");
    expect(source).toContain("create or replace function public.buyer_rfq_actor_is_buyer_v1()");
    expect(source).not.toContain("in ('buyer', 'contractor'");
    expect(source).not.toContain("array['buyer', 'contractor']");
  });

  it("makes the actual publish RPC use context diagnostics instead of raw get_my_role detail", () => {
    expect(source).toContain("v_actor_context jsonb := public.buyer_rfq_actor_context_v1()");
    expect(source).toContain("v_actor_is_buyer boolean := coalesce((v_actor_context ->> 'allowed')::boolean, false)");
    expect(source).toContain("detail = coalesce(v_actor_context::text, v_actor_role, 'unknown')");
    expect(source).not.toContain("v_actor_role text := nullif(lower(trim(coalesce(public.get_my_role()");
  });

  it("selects buyer as the initial effective role only for the seeded developer override", () => {
    expect(source).toContain("active_effective_role = 'buyer'");
    expect(source).toContain("where user_id = '9adc5ab1-31fa-41be-8a00-17eadbb37c39'::uuid");
    expect(source).toContain("and 'buyer' = any(allowed_roles)");
    expect(source).toContain("and (expires_at is null or expires_at > now())");
  });
});
