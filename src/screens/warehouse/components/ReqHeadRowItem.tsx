import React from "react";
import { Pressable, Text, View } from "react-native";
import type { ReqHeadRow } from "../warehouse.types";
import { UI, s } from "../warehouse.styles";

type Props = {
  row: ReqHeadRow;
  onPress: (row: ReqHeadRow) => void;
  fmtRuDate: (iso?: string | null) => string;
};

export default function ReqHeadRowItem({ row, onPress, fmtRuDate }: Props) {
  const totalPos = Math.max(0, Number(row.items_cnt ?? 0));
  const openPos = Math.max(0, Number(row.ready_cnt ?? 0));
  const issuedPos = Math.max(0, Number(row.done_cnt ?? 0));

  const hasToIssue = openPos > 0;
  const isFullyIssued = issuedPos >= totalPos && totalPos > 0;

  const locParts: string[] = [];
  const obj = String(row.object_name || "").trim();
  const lvl = String(row.level_name || row.level_code || "").trim();
  const sys = String(row.system_name || row.system_code || "").trim();

  if (obj) locParts.push(obj);
  if (lvl) locParts.push(lvl);
  if (sys) locParts.push(sys);

  const dateStr = fmtRuDate(row.submitted_at);

  return (
    <View style={s.listItemContainer}>
      <Pressable
        onPress={() => onPress(row)}
        style={({ pressed }) => [
          s.groupHeader,
          s.reqItemPressable,
          {
            borderLeftWidth: hasToIssue ? 5 : 0,
            borderLeftColor: "#22c55e",
          },
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={s.listItemFlex}>
          <View style={s.listItemRow1}>
            <Text style={[s.groupTitle, { fontSize: 16 }]} numberOfLines={1}>
              {row.display_no || `REQ-${row.request_id.slice(0, 8)}`}
            </Text>
            <Text style={s.reqItemDate}>{dateStr}</Text>
          </View>

          <View style={s.reqItemRow2}>
            {isFullyIssued ? (
              <Text style={s.reqItemStatusFullyIssued}>Выдано полностью</Text>
            ) : (
              <Text style={s.reqItemStatusNotFullyIssued}>
                К выдаче:{" "}
                <Text style={{ color: hasToIssue ? "#22c55e" : UI.text, fontWeight: "900" }}>
                  {hasToIssue ? `${openPos} ${openPos === 1 ? "позиция" : openPos > 1 && openPos < 5 ? "позиции" : "позиций"}` : "0"}
                </Text>
                {" • "}
                Выдано:{" "}
                <Text style={{ color: issuedPos > 0 ? "#22c55e" : UI.text, fontWeight: "800" }}>
                  {issuedPos}
                </Text>
              </Text>
            )}
          </View>

          {locParts.length > 0 && <Text style={s.reqItemRow3}>{locParts.join(" • ")}</Text>}
        </View>
      </Pressable>
    </View>
  );
}

