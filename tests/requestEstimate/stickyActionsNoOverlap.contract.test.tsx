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

    expect(view).toContain("<AppScreen hasStickyAction");
    expect(view).toContain("<AppScreenScroll contentStyle={styles.content}");
    expect(styles).toContain("paddingBottom: APP_LAYOUT.scrollBottomPaddingPx + APP_LAYOUT.stickyActionHeightPx");
    expect(sticky).toContain('placement="above_bottom_nav"');
    expect(sticky).toContain("safeAreaAware");
  });
});
