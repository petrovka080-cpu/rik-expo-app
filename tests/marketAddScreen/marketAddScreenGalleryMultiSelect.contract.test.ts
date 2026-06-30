import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen gallery multi-select contract", () => {
  it("selects up to the remaining photo slots in one gallery action", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const media = read("src/screens/profile/profile.marketplaceMedia.ts");
    const smoke = read("scripts/market_add_web_media_publish_smoke.ts");

    expect(panel).toContain("availableSlots");
    expect(panel).toContain('selectionLimit: input.source === "library" && input.mediaKind === "photo" ? availableSlots : 1');
    expect(panel).toContain("localMediaAssetIds.length >= availableSlots");
    expect(panel).toContain("uploadResultsFromPickResult(picked).slice(0, availableSlots)");
    expect(media).toContain("multiple: mediaKind === \"photo\" && selectionLimit > 1");
    expect(media).toContain("maxFiles: selectionLimit");
    expect(media).toContain("pickManyFromLibrary");
    expect(media).toContain("selectionLimit: params.selectionLimit");
    expect(media).toContain("MARKETPLACE_MEDIA_UPLOAD_CONCURRENCY = 2");
    expect(media).toContain("mapBounded");
    expect(smoke).toContain("chooser.setFiles(Array.from({ length: scenario.photoCount }");
    expect(smoke).toContain("selectedPhotoCount === scenario.photoCount");
    expect(smoke).toContain("PHOTO_LIMIT = 5");
  });
});
