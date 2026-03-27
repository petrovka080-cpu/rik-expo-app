import React from "react";
import {
  ActivityIndicator,
  Text,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type RefreshControlProps,
} from "react-native";
import RoleScreenLayout from "../../../components/layout/RoleScreenLayout";
import { FlashList } from "../../../ui/FlashList";
import {
  selectWarehouseEmptyTextStyle,
  selectWarehouseReqHeadKey,
} from "../warehouse.list.common";
import { selectWarehouseIssueEmptyText } from "../warehouse.tab.empty";
import type { ReqHeadRow } from "../warehouse.types";

type Props = {
  data: ReqHeadRow[];
  contentContainerStyle: { paddingTop: number; paddingBottom: number };
  onScroll: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined;
  scrollEventThrottle: number | undefined;
  onEndReached: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  refreshControl: React.ReactElement<RefreshControlProps>;
  listHeader: React.ReactElement;
  renderItem: ListRenderItem<ReqHeadRow>;
  loading: boolean;
  emptyColor: string;
};

export default function WarehouseIssueTab({
  data,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle,
  onEndReached,
  hasMore,
  loadingMore,
  refreshControl,
  listHeader,
  renderItem,
  loading,
  emptyColor,
}: Props) {
  return (
    <RoleScreenLayout>
      <FlashList
        data={data}
        keyExtractor={selectWarehouseReqHeadKey}
        contentContainerStyle={contentContainerStyle}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={refreshControl}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 16 }} />
          ) : hasMore ? (
            <Text style={selectWarehouseEmptyTextStyle(emptyColor)}> </Text>
          ) : null
        }
        ListHeaderComponent={listHeader}
        renderItem={renderItem}
        estimatedItemSize={104}
        ListEmptyComponent={
          <Text style={selectWarehouseEmptyTextStyle(emptyColor)}>
            {selectWarehouseIssueEmptyText(loading)}
          </Text>
        }
      />
    </RoleScreenLayout>
  );
}
