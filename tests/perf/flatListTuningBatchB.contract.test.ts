import fs from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const tunedFlatListBatchB = [
  "src/features/chat/ChatScreen.tsx",
  "src/features/market/MarketHomeScreen.tsx",
  "src/screens/buyer/components/BuyerInboxSheetBody.tsx",
] as const;

describe("S_RUNTIME_04_FLATLIST_TUNING_BATCH_B", () => {
  it("limits batch B to three FlatList-heavy components", () => {
    expect(tunedFlatListBatchB).toHaveLength(3);
  });

  it("tunes ChatScreen thread list without changing message identity or send/read behavior", () => {
    const source = readRepoFile("src/features/chat/ChatScreen.tsx");

    expect(source).toContain("CHAT_THREAD_LIST_TUNING");
    expect(source).toContain("initialNumToRender: 16");
    expect(source).toContain("maxToRenderPerBatch: 12");
    expect(source).toContain("updateCellsBatchingPeriod: 32");
    expect(source).toContain("windowSize: 7");
    expect(source).toContain('removeClippedSubviews: Platform.OS !== "web"');
    expect(source).toContain("const chatMessageKeyExtractor = (item: ChatMessage) => item.id;");
    expect(source).toContain("keyExtractor={chatMessageKeyExtractor}");
    expect(source).toContain("renderItem={renderItem}");
    expect(source).toContain("ListEmptyComponent={chatEmptyComponent}");
    expect(source).toContain("markListingChatMessagesRead(messages)");
    expect(source).toContain("scrollToEnd({ animated: true })");
  });

  it("tunes MarketHomeScreen feed list while preserving refresh and pagination triggers", () => {
    const source = readRepoFile("src/features/market/MarketHomeScreen.tsx");

    expect(source).toContain("MARKET_HOME_FEED_FLATLIST_TUNING");
    expect(source).toContain("initialNumToRender: 6");
    expect(source).toContain("maxToRenderPerBatch: 6");
    expect(source).toContain("updateCellsBatchingPeriod: 32");
    expect(source).toContain("windowSize: 7");
    expect(source).toContain('removeClippedSubviews: Platform.OS !== "web"');
    expect(source).toContain("const marketHomeListingKeyExtractor = (item: MarketHomeListingCard) => item.id;");
    expect(source).toContain("keyExtractor={marketHomeListingKeyExtractor}");
    expect(source).toContain("void loadFeedStage(\"refresh\");");
    expect(source).toContain("onEndReached={() => void loadMore()}");
    expect(source).toContain("onEndReachedThreshold={0.35}");
  });

  it("tunes BuyerInboxSheetBody while preserving sticky attachment and focus-scroll safety", () => {
    const source = readRepoFile("src/screens/buyer/components/BuyerInboxSheetBody.tsx");

    expect(source).toContain("BUYER_INBOX_SHEET_FLATLIST_TUNING");
    expect(source).toContain("initialNumToRender: 8");
    expect(source).toContain("maxToRenderPerBatch: 8");
    expect(source).toContain("updateCellsBatchingPeriod: 32");
    expect(source).toContain("windowSize: 5");
    expect(source).toContain("removeClippedSubviews: false");
    expect(source).toContain("stickyHeaderIndices={STICKY_HEADER_INDICES}");
    expect(source).toContain("getItemType={getInboxSheetItemType}");
    expect(source).toContain("keyExtractor={keyExtractor}");
    expect(source).toContain("renderItem={renderItem}");
    expect(source).toContain("onScrollToIndexFailed={handleScrollToIndexFailed}");
  });
});
