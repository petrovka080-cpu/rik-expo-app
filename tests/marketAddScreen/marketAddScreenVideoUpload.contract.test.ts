import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen video upload contract", () => {
  it("routes video buttons through duration validation, upload and product_video links", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const media = read("src/screens/profile/profile.marketplaceMedia.ts");
    const services = read("src/screens/profile/profile.services.ts");
    const smoke = read("scripts/market_add_web_media_publish_smoke.ts");

    expect(panel).toContain('mediaKind: "video", source: "camera"');
    expect(panel).toContain('mediaKind: "video", source: "library"');
    expect(panel).toContain("thumbnail.video-duration");
    expect(media).toContain("readWebVideoMetadata");
    expect(media).toContain("Marketplace web video metadata duration could not be resolved");
    expect(media).toContain('mediaTypes: "videos"');
    expect(media).toContain("videoMaxDuration: MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs / 1000");
    expect(media).toContain("Marketplace video duration could not be read.");
    expect(media).toContain("Marketplace video must be 15 seconds or shorter.");
    expect(media).toContain('purpose: params.mediaKind === "photo" ? "product_photo" : "product_video"');
    expect(media).toContain("completeSupabaseMediaUploadSession");
    expect(services).toContain('purpose: mediaAsset.mediaKind === "video" ? "product_video" : "product_photo"');
    expect(smoke).toContain("createTinyWebmVideoBuffer");
    expect(smoke).toContain("gallery_video_button");
    expect(smoke).toContain("selectedVideoCount === scenario.videoCount");
    expect(smoke).toContain("productVideoThumbDisplayed");
    expect(smoke).toContain('purpose === "product_video"');
  });
});
