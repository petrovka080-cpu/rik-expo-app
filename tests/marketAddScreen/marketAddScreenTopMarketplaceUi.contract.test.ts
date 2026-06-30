import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen top marketplace UI contract", () => {
  it("uses a composer tile and picker sheet instead of loose marketplace media buttons", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const model = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.model.ts");
    const smoke = read("scripts/market_add_web_media_publish_smoke.ts");

    expect(model).toContain('title: "Добавьте фото и видео"');
    expect(panel).toContain("renderAddMediaTile");
    expect(panel).toContain(".add-media-tile");
    expect(panel).toContain("renderMediaPicker");
    expect(panel).toContain(".picker-sheet");
    expect(panel).toContain("mediaPickerVisible");
    expect(panel).toContain("marketplace ? this.renderAddMediaTile(copy, mediaProps) : this.renderButtons(copy)");
    expect(panel).toContain('testSuffix: "camera_photo_button"');
    expect(panel).toContain('testSuffix: "gallery_photo_button"');
    expect(panel).toContain('testSuffix: "camera_video_button"');
    expect(panel).toContain('testSuffix: "gallery_video_button"');
    expect(smoke).toContain("marketplace.media.entrypoints.add-media-tile");
    expect(smoke).toContain("marketplace.media.entrypoints.picker-sheet");
  });

  it("renders visible thumbnails with cover, duration, upload status, remove and replace actions", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const model = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.model.ts");

    expect(panel).toContain(".thumbnail-strip");
    expect(panel).toContain(".thumbnail-empty-strip");
    expect(panel).toContain(".preview-image.");
    expect(panel).toContain(".thumbnail.cover-badge.");
    expect(panel).toContain(".thumbnail.video-duration.");
    expect(panel).toContain(".thumbnail.upload-status.");
    expect(panel).toContain(".thumbnail.replace.");
    expect(panel).toContain(".thumbnail.remove.");
    expect(model).toContain("mediaDraftCoverItem");
    expect(model).toContain("mediaCoverBadge");
    expect(model).toContain("videoDurationBadge");
  });
});
