import React from "react";
import { View, Text, FlatList } from "react-native";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { DraftAttachmentMap } from "../buyer.types";
import { BuyerAttachmentsSticky } from "./BuyerReworkSheetBody";
import type { StateSetter, StylesBag } from "./component.types";

type BuyerLineLite = BuyerInboxRow & {
  request_item_id?: string | number | null;
  name_human?: string | null;
  app_code?: string | null;
  object_name?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  note?: string | null;
};

type SheetHeaderMarker = { __kind: "attachments" };
type InboxSheetRow = BuyerLineLite | SheetHeaderMarker;

export function BuyerInboxSheetBody({
  s,
  sheetGroup,
  sheetData,
  kbOpen,
  creating,
  needAttachWarn,
  showAttachBlock,
  setShowAttachBlock,
  requiredSuppliers,
  missingAttachSuppliers,
  attachMissingCount,
  attachFilledCount,
  attachSlotsTotal,
  pickedIdsLen,
  attachments,
  setAttachments,
  renderItemRow,
  footer,
}: {
  s: StylesBag;
  sheetGroup: { request_id?: string | number | null; items?: BuyerLineLite[] };
  sheetData: InboxSheetRow[];
  kbOpen: boolean;
  creating: boolean;
  needAttachWarn: boolean;
  showAttachBlock: boolean;
  setShowAttachBlock: (v: boolean | ((p: boolean) => boolean)) => void;
  requiredSuppliers: string[];
  missingAttachSuppliers: string[];
  attachMissingCount: number;
  attachFilledCount: number;
  attachSlotsTotal: number;
  pickedIdsLen: number;
  attachments: DraftAttachmentMap;
  setAttachments: StateSetter<DraftAttachmentMap>;
  renderItemRow: (it: BuyerLineLite, idx2: number) => React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <View style={s.sheetSection}>
      <FlatList
        data={sheetData}
        stickyHeaderIndices={[1]}
        keyExtractor={(item, idx: number) => {
          if ("__kind" in item && item.__kind === "attachments") return "hdr:attachments";
          const row = item as BuyerLineLite;
          return row?.request_item_id ? `ri:${row.request_item_id}` : `f:${String(sheetGroup?.request_id ?? "x")}:${idx}`;
        }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 12 + 86 }}
        ListHeaderComponent={
          <View>
            {!kbOpen ? (
              (() => {
                const headerNote = String((sheetGroup?.items || []).find((x) => x?.note)?.note || "").trim();
                if (headerNote) {
                  const lines = headerNote.split(";").map((x) => x.trim()).filter(Boolean).slice(0, 5);
                  if (!lines.length) return null;
                  return (
                    <View style={s.reqNoteBox}>
                      {lines.map((t, i) => (
                        <Text key={i} style={s.reqNoteLine} numberOfLines={1}>
                          {t}
                        </Text>
                      ))}
                    </View>
                  );
                }

                const any0 = (sheetGroup?.items || [])[0];
                const metaLines = [
                  any0?.object_name ? `Объект: ${any0.object_name}` : null,
                  any0?.level_code ? `Этаж/уровень: ${any0.level_code}` : null,
                  any0?.system_code ? `Система: ${any0.system_code}` : null,
                  any0?.zone_code ? `Зона: ${any0.zone_code}` : null,
                ].filter(Boolean) as string[];

                if (!metaLines.length) return null;
                return (
                  <View style={s.reqNoteBox}>
                    {metaLines.map((t, i) => (
                      <Text key={i} style={s.reqNoteLine} numberOfLines={1}>
                        {t}
                      </Text>
                    ))}
                  </View>
                );
              })()
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => {
          if ("__kind" in item && item.__kind === "attachments") {
            return (
              <BuyerAttachmentsSticky
                s={s}
                creating={creating}
                kbOpen={kbOpen}
                needAttachWarn={needAttachWarn}
                showAttachBlock={showAttachBlock}
                setShowAttachBlock={setShowAttachBlock}
                requiredSuppliers={requiredSuppliers}
                missingAttachSuppliers={missingAttachSuppliers}
                attachMissingCount={attachMissingCount}
                attachFilledCount={attachFilledCount}
                attachSlotsTotal={attachSlotsTotal}
                pickedIdsLen={pickedIdsLen}
                attachments={attachments}
                setAttachments={setAttachments}
              />
            );
          }

          const realIndex = index - 1;
          return <View style={{ marginBottom: 10 }}>{renderItemRow(item as BuyerLineLite, realIndex)}</View>;
        }}
      />

      {footer ?? null}
    </View>
  );
}

