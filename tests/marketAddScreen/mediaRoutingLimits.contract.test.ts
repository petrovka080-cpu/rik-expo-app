import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen media routing and limits", () => {
  it("keeps the marketplace add limit at 5 photos and 1 video", () => {
    const limits = read("src/lib/media/mediaLimits.ts");
    const model = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.model.ts");

    expect(limits).toContain("maxPhotosPerGroup: 5");
    expect(limits).toContain("maxVideosPerGroup: 1");
    expect(limits).toContain("maxVideoDurationMs: 15_000");
    expect(limits).toContain("maxPhotos: MEDIA_LIMITS.maxPhotosPerGroup");
    expect(limits).toContain("maxVideoBytes: 50 * 1024 * 1024");
    expect(model).toContain("MARKET_ADD_MEDIA_LIMITS.maxPhotos");
    expect(model).not.toContain("До 7 фото");
  });

  it("routes every add-screen media button to the matching mediaKind and source", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const marketplaceMedia = read("src/screens/profile/profile.marketplaceMedia.ts");

    expect(panel).toContain(".camera_photo_button");
    expect(panel).toContain('this.addMedia({ mediaKind: "photo", source: "camera" })');
    expect(panel).toContain(".gallery_photo_button");
    expect(panel).toContain('this.addMedia({ mediaKind: "photo", source: "library" })');
    expect(panel).toContain(".camera_video_button");
    expect(panel).toContain('this.addMedia({ mediaKind: "video", source: "camera" })');
    expect(panel).toContain(".gallery_video_button");
    expect(panel).toContain('this.addMedia({ mediaKind: "video", source: "library" })');

    expect(marketplaceMedia).toContain("if (media.mediaKind !== params.mediaKind)");
    expect(marketplaceMedia).toContain("Marketplace media picker returned");
    expect(marketplaceMedia).toContain("MARKET_ADD_MEDIA_LIMITS.allowedVideoMimeTypes");
    expect(marketplaceMedia).toContain('"video/webm"');
  });
});
