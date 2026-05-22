import * as fs from "fs";
import * as path from "path";

describe("bottom nav estimate position contract", () => {
  it("keeps Смета immediately after Офис", () => {
    const tabs = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/_layout.tsx"), "utf8");

    expect(tabs.indexOf('label: "Офис"')).toBeLessThan(tabs.indexOf('label: "Смета"'));
    expect(tabs.indexOf('label: "Смета"')).toBeLessThan(tabs.indexOf('label: "Маркет"'));
  });
});
