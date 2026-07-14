import fs from "fs";
import path from "path";

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("market cleanup contracts", () => {
  it("keeps market home focused on one compact filter and the feed", () => {
    const source = readSource("src", "features", "market", "MarketHomeScreen.tsx");
    const headerStart = source.indexOf("const header = (");
    const footerStart = source.indexOf("const footer =");
    const headerChunk = source.slice(headerStart, footerStart);
    const footerChunk = source.slice(footerStart);
    const feedCardCellSource = readSource("src", "features", "market", "components", "MarketHomeFeedCardCell.tsx");
    const controllerSource = readSource("src", "features", "market", "useMarketHomeController.ts");

    expect(source).not.toContain("MarketHeaderBar");
    expect(source).not.toContain("MarketCategoryRail");
    expect(source).not.toContain("Смотреть все");
    expect(source).toContain('testID="market_top_filter_button"');
    expect(source).toContain('testID="market_top_filter_sheet"');
    expect(source).toContain('key="market-single-column-feed"');
    expect(controllerSource).toContain("const numColumns = 1");
    expect(source).not.toContain("columnWrapperStyle");
    expect(headerChunk).not.toContain("<MarketHeroCarousel");
    expect(headerChunk).not.toContain("<MarketTenderBanner");
    expect(headerChunk).not.toContain("<MarketAssistantBanner");
    expect(headerChunk).not.toContain("Открыта карточка:");
    expect(feedCardCellSource).toContain('variant="market-primary"');
    expect(footerChunk).not.toContain("<MarketHeroCarousel");
    expect(footerChunk).not.toContain("<MarketTenderBanner");
    expect(footerChunk).not.toContain("<MarketAssistantBanner");
    expect(source).not.toContain("MarketAssistantBanner");
    expect(source).toContain('testID={`market_top_filter_category_${item.key}`}');
    expect(source).not.toContain('{ key: "auctions", label: "Торги" }');
    expect(source).not.toContain('testID="market_top_filter_kinds"');
    expect(source).toContain("MARKET_LISTING_CATEGORY_OPTIONS");
    expect(source).toContain("filterChipCount");
    expect(footerChunk).toContain('testID="market_scroll_bottom_limit"');
  });

  it("keeps market-primary cards focused on media, product info and quick contact only", () => {
    const source = readSource("src", "features", "market", "components", "MarketFeedCard.tsx");

    expect(source).toContain('variant?: "full" | "market-primary"');
    expect(source).toContain("const isMarketPrimary = variant === \"market-primary\"");
    expect(source).toContain("const imageSource = useMemo<ImageSourcePropType>");
    expect(source).toContain("listing.imageUrls.length ? listing.imageUrls : listing.imageUrl ? [listing.imageUrl] : []");
    expect(source).toContain("...Array.from(new Set(listing.videoUrls)).map");
    expect(source).toContain("horizontal");
    expect(source).toContain("pagingEnabled");
    expect(source).toContain("market_feed_card_media_carousel_");
    expect(source).toContain("market_feed_card_media_counter_");
    expect(source).toContain("!isMarketPrimary && listing.stockLabel");
    expect(source).toContain("!isMarketPrimary && listing.itemsPreview.length");
    expect(source).toContain("{isMarketPrimary ? (");
    expect(source).toContain("Позвонить");
    expect(source).toContain("WhatsApp");
    expect(source).toContain("На карте");
    expect(source).toContain("{showErpActions ? (");
  });

  it("keeps product page marketplace-first without ERP dead blocks", () => {
    const source = readSource("src", "features", "market", "ProductDetailsContent.tsx");
    const routeSource = readSource("app", "product", "[id].tsx");

    expect(source).toContain("const galleryImageUrls = row.imageUrls.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : []");
    expect(source).toContain("...row.videoUrls.map");
    expect(source).toContain("testID=\"market_product_gallery\"");
    expect(source).toContain("testID=\"market_product_gallery_strip\"");
    expect(source).toContain("testID=\"market_product_hero_video\"");
    expect(source).toContain('testID="market_product_hero_image_open"');
    expect(source).toContain('testID="market_product_image_viewer"');
    expect(source).toContain('testID="market_product_viewer_image"');
    expect(source).toContain("setImageViewerVisible(true)");
    expect(source).toContain('resizeMode="contain"');
    expect(source).toContain('testID="market_product_card"');
    expect(source).toContain('testID="market_product_contact_panel"');
    expect(source.match(/style=\{styles[.]card\}/g) ?? []).toHaveLength(1);
    expect(source).toContain("styles.heroInfoColumn");
    expect(source).toContain("heroMediaItem?.kind === \"photo\"");
    expect(source).toContain("Связаться с продавцом");
    expect(source).toContain("Другие объявления");
    expect(source).toContain('testID="market_product_related_feed"');
    expect(source).toContain('variant="market-primary"');
    expect(source).toContain("loadMarketHomePage");
    expect(source.indexOf('testID="market_product_gallery"')).toBeLessThan(source.indexOf('testID="market_product_contact_panel"'));
    expect(source.indexOf('testID="market_product_contact_panel"')).toBeLessThan(source.indexOf('testID="market_product_related_feed"'));
    expect(source).not.toContain("Для ERP и закупок");
    expect(source).not.toContain("Ещё в маркете");
    expect(source).not.toContain(">Позиции<");
    expect(source).not.toContain("market_product_add_to_request");
    expect(source).not.toContain("market_product_create_proposal");
    expect(routeSource).not.toContain("loadMarketRoleCapabilities");
  });
});
