import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market card and detail top marketplace UI contract", () => {
  it("renders card and detail media from persistent imageUrl with compact marketplace sizing", () => {
    const card = read("src/features/market/components/MarketFeedCard.tsx");
    const home = read("src/features/market/MarketHomeScreen.tsx");
    const detail = read("app/product/[id].tsx");
    const data = read("src/features/market/marketHome.data.ts");

    expect(card).toContain("const imageSource = listing.imageUrl ? { uri: listing.imageUrl } : listing.imageSource");
    expect(card).toContain("source={imageSource}");
    expect(card).toContain("resizeMode=\"cover\"");
    expect(card).toContain("market_feed_card_image_");
    expect(home).toContain("estimatedItemSize={300}");
    expect(detail).toContain("const heroImageSource = row.imageUrl ? { uri: row.imageUrl } : row.imageSource");
    expect(detail).toContain("market_product_hero_image");
    expect(detail).toContain("resizeMode=\"cover\"");
    expect(data).toContain("normalizeImageUrl");
    expect(data).toContain("image_url");
  });
});
