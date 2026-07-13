import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen media routing and limits", () => {
  it("keeps the marketplace add limit at 7 photos and 1 video", () => {
    const limits = read("src/lib/media/mediaLimits.ts");
    const model = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.model.ts");

    expect(limits).toContain("maxPhotosPerGroup: 5");
    expect(limits).toContain("maxVideosPerGroup: 1");
    expect(limits).toContain("maxVideoDurationMs: 15_000");
    expect(limits).toContain("maxPhotos: 7");
    expect(limits).toContain("maxVideoBytes: 50 * 1024 * 1024");
    expect(model).toContain("MARKET_ADD_MEDIA_LIMITS.maxPhotos");
  });

  it("routes every add-screen media button directly to the matching mediaKind and source", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const marketplaceMedia = read("src/screens/profile/profile.marketplaceMedia.ts");

    expect(panel).toContain('testSuffix: "camera_photo_button"');
    expect(panel).toContain('testSuffix: "gallery_photo_button"');
    expect(panel).toContain('testSuffix: "camera_video_button"');
    expect(panel).toContain('testSuffix: "gallery_video_button"');
    expect(panel).toContain('input: { mediaKind: "photo", source: "camera" }');
    expect(panel).toContain('input: { mediaKind: "photo", source: "library" }');
    expect(panel).toContain('input: { mediaKind: "video", source: "camera" }');
    expect(panel).toContain('input: { mediaKind: "video", source: "library" }');
    expect(panel).toContain('void this.addMedia(params.input)');
    expect(panel).not.toContain(".add-media-tile");
    expect(panel).not.toContain(".picker-sheet");
    expect(panel).not.toContain("renderAddMediaTile");
    expect(panel).not.toContain("renderMediaPicker");

    expect(marketplaceMedia).toContain("if (media.mediaKind !== params.mediaKind)");
    expect(marketplaceMedia).toContain("Marketplace media picker returned");
    expect(marketplaceMedia).toContain("MARKET_ADD_MEDIA_LIMITS.allowedVideoMimeTypes");
    expect(marketplaceMedia).toContain('"video/webm"');
  });

  it("keeps native photo capture out of the marketplace web uploader import path", () => {
    const marketplaceMedia = read("src/screens/profile/profile.marketplaceMedia.ts");

    expect(marketplaceMedia).toContain('if (Platform.OS === "web")');
    expect(marketplaceMedia).toContain("async function createNativeMarketplacePhotoCaptureService()");
    expect(marketplaceMedia).toContain('await import(');
    expect(marketplaceMedia).toContain("../../lib/mobilePhotoCapture/mobilePhotoCaptureService");
    expect(marketplaceMedia).toContain("const service = await createNativeMarketplacePhotoCaptureService()");
    expect(marketplaceMedia).not.toContain('import { createMobilePhotoCaptureService }');
  });

  it("keeps native marketplace video upload to one decoded file read before hashing", () => {
    const marketplaceMedia = read("src/screens/profile/profile.marketplaceMedia.ts");
    const nativeVideoPicker = marketplaceMedia.slice(
      marketplaceMedia.indexOf("async function pickNativeMarketplaceVideo"),
      marketplaceMedia.indexOf("async function pickMarketplaceMedia"),
    );

    expect(nativeVideoPicker.match(/readNativeUploadBody\(asset\.uri\)/g)).toHaveLength(1);
    expect(nativeVideoPicker.match(/sha256Hex\(uploadBody\)/g)).toHaveLength(1);
    expect(nativeVideoPicker).toContain("const uploadBody = await readNativeUploadBody(asset.uri)");
    expect(nativeVideoPicker).toContain("const contentHash = await sha256Hex(uploadBody)");
    expect(nativeVideoPicker).toContain("contentHash,");
    expect(nativeVideoPicker).not.toContain("sha256NativeFile");
  });
});
