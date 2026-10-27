import React from "react";
import { Text, View } from "react-native";
import { s } from "./director.styles";
import { type ProposalItem, type RequestMeta } from "./director.types";
import {
  buildRequestContextLines,
  buildRequestContextView,
  cleanOfficeText,
  parseRequestContextFromNotes,
} from "../../features/office/requestContextView";

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

  const headerNote = firstReqItemId ? cleanOfficeText(reqItemNoteById?.[firstReqItemId]) : "";

  const firstReqId = propReqIds[0];
  const meta = reqMetaById?.[firstReqId];
  const noteContext = parseRequestContextFromNotes([headerNote, meta?.note, meta?.comment]);
  const context = buildRequestContextView(
    {
      requestId: meta?.id ?? firstReqId,
      requestNo: meta?.request_no,
      displayNo: meta?.display_no,
      objectName: meta?.object_name,
      object: meta?.object,
      siteAddress: meta?.site_address_snapshot,
      levelCode: meta?.level_code,
      systemCode: meta?.system_code,
      zoneCode: meta?.zone_code,
      status: meta?.status,
      createdAt: meta?.created_at,
      submittedAt: meta?.submitted_at,
      neededBy: meta?.need_by,
    },
    noteContext,
  );
  const lines = buildRequestContextLines(context, { includeRequestNo: true, maxLines: 8 });

  if (!lines.length) return null;

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
