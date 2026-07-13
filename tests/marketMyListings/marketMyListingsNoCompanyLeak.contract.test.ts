import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("market my listings no company leak contract", () => {
  it("does not widen personal history to company membership or shared seller scope", () => {
    const migration = read("supabase/migrations/20260701090000_marketplace_my_listings_scope_page_v1.sql");
    const block = read("src/features/market/components/MarketMyListingsBlock.tsx");

    expect(migration).not.toContain("rls_current_user_company_member_v1");
    expect(migration).not.toContain("company_member");
    expect(migration).not.toContain("idx_market_listings_my_company_created_v1");
    expect(migration).not.toMatch(/or\s+.*company_id\s*=/i);
    expect(block).not.toContain("backend-");
    expect(block).not.toContain(" policy");
    expect(block).not.toContain("} total");
    expect(block).not.toContain("market-my-listings-edit-disabled");
    expect(block).not.toContain("market-my-listings-archive-disabled");
  });
});
