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

    expect(tabs).not.toContain('<Tabs.Screen name="add"');
    expect(tabs).toContain('testID="bottom-nav-marketplace-add"');
    expect(tabs).toContain('accessibilityLabel="Добавить товар в маркет"');
    expect(tabs).toContain("router.push(ADD_LISTING_ROUTE)");
    expect(tabs).not.toContain('tabBarLabel: "+"');
    expect(tabs).not.toContain('title: "+"');
  });
});
