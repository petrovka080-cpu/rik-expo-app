import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("bottom tabs estimate label and duplicate plus contract", () => {
  it("labels the nested request index route as Смета", () => {
    const tabs = read("app/(tabs)/_layout.tsx");

    expect(tabs).toContain('name="request/index"');
    expect(tabs).toContain('title: "Смета"');
    expect(tabs).toContain('tabBarLabel: "Смета"');
    expect(tabs).toContain('tabBarAccessibilityLabel: "Смета"');
    expect(tabs).toContain('tabBarButtonTestID: "tabs.request"');
  });

  it("exposes one custom marketplace add action instead of a tab route", () => {
    const tabs = read("app/(tabs)/_layout.tsx");
    const nav = read("app/(tabs)/_layout.tsx");

    expect(tabs).toContain('<Tabs.Screen name="add" options={{ href: null }} />');
    expect(nav).toContain('testID="bottom-nav-marketplace-add"');
    expect(nav).toContain('accessibilityLabel="Добавить товар в маркет"');
    expect(tabs).not.toContain('tabBarLabel: "+"');
    expect(tabs).not.toContain('title: "+"');
  });
});
