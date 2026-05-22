import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("marketplace add plus opens add product contract", () => {
  it("routes the visible plus action to /add through the UI", () => {
    const nav = read("app/(tabs)/_layout.tsx");

    expect(nav).toContain('testID="bottom-nav-marketplace-add"');
    expect(nav).toContain("ADD_LISTING_ROUTE");
    expect(nav).toContain("href={ADD_LISTING_ROUTE}");
    expect(nav).not.toContain('router.push("/request")');
    expect(nav).not.toContain('router.push("/add/index")');
  });

  it("does not expose /add as a bottom tab label", () => {
    const tabs = read("app/(tabs)/_layout.tsx");

    expect(tabs).toContain('<Tabs.Screen name="add" options={{ href: null }} />');
    expect(tabs).not.toContain('tabBarLabel: "add/index"');
    expect(tabs).not.toContain('title: "add/index"');
    expect(tabs).not.toContain('tabBarLabel: "/add"');
  });
});
