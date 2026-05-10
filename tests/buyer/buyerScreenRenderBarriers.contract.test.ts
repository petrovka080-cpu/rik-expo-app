import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function collectSourceFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(repoRoot, relativeDir);
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(relativePath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(relativePath);
    }
  }

  return files;
}

const memoizedBuyerComponents = [
  {
    relativePath: "src/screens/buyer/components/BuyerAccountingSheetBody.tsx",
    exportLine: "export const BuyerAccountingSheetBody = React.memo(BuyerAccountingSheetBodyInner);",
  },
  {
    relativePath: "src/screens/buyer/components/BuyerRfqSheetBody.tsx",
    exportLine: "export const BuyerRfqSheetBody = React.memo(BuyerRfqSheetBodyInner);",
  },
  {
    relativePath: "src/screens/buyer/components/BuyerReworkSheetBody.tsx",
    exportLine: "export const BuyerReworkSheetBody = React.memo(BuyerReworkSheetBodyInner);",
  },
  {
    relativePath: "src/screens/buyer/components/BuyerReworkSheetBody.tsx",
    exportLine: "export const SheetFooterActions = React.memo(SheetFooterActionsInner);",
  },
  {
    relativePath: "src/screens/buyer/components/BuyerReworkSheetBody.tsx",
    exportLine: "export const BuyerAttachmentsSticky = React.memo(BuyerAttachmentsStickyInner);",
  },
  {
    relativePath: "src/screens/buyer/components/BuyerMobileItemEditorModal.tsx",
    exportLine: "export const BuyerMobileItemEditorModal = React.memo(BuyerMobileItemEditorModalInner);",
  },
  {
    relativePath: "src/screens/buyer/components/BuyerCardSkeleton.tsx",
    exportLine: "export const BuyerCardSkeleton = React.memo(function BuyerCardSkeleton",
  },
  {
    relativePath: "src/screens/buyer/components/common/WideActionButton.tsx",
    exportLine: "export const WideActionButton = React.memo(function WideActionButton",
  },
  {
    relativePath: "src/screens/buyer/ToastOverlay.tsx",
    exportLine: "export default React.memo(ToastOverlay);",
  },
] as const;

describe("S_RUNTIME_02 BuyerScreen render barriers", () => {
  it("adds memo boundaries to safe buyer child and section components", () => {
    for (const { relativePath, exportLine } of memoizedBuyerComponents) {
      expect(readRepoFile(relativePath)).toContain(exportLine);
    }

    const buyerSourceFiles = collectSourceFiles("src/screens/buyer/components");
    buyerSourceFiles.push("src/screens/buyer/ToastOverlay.tsx");

    const memoBoundaryCount = buyerSourceFiles.reduce((total, relativePath) => {
      const source = readRepoFile(relativePath);
      return total + (source.match(/React\.memo\s*\(/g) ?? []).length;
    }, 0);

    expect(memoBoundaryCount).toBeGreaterThanOrEqual(22);
  });

  it("stabilizes sheet props before memoized sheet children receive them", () => {
    const source = readRepoFile("src/screens/buyer/components/BuyerScreenSheets.tsx");

    expect(source).toContain("const inboxFooter = React.useMemo");
    expect(source).toContain("const reloadProposalAttachments = React.useCallback");
    expect(source).toContain("const attachProposalFile = React.useCallback");
    expect(source).toContain("EMPTY_PROPOSAL_ATTACHMENTS");
    expect(source).toContain("onReloadAttachments={reloadProposalAttachments}");
    expect(source).toContain("onAttachFile={attachProposalFile}");
    expect(source).not.toContain("onReloadAttachments={() =>");
    expect(source).not.toContain("onAttachFile={() =>");
  });

  it("keeps render barriers out of direct business transport paths", () => {
    for (const { relativePath } of memoizedBuyerComponents) {
      const source = readRepoFile(relativePath);

      expect(source).not.toMatch(/from ["'][^"']*supabase/i);
      expect(source).not.toMatch(/from ["'][^"']*catalog_api/i);
    }
  });
});
