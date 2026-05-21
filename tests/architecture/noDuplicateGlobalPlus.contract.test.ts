import * as fs from "fs";
import * as path from "path";

describe("no duplicate global plus architecture contract", () => {
  it("keeps add route hidden from bottom nav while request has its own tab", () => {
    const tabs = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/_layout.tsx"), "utf8");

    expect(tabs).toContain('name="request/index"');
    expect(tabs).toContain('<Tabs.Screen name="add" options={{ href: null }} />');
    expect((tabs.match(/tabBarLabel:\s*"\+"/g) ?? [])).toHaveLength(0);
    expect((tabs.match(/tabBarIcon:\s*\(\{ focused, color, size \}\).*iconForRoute\("add"/gs) ?? [])).toHaveLength(0);
  });
});
