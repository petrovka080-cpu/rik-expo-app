import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416203500_h1_8b_buyer_rfq_override_publish_volatility.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

describe("H1.8b buyer RFQ override volatility migration", () => {
  it("marks RFQ override-aware helpers volatile because override role resolution writes audit rows", () => {
    expect(source).toContain("create or replace function public.buyer_rfq_actor_context_v1()");
    expect(source).toContain("volatile");
    expect(source).toContain("public.app_actor_role_context_v1(array['buyer'])");
    expect(source).toContain("create or replace function public.buyer_rfq_actor_is_buyer_v1()");
    expect(source).toContain("override-aware role resolution writes audit rows");
  });
});
