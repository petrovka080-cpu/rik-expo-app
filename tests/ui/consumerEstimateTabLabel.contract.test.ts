import * as fs from "fs";
import * as path from "path";

describe("consumer estimate tab label contract", () => {
  it("uses visible Смета label while preserving the safer request/index route", () => {
    const tabs = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/_layout.tsx"), "utf8");

    expect(tabs).toContain('name="request/index"');
    expect(tabs).toContain('label: "Смета"');
    expect(tabs).toContain('title: "Смета"');
  });
});
