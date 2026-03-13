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
import {
  selectWarehouseEmptyTextStyle,
  selectWarehouseIncomingKey,
} from "../warehouse.list.common";
import { selectWarehouseIncomingEmptyText } from "../warehouse.tab.empty";
import type { IncomingRow } from "../warehouse.types";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

type Props = {
  data: IncomingRow[];
  contentContainerStyle: { paddingTop: number; paddingBottom: number };
  onScroll: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined;
  scrollEventThrottle: number | undefined;
  onEndReached: () => void;
  refreshControl: React.ReactElement<RefreshControlProps>;
  renderItem: ListRenderItem<IncomingRow>;
  emptyColor: string;
};

export default function WarehouseIncomingTab({
  data,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle,
  onEndReached,
  refreshControl,
  renderItem,
  emptyColor,
}: Props) {
  return (
    <RoleScreenLayout>
      <AnimatedFlatList
        data={data}
        keyExtractor={selectWarehouseIncomingKey}
        contentContainerStyle={contentContainerStyle}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        ListHeaderComponent={null}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={null}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={selectWarehouseEmptyTextStyle(emptyColor)}>
            {selectWarehouseIncomingEmptyText()}
          </Text>
        }
        refreshControl={refreshControl}
      />
    </RoleScreenLayout>
  );
}
