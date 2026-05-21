import * as fs from "fs";
import * as path from "path";

describe("consumer repair no bottom nav overlap architecture contract", () => {
  it("uses canonical scroll and sticky action layout for /request", () => {
    const screen = fs.readFileSync(path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"), "utf8");
    const route = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/request/index.tsx"), "utf8");

    expect(screen).toContain("AppScreenScroll");
    expect(screen).toContain("AppStickyActionBar");
    expect(screen).toContain("placement=\"above_bottom_nav\"");
    expect(screen).not.toMatch(/marginBottom:\s*(72|80|100|120|160)/);
    expect(route).toContain("route: \"/request\"");
  });
});
