import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("BuyerItemRow decomposition audit", () => {
  it("keeps static row styles in a sibling boundary without render logic drift", () => {
    const rowSource = readRepoFile("src/screens/buyer/components/BuyerItemRow.tsx");
    const stylesSource = readRepoFile("src/screens/buyer/buyer.styles.ts");
    const originalAuditLineCount = 934;
    const minimumRequiredReduction = 50;

    expect(rowSource).toContain('import { buyerStyles as styles } from "../buyer.styles";');
    expect(rowSource).not.toContain("StyleSheet.create");
    expect(rowSource.split("\n").length).toBeLessThanOrEqual(
      originalAuditLineCount - minimumRequiredReduction,
    );

    expect(stylesSource).toContain("export const buyerStyles = StyleSheet.create");
    expect(stylesSource).toContain("editorCardBase");
    expect(stylesSource).toContain("supplierModalSafeArea");
    expect(stylesSource).toContain("rowShellSelected");
  });
});
