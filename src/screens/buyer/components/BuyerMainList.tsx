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

type ListItem = {
  request_id?: string | number | null;
  id?: string | number | null;
  __skeleton?: boolean;
};

export const BuyerMainList = React.memo(function BuyerMainList(props: {
  s: StylesBag;
  tab: BuyerTab;
  data: ListItem[];
  measuredHeaderMax: number;
  refreshing: boolean;
  onRefresh: () => void;
  loadingInbox: boolean;
  loadingBuckets: boolean;
  loadingInboxMore?: boolean;
  inboxHasMore?: boolean;
  onLoadMoreInbox?: () => void;
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
    loadingInboxMore,
    inboxHasMore,
    onLoadMoreInbox,
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={UI.accent}
          colors={[UI.accent]}
        />
      }
      ListEmptyComponent={
        showEmptyState ? (
          <SafeView style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: UI.sub, fontSize: 15, fontWeight: "800" }}>
              {"\u041f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u043e"}
            </Text>
          </SafeView>
        ) : null
      }
      ListFooterComponent={
        tab === "inbox" && (loadingInboxMore || inboxHasMore) ? (
          <SafeView style={{ paddingHorizontal: 16, paddingBottom: 10, alignItems: "center" }}>
            <Text style={{ color: UI.sub, fontSize: 12, fontWeight: "800" }}>
              {loadingInboxMore
                ? "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0435\u0449\u0451"
                : "\u041f\u0440\u043e\u043a\u0440\u0443\u0442\u0438\u0442\u0435 \u0434\u043b\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0435\u0449\u0451"}
            </Text>
          </SafeView>
        ) : null
      }
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      scrollEventThrottle={16}
      onEndReachedThreshold={0.45}
      onEndReached={() => {
        if (tab !== "inbox" || !inboxHasMore || loadingInboxMore) return;
        onLoadMoreInbox?.();
      }}
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
