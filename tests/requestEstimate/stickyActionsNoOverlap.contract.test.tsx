import fs from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("request sticky actions no overlap", () => {
  it("keeps the request scroll content padded beyond the sticky action height", () => {
    const styles = read("src/features/consumerRepair/ConsumerRepairRequestScreen.styles.ts");
    const view = read("src/features/consumerRepair/ConsumerRepairRequestScreenView.tsx");
    const sticky = read("src/features/consumerRepair/ConsumerRepairRequestChrome.tsx");
    const appScreen = read("src/components/layout/AppScreen.tsx");

    expect(view).toContain("<AppScreen style={styles.screen}>");
    expect(appScreen).toContain('position: "relative"');
    expect(view).toContain("<AppScreenScroll");
    expect(view).toContain("contentStyle={styles.content}");
    expect(view.indexOf("<ConsumerRepairRequestContent"))
      .toBeLessThan(view.indexOf("<ConsumerRepairRequestStickyActions"));
    expect(view.indexOf("<ConsumerRepairRequestStickyActions"))
      .toBeLessThan(view.indexOf("</AppScreenScroll>"));
    expect(view.match(/<ConsumerRepairRequestStickyActions/g)).toHaveLength(1);
    expect(styles).toMatch(/bottomActions:\s*\{[^}]*marginTop:\s*2/su);
    expect(styles).not.toMatch(/bottomActions:\s*\{[^}]*position:\s*"absolute"/su);
    expect(sticky).not.toContain('placement="above_bottom_nav"');
  });
});
