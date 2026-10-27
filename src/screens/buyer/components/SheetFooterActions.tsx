import React from "react";
import { View } from "react-native";

import type { StylesBag } from "./component.types";

function SheetFooterActionsInner({
  s,
  left,
  center,
  right,
}: {
  s: StylesBag;
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const sideSlotWidth = 60;
  const slotHeight = 56;

  return (
    <View
      style={[
        s.reqActionsBottom,
        {
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
        },
      ]}
    >
      <View
        style={{
          width: sideSlotWidth,
          minWidth: sideSlotWidth,
          height: slotHeight,
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        {left ?? null}
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
          marginHorizontal: 12,
          justifyContent: "center",
        }}
      >
        {center ?? null}
      </View>

      <View
        style={{
          width: sideSlotWidth,
          minWidth: sideSlotWidth,
          height: slotHeight,
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        {right ?? null}
      </View>
    </View>
  );
}

export const SheetFooterActions = React.memo(SheetFooterActionsInner);
