import fs from "node:fs";
import path from "node:path";

describe("structured pipeline mobile bottom actions", () => {
  it("keeps request actions in the safe-area-aware sticky bar", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src", "features", "consumerRepair", "ConsumerRepairRequestChrome.tsx"),
      "utf8",
    );
    expect(source).toContain("AppStickyActionBar");
    expect(source).toContain("safeAreaAware");
    expect(source).toContain('placement="above_bottom_nav"');
    expect(source).toContain("consumer-estimate-make-pdf");
    expect(source).toContain("consumer-repair-approve");
  });
});
