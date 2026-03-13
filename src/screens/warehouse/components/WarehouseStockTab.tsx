import React from "react";
import {
  Animated,
  FlatList,
  Text,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import SectionBlock from "../../../ui/SectionBlock";
import RoleScreenLayout from "../../../components/layout/RoleScreenLayout";
import {
  selectWarehouseEmptyTextStyle,
  selectWarehouseStockKey,
} from "../warehouse.list.common";
import {
  selectWarehouseStockEmptyText,
  selectWarehouseStockUnsupportedText,
} from "../warehouse.tab.empty";
import type { StockRow } from "../warehouse.types";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

type Props = {
  stockSupported: boolean | null;
  data: StockRow[];
  contentContainerStyle: { paddingTop: number; paddingBottom: number };
  onScroll: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined;
  scrollEventThrottle: number | undefined;
  renderItem: ListRenderItem<StockRow>;
  header: React.ReactElement;
  emptyColor: string;
};

export default function WarehouseStockTab({
  stockSupported,
  data,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle,
  renderItem,
  header,
  emptyColor,
}: Props) {
  if (stockSupported === false) {
    return (
      <RoleScreenLayout>
        <SectionBlock style={{ padding: 12, marginBottom: 0 }} contentStyle={{ gap: 0 }}>
          <Text style={{ color: "#475569" }}>
            {selectWarehouseStockUnsupportedText()}{" "}
            <Text style={{ fontWeight: "700" }}>v_warehouse_fact</Text>.
          </Text>
        </SectionBlock>
      </RoleScreenLayout>
    );
  }

  return (
    <RoleScreenLayout>
      <AnimatedFlatList
        data={data}
        keyExtractor={selectWarehouseStockKey}
        contentContainerStyle={contentContainerStyle}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={selectWarehouseEmptyTextStyle(emptyColor)}>
            {selectWarehouseStockEmptyText()}
          </Text>
        }
      />
    </RoleScreenLayout>
  );
}
