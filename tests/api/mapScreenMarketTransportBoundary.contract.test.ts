import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S_AUDIT_BATTLE_99_MAP_SCREEN_MARKET_TRANSPORT_BOUNDARY", () => {
  it("keeps MapScreen UI state local while routing market reads and writes through transport", () => {
    const screen = read("src/components/map/MapScreen.tsx");
    const transport = read("src/components/map/MapScreen.market.transport.ts");

    expect(screen).toContain("loadMapScreenCurrentAuthUser()");
    expect(screen).toContain("submitMapScreenDemandOffer");
    expect(screen).toContain("loadMapScreenListingRouteMeta");
    expect(screen).not.toContain("../../lib/supabaseClient");
    expect(screen).not.toContain('from("demand_offers")');
    expect(screen).not.toContain('from("market_listings")');

    expect(transport).toContain('supabase.from("demand_offers").insert');
    expect(transport).toContain('supabase.from("market_listings").select');
  });
});
