import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("marketplace add plus is action not tab architecture contract", () => {
  it("renders plus from the custom bottom nav instead of registering add as a visible tab", () => {
    const tabs = read("app/(tabs)/_layout.tsx");
    const nav = read("app/(tabs)/_layout.tsx");
    const rootLayout = read("app/_layout.tsx");

    expect(tabs).toContain('tabBar={(props) => (');
    expect(tabs).toContain("<AppBottomNav");
    expect(rootLayout).toContain('name="add"');
    expect(tabs).not.toContain('<Tabs.Screen name="add"');
    expect(nav).toContain('accessibilityRole="button"');
    expect(nav).toContain('testID="bottom-nav-marketplace-add"');
    expect(nav).toContain("router.push(ADD_LISTING_ROUTE)");
    expect(nav).not.toContain('navigation.navigate("add"');
    expect(nav).not.toContain('routeName: "add"');
  });
});
