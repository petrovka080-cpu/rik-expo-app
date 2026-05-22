import * as fs from "fs";
import * as path from "path";

describe("bottom nav no duplicate plus or raw routes contract", () => {
  it("does not expose duplicate plus or raw route labels", () => {
    const tabs = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/_layout.tsx"), "utf8");

    expect((tabs.match(/<Tabs.Screen name="add"/g) ?? []).length).toBe(1);
    expect(tabs).toContain('<Tabs.Screen name="add" options={{ href: null }} />');
    expect(tabs).not.toContain("request/index</Text>");
    expect(tabs).not.toContain("add/index");
  });
});
