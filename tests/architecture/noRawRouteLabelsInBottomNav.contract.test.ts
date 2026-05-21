import * as fs from "fs";
import * as path from "path";

describe("no raw route labels in bottom nav architecture contract", () => {
  it("never lets request/index become a user-facing label", () => {
    const tabs = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/_layout.tsx"), "utf8");
    const requestOptions = tabs.slice(tabs.indexOf('name="request/index"'), tabs.indexOf('name="market"'));

    expect(requestOptions).toContain("Заявка");
    expect(requestOptions).not.toContain('title: "request/index"');
    expect(requestOptions).not.toContain('tabBarLabel: "request/index"');
    expect(requestOptions).not.toContain("(tabs)/request");
  });
});
