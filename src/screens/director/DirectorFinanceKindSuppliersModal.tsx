import React from "react";
import { Pressable, Text } from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import { UI, s } from "./director.styles";
import type { FinKindSupplierRow, FinSupplierInput } from "./director.finance";

type Props = {
  visible?: boolean;
  onClose?: () => void;
  loading: boolean;
  periodShort?: string;
  onOpenPeriod?: () => void;
  onRefresh?: () => void;
  onPdf?: () => void;
  kindName: string;
  list: FinKindSupplierRow[];
  money: (v: number) => string;
  onOpenSupplier: (payload: FinSupplierInput) => void;
};

type FlashListLayout = { size?: number };

export default function DirectorFinanceKindSuppliersModal(props: Props) {
  if (!props.kindName) {
    return <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет выбранного вида</Text>;
  }

  if (!props.list?.length) {
    return <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет данных</Text>;
  }

  const renderSupplierRow = ({ item }: { item: FinKindSupplierRow }) => {
    const supplierName = String(item.supplier || "—");
    return (
      <Pressable
        onPress={() => {
          const name = String(item.supplier || "—").trim() || "—";
          props.onOpenSupplier({ supplier: name, _kindName: props.kindName });
        }}
        style={[
          s.mobCard,
          {
            marginBottom: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            flexDirection: "column",
            alignItems: "stretch",
          },
        ]}
      >
        <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
          {supplierName}
        </Text>

        <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 2 }} numberOfLines={2}>
          {`Утверждено: ${props.money(item.approved)} · оплачено: ${props.money(item.paid)}`}
          {item.overpay > 0 ? ` · переплата ${props.money(item.overpay)}` : ""}
        </Text>

        <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
          {`Счетов: ${item.count}`}
        </Text>
      </Pressable>
    );
  };

  return (
    <FlashList
      style={{ flex: 1, minHeight: 0 }}
      data={props.list}
      renderItem={renderSupplierRow}
      keyExtractor={(item, index) => `${props.kindName}:${String(item.supplier || "—")}:${index}`}
      overrideItemLayout={(layout: FlashListLayout) => {
        layout.size = 92;
      }}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}
