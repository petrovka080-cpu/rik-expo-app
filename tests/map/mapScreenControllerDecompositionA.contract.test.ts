import { readFileSync } from "fs";
import { join } from "path";

const repoRoot = join(__dirname, "..", "..");

const readRepoFile = (relativePath: string): string =>
  readFileSync(join(repoRoot, relativePath), "utf8");

const countHookCalls = (source: string): number =>
  Array.from(source.matchAll(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g)).length;

describe("WAVE 17 MapScreen controller decomposition A", () => {
  const screen = readRepoFile("src/components/map/MapScreen.tsx");
  const container = readRepoFile("src/components/map/MapScreenContainer.tsx");
  const controller = readRepoFile("src/components/map/useMapScreenController.tsx");
  const view = readRepoFile("src/components/map/MapScreenView.tsx");

  it("keeps MapScreen as a thin shell", () => {
    expect(screen.split("\n").length).toBeLessThanOrEqual(30);
    expect(countHookCalls(screen)).toBe(0);
    expect(screen).toContain("MapScreenContainer");
    expect(screen).not.toContain("useMapListingsQuery");
    expect(screen).not.toContain("Location.requestForegroundPermissionsAsync");
  });

  it("keeps map state, viewport, selection, and actions in the controller", () => {
    expect(container).toContain("useMapScreenController()");
    expect(container).toContain("<MapScreenView {...controller} />");

    expect(controller).toContain("useMapListingsQuery");
    expect(controller).toContain("useLocalSearchParams");
    expect(controller).toContain("routeMetaCacheRef");
    expect(controller).toContain("focusById");
    expect(controller).toContain("goToMyLocation");
    expect(controller).toContain("submitOffer");
    expect(controller).toContain("loadMapScreenCurrentAuthUser()");
    expect(controller).toContain("submitMapScreenDemandOffer");
    expect(controller).toContain("loadMapScreenListingRouteMeta");
  });

  it("keeps render-only sections in the view", () => {
    expect(countHookCalls(view)).toBe(0);
    expect(view).toContain("<MapRenderer");
    expect(view).toContain("<TopSearchBar");
    expect(view).toContain("<ResultsBottomSheet");
    expect(view).toContain("<DemandDetailsModal");
    expect(view).toContain("<MapFab");
    expect(view).toContain("<Modal");
  });

  it("does not add provider calls or transport bypasses", () => {
    expect(controller).not.toContain("../../lib/supabaseClient");
    expect(controller).not.toMatch(/\.(from|rpc)\s*\(/);
    expect(controller).not.toMatch(/\bfetch\s*\(/);
    expect(view).not.toContain("supabase");
    expect(view).not.toMatch(/\bfetch\s*\(/);
  });
});
