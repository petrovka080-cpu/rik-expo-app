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
    const route = read("app/(tabs)/add.tsx");
    const screen = read("src/screens/profile/AddListingScreen.tsx");
    const modal = decodeEscapedUnicode(
      read("src/screens/profile/components/ListingModal.tsx"),
    );
    const media = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");

    expect(route).toContain("AddListingScreenComponent");
    expect(screen).toContain("createMarketListing({");
    expect(modal).toContain("Создание объявления");
    expect(modal).toContain("Тип объявления");
    expect(modal).toContain("Позиция");
    expect(modal).toContain("Описание");
    expect(modal).toContain("Телефон");
    expect(modal).toContain("Опубликовать");
    expect(media).toContain("Фото и видео");
    expect(media).toContain("＋ Фото");
    expect(media).toContain("Проверяю товар...");
    expect(media).toContain("Заполнено по фото · проверьте данные");
  });

  it("keeps publish in the sticky action bar above the bottom nav", () => {
    const modal = read("src/screens/profile/components/ListingModal.tsx");

    expect(modal).toContain("<AppStickyActionBar");
    expect(modal).toContain('placement="above_bottom_nav"');
    expect(modal).toContain('testID: "add-listing-flow-publish"');
  });
});
