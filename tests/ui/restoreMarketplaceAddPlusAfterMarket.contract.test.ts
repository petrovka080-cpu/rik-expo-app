import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("restore marketplace add plus after market contract", () => {
  it("renders the bottom nav as office/request/market/add/chat/profile", () => {
    const nav = read("app/(tabs)/_layout.tsx");

    const office = nav.indexOf('testID: "bottom-tab-office"');
    const request = nav.indexOf('testID: "bottom-tab-request"');
    const market = nav.indexOf('testID: "bottom-tab-market"');
    const add = nav.indexOf('testID="bottom-nav-marketplace-add"');
    const chat = nav.indexOf('testID: "bottom-tab-chat"');
    const profile = nav.indexOf('testID: "bottom-tab-profile"');

    expect(office).toBeGreaterThanOrEqual(0);
    expect(request).toBeGreaterThan(office);
    expect(market).toBeGreaterThan(request);
    expect(add).toBeGreaterThan(market);
    expect(chat).toBeGreaterThan(market);
    expect(profile).toBeGreaterThan(chat);

    expect(nav.indexOf("renderTab(BOTTOM_NAV_ITEMS[2])")).toBeLessThan(add);
    expect(add).toBeLessThan(nav.indexOf("renderTab(BOTTOM_NAV_ITEMS[3])"));
  });

  it("keeps the marketplace add plus visible and accessible", () => {
    const nav = read("app/(tabs)/_layout.tsx");

    expect(nav).toContain('testID="bottom-nav-marketplace-add"');
    expect(nav).toContain('accessibilityLabel="Добавить товар в маркет"');
    expect(nav).toContain("＋");
    expect(nav).toContain("width: 48");
    expect(nav).toContain("height: 48");
  });
});
