import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

const decodeEscapedUnicode = (source: string) =>
  source.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );

describe("marketplace add product screen still works contract", () => {
  it("keeps /add wired to the marketplace listing screen", () => {
    const route = read("app/add.tsx");
    const screen = read("src/screens/profile/AddListingScreen.tsx");
    const modal = decodeEscapedUnicode(
      read("src/screens/profile/components/ListingModal.tsx"),
    );
    const media = [
      read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx"),
      read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.model.ts"),
    ].join("\n");

    expect(route).toContain("AddListingScreenComponent");
    expect(route).toContain('route: "/add"');
    expect(screen).toContain("createMarketListing({");
    expect(modal).toContain("add-listing-flow-publish");
    expect(modal).toContain("add-listing-flow-close");
    expect(modal).toContain("market-add-open-listing");
    expect(media).toContain("marketplace_product");
    expect(media).toContain('testSuffix: "camera_photo_button"');
    expect(media).toContain('testSuffix: "gallery_photo_button"');
    expect(media).toContain('testSuffix: "camera_video_button"');
    expect(media).toContain('testSuffix: "gallery_video_button"');
    expect(media).toContain(".thumbnail-strip");
    expect(media).toContain(".thumbnail.replace.");
    expect(media).toContain(".thumbnail.remove.");
    expect(media).toContain('icon: "camera-outline"');
    expect(media).toContain('label: copy.photoButtonLabel ?? "Фото"');
    expect(media).toContain("Проверяю товар...");
    expect(media).toContain("Заполнено по фото · проверьте данные");
    expect(media).not.toContain(".add-media-tile");
    expect(media).not.toContain(".picker-sheet");
    expect(media).not.toContain("React19SafeModal");
    expect(media).not.toContain("setTimeout");
    expect(media).not.toContain("local:");
    expect(media).not.toContain("Р¤РѕС‚Рѕ");
    expect(media).not.toContain("РїСвЂ№");
  });

  it("keeps publish in the sticky action bar above the bottom nav", () => {
    const modal = read("src/screens/profile/components/ListingModal.tsx");

    expect(modal).toContain("<AppStickyActionBar");
    expect(modal).toContain('placement="above_bottom_nav"');
    expect(modal).toContain('testID: "add-listing-flow-publish"');
  });
});
