import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen all buttons contract", () => {
  it("keeps every marketplace add button wired to a visible business effect", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const modal = read("src/screens/profile/components/ListingModal.tsx");
    const smoke = read("scripts/market_add_web_media_publish_smoke.ts");

    expect(panel).toContain(".add-media-tile");
    expect(panel).toContain(".picker-sheet");
    expect(panel).toContain(".camera_photo_button");
    expect(panel).toContain(".gallery_photo_button");
    expect(panel).toContain(".camera_video_button");
    expect(panel).toContain(".gallery_video_button");
    expect(panel).toContain(".thumbnail.open.");
    expect(panel).toContain(".thumbnail.replace.");
    expect(panel).toContain(".thumbnail.remove.");
    expect(panel).toContain(".preview-modal.replace");
    expect(panel).toContain(".preview-modal.remove");
    expect(panel).toContain(".preview-modal.close");
    expect(modal).toContain("add-listing-flow-close");
    expect(modal).toContain("add-listing-flow-publish");
    expect(modal).toContain("market-add-open-listing");
    expect(modal).toContain("market-add-back-to-market");
    expect(smoke).toContain("gallery_photo_button");
    expect(smoke).not.toContain("marketplace.media.entrypoints.photo");
  });
});
