import fs from "fs";
import path from "path";

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("market listing media carousel contract", () => {
  it("renders listing photos and videos as a horizontal card carousel", () => {
    const source = readSource("src", "features", "market", "components", "MarketFeedCard.tsx");

    expect(source).toContain("type ListingMediaItem");
    expect(source).toContain("listing.imageUrls.length ? listing.imageUrls : listing.imageUrl ? [listing.imageUrl] : []");
    expect(source).toContain("...Array.from(new Set(listing.videoUrls)).map");
    expect(source).toContain('await import("expo-av")');
    expect(source).toContain("<ScrollView");
    expect(source).toContain("horizontal");
    expect(source).toContain("pagingEnabled");
    expect(source).toContain("onMomentumScrollEnd={handleMediaMomentumEnd}");
    expect(source).toContain("market_feed_card_media_carousel_");
    expect(source).toContain("market_feed_card_media_counter_");
    expect(source).toContain("market_feed_card_media_prev_");
    expect(source).toContain("market_feed_card_media_next_");
    expect(source).toContain("market_feed_card_video_badge_");
    expect(source).toContain("handleMediaImageError");
    expect(source).not.toContain("handleMediaImageLoad");
    expect(source).not.toContain("Image.getSize");
    expect(source).toContain("market_feed_card_broken_media_");
    expect(source).toContain("failedMediaKeys[mediaKey]");
    expect(source).toContain("item.kind === \"placeholder\"");
    expect(source).toContain("onError={item.kind === \"photo\"");
    expect(source).toContain("onPress={onOpen}");
  });
});
