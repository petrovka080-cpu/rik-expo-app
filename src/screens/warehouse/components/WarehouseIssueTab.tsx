import React from "react";
import {
  Animated,
  FlatList,
  Text,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type RefreshControlProps,
} from "react-native";
import RoleScreenLayout from "../../../components/layout/RoleScreenLayout";
import type { ReqHeadRow } from "../warehouse.types";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

type Props = {
  data: ReqHeadRow[];
  contentContainerStyle: { paddingTop: number; paddingBottom: number };
  onScroll: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined;
  scrollEventThrottle: number | undefined;
  onEndReached: () => void;
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
  refreshControl,
  listHeader,
  renderItem,
  loading,
  emptyColor,
}: Props) {
  return (
    <RoleScreenLayout>
      <AnimatedFlatList
        data={data}
        keyExtractor={(x: ReqHeadRow) => x.request_id}
        contentContainerStyle={contentContainerStyle}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={refreshControl}
        ListFooterComponent={null}
        ListHeaderComponent={listHeader}
        renderItem={renderItem}
        ListEmptyComponent={
          loading ? (
            <Text style={{ color: emptyColor, paddingHorizontal: 16, fontWeight: "800" }}>Загрузка...</Text>
          ) : (
            <Text style={{ color: emptyColor, paddingHorizontal: 16, fontWeight: "800" }}>
              Нет заявок для выдачи.
              {"\n"}Потяни вниз, чтобы обновить.
            </Text>
          )
        }
      />
    </RoleScreenLayout>
  );
}
