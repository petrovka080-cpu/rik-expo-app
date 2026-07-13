import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("market my listings owner-only contract", () => {
  it("uses auth.uid in the backend RPC and never relies on client-side owner filtering", () => {
    const migration = read("supabase/migrations/20260701090000_marketplace_my_listings_scope_page_v1.sql");
    const repository = read("src/features/market/market.repository.ts");
    const transport = read("src/features/market/market.repository.transport.ts");

    expect(migration).toContain("create or replace function public.marketplace_my_listings_scope_page_v1");
    expect(migration).toContain("where auth.uid() is not null");
    expect(migration).toContain("and ml.user_id = auth.uid()");
    expect(migration).toContain("limit greatest(least(coalesce(p_limit, 8), 24), 1)");
    expect(repository).toContain("loadMarketMyListingsPage");
    expect(repository).toContain('rpcName: "marketplace_my_listings_scope_page_v1"');
    expect(transport).toContain('supabase.rpc("marketplace_my_listings_scope_page_v1"');
    expect(repository).not.toMatch(/listing\.user_id\s*===\s*auth|filter\([^)]*user_id/i);
  });
});
