import React from "react";
import {
  Animated,
  FlatList,
  Text,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import SectionBlock from "../../../ui/SectionBlock";
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
      <SectionBlock style={{ padding: 12, marginBottom: 0 }} contentStyle={{ gap: 0 }}>
        <Text style={{ color: "#475569" }}>
          Раздел «Склад факт» требует вью <Text style={{ fontWeight: "700" }}>v_warehouse_fact</Text> или
          RPC с фактическими остатками.
        </Text>
      </SectionBlock>
    );
  }

  return (
    <AnimatedFlatList
      data={data}
      keyExtractor={(i: StockRow) => String(i.material_id || `${i.code || ""}:${i.uom_id || ""}`)}
      contentContainerStyle={contentContainerStyle}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Text style={{ color: emptyColor, paddingHorizontal: 16, fontWeight: "800" }}>Пока нет данных по складу.</Text>
      }
    />
  );
}
