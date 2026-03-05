import React from "react";
import { Text } from "react-native";
import type { ActBuilderWorkItem } from "../types";
import ActBuilderWorkRow from "./ActBuilderWorkRow";

type Props = {
  works: ActBuilderWorkItem[];
  expandedWorkId: string | null;
  resolvedObjectName: string;
  onToggleExpanded: (id: string) => void;
  onToggleInclude: (index: number) => void;
  onQtyChange: (index: number, txt: string) => void;
  onUnitChange: (index: number, txt: string) => void;
  onPriceChange: (index: number, txt: string) => void;
};

export default function ActBuilderWorksList(props: Props) {
  if (props.works.length === 0) {
    return <Text style={{ fontSize: 12, color: "#94a3b8" }}>Нет работ для выбора</Text>;
  }

  return (
    <>
      {props.works.map((w, idx) => (
        <ActBuilderWorkRow
          key={w.id}
          item={w}
          expanded={props.expandedWorkId === w.id}
          resolvedObjectName={props.resolvedObjectName}
          onToggleExpanded={() => props.onToggleExpanded(w.id)}
          onToggleInclude={() => props.onToggleInclude(idx)}
          onQtyChange={(txt) => props.onQtyChange(idx, txt)}
          onUnitChange={(txt) => props.onUnitChange(idx, txt)}
          onPriceChange={(txt) => props.onPriceChange(idx, txt)}
        />
      ))}
    </>
  );
}
