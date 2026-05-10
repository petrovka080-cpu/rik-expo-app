import { readFileSync } from "fs";
import { join } from "path";
import { styles } from "../../src/screens/buyer/BuyerSubcontractTab.styles";

const TAB_PATH = join(__dirname, "..", "..", "src", "screens", "buyer", "BuyerSubcontractTab.tsx");
const VIEW_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "screens",
  "buyer",
  "BuyerSubcontractTab.view.tsx",
);
const STYLES_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "screens",
  "buyer",
  "BuyerSubcontractTab.styles.ts",
);

describe("BuyerSubcontractTab decomposition", () => {
  const tabSource = readFileSync(TAB_PATH, "utf8");
  const viewSource = readFileSync(VIEW_PATH, "utf8");
  const stylesSource = readFileSync(STYLES_PATH, "utf8");

  it("keeps static styles in the dedicated typed boundary", () => {
    expect(tabSource).toContain('from "./BuyerSubcontractTab.view"');
    expect(viewSource).toContain('from "./BuyerSubcontractTab.styles"');
    expect(tabSource).not.toContain("StyleSheet.create({");
    expect(stylesSource).toContain("StyleSheet.create({");
  });

  it("keeps render-heavy primitives in the view boundary", () => {
    expect(viewSource).toContain("FlashList");
    expect(viewSource).toContain("SingleDatePickerSheet");
    expect(viewSource).toContain("SendPrimaryButton");
    expect(tabSource).not.toContain("FlashList");
    expect(tabSource).not.toContain("SingleDatePickerSheet");
    expect(tabSource).not.toContain("renderItem");
  });

  it("keeps the controller hook pressure below the previous tab baseline", () => {
    const hookCount = (tabSource.match(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g) || []).length;

    expect(hookCount).toBeLessThanOrEqual(24);
  });

  it("preserves key style handles used by the tab", () => {
    expect(styles.createBtn).toBeTruthy();
    expect(styles.card).toBeTruthy();
    expect(styles.formHeader).toBeTruthy();
    expect(styles.input).toBeTruthy();
    expect(styles.emptyText).toBeTruthy();
  });
});
