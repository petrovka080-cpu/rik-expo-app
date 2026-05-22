import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("no duplicate global plus architecture contract", () => {
  it("keeps add route hidden and renders exactly one marketplace add action", () => {
    const tabs = read("app/(tabs)/_layout.tsx");
    const nav = read("app/(tabs)/_layout.tsx");

    expect(tabs).toContain('name="request/index"');
    expect(tabs).toContain('<Tabs.Screen name="add" options={{ href: null }} />');
    expect((tabs.match(/tabBarLabel:\s*"\+"/g) ?? [])).toHaveLength(0);
    expect((tabs.match(/title:\s*"\+"/g) ?? [])).toHaveLength(0);
    expect((nav.match(/bottom-nav-marketplace-add"/g) ?? [])).toHaveLength(1);
    expect((nav.match(/bottom-nav-global-add"/g) ?? [])).toHaveLength(0);
  });
});
