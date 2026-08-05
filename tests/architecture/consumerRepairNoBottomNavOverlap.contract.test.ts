import * as fs from "fs";
import * as path from "path";

describe("consumer repair no bottom nav overlap architecture contract", () => {
  it("uses canonical scroll and sticky action layout for /request", () => {
    const screen = [
      "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
      "src/features/consumerRepair/ConsumerRepairRequestScreenView.tsx",
    ].map((file) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8")).join("\n");
    const chrome = fs.readFileSync(path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestChrome.tsx"), "utf8");
    const route = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/request/index.tsx"), "utf8");

    expect(screen).toContain("AppScreenScroll");
    expect(screen).toContain("ConsumerRepairRequestStickyActions");
    expect(chrome).toContain("AppStickyActionBar");
    expect(chrome).toContain("placement=\"above_bottom_nav\"");
    expect(chrome).toContain('testID: finalized ? "consumer-repair-open-pdf" : "consumer-estimate-make-pdf"');
    expect(chrome).toContain('testID: "consumer-repair-delete-draft"');
    expect(screen).not.toMatch(/marginBottom:\s*(72|80|100|120|160)/);
    expect(route).toContain("route: \"/request\"");
  });
});
