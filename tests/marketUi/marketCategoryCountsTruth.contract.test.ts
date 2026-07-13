import fs from "fs";
import path from "path";

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("market category count truth contract", () => {
  it("counts the whole active marketplace by category when the deployed RPC has no count columns", () => {
    const repository = readSource("src", "features", "market", "market.repository.ts");
    const transport = readSource("src", "features", "market", "market.repository.transport.ts");
    const screen = readSource("src", "features", "market", "MarketHomeScreen.tsx");

    expect(transport).not.toContain("countActiveMarketplaceListingsByKind");
    expect(repository).toContain("loadScopeCategoryCounts");
    expect(repository).toContain("resolveServerScopeCategoryCounts");
    expect(repository).toContain("loadScopeKindTotalCount");
    expect(repository).toContain("callMarketplaceItemsScopePageRpc");
    expect(repository).toContain("p_limit: 1");
    expect(repository).toContain('loadScopeKindTotalCount(sideFilter, "material")');
    expect(repository).toContain('loadScopeKindTotalCount(sideFilter, "work")');
    expect(repository).toContain('loadScopeKindTotalCount(sideFilter, "service")');
    expect(repository).toContain('loadScopeKindTotalCount(sideFilter, "delivery")');
    expect(repository).toContain('loadScopeKindTotalCount(sideFilter, "rent")');
    expect(repository).toContain("toScopeFilterValue(params.filters?.side)");
    expect(screen).toContain("const categoryCounts = feed.categoryCounts");
    expect(screen).not.toContain('if (key === "all") return feed.totalCount');
  });
});
