import * as fs from "fs";
import * as path from "path";

describe("bottom nav marketplace plus contract", () => {
  it("preserves marketplace plus after Маркет and before Чат", () => {
    const tabs = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/_layout.tsx"), "utf8");
    const navRow = tabs.slice(
      tabs.indexOf("{renderTab(BOTTOM_NAV_ITEMS[0])}"),
      tabs.indexOf("{showAssistantFab"),
    );

    expect(navRow.indexOf("{renderTab(BOTTOM_NAV_ITEMS[2])}")).toBeLessThan(navRow.indexOf('testID="bottom-nav-marketplace-add"'));
    expect(navRow.indexOf('testID="bottom-nav-marketplace-add"')).toBeLessThan(navRow.indexOf("{renderTab(BOTTOM_NAV_ITEMS[3])}"));
    expect((tabs.match(/testID="bottom-nav-marketplace-add"/g) ?? []).length).toBe(1);
  });
});
