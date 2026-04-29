import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("V4-6 inline styles phase 2", () => {
  const hotpathFiles = [
    "src/screens/contractor/components/ActBuilderMaterialRow.tsx",
    "src/screens/contractor/components/ActBuilderWorkRow.tsx",
    "src/screens/accountant/components/AccountantCardContent.tsx",
    "src/screens/buyer/components/BuyerMobileItemEditorModal.tsx",
    "src/screens/buyer/components/BuyerRfqSheetBody.tsx",
  ];

  it("keeps the selected hotpath files free of render-time style={{}} allocations", () => {
    for (const relativePath of hotpathFiles) {
      const source = readRepoFile(relativePath);
      const inlineStyleCount = (source.match(/style=\{\{/g) || []).length;
      expect(inlineStyleCount).toBe(0);
    }
  });

  it("keeps read-only receipt static styles in StyleSheet while preserving dynamic variants", () => {
    const source = readRepoFile("src/screens/accountant/components/ReadOnlyReceipt.tsx");
    const inlineStyleCount = (source.match(/style=\{\{/g) || []).length;

    expect(source).toContain("const receiptStyles = StyleSheet.create");
    expect(inlineStyleCount).toBeLessThanOrEqual(10);
    expect(source).toContain('color: rest <= 0 ? "rgba(134,239,172,0.95)" : "rgba(253,224,138,0.95)"');
    expect(source).toContain("opacity: busyKey ? 0.6 : 1");
  });
});
