import * as fs from "fs";
import * as path from "path";

describe("consumer repair no bottom nav overlap architecture contract", () => {
  it("keeps request actions in document flow above the bottom navigation", () => {
    const screen = [
      "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
      "src/features/consumerRepair/ConsumerRepairRequestScreenView.tsx",
    ].map((file) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8")).join("\n");
    const chrome = fs.readFileSync(path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestChrome.tsx"), "utf8");
    const requestStyles = fs.readFileSync(path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.styles.ts"), "utf8");
    const appScreenScroll = fs.readFileSync(path.resolve(process.cwd(), "src/components/layout/AppScreenScroll.tsx"), "utf8");
    const route = fs.readFileSync(path.resolve(process.cwd(), "app/(tabs)/request/index.tsx"), "utf8");

    expect(screen).toContain("AppScreenScroll");
    expect(screen).toContain("ConsumerRepairRequestStickyActions");
    expect(chrome).not.toContain("AppStickyActionBar");
    expect(chrome).toContain('testID="consumer-repair-bottom-actions"');
    expect(chrome).toContain('testID={finalized ? "consumer-repair-open-pdf" : "consumer-estimate-make-pdf"}');
    expect(chrome).toContain('testID="consumer-repair-delete-draft"');
    expect(screen.indexOf("<ConsumerRepairRequestContent"))
      .toBeLessThan(screen.indexOf("<ConsumerRepairRequestStickyActions"));
    expect(screen.indexOf("<ConsumerRepairRequestStickyActions"))
      .toBeLessThan(screen.indexOf("</AppScreenScroll>"));
    expect(screen).not.toContain("<AppScreen hasStickyAction");
    expect(screen).not.toMatch(/marginBottom:\s*(72|80|100|120|160)/);
    expect(requestStyles).not.toMatch(/content:\s*\{[^}]*paddingBottom:/su);
    expect(appScreenScroll).toContain("paddingBottom: APP_LAYOUT.scrollBottomPaddingPx");
    expect(route).toContain("route: \"/request\"");
  });
});
