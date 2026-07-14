import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen media kind routing", () => {
  it("keeps photo and video kind routing explicit from picker to publish", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const media = read("src/screens/profile/profile.marketplaceMedia.ts");
    const screen = read("src/screens/profile/AddListingScreen.tsx");

    expect(panel).toContain('mediaKind: "photo", source: "camera"');
    expect(panel).toContain('mediaKind: "photo", source: "library"');
    expect(panel).toContain('mediaKind: "video", source: "camera"');
    expect(panel).toContain('mediaKind: "video", source: "library"');
    expect(panel).toContain("MEDIA_KIND_ROUTING_MISMATCH");
    expect(panel).toContain("mediaKind: currentItem?.mediaKind ?? \"photo\"");
    expect(media).toContain("if (media.mediaKind !== params.mediaKind)");
    expect(media).toContain("Marketplace media picker returned");
    expect(screen).toContain("snapshot.mediaAssets");
    expect(screen).toContain("mediaKind: \"photo\"");
  });
});
