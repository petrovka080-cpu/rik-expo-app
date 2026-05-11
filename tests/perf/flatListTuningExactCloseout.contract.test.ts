import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const tunedCloseoutComponents = [
  "src/components/AppCombo.tsx",
  "src/screens/buyer/components/BuyerMainList.tsx",
  "src/screens/buyer/BuyerSubcontractTab.view.tsx",
  "src/screens/accountant/components/AccountantListSection.tsx",
  "src/screens/accountant/AccountantSubcontractTab.tsx",
  "src/screens/contractor/components/ContractorSubcontractsList.tsx",
  "src/screens/contractor/components/ContractorOtherWorksList.tsx",
  "src/features/auctions/AuctionsScreen.tsx",
  "src/features/supplierShowcase/SupplierShowcaseScreen.tsx",
  "src/screens/director/DirectorSubcontractTab.tsx",
  "src/screens/warehouse/components/WarehouseStockTab.tsx",
  "src/screens/warehouse/components/WarehouseIncomingTab.tsx",
  "src/screens/warehouse/components/WarehouseIssueTab.tsx",
] as const;

describe("S_NIGHT_FLATLIST_21_TUNING_EXACT_CLOSEOUT", () => {
  it("keeps the exact closeout candidate set narrow and documented", () => {
    expect(tunedCloseoutComponents).toHaveLength(13);
  });

  it.each([
    ["src/components/AppCombo.tsx", "APP_COMBO_FLATLIST_TUNING", "keyExtractor={appComboKeyExtractor}"],
    ["src/screens/buyer/components/BuyerMainList.tsx", "BUYER_MAIN_LIST_FLATLIST_TUNING", "keyExtractor={keyExtractor}"],
    ["src/screens/buyer/BuyerSubcontractTab.view.tsx", "BUYER_SUBCONTRACT_LIST_FLATLIST_TUNING", "keyExtractor={buyerSubcontractKeyExtractor}"],
    ["src/screens/accountant/components/AccountantListSection.tsx", "ACCOUNTANT_LIST_SECTION_FLATLIST_TUNING", "keyExtractor={keyExtractor}"],
    ["src/screens/accountant/AccountantSubcontractTab.tsx", "ACCOUNTANT_SUBCONTRACT_LIST_FLATLIST_TUNING", "keyExtractor={accountantSubcontractKeyExtractor}"],
    ["src/screens/contractor/components/ContractorSubcontractsList.tsx", "CONTRACTOR_SUBCONTRACTS_LIST_FLATLIST_TUNING", "keyExtractor={contractorWorkCardKeyExtractor}"],
    ["src/screens/contractor/components/ContractorOtherWorksList.tsx", "CONTRACTOR_OTHER_WORKS_LIST_FLATLIST_TUNING", "keyExtractor={contractorOtherWorkKeyExtractor}"],
    ["src/features/auctions/AuctionsScreen.tsx", "AUCTIONS_LIST_FLATLIST_TUNING", "keyExtractor={auctionListKeyExtractor}"],
    ["src/features/supplierShowcase/SupplierShowcaseScreen.tsx", "SUPPLIER_SHOWCASE_LIST_FLATLIST_TUNING", "keyExtractor={supplierShowcaseListingKeyExtractor}"],
    ["src/screens/director/DirectorSubcontractTab.tsx", "DIRECTOR_SUBCONTRACT_LIST_FLATLIST_TUNING", "keyExtractor={keyExtractor}"],
    ["src/screens/warehouse/components/WarehouseStockTab.tsx", "WAREHOUSE_STOCK_LIST_FLATLIST_TUNING", "keyExtractor={selectWarehouseStockKey}"],
    ["src/screens/warehouse/components/WarehouseIncomingTab.tsx", "WAREHOUSE_INCOMING_LIST_FLATLIST_TUNING", "keyExtractor={selectWarehouseIncomingKey}"],
    ["src/screens/warehouse/components/WarehouseIssueTab.tsx", "WAREHOUSE_ISSUE_LIST_FLATLIST_TUNING", "keyExtractor={selectWarehouseReqHeadKey}"],
  ])("%s has tuning and a stable key extractor", (relativePath, tuningName, keyExtractorSource) => {
    const source = readRepoFile(relativePath);

    expect(source).toContain(tuningName);
    expect(source).toContain("initialNumToRender");
    expect(source).toContain("maxToRenderPerBatch");
    expect(source).toContain("windowSize");
    expect(source).toContain("removeClippedSubviews");
    expect(source).toContain(keyExtractorSource);
  });

  it("keeps WarehouseReportsTab inventoried but untouched as a report-surface exclusion", () => {
    const source = readRepoFile("src/screens/warehouse/components/WarehouseReportsTab.tsx");

    expect(source).toContain("keyExtractor={(item) => item.day}");
    expect(source).toContain("estimatedItemSize={88}");
    expect(source).not.toContain("WAREHOUSE_REPORTS_DAY_GROUP_LIST_TUNING");
    expect(source).not.toContain("WAREHOUSE_REPORTS_ACTIVE_DAY_LIST_TUNING");
  });

  it("verifies the generic FlashList wrapper forwards tuning props through native and fallback renderers", () => {
    const source = readRepoFile("src/ui/FlashList.tsx");

    expect(source).toContain("<NativeFlashList");
    expect(source).toContain("{...rest}");
    expect(source).toContain("return <FlatList ref={ref} {...rest} />;");
  });

  it("leaves getItemLayout limited to proven stable-height lists", () => {
    const appCombo = readRepoFile("src/components/AppCombo.tsx");
    const buyerMain = readRepoFile("src/screens/buyer/components/BuyerMainList.tsx");

    expect(appCombo).not.toContain("getItemLayout=");
    expect(buyerMain).not.toContain("getItemLayout=");
  });
});
