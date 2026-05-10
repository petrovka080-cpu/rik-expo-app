import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("S_NIGHT_UI_13 BuyerScreen render section extraction", () => {
  const rootSource = read("src/screens/buyer/BuyerScreen.tsx");
  const contentSource = read("src/screens/buyer/components/BuyerScreenContent.tsx");
  const sectionsSource = read("src/screens/buyer/components/BuyerScreenRenderSections.tsx");

  it("keeps BuyerScreen itself as the existing tiny controller shell", () => {
    const hookCalls = rootSource.match(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g) ?? [];

    expect(hookCalls).toEqual(["useBuyerScreenController("]);
    expect(rootSource.split(/\r?\n/).length).toBeLessThanOrEqual(12);
    expect(rootSource).toContain("<BuyerScreenContent");
    expect(rootSource).not.toContain("RoleScreenLayout");
    expect(rootSource).not.toContain("BuyerScreenSheets");
  });

  it("adds five memoized presentational render boundaries", () => {
    const expectedSections = [
      "BuyerScreenLayoutSection",
      "BuyerScreenHeaderSection",
      "BuyerScreenSearchHostSection",
      "BuyerScreenContentListSection",
      "BuyerScreenSheetHostSection",
    ];

    for (const sectionName of expectedSections) {
      expect(sectionsSource).toContain(`export const ${sectionName} = React.memo`);
      expect(contentSource).toContain(`<${sectionName}`);
    }

    expect((sectionsSource.match(/React\.memo\(function BuyerScreen/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it("keeps the extracted sections presentational and transport-free", () => {
    for (const forbidden of ["supabase", "fetch(", "cache", "rateLimit", "listBuyerInbox", "proposalSubmit"]) {
      expect(sectionsSource).not.toContain(forbidden);
    }

    expect(sectionsSource).toContain("<BuyerSearchBar");
    expect(sectionsSource).toContain("<BuyerSubcontractTab");
    expect(sectionsSource).toContain("<BuyerMainList");
    expect(sectionsSource).toContain("<BuyerScreenSheets");
    expect(contentSource).not.toMatch(/<BuyerMainList[\s>]/);
    expect(contentSource).not.toMatch(/<BuyerScreenSheets[\s>]/);
  });
});
