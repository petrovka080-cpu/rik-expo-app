import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("BUYER_SCREEN_OWNER_SPLIT decomposition audit", () => {
  it("adds the extracted buyer owner-boundary modules", () => {
    const requiredFiles = [
      "src/screens/buyer/buyer.screen.model.ts",
      "src/screens/buyer/components/BuyerSearchBar.tsx",
      "src/screens/buyer/components/BuyerScreenContent.tsx",
    ];

    for (const relativePath of requiredFiles) {
      expect(fs.existsSync(path.join(repoRoot, relativePath))).toBe(true);
    }
  });

  it("keeps BuyerScreen as orchestration while moving view/config noise out", () => {
    const source = readRepoFile("src/screens/buyer/BuyerScreen.tsx");
    const contentSource = readRepoFile("src/screens/buyer/components/BuyerScreenContent.tsx");

    expect(source).toContain("buildBuyerScreenViewModel");
    expect(source).toContain("buildBuyerScreenLoadingState");
    expect(source).toContain("useBuyerScreenContentProps");
    expect(contentSource).toContain("export function useBuyerScreenContentProps");
    expect(source).toContain("<BuyerScreenContent");
    expect(source).not.toContain("TextInput");
    expect(source).not.toContain("RoleScreenLayout");
    expect(source).not.toContain("Ionicons");
    expect(source).not.toContain("BuyerScreenSheets");
    expect((source.match(/^import /gm) || []).length).toBeLessThan(61);
    expect(source.split("\n").length).toBeLessThan(727);
  });
});
