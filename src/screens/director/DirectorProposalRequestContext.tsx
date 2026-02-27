import React from "react";
import { Text, View } from "react-native";
import { s } from "./director.styles";
import { type ProposalItem, type RequestMeta } from "./director.types";

type Props = {
  pidStr: string;
  items: ProposalItem[];
  reqItemNoteById: Record<string, string>;
  propReqIds: string[];
  reqMetaById: Record<string, RequestMeta>;
};

export default function DirectorProposalRequestContext({
  items,
  reqItemNoteById,
  propReqIds,
  reqMetaById,
}: Props) {
  const firstReqItemId =
    (items || [])
      .map((x) => String(x?.request_item_id ?? "").trim())
      .find(Boolean) || "";

  const headerNote = firstReqItemId ? String(reqItemNoteById?.[firstReqItemId] ?? "").trim() : "";
  if (headerNote) {
    const lines = headerNote
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 4);

    if (lines.length) {
      return (
        <View style={s.reqNoteBox}>
          {lines.map((t, idx) => (
            <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
              {t}
            </Text>
          ))}
        </View>
      );
    }
  }

  if (!propReqIds.length) return null;

  const firstReqId = propReqIds[0];
  const meta = reqMetaById?.[firstReqId];
  const human =
    String(meta?.note ?? "").trim() ||
    String(meta?.comment ?? "").trim();

  if (human) {
    const lines = human
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 4);

    if (lines.length) {
      return (
        <View style={s.reqNoteBox}>
          {lines.map((t, idx) => (
            <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
              {t}
            </Text>
          ))}
        </View>
      );
    }
  }

  const obj =
    String(meta?.object_name ?? "").trim() ||
    String(meta?.object ?? "").trim() ||
    (meta?.site_address_snapshot ? String(meta.site_address_snapshot).trim() : "");

  const lines: string[] = [];
  if (obj) lines.push(`Объект: ${obj}`);
  if (meta?.level_code) lines.push(`Этаж/уровень: ${meta.level_code}`);
  if (meta?.system_code) lines.push(`Система: ${meta.system_code}`);
  if (meta?.zone_code) lines.push(`Зона: ${meta.zone_code}`);

  if (!lines.length) return null;

  return (
    <View style={s.reqNoteBox}>
      {lines.slice(0, 4).map((t, idx) => (
        <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
          {t}
        </Text>
      ))}
    </View>
  );
}
