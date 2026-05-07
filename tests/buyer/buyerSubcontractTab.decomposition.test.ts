import { readFileSync } from "fs";
import { join } from "path";
import { styles } from "../../src/screens/buyer/BuyerSubcontractTab.styles";

const TAB_PATH = join(__dirname, "..", "..", "src", "screens", "buyer", "BuyerSubcontractTab.tsx");
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
  const stylesSource = readFileSync(STYLES_PATH, "utf8");

  it("keeps static styles in the dedicated typed boundary", () => {
    expect(tabSource).toContain('from "./BuyerSubcontractTab.styles"');
    expect(tabSource).not.toContain("StyleSheet.create({");
    expect(stylesSource).toContain("StyleSheet.create({");
  });

  it("preserves key style handles used by the tab", () => {
    expect(styles.createBtn).toBeTruthy();
    expect(styles.card).toBeTruthy();
    expect(styles.formHeader).toBeTruthy();
    expect(styles.input).toBeTruthy();
    expect(styles.emptyText).toBeTruthy();
  });
});
