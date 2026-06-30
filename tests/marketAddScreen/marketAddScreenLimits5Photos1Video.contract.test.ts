import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen 5 photos 1 video limits", () => {
  it("keeps 5 photos, 1 video and 15 seconds as the single shared contract", () => {
    const limits = read("src/lib/media/mediaLimits.ts");
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const model = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.model.ts");
    const media = read("src/screens/profile/profile.marketplaceMedia.ts");

    expect(limits).toContain("maxPhotosPerGroup: 5");
    expect(limits).toContain("maxVideosPerGroup: 1");
    expect(limits).toContain("maxVideoDurationMs: 15_000");
    expect(limits).toContain("allowedPhotoMimeTypes");
    expect(limits).toContain("allowedVideoMimeTypes");
    expect(panel).toContain("MARKET_ADD_MEDIA_LIMITS.maxPhotos");
    expect(panel).toContain("MARKET_ADD_MEDIA_LIMITS.maxVideos");
    expect(model).toContain("MARKET_ADD_MEDIA_LIMITS.maxPhotos");
    expect(model).toContain("MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs");
    expect(media).toContain("MARKET_ADD_MEDIA_LIMITS.maxPhotoBytes");
    expect(media).toContain("MARKET_ADD_MEDIA_LIMITS.maxVideoBytes");
    expect(`${limits}\n${panel}\n${model}`).not.toContain("7 фото");
  });
});
