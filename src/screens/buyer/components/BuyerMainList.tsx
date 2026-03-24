import React, { useCallback } from "react";
import {
  View,
  Text,
  Animated,
  RefreshControl,
  Keyboard,
} from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import { UI } from "../buyerUi";
import {
  selectBuyerListLoading,
  selectBuyerMainListData,
  selectBuyerShouldShowEmptyState,
} from "../buyer.list.ui";
import { SafeView } from "./common/SafeView";
import type { BuyerTab } from "../buyer.types";
import type { StylesBag } from "./component.types";
import { BuyerCardSkeleton } from "./BuyerCardSkeleton";

type ListItem = { request_id?: string | number | null; id?: string | number | null; __skeleton?: boolean };

export const BuyerMainList = React.memo(function BuyerMainList(props: {
  s: StylesBag;
  tab: BuyerTab;
  data: ListItem[];
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

  const isLoading = selectBuyerListLoading(tab, loadingInbox, loadingBuckets);
  const finalData = selectBuyerMainListData(data, isLoading, refreshing);
  const showEmptyState = selectBuyerShouldShowEmptyState(isLoading);

  const renderItem = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      if (item.__skeleton) {
        return (
          <View style={{ marginBottom: 10, paddingHorizontal: 16 }}>
            <BuyerCardSkeleton s={s} />
          </View>
        );
      }

      const rowZ = Math.max(1, 1000 - Math.max(0, index));
      return (
        <View
          style={{
            marginBottom: 10,
            paddingHorizontal: 16,
            position: "relative",
            overflow: "visible",
            zIndex: rowZ,
            elevation: rowZ,
            pointerEvents: "box-none",
          }}
        >
          {tab === "inbox" ? renderGroupBlock(item, index) : renderProposalCard(item)}
        </View>
      );
    },
    [renderGroupBlock, renderProposalCard, s, tab],
  );

  return (
    <FlashList
      data={finalData}
      keyExtractor={(item, index) => {
        if (item.__skeleton) return `skel:${index}`;
        return tab === "inbox"
          ? `g:${String(item?.request_id ?? index)}`
          : `p:${String(item?.id ?? index)}`;
      }}
      renderItem={renderItem}
      overrideItemLayout={(layout, item) => {
        const measuredLayout = layout as { size?: number };
        measuredLayout.size = item.__skeleton ? 180 : tab === "inbox" ? 192 : 176;
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UI.accent} colors={[UI.accent]} />}
      ListEmptyComponent={
        showEmptyState ? (
          <SafeView style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: UI.sub, fontSize: 15, fontWeight: "800" }}>Пока пусто</Text>
          </SafeView>
        ) : null
      }
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      scrollEventThrottle={16}
      contentContainerStyle={{
        paddingTop: measuredHeaderMax + 10,
        paddingBottom: 30,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={() => {
        Keyboard.dismiss();
      }}
      removeClippedSubviews={false}
    />
  );
});

