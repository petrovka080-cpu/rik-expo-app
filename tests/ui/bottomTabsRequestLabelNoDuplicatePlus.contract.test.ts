import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("bottom tabs request label and duplicate plus contract", () => {
  it("labels the nested request index route as Заявка", () => {
    const tabs = read("app/(tabs)/_layout.tsx");

    expect(tabs).toContain('name="request/index"');
    expect(tabs).toContain('title: "Заявка"');
    expect(tabs).toContain('tabBarLabel: "Заявка"');
    expect(tabs).toContain('tabBarAccessibilityLabel: "Заявка"');
    expect(tabs).toContain('tabBarButtonTestID: "tabs.request"');
  });

  it("does not expose the global add plus as a second bottom tab action", () => {
    const tabs = read("app/(tabs)/_layout.tsx");

    expect(tabs).toContain('<Tabs.Screen name="add" options={{ href: null }} />');
    expect(tabs).not.toContain('tabBarLabel: "+"');
    expect(tabs).not.toContain('title: "+"');
  });
});
