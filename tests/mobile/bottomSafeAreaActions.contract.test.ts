import fs from "node:fs";
import path from "node:path";

describe("bottom safe-area actions", () => {
  it("keeps restored request actions in the safe-area-aware sticky bar", () => {
    const chrome = fs.readFileSync(
      path.resolve(process.cwd(), "src", "features", "consumerRepair", "ConsumerRepairRequestChrome.tsx"),
      "utf8",
    );
    const view = fs.readFileSync(
      path.resolve(process.cwd(), "src", "features", "consumerRepair", "ConsumerRepairRequestScreenView.tsx"),
      "utf8",
    );
    const scroll = fs.readFileSync(
      path.resolve(process.cwd(), "src", "components", "layout", "AppScreenScroll.tsx"),
      "utf8",
    );
    expect(chrome).not.toContain("AppStickyActionBar");
    expect(chrome).toContain("consumer-estimate-make-pdf");
    expect(chrome).toContain("consumer-repair-approve");
    expect(chrome).toContain("consumer-repair-delete-draft");
    expect(view.indexOf("<ConsumerRepairRequestStickyActions")).toBeLessThan(view.indexOf("</AppScreenScroll>"));
    expect(scroll).toContain("paddingBottom: APP_LAYOUT.scrollBottomPaddingPx");
  });
});
