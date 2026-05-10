import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");
const baselineReactMemoCount = 52;

const readRepoFile = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const sourceFiles = [
  "src/screens/accountant/components/Chip.tsx",
  "src/screens/accountant/components/TabsBar.tsx",
  "src/screens/accountant/components/AccountantListSection.tsx",
  "src/screens/contractor/components/ContractorModeHeader.tsx",
  "src/screens/contractor/components/ContractorModeHomeSwitcher.tsx",
  "src/screens/contractor/components/NormalizedText.tsx",
  "src/screens/office/officeHub.sections.tsx",
] as const;

const memoizedComponents = [
  {
    relativePath: "src/screens/accountant/components/Chip.tsx",
    exportLine: "export default React.memo(function Chip",
  },
  {
    relativePath: "src/screens/accountant/components/TabsBar.tsx",
    exportLine: "export default React.memo(function TabsBar",
  },
  {
    relativePath: "src/screens/accountant/components/AccountantListSection.tsx",
    exportLine: "export const AccountantEmptyState = React.memo(function AccountantEmptyState",
  },
  {
    relativePath: "src/screens/contractor/components/ContractorModeHeader.tsx",
    exportLine: "export default React.memo(function ContractorModeHeader",
  },
  {
    relativePath: "src/screens/contractor/components/ContractorModeHomeSwitcher.tsx",
    exportLine: "export default React.memo(function ContractorModeHomeSwitcher",
  },
  {
    relativePath: "src/screens/contractor/components/NormalizedText.tsx",
    exportLine: "export default React.memo(function NormalizedText",
  },
  {
    relativePath: "src/screens/office/officeHub.sections.tsx",
    exportLine: "export const DirectorOfficeSection = React.memo(function DirectorOfficeSection",
  },
  {
    relativePath: "src/screens/office/officeHub.sections.tsx",
    exportLine: "export const ForemanOfficeSection = React.memo(function ForemanOfficeSection",
  },
  {
    relativePath: "src/screens/office/officeHub.sections.tsx",
    exportLine: "export const BuyerOfficeSection = React.memo(function BuyerOfficeSection",
  },
  {
    relativePath: "src/screens/office/officeHub.sections.tsx",
    exportLine: "export const AccountantOfficeSection = React.memo(function AccountantOfficeSection",
  },
  {
    relativePath: "src/screens/office/officeHub.sections.tsx",
    exportLine: "export const WarehouseOfficeSection = React.memo(function WarehouseOfficeSection",
  },
  {
    relativePath: "src/screens/office/officeHub.sections.tsx",
    exportLine: "export const ContractorOfficeSection = React.memo(function ContractorOfficeSection",
  },
  {
    relativePath: "src/screens/office/officeHub.sections.tsx",
    exportLine: "export const SecurityOfficeSection = React.memo(function SecurityOfficeSection",
  },
  {
    relativePath: "src/screens/office/officeHub.sections.tsx",
    exportLine: "export const EngineerOfficeSection = React.memo(function EngineerOfficeSection",
  },
  {
    relativePath: "src/screens/office/officeHub.sections.tsx",
    exportLine: "export const ReportsOfficeSection = React.memo(function ReportsOfficeSection",
  },
] as const;

describe("S_NIGHT_UI_19_REACT_MEMO_RENDER_BARRIERS_BATCH_B", () => {
  it("adds exactly fifteen React.memo render barriers for pure display boundaries", () => {
    expect(memoizedComponents).toHaveLength(15);

    for (const { relativePath, exportLine } of memoizedComponents) {
      expect(readRepoFile(relativePath)).toContain(exportLine);
    }
  });

  it("raises the exact React.memo count by the batch target", () => {
    const srcRoot = path.join(repoRoot, "src");
    const files: string[] = [];
    const collect = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          collect(fullPath);
        } else if (/\.tsx?$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    };

    collect(srcRoot);

    const reactMemoCount = files.reduce((total, filePath) => {
      const source = fs.readFileSync(filePath, "utf8");
      return total + (source.match(/React\.memo/g) ?? []).length;
    }, 0);

    expect(reactMemoCount).toBeGreaterThanOrEqual(
      baselineReactMemoCount + memoizedComponents.length,
    );
  });

  it("keeps the batch out of custom comparators and provider paths", () => {
    for (const relativePath of sourceFiles) {
      const source = readRepoFile(relativePath);

      expect(source).not.toMatch(/React\.memo\([^)]*,\s*\((prev|previous|next)/);
      expect(source).not.toMatch(/from ["'][^"']*supabase/i);
      expect(source).not.toMatch(/\.from\(/);
      expect(source).not.toMatch(/recordPlatformObservability/);
    }
  });
});
