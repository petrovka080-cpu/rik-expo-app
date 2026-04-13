import fs from "fs";
import path from "path";

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("WAVE 6 list scalability discipline", () => {
  it("keeps touched heavy lists behind virtualized boundaries", () => {
    const accountantList = read("src/screens/accountant/components/AccountantListSection.tsx");
    const directorSpend = read("src/screens/director/DirectorFinanceSpendModal.tsx");

    expect(accountantList).toContain("<FlashList");
    expect(accountantList).toContain("buildAccountantListModel");
    expect(directorSpend).toContain("<FlashList");
    expect(directorSpend).not.toMatch(/\bScrollView\b/);
    expect(directorSpend).not.toMatch(/kindRows\.map\s*\(/);
  });

  it("keeps priority screen Zustand subscriptions selector-based", () => {
    const priorityFiles = [
      "src/screens/buyer/BuyerScreen.tsx",
      "src/screens/accountant/AccountantScreen.tsx",
      "src/screens/warehouse/WarehouseScreenContent.tsx",
      "src/screens/warehouse/hooks/useWarehouseScreenController.ts",
      "src/screens/director/useDirectorScreenController.ts",
    ];

    for (const file of priorityFiles) {
      const source = read(file);
      expect(source).not.toMatch(/use[A-Za-z0-9_]*Store\s*\(\s*\)/);
    }
  });
});
