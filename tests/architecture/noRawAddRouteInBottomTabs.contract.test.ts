import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("no raw add route in bottom tabs architecture contract", () => {
  it("keeps add route hidden and out of user-facing tab labels", () => {
    const tabs = read("app/(tabs)/_layout.tsx");
    const nav = read("app/(tabs)/_layout.tsx");

    expect(tabs).not.toContain('<Tabs.Screen name="add"');
    expect(tabs).toContain("ADD_LISTING_ROUTE");
    expect(tabs).not.toContain('tabBarLabel: "add"');
    expect(tabs).not.toContain('tabBarLabel: "add/index"');
    expect(tabs).not.toContain('title: "add"');
    expect(tabs).not.toContain('title: "add/index"');
    expect(nav).not.toContain('routeName: "add"');
    expect(nav).not.toContain('routeName: "add/index"');
    expect(nav).toContain("router.push(ADD_LISTING_ROUTE)");
  });
});
