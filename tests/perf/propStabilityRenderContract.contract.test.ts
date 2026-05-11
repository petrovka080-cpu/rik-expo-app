import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

const readRepoFile = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const sourceFilesTouchedByContract = [
  "src/features/market/MarketHomeScreen.tsx",
  "src/features/market/components/MarketHomeFeedCardCell.tsx",
  "src/features/chat/ChatScreen.tsx",
  "src/screens/contractor/components/ContractorSubcontractsList.tsx",
] as const;

describe("S_NIGHT_UI_20_PROP_STABILITY_RENDER_CONTRACT", () => {
  it("keeps BuyerScreen and BuyerItemRow behind stable composition contracts", () => {
    const buyerScreen = readRepoFile("src/screens/buyer/BuyerScreen.tsx");
    const buyerContent = readRepoFile("src/screens/buyer/components/BuyerScreenContent.tsx");
    const buyerItemRow = readRepoFile("src/screens/buyer/components/BuyerItemRow.tsx");

    expect(buyerScreen).toContain("const contentProps = useBuyerScreenController();");
    expect(buyerScreen).toContain("<BuyerScreenContent {...contentProps} />");

    expect(buyerContent).toContain("export const BuyerScreenContent = React.memo(function BuyerScreenContent");
    expect(buyerContent).toContain("const subcontractScrollHandler = useMemo");
    expect(buyerContent).toContain("const stableMainList = useMemo");
    expect(buyerContent).toContain("const stableSheets = useMemo");

    expect(buyerItemRow).toContain("const supplierKeyExtractor = (item: string, idx: number)");
    expect(buyerItemRow).toContain("const renderInlineSupplierItem = React.useCallback");
    expect(buyerItemRow).toContain("const renderModalSupplierItem = React.useCallback");
    expect(buyerItemRow).toContain("keyExtractor={supplierKeyExtractor}");
    expect(buyerItemRow).toContain("renderItem={renderInlineSupplierItem}");
    expect(buyerItemRow).toContain("renderItem={renderModalSupplierItem}");
  });

  it("stabilizes MarketHomeScreen heavy feed props and item callbacks", () => {
    const source = readRepoFile("src/features/market/MarketHomeScreen.tsx");
    const feedCardCell = readRepoFile("src/features/market/components/MarketHomeFeedCardCell.tsx");
    const controller = readRepoFile("src/features/market/useMarketHomeController.ts");

    expect(feedCardCell).toContain("export const MarketHomeFeedCardCell = React.memo(function MarketHomeFeedCardCell");
    expect(feedCardCell).toContain("const cellStyle = useMemo");
    expect(feedCardCell).toContain("const handleOpen = useCallback");
    expect(feedCardCell).toContain("const handleMapPress = useCallback");
    expect(source).toContain("const renderCard = useCallback");
    expect(source).toContain("<MarketHomeFeedCardCell");
    expect(controller).toContain("const handleRefreshFeed = useCallback");
    expect(controller).toContain("const handleEndReached = useCallback");
    expect(controller).toContain("const handleBannerItemPress = useCallback");
    expect(source).toContain("keyExtractor={marketHomeListingKeyExtractor}");
    expect(source).toContain("ListHeaderComponent={header}");
    expect(source).toContain("ListFooterComponent={footer}");
    expect(source).toContain("ListEmptyComponent={renderFeedPlaceholder}");
    expect(source).not.toContain("onOpen={() => handleOpenListing(item)}");
    expect(source).not.toContain("onMapPress={() => pushSupplierMap(item)}");
    expect(source).not.toContain("onRefresh={() =>");
    expect(source).not.toContain("onEndReached={() =>");
  });

  it("stabilizes ChatScreen thread row callbacks without changing thread data flow", () => {
    const source = readRepoFile("src/features/chat/ChatScreen.tsx");

    expect(source).toContain("const ChatMessageRow = React.memo(function ChatMessageRow");
    expect(source).toContain("const renderItem = useCallback");
    expect(source).toContain("<ChatMessageRow");
    expect(source).toContain("keyExtractor={chatMessageKeyExtractor}");
    expect(source).toContain("ListEmptyComponent={chatEmptyComponent}");
    expect(source).not.toContain("onLongPress={isOwn ? () => void handleDelete(item.id) : undefined}");
  });

  it("keeps DirectorDashboard, AccountantScreen, and OfficeHubScreen on existing stable list contracts", () => {
    const director = readRepoFile("src/screens/director/DirectorDashboard.tsx");
    const accountantScreen = readRepoFile("src/screens/accountant/AccountantScreen.tsx");
    const accountantList = readRepoFile("src/screens/accountant/components/AccountantListSection.tsx");
    const officeScreen = readRepoFile("src/screens/office/OfficeHubScreen.tsx");
    const officeContent = readRepoFile("src/screens/office/OfficeShellContent.tsx");

    expect(director).toContain("const DIRECTOR_TOP_TABS: TopTabItem[]");
    expect(director).toContain("const DIRECTOR_FINANCE_DASHBOARD_CARDS");
    expect(director).toContain("const directorTopTabKeyExtractor");
    expect(director).toContain("const directorForemanGroupKeyExtractor");
    expect(director).toContain("const directorProposalHeadKeyExtractor");
    expect(director).toContain("const directorFinanceCardKeyExtractor");
    expect(director).toContain("const requestGroupsContentContainerStyle = React.useMemo");
    expect(director).toContain("const proposalHeadsContentContainerStyle = React.useMemo");
    expect(director).toContain("const financeContentContainerStyle = React.useMemo");
    expect(director).toContain("const renderForemanGroup = React.useCallback");
    expect(director).toContain("const renderProposalHead = React.useCallback");

    expect(accountantScreen).toContain("const model = useAccountantScreenComposition();");
    expect(accountantScreen).toContain("<AccountantScreenView {...model} />");
    expect(accountantList).toContain("const data = React.useMemo");
    expect(accountantList).toContain("const keyExtractor = React.useCallback");
    expect(accountantList).toContain("const renderItem = React.useCallback");

    expect(officeScreen).toContain("const controller = useOfficeHubScreenController(props);");
    expect(officeScreen).toContain("<OfficeShellContent {...controller} />");
    expect(officeContent).toContain("onRefresh={onRefresh}");
    expect(officeContent).toContain("onOpenCard={onOpenOfficeCard}");
  });

  it("stabilizes ContractorScreen subcontract list rows and list chrome", () => {
    const screen = readRepoFile("src/screens/contractor/ContractorScreen.tsx");
    const view = readRepoFile("src/screens/contractor/ContractorScreenView.tsx");
    const list = readRepoFile("src/screens/contractor/components/ContractorSubcontractsList.tsx");

    expect(screen).toContain("<ContractorScreenContainer");
    expect(view).toContain("data={contractorWorkCards}");
    expect(view).toContain("onRefresh={handleRefresh}");
    expect(view).toContain("onOpen={handleOpenUnifiedCard}");

    expect(list).toContain("const ContractorWorkCardRow = React.memo(function ContractorWorkCardRow");
    expect(list).toContain("const contractorWorkCardKeyExtractor");
    expect(list).toContain("const refreshControl = React.useMemo");
    expect(list).toContain("const headerComponent = React.useMemo");
    expect(list).toContain("const emptyComponent = React.useMemo");
    expect(list).toContain("const renderItem = React.useCallback");
    expect(list).toContain("keyExtractor={contractorWorkCardKeyExtractor}");
    expect(list).toContain("renderItem={renderItem}");
    expect(list).not.toContain("renderItem={({ item })");
    expect(list).not.toContain("onPress={() => onOpen(String(item.workId))}");
  });

  it("does not add provider calls or transport mutations to render contract files", () => {
    for (const relativePath of sourceFilesTouchedByContract) {
      const source = readRepoFile(relativePath);

      expect(source).not.toMatch(/from ["'][^"']*supabase/i);
      expect(source).not.toMatch(/\brpc\s*\(/);
      expect(source).not.toMatch(/\bsupabase\s*\./i);
      expect(source).not.toMatch(/\bfetch\s*\(/);
    }
  });
});
