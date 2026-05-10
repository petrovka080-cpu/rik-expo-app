import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const tunedFlatListBatchA = [
  "src/screens/buyer/components/BuyerItemRow.tsx",
  "src/screens/buyer/components/BuyerMobileItemEditorModal.tsx",
  "src/components/map/ResultsBottomSheet.tsx",
] as const;

describe("S_RUNTIME_03_FLATLIST_TUNING_BATCH_A", () => {
  it("limits batch A to three FlatList-heavy components", () => {
    expect(tunedFlatListBatchA).toHaveLength(3);
  });

  it("tunes BuyerItemRow supplier suggestion lists without changing item identity", () => {
    const source = readRepoFile("src/screens/buyer/components/BuyerItemRow.tsx");

    expect(source).toContain("INLINE_SUPPLIER_FLATLIST_TUNING");
    expect(source).toContain("MODAL_SUPPLIER_FLATLIST_TUNING");
    expect(source).toContain("initialNumToRender: 8");
    expect(source).toContain("initialNumToRender: 12");
    expect(source).toContain("maxToRenderPerBatch: 8");
    expect(source).toContain("maxToRenderPerBatch: 12");
    expect(source).toContain("updateCellsBatchingPeriod: 32");
    expect(source).toContain("windowSize: 3");
    expect(source).toContain("windowSize: 5");
    expect(source).toContain("keyExtractor={supplierKeyExtractor}");
    expect(source).toContain("renderItem={renderInlineSupplierItem}");
    expect(source).toContain("renderItem={renderModalSupplierItem}");
  });

  it("tunes BuyerMobileItemEditorModal form and supplier picker lists with stable render helpers", () => {
    const source = readRepoFile("src/screens/buyer/components/BuyerMobileItemEditorModal.tsx");

    expect(source).toContain("FORM_FLATLIST_TUNING");
    expect(source).toContain("SUPPLIER_PICKER_FLATLIST_TUNING");
    expect(source).toContain("initialNumToRender: 1");
    expect(source).toContain("initialNumToRender: 12");
    expect(source).toContain("maxToRenderPerBatch: 1");
    expect(source).toContain("maxToRenderPerBatch: 12");
    expect(source).toContain("updateCellsBatchingPeriod: 64");
    expect(source).toContain("updateCellsBatchingPeriod: 32");
    expect(source).toContain("keyExtractor={supplierKeyExtractor}");
    expect(source).toContain("keyExtractor={emptyFormKeyExtractor}");
    expect(source).toContain("renderItem={renderSupplierItem}");
    expect(source).toContain("renderItem={renderEmptyFormRow}");
    expect(source).toContain("ListEmptyComponent={renderSupplierListEmpty}");
  });

  it("tunes ResultsBottomSheet carousel without changing ordering, selection, or snap identity", () => {
    const source = readRepoFile("src/components/map/ResultsBottomSheet.tsx");

    expect(source).toContain("RESULTS_BOTTOM_SHEET_FLATLIST_TUNING");
    expect(source).toContain("initialNumToRender: 4");
    expect(source).toContain("maxToRenderPerBatch: 4");
    expect(source).toContain("updateCellsBatchingPeriod: 32");
    expect(source).toContain("windowSize: 5");
    expect(source).toContain("const resultsKeyExtractor = (item: Row) => item.id;");
    expect(source).toContain("keyExtractor={resultsKeyExtractor}");
    expect(source).toContain("const renderCard = useCallback");
    expect(source).toContain("ItemSeparatorComponent={ResultsItemSeparator}");
    expect(source).toContain("contentContainerStyle={resultsListContentStyle}");
    expect(source).toContain("getItemLayout={getResultsItemLayout}");
    expect(source).not.toContain("onEndReached");
  });
});
