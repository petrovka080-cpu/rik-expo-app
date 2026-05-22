import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("no raw add route in bottom tabs architecture contract", () => {
  it("keeps add route hidden and out of user-facing tab labels", () => {
    const tabs = read("app/(tabs)/_layout.tsx");
    const nav = read("app/(tabs)/_layout.tsx");

    expect(tabs).toContain('<Tabs.Screen name="add" options={{ href: null }} />');
    expect(tabs).not.toContain('tabBarLabel: "add"');
    expect(tabs).not.toContain('tabBarLabel: "add/index"');
    expect(tabs).not.toContain('title: "add"');
    expect(tabs).not.toContain('title: "add/index"');
    expect(nav).not.toContain('routeName: "add"');
    expect(nav).not.toContain('routeName: "add/index"');
  });
});
