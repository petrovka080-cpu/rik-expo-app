import React from "react";
import { Text, View } from "react-native";
import { s } from "./director.styles";
import { type ProposalItem, type RequestMeta } from "./director.types";
import { safeJsonParse } from "../../lib/format";

type Props = {
  pidStr: string;
  items: ProposalItem[];
  reqItemNoteById: Record<string, string>;
  propReqIds: string[];
  reqMetaById: Record<string, RequestMeta>;
};

const cleanText = (value: unknown): string => String(value ?? "").replace(/\s+/g, " ").trim();

const isInternalAiEstimateNote = (value: string): boolean => {
  const text = cleanText(value);
  if (!text.startsWith("{") || !text.endsWith("}")) return false;
  const parsed = safeJsonParse<{ source?: unknown; estimateId?: unknown; rowId?: unknown }>(text, {});
  if (!parsed.ok) {
    return /"source"\s*:\s*"foreman_ai_professional_estimate"/.test(text);
  }
  return (
    parsed.value?.source === "foreman_ai_professional_estimate" ||
    (parsed.value?.estimateId != null && parsed.value?.rowId != null)
  );
};

const splitVisibleLines = (value: string): string[] =>
  cleanText(value)
    .split(";")
    .map(cleanText)
    .filter((line) => line && !isInternalAiEstimateNote(line))
    .slice(0, 4);

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

  const headerNote = firstReqItemId ? cleanText(reqItemNoteById?.[firstReqItemId]) : "";
  if (headerNote) {
    const lines = splitVisibleLines(headerNote);

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
  const human = cleanText(meta?.note) || cleanText(meta?.comment);

  if (human) {
    const lines = splitVisibleLines(human);

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
