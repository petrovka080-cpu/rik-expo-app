import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function countHookCalls(source: string): number {
  return Array.from(source.matchAll(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g)).length;
}

describe("S_RUNTIME_08 MarketHomeScreen controller boundary", () => {
  it("keeps MarketHomeScreen as a render shell around the controller", () => {
    const screenSource = readRepoFile("src/features/market/MarketHomeScreen.tsx");
    const controllerSource = readRepoFile("src/features/market/useMarketHomeController.ts");
    const originalHookCallSites = 33;
    const currentHookCallSites = countHookCalls(screenSource);

    expect(screenSource).toContain('import { useMarketHomeController } from "./useMarketHomeController";');
    expect(screenSource).toContain("} = useMarketHomeController();");
    expect(screenSource).toContain("renderItem={renderCard}");
    expect(screenSource).toContain("data={feedData}");
    expect(currentHookCallSites).toBeLessThanOrEqual(4);
    expect(originalHookCallSites - currentHookCallSites).toBeGreaterThanOrEqual(29);

    expect(controllerSource).toContain("export function useMarketHomeController");
    expect(controllerSource).toContain("useWindowDimensions()");
    expect(controllerSource).toContain("useMarketHeaderProfile()");
    expect(controllerSource).toContain("useMarketUiStore((state) => state.activeCategory)");
    expect(controllerSource).toContain("useFocusEffect(");
  });

  it("preserves marketplace behavior owners in the controller", () => {
    const screenSource = readRepoFile("src/features/market/MarketHomeScreen.tsx");
    const controllerSource = readRepoFile("src/features/market/useMarketHomeController.ts");

    expect(controllerSource).toContain("loadMarketplaceHomeStage1()");
    expect(controllerSource).toContain("loadMarketplaceHomeFeedStage(");
    expect(controllerSource).toContain("buildMarketSupplierMapRoute(params)");
    expect(controllerSource).toContain("buildMarketProductRoute(listing.id)");
    expect(controllerSource).toContain("buildMarketAssistantPrompt(filters)");
    expect(controllerSource).toContain("recordPlatformObservability");
    expect(screenSource).not.toContain("loadMarketplaceHomeStage1()");
    expect(screenSource).not.toContain("recordPlatformObservability");
  });

  it("keeps FlatList tuning, refresh, and pagination wired in the screen", () => {
    const screenSource = readRepoFile("src/features/market/MarketHomeScreen.tsx");

    expect(screenSource).toContain("MARKET_HOME_FEED_FLATLIST_TUNING");
    expect(screenSource).toContain("keyExtractor={marketHomeListingKeyExtractor}");
    expect(screenSource).toContain("void loadFeedStage(\"refresh\");");
    expect(screenSource).toContain("onEndReached={() => void loadMore()}");
    expect(screenSource).toContain("onEndReachedThreshold={0.35}");
  });

  it("keeps the controller out of direct Supabase and new global store ownership", () => {
    const controllerSource = readRepoFile("src/features/market/useMarketHomeController.ts");

    expect(controllerSource).not.toMatch(/from ["'][^"']*supabase/i);
    expect(controllerSource).not.toContain("supabase.");
    expect(controllerSource).not.toMatch(/create\(/);
  });
});
