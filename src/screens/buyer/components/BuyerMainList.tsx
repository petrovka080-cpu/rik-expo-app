import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  Animated,
  RefreshControl,
  Keyboard,
  StyleSheet,
} from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import { UI } from "../buyerUi";
import {
  normalizeBuyerPublicationMessage,
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

const SKELETON_ITEM_SIZE = 180;
const INBOX_ITEM_SIZE = 192;
const PROPOSAL_ITEM_SIZE = 176;
const END_REACHED_THRESHOLD = 0.45;

function getRowLayerStyle(index: number) {
  const rowZ = Math.max(1, 1000 - Math.max(0, index));
  return {
    zIndex: rowZ,
    elevation: rowZ,
  };
}

export const BuyerMainList = React.memo(function BuyerMainList(props: {
  s: StylesBag;
  tab: BuyerTab;
  data: ListItem[];
  publicationState: "idle" | "ready" | "error" | "degraded";
  publicationMessage?: string | null;
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
    publicationState,
    publicationMessage,
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
  const hasData = data.length > 0;
  const showEmptyState = selectBuyerShouldShowEmptyState(isLoading, publicationState);
  const showPublicationFailure = !isLoading && !hasData && publicationState !== "ready";
  const showDegradedBanner = !isLoading && hasData && publicationState === "degraded";
  const sanitizedPublicationMessage = normalizeBuyerPublicationMessage(
    tab === "inbox" ? "inbox" : "buckets",
    publicationState,
    publicationMessage,
  );
  const normalizedPublicationMessage =
    sanitizedPublicationMessage ||
    (publicationState === "degraded"
      ? "Не удалось полностью обновить данные. Показана последняя доступная версия."
      : "Не удалось загрузить данные. Повторите обновление.");

  const contentContainerStyle = useMemo(
    () => [styles.contentContainer, { paddingTop: measuredHeaderMax + 10 }],
    [measuredHeaderMax],
  );
  const scrollHandler = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false }),
    [scrollY],
  );

  const keyExtractor = useCallback(
    (item: ListItem, index: number) => {
      if (item.__skeleton) return `skel:${index}`;
      return tab === "inbox"
        ? `g:${String(item?.request_id ?? index)}`
        : `p:${String(item?.id ?? index)}`;
    },
    [tab],
  );

  const overrideItemLayout = useCallback(
    (layout: unknown, item: ListItem) => {
      const measuredLayout = layout as { size?: number };
      measuredLayout.size = item.__skeleton ? SKELETON_ITEM_SIZE : tab === "inbox" ? INBOX_ITEM_SIZE : PROPOSAL_ITEM_SIZE;
    },
    [tab],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      if (item.__skeleton) {
        return (
          <View style={styles.skeletonRow}>
            <BuyerCardSkeleton s={s} />
          </View>
        );
      }

      return (
        <View style={[styles.listRow, getRowLayerStyle(index)]}>
          {tab === "inbox" ? renderGroupBlock(item, index) : renderProposalCard(item)}
        </View>
      );
    },
    [renderGroupBlock, renderProposalCard, s, tab],
  );

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={UI.accent}
        colors={[UI.accent]}
      />
    ),
    [onRefresh, refreshing],
  );

  const listHeaderComponent = useMemo(
    () => showDegradedBanner ? (
      <SafeView
        testID="buyer-main-list-degraded"
        style={styles.degradedBanner}
      >
        <Text style={styles.degradedText}>
          {normalizedPublicationMessage}
        </Text>
      </SafeView>
    ) : null,
    [normalizedPublicationMessage, showDegradedBanner],
  );

  const listEmptyComponent = useMemo(
    () => showPublicationFailure ? (
      <SafeView testID="buyer-main-list-error" style={styles.emptyWrap}>
        <Text style={styles.errorText}>
          {normalizedPublicationMessage}
        </Text>
      </SafeView>
    ) : showEmptyState ? (
      <SafeView style={styles.emptyWrap}>
        <Text style={styles.emptyText}>
          {"\u041f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u043e"}
        </Text>
      </SafeView>
    ) : null,
    [normalizedPublicationMessage, showEmptyState, showPublicationFailure],
  );

  const listFooterComponent = useMemo(
    () => tab === "inbox" && (loadingInboxMore || inboxHasMore) ? (
      <SafeView style={styles.footerWrap}>
        <Text style={styles.footerText}>
          {loadingInboxMore
            ? "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0435\u0449\u0451"
            : "\u041f\u0440\u043e\u043a\u0440\u0443\u0442\u0438\u0442\u0435 \u0434\u043b\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0435\u0449\u0451"}
        </Text>
      </SafeView>
    ) : null,
    [inboxHasMore, loadingInboxMore, tab],
  );

  const handleEndReached = useCallback(() => {
    if (tab !== "inbox" || !inboxHasMore || loadingInboxMore) return;
    onLoadMoreInbox?.();
  }, [inboxHasMore, loadingInboxMore, onLoadMoreInbox, tab]);

  const handleScrollBeginDrag = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return (
    <FlashList
      data={finalData}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      overrideItemLayout={overrideItemLayout}
      refreshControl={refreshControl}
      ListHeaderComponent={listHeaderComponent}
      ListEmptyComponent={listEmptyComponent}
      ListFooterComponent={listFooterComponent}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      onEndReached={handleEndReached}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={handleScrollBeginDrag}
      removeClippedSubviews={false}
    />
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 30,
  },
  degradedBanner: {
    marginBottom: 12,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.32)",
  },
  degradedText: {
    color: "#FCD34D",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyText: {
    color: UI.sub,
    fontSize: 15,
    fontWeight: "800",
  },
  emptyWrap: {
    padding: 24,
    alignItems: "center",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  footerText: {
    color: UI.sub,
    fontSize: 12,
    fontWeight: "800",
  },
  footerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: "center",
  },
  listRow: {
    marginBottom: 10,
    paddingHorizontal: 16,
    position: "relative",
    overflow: "visible",
    pointerEvents: "box-none",
  },
  skeletonRow: {
    marginBottom: 10,
    paddingHorizontal: 16,
  },
});
