import React from "react";
import { Text, View } from "react-native";
import type { ActBuilderItem } from "../types";
import ActBuilderMaterialRow from "./ActBuilderMaterialRow";

type Props = {
  items: ActBuilderItem[];
  expandedMatId: string | null;
  onToggleExpanded: (id: string) => void;
  onToggleInclude: (index: number) => void;
  onDecrement: (index: number) => void;
  onIncrement: (index: number) => void;
  onPriceChange: (index: number, txt: string) => void;
};

export default function ActBuilderMaterialsList(props: Props) {
  if (props.items.length === 0) {
    return (
      <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 12 }}>
        <Text style={{ color: "#94a3b8" }}>Нет позиций для акта.</Text>
      </View>
    );
  }

  return (
    <>
      {props.items.map((it, idx) => (
        <ActBuilderMaterialRow
          key={it.id}
          item={it}
          expanded={props.expandedMatId === it.id}
          onToggleExpanded={() => props.onToggleExpanded(it.id)}
          onToggleInclude={() => props.onToggleInclude(idx)}
          onDecrement={() => props.onDecrement(idx)}
          onIncrement={() => props.onIncrement(idx)}
          onPriceChange={(txt) => props.onPriceChange(idx, txt)}
        />
      ))}
    </>
  );
}
