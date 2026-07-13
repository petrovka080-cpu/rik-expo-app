import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("market my listings owner scope", () => {
  it("keeps the backend history scoped to the authenticated listing owner only", () => {
    const migration = read("supabase/migrations/20260701090000_marketplace_my_listings_scope_page_v1.sql");

    expect(migration).toContain("create or replace function public.marketplace_my_listings_scope_page_v1");
    expect(migration).toContain("where auth.uid() is not null");
    expect(migration).toContain("and ml.user_id = auth.uid()");
    expect(migration).toContain("limit greatest(least(coalesce(p_limit, 8), 24), 1)");
    expect(migration).not.toContain("rls_current_user_company_member_v1");
    expect(migration).not.toContain("idx_market_listings_my_company_created_v1");
  });

  it("renders my listings as a vertical page list, not a horizontal carousel", () => {
    const block = read("src/features/market/components/MarketMyListingsBlock.tsx");

    expect(block).toContain('testID="market-my-listings-history"');
    expect(block).toContain('width: "100%"');
    expect(block).toContain("STATUS_SUMMARY_LABELS");
    expect(block).toContain("formatListingCount");
    expect(block).not.toMatch(/\bhorizontal\b/);
    expect(block).not.toContain("showsHorizontalScrollIndicator");
    expect(block).not.toContain("ScrollView");
    expect(block).not.toContain("backend-");
    expect(block).not.toContain(" policy");
    expect(block).not.toContain("} total");
    expect(block).not.toContain("market-my-listings-edit-disabled");
    expect(block).not.toContain("market-my-listings-archive-disabled");
  });

  it("keeps the owner entry points out of the public market home feed", () => {
    const marketHome = read("src/features/market/MarketHomeScreen.tsx");
    const marketController = read("src/features/market/useMarketHomeController.ts");

    expect(marketHome).not.toContain("market-my-listings");
    expect(marketController).not.toContain("MARKET_MY_LISTINGS_ROUTE");
  });

  it("uses an icon-only profile return action instead of fragile browser history", () => {
    const screen = read("src/features/market/MarketMyListingsScreen.tsx");
    const controller = read("src/features/market/useMarketMyListingsController.ts");

    expect(screen).toContain('testID="market-my-listings-back"');
    expect(screen).not.toContain("navButtonText");
    expect(screen).not.toContain("<Text style={styles.navButtonText}");
    expect(controller).toContain("MARKET_PROFILE_ROUTE");
    expect(controller).toContain("router.replace(MARKET_PROFILE_ROUTE)");
    expect(controller).not.toContain("safeBack");
    expect(controller).not.toContain("MARKET_TAB_ROUTE");
  });
});
