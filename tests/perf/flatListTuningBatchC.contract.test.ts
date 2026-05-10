import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const tunedFlatListBatchC = [
  "src/screens/director/DirectorDashboard.tsx",
] as const;

describe("S_RUNTIME_05_FLATLIST_TUNING_BATCH_C", () => {
  it("limits batch C to the remaining DirectorDashboard FlatList candidate", () => {
    expect(tunedFlatListBatchC).toHaveLength(1);
  });

  it("tunes DirectorDashboard top tabs without changing tab identity or scroll recovery", () => {
    const source = readRepoFile("src/screens/director/DirectorDashboard.tsx");

    expect(source).toContain("DIRECTOR_TOP_TABS_FLATLIST_TUNING");
    expect(source).toContain("initialNumToRender: 5");
    expect(source).toContain("maxToRenderPerBatch: 5");
    expect(source).toContain("windowSize: 3");
    expect(source).toContain("removeClippedSubviews: false");
    expect(source).toContain("const directorTopTabKeyExtractor = (item: TopTabItem) => item.key;");
    expect(source).toContain("keyExtractor={directorTopTabKeyExtractor}");
    expect(source).toContain("contentContainerStyle={DIRECTOR_TOP_TABS_CONTENT_CONTAINER_STYLE}");
    expect(source).toContain("reportDirectorTopTabsScrollFailure(error)");
  });

  it("tunes DirectorDashboard request and proposal lists while preserving refresh and pagination", () => {
    const source = readRepoFile("src/screens/director/DirectorDashboard.tsx");

    expect(source).toContain("DIRECTOR_REQUEST_GROUPS_FLATLIST_TUNING");
    expect(source).toContain("DIRECTOR_PROPOSAL_HEADS_FLATLIST_TUNING");
    expect(source).toContain("initialNumToRender: 8");
    expect(source).toContain("maxToRenderPerBatch: 8");
    expect(source).toContain("updateCellsBatchingPeriod: 32");
    expect(source).toContain("const directorForemanGroupKeyExtractor = (group: Group, index: number)");
    expect(source).toContain("const directorProposalHeadKeyExtractor = (proposal: ProposalHead, index: number)");
    expect(source).toContain("keyExtractor={directorForemanGroupKeyExtractor}");
    expect(source).toContain("keyExtractor={directorProposalHeadKeyExtractor}");
    expect(source).toContain("refreshControl={refreshRowsControl}");
    expect(source).toContain("refreshControl={refreshPropsControl}");
    expect(source).toContain("onEndReachedThreshold={0.35}");
    expect(source).toContain("void p.loadMoreProps();");
  });

  it("tunes DirectorDashboard finance cards with stable data, key, and item type", () => {
    const source = readRepoFile("src/screens/director/DirectorDashboard.tsx");

    expect(source).toContain("DIRECTOR_FINANCE_DASHBOARD_CARDS");
    expect(source).toContain("DIRECTOR_FINANCE_FLATLIST_TUNING");
    expect(source).toContain("initialNumToRender: 2");
    expect(source).toContain("maxToRenderPerBatch: 2");
    expect(source).toContain("updateCellsBatchingPeriod: 64");
    expect(source).toContain("data={DIRECTOR_FINANCE_DASHBOARD_CARDS}");
    expect(source).toContain("keyExtractor={directorFinanceCardKeyExtractor}");
    expect(source).toContain("getItemType={getDirectorFinanceCardType}");
    expect(source).toContain('openFinancePage("debt")');
    expect(source).toContain('openFinancePage("spend")');
  });
});
