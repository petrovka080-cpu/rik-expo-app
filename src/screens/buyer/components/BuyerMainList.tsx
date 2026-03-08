import React from "react";
import {
  View,
  Text,
  Animated,
  RefreshControl,
  Keyboard,
  Platform,
  FlatList,
} from "react-native";
import { UI } from "../buyerUi";
import { SafeView } from "./common/SafeView";
import type { BuyerTab } from "../buyer.types";
import type { StylesBag } from "./component.types";
import { BuyerCardSkeleton } from "./BuyerCardSkeleton";

type ListItem = { request_id?: string | number | null; id?: string | number | null; __skeleton?: boolean };

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
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
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
    s,
  } = props;

  const isLoading = (tab === "inbox" && loadingInbox) || (tab !== "inbox" && loadingBuckets);

  const skeletonData: ListItem[] = [
    { id: "s1", __skeleton: true },
    { id: "s2", __skeleton: true },
    { id: "s3", __skeleton: true },
    { id: "s4", __skeleton: true },
  ];

  const finalData = (isLoading && !refreshing && (!data || data.length === 0)) ? skeletonData : data;

  return (
    <Animated.FlatList
      ref={listRef}
      data={finalData}
      keyExtractor={(item, index) => {
        if (item.__skeleton) return `skel:${index}`;
        return tab === "inbox"
          ? `g:${String(item?.request_id ?? index)}`
          : `p:${String(item?.id ?? index)}`;
      }}
      renderItem={({ item, index }) => {
        if (item.__skeleton) {
          return <View style={{ marginBottom: 12, paddingHorizontal: 16 }}><BuyerCardSkeleton s={s} /></View>;
        }
        return (
          <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
            {tab === "inbox" ? renderGroupBlock(item as ListItem, index) : renderProposalCard(item as ListItem)}
          </View>
        );
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UI.accent} colors={[UI.accent]} />}
      ListEmptyComponent={
        !isLoading ? (
          <SafeView style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: UI.sub, fontSize: 15, fontWeight: "800" }}>Пока пусто</Text>
          </SafeView>
        ) : null
      }
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      scrollEventThrottle={16}
      contentContainerStyle={{
        paddingTop: measuredHeaderMax + 4,
        paddingBottom: 60,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={() => { Keyboard.dismiss(); }}
      removeClippedSubviews={Platform.OS === "web" ? false : true}
    />
  );
});
