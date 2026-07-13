import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen all buttons contract", () => {
  it("keeps every marketplace add button wired to a visible business effect", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const modal = read("src/screens/profile/components/ListingModal.tsx");
    const smoke = read("scripts/market_add_web_media_publish_smoke.ts");

    expect(panel).toContain('testSuffix: "camera_photo_button"');
    expect(panel).toContain('testSuffix: "gallery_photo_button"');
    expect(panel).toContain('testSuffix: "camera_video_button"');
    expect(panel).toContain('testSuffix: "gallery_video_button"');
    expect(panel).toContain(".thumbnail.replace.");
    expect(panel).toContain(".thumbnail.remove.");
    expect(panel).not.toContain(".add-media-tile");
    expect(panel).not.toContain(".picker-sheet");
    expect(panel).not.toContain(".thumbnail.open.");
    expect(panel).not.toContain(".preview-modal");
    expect(modal).toContain("add-listing-flow-close");
    expect(modal).toContain("add-listing-flow-publish");
    expect(modal).toContain("market-add-open-listing");
    expect(modal).toContain("market-add-back-to-market");
    expect(smoke).toContain("gallery_photo_button");
    expect(smoke).toContain("gallery_video_button");
    expect(smoke).not.toContain("add-media-tile");
    expect(smoke).not.toContain("picker-sheet");
    expect(smoke).not.toContain("marketplace.media.entrypoints.photo");
  });
});
