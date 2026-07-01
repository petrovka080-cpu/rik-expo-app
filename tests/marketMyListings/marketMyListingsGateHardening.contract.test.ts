import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("market my listings gate hardening", () => {
  it("keeps web smoke coverage for material service and rent owner history", () => {
    const smoke = read("scripts/market_add_web_media_publish_smoke.ts");

    expect(smoke).toContain("SMOKE_SCENARIOS");
    expect(smoke).toContain('kind: "material"');
    expect(smoke).toContain('kind: "service"');
    expect(smoke).toContain('kind: "rent"');
    expect(smoke).toContain("myListingVisible");
    expect(smoke).toContain("myListingMediaVisible");
    expect(smoke).toContain("myListingAfterRefreshVisible");
    expect(smoke).toContain("myListingAfterReloginVisible");
    expect(smoke).toContain('triggerTestId: "market-add-back-to-market"');
    expect(smoke).toContain('[data-testid="market-my-listings-back"]');
    expect(smoke).toContain('[data-testid="bottom-tab-market"]');
    expect(smoke).toContain('node.scrollIntoView({ block: "center", inline: "center" })');
    expect(smoke).not.toContain("trigger.click({ force: true })");
    expect(smoke).toContain("MARKET_FEED_FIRST_CONTENT_BUDGET_MS = 1_000");
    expect(smoke).toContain("MY_LISTINGS_FIRST_CONTENT_BUDGET_MS = 1_000");
    expect(smoke).toContain("PRODUCT_INSTANT_OPEN_BUDGET_MS = 300");
  });

  it("keeps live gate summary fields explicit for my listings and market bridge", () => {
    const live = read("scripts/e2e/runOfficeMarketLiveWebE2E.ts");

    expect(live).toContain("result.market.my_listings_screen_visible");
    expect(live).toContain("result.market.my_listing_visible");
    expect(live).toContain("result.market.my_listing_media_visible");
    expect(live).toContain("result.market.my_listing_after_refresh_visible");
    expect(live).toContain("result.market.my_listing_after_relogin_visible");
    expect(live).toContain("market_add_to_estimate_button_available");
    expect(live).toContain("market_add_to_estimate_passed");
    expect(live).toContain("live_gate_extended_with_my_listings");
    expect(live).toContain("live_gate_public_market_unaffected");
  });
});
