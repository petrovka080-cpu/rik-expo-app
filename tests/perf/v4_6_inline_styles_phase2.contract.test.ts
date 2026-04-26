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
});
