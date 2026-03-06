import React from "react";
import {
  View,
  Text,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  Platform,
  FlatList,
} from "react-native";
import { UI } from "../buyerUi";
import { SafeView } from "./common/SafeView";
import type { BuyerTab } from "../buyer.types";
import type { StylesBag } from "./component.types";
type ListItem = { request_id?: string | number | null; id?: string | number | null };

export const BuyerMainList = React.memo(function BuyerMainList(props: {
  s: StylesBag;
  tab: BuyerTab;
  data: ListItem[];
  listRef?: React.RefObject<FlatList<ListItem> | null>;
  measuredHeaderMax: number;
  refreshing: boolean;
  onRefresh: () => void;
  loadingInbox: boolean;
  loadingBuckets: boolean;
  scrollY: Animated.Value;
  renderGroupBlock: (g: ListItem, index: number) => React.ReactNode;
  renderProposalCard: (item: ListItem) => React.ReactNode;
}) {
  const {
    tab,
    data,
    listRef,
    measuredHeaderMax,
    refreshing,
    onRefresh,
    loadingInbox,
    loadingBuckets,
    scrollY,
    renderGroupBlock,
    renderProposalCard,
  } = props;

  return (
    <Animated.FlatList
      ref={listRef}
      data={data}
      keyExtractor={(item) =>
        tab === "inbox"
          ? `g:${String(item?.request_id ?? "")}`
          : `p:${String(item?.id ?? "")}`
      }
      renderItem={({ item, index }) => (
        <View style={{ marginBottom: 12 }}>
          {tab === "inbox" ? renderGroupBlock(item, index) : renderProposalCard(item)}
        </View>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        loadingInbox || loadingBuckets
          ? (<SafeView style={{ padding: 24, alignItems: "center" }}><ActivityIndicator /></SafeView>)
          : (<SafeView style={{ padding: 24 }}><Text style={{ color: UI.sub }}>Пока пусто</Text></SafeView>)
      }
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      scrollEventThrottle={16}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      contentContainerStyle={{
        paddingTop: measuredHeaderMax + 16,
        paddingHorizontal: 12,
        paddingBottom: 24,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={() => { Keyboard.dismiss(); }}
      removeClippedSubviews={Platform.OS === "web" ? false : true}
      onScrollToIndexFailed={(info: { index: number; averageItemLength: number }) => {
        requestAnimationFrame(() => {
          try {
            listRef?.current?.scrollToOffset?.({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          } catch { }
        });
      }}
    />
  );
});
