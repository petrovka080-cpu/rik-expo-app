import React from "react";
import { View, Text, type FlatList } from "react-native";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import { FlashList, type FlashListProps } from "../../../ui/FlashList";
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
  renderItemRow: (it: BuyerLineLite, idx2: number, onFocusRow?: () => void) => React.ReactNode;
  footer?: React.ReactNode;
}) {
  const listRef = React.useRef<FlatList<InboxSheetRow> | null>(null);
  const retryScrollFrameRef = React.useRef<number | null>(null);
  const footerBottomInset = 18;
  const footerReservedHeight = 86 + footerBottomInset;
  const bottomPadding = kbOpen ? 220 : 12 + footerReservedHeight;
  const scrollToRow = React.useCallback((realIndex: number) => {
    const targetIndex = Math.max(0, realIndex + 1);
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex?.({
          index: targetIndex,
          animated: true,
          viewPosition: 0.18,
        });
      } catch {
        listRef.current?.scrollToOffset?.({
          offset: Math.max(0, targetIndex * 140),
          animated: true,
        });
      }
    });
  }, []);

  const renderCell: FlashListProps<InboxSheetRow>["CellRendererComponent"] = ({
    children,
    style,
    index,
    ...rest
  }) => (
    <View
      {...rest}
      style={[
        style,
        {
          position: "relative",
          overflow: "visible",
          zIndex: Math.max(1, 1000 - Math.max(0, index ?? 0)),
          elevation: Math.max(1, 1000 - Math.max(0, index ?? 0)),
          pointerEvents: "box-none",
        },
      ]}
    >
      {children}
    </View>
  );

  React.useEffect(() => {
    return () => {
      if (retryScrollFrameRef.current != null) cancelAnimationFrame(retryScrollFrameRef.current);
    };
  }, []);

  return (
    <View style={s.sheetSection}>
      <FlashList
        ref={listRef}
        data={sheetData}
        CellRendererComponent={renderCell}
        stickyHeaderIndices={[1]}
        estimatedItemSize={184}
        getItemType={(item) => ("__kind" in item && item.__kind === "attachments" ? "attachments" : "line")}
        keyExtractor={(item, idx: number) => {
          if ("__kind" in item && item.__kind === "attachments") return "hdr:attachments";
          const row = item as BuyerLineLite;
          return row?.request_item_id ? `ri:${row.request_item_id}` : `f:${String(sheetGroup?.request_id ?? "x")}:${idx}`;
        }}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding, overflow: "visible" }}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset?.({
            offset: Math.max(0, info.averageItemLength * info.index),
            animated: true,
          });
          retryScrollFrameRef.current = requestAnimationFrame(() => {
            retryScrollFrameRef.current = requestAnimationFrame(() => {
              listRef.current?.scrollToIndex?.({
                index: info.index,
                animated: true,
                viewPosition: 0.18,
              });
            });
          });
        }}
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
          return (
            <View
              style={{
                marginBottom: 10,
                position: "relative",
                overflow: "visible",
                zIndex: Math.max(1, 1000 - Math.max(0, realIndex)),
                elevation: Math.max(1, 1000 - Math.max(0, realIndex)),
                pointerEvents: "box-none",
              }}
            >
              {renderItemRow(item as BuyerLineLite, realIndex, () => scrollToRow(realIndex))}
            </View>
          );
        }}
      />

      {footer ? <View style={{ paddingBottom: footerBottomInset }}>{footer}</View> : null}
    </View>
  );
}
