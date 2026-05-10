import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");
const baselineMemoBoundaryCount = 38;

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
    } else if (/\.tsx$/.test(entry.name)) {
      files.push(relativePath);
    }
  }

  return files;
}

const memoizedComponents = [
  {
    relativePath: "src/features/market/components/MarketHeaderBar.tsx",
    exportLine: "export default React.memo(MarketHeaderBar);",
  },
  {
    relativePath: "src/features/market/components/MarketAssistantBanner.tsx",
    exportLine: "export default React.memo(MarketAssistantBanner);",
  },
  {
    relativePath: "src/features/market/components/MarketTenderBanner.tsx",
    exportLine: "export default React.memo(MarketTenderBanner);",
  },
  {
    relativePath: "src/features/market/components/MarketCategoryRail.tsx",
    exportLine: "export default React.memo(MarketCategoryRail);",
  },
  {
    relativePath: "src/screens/contractor/components/ActBuilderHeaderInfo.tsx",
    exportLine: "export default React.memo(ActBuilderHeaderInfo);",
  },
  {
    relativePath: "src/screens/contractor/components/ActBuilderTotalsCard.tsx",
    exportLine: "export default React.memo(ActBuilderTotalsCard);",
  },
  {
    relativePath: "src/screens/contractor/components/ActBuilderSelectionStats.tsx",
    exportLine: "export default React.memo(ActBuilderSelectionStats);",
  },
  {
    relativePath: "src/screens/contractor/components/ActBuilderFooter.tsx",
    exportLine: "export default React.memo(ActBuilderFooter);",
  },
  {
    relativePath: "src/screens/contractor/components/ContractorLoadingView.tsx",
    exportLine: "export default React.memo(ContractorLoadingView);",
  },
  {
    relativePath: "src/screens/contractor/components/ContractorActivationView.tsx",
    exportLine: "export default React.memo(ContractorActivationView);",
  },
  {
    relativePath: "src/screens/contractor/components/ContractorSubcontractsList.tsx",
    exportLine: "export default React.memo(ContractorSubcontractsList);",
  },
  {
    relativePath: "src/screens/contractor/components/ModalSheetHeader.tsx",
    exportLine: "export default React.memo(ModalSheetHeader);",
  },
  {
    relativePath: "src/screens/warehouse/components/ReqHeadRowItem.tsx",
    exportLine: "export default React.memo(ReqHeadRowItem);",
  },
  {
    relativePath: "src/screens/warehouse/components/IncomingRowItem.tsx",
    exportLine: "export default React.memo(IncomingRowItem);",
  },
] as const;

describe("S_RUNTIME_04_REACT_MEMO_BARRIERS_BATCH_A", () => {
  it("adds React.memo boundaries to 10-20 safe presentational/list components", () => {
    expect(memoizedComponents.length).toBeGreaterThanOrEqual(10);
    expect(memoizedComponents.length).toBeLessThanOrEqual(20);

    for (const { relativePath, exportLine } of memoizedComponents) {
      expect(readRepoFile(relativePath)).toContain(exportLine);
    }
  });

  it("raises the source memo-boundary budget from the batch baseline", () => {
    const sourceFiles = collectSourceFiles("src");
    const memoBoundaryCount = sourceFiles.reduce((total, relativePath) => {
      const source = readRepoFile(relativePath);
      return total + (source.match(/React\.memo|memo\(/g) ?? []).length;
    }, 0);

    expect(memoBoundaryCount).toBeGreaterThanOrEqual(
      baselineMemoBoundaryCount + memoizedComponents.length,
    );
  });

  it("keeps selected memo components free of hooks, side effects, and transport paths", () => {
    for (const { relativePath } of memoizedComponents) {
      const source = readRepoFile(relativePath);

      expect(source).not.toMatch(/\buse(State|Effect|LayoutEffect|FocusEffect|Subscription)\s*\(/);
      expect(source).not.toMatch(/\bset(Timeout|Interval)\s*\(/);
      expect(source).not.toMatch(/\.addListener\s*\(/);
      expect(source).not.toMatch(/\b(router|navigation|Linking)\./);
      expect(source).not.toMatch(/from ["'][^"']*supabase/i);
      expect(source).not.toMatch(/recordPlatformObservability/);
    }
  });

  it("proves selected parent props are stable before memo boundaries receive them", () => {
    const marketScreen = readRepoFile("src/features/market/MarketHomeScreen.tsx");
    expect(marketScreen).toContain("onChangeQuery={setQuery}");
    expect(marketScreen).toContain("onMapPress={handleOpenMap}");
    expect(marketScreen).toContain("onProfilePress={handleOpenProfile}");
    expect(marketScreen).toContain("onSelect={handleCategorySelect}");
    expect(marketScreen).toContain("onPress={handleOpenAuctions}");
    expect(marketScreen).toContain("onOpenAssistant={handleOpenAssistant}");
    expect(marketScreen).toContain("onOpenMap={handleOpenMap}");

    const actBuilderModal = readRepoFile("src/screens/contractor/components/ActBuilderModal.tsx");
    expect(actBuilderModal).toContain("const listHeader = React.useMemo");
    expect(actBuilderModal).toContain("const listFooter = React.useMemo");
    expect(actBuilderModal).toContain("const modalHeaderContainerStyle = React.useMemo");
    expect(actBuilderModal).toContain("containerStyle={modalHeaderContainerStyle}");
    expect(actBuilderModal).toContain("titleStyle={modalHeaderTitleStyle}");
    expect(actBuilderModal).toContain("subtitleStyle={modalHeaderSubtitleStyle}");
    expect(actBuilderModal).toContain("closeBtnStyle={modalHeaderCloseButtonStyle}");
    expect(actBuilderModal).toContain("closeTextStyle={modalHeaderCloseTextStyle}");

    const contractorScreenView = readRepoFile("src/screens/contractor/ContractorScreenView.tsx");
    expect(contractorScreenView).toContain("onCodeChange={setCode}");
    expect(contractorScreenView).toContain("onActivate={activateCode}");
    expect(contractorScreenView).toContain("data={contractorWorkCards}");
    expect(contractorScreenView).toContain("onRefresh={handleRefresh}");
    expect(contractorScreenView).toContain("onOpen={handleOpenUnifiedCard}");

    const contractorActivationHook = readRepoFile("src/screens/contractor/hooks/useContractorActivation.ts");
    expect(contractorActivationHook).toContain("const activateCode = useCallback");

    const contractorCardsHook = readRepoFile("src/screens/contractor/hooks/useContractorCards.ts");
    expect(contractorCardsHook).toContain("const contractorCardModels = useMemo");
    expect(contractorCardsHook).toContain("const handleOpenUnifiedCard = useCallback");

    const contractorRefreshHook = readRepoFile("src/screens/contractor/hooks/useContractorRefreshLifecycle.ts");
    expect(contractorRefreshHook).toContain("const handleRefresh = useCallback");

    const warehouseRenderers = readRepoFile("src/screens/warehouse/hooks/useWarehouseRenderers.tsx");
    expect(warehouseRenderers).toContain("const renderReqHeadItem = useMemo");
    expect(warehouseRenderers).toContain("const renderIncomingItem = useMemo");
  });

  it("keeps the batch out of screens and hidden stateful components", () => {
    for (const { relativePath } of memoizedComponents) {
      expect(relativePath).not.toMatch(/Screen\.tsx$/);
      expect(relativePath).not.toMatch(/Modal\.tsx$/);
    }
  });
});
