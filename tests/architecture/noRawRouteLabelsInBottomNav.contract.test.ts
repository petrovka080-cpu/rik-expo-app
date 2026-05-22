import * as fs from "fs";
import * as path from "path";

describe("no raw route labels in bottom nav architecture contract", () => {
  it("never lets request/index or add/index become user-facing labels", () => {
    const tabs = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/_layout.tsx"), "utf8");
    const nav = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/_layout.tsx"), "utf8");
    const requestOptions = tabs.slice(tabs.indexOf('name="request/index"'), tabs.indexOf('name="market"'));

    expect(requestOptions).toContain("Смета");
    expect(requestOptions).not.toContain('title: "request/index"');
    expect(requestOptions).not.toContain('tabBarLabel: "request/index"');
    expect(requestOptions).not.toContain("(tabs)/request");

    expect(nav).not.toContain("request/index</Text>");
    expect(nav).not.toContain("add/index");
  });
});
