import React from "react";
import { StyleSheet, View, Text, type FlatList } from "react-native";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { ProcurementReadyBuyOptionBundle } from "../../../features/ai/procurement/aiProcurementReadyBuyOptionTypes";
import {
  buildRequestContextLines,
  buildRequestContextView,
  parseRequestContextFromNotes,
} from "../../../features/office/requestContextView";
import { FlashList, type FlashListProps } from "../../../ui/FlashList";
import type { DraftAttachmentMap } from "../buyer.types";
import { BuyerAttachmentsSticky } from "./BuyerReworkSheetBody";
import { BuyerReadyBuyOptionsBlock } from "./BuyerReadyBuyOptionsBlock";
import type { StateSetter, StylesBag } from "./component.types";

type BuyerLineLite = BuyerInboxRow & {
  request_item_id?: string | number | null;
  name_human?: string | null;
  app_code?: string | null;
  object_name?: string | null;
  request_no?: string | null;
  display_no?: string | null;
  level_code?: string | null;
  system_code?: string | null;
  zone_code?: string | null;
  need_by?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
  note?: string | null;
  object?: string | null;
  site_address_snapshot?: string | null;
  request_note?: string | null;
  request_comment?: string | null;
};

type SheetHeaderMarker = { __kind: "attachments" };
type InboxSheetRow = BuyerLineLite | SheetHeaderMarker;
type InboxCellRenderer = NonNullable<FlashListProps<InboxSheetRow>["CellRendererComponent"]>;

const FOOTER_BOTTOM_INSET = 18;
const FOOTER_RESERVED_HEIGHT = 86 + FOOTER_BOTTOM_INSET;
const STICKY_HEADER_INDICES = [1];
const BUYER_INBOX_SHEET_FLATLIST_TUNING = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 32,
  windowSize: 5,
  removeClippedSubviews: false,
} as const;

const getInboxSheetItemType = (item: InboxSheetRow) =>
  "__kind" in item && item.__kind === "attachments" ? "attachments" : "line";

const getLayerStyle = (index: number) => ({
  zIndex: Math.max(1, 1000 - Math.max(0, index)),
  elevation: Math.max(1, 1000 - Math.max(0, index)),
});

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
  readyBuyOptions,
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
  readyBuyOptions?: ProcurementReadyBuyOptionBundle | null;
  footer?: React.ReactNode;
}) {
  const listRef = React.useRef<FlatList<InboxSheetRow> | null>(null);
  const retryScrollFrameRef = React.useRef<number | null>(null);
  const bottomPadding = kbOpen ? 220 : 12 + FOOTER_RESERVED_HEIGHT;
  const contentContainerStyle = React.useMemo(
    () => [styles.listContent, { paddingBottom: bottomPadding }],
    [bottomPadding],
  );
  const requestContextLines = React.useMemo(() => {
    const items = sheetGroup?.items || [];
    const first = items[0];
    const noteContext = parseRequestContextFromNotes([
      first?.request_note,
      first?.request_comment,
      ...items.map((item) => item?.note),
    ]);
    const context = buildRequestContextView(
      {
        requestId: sheetGroup?.request_id,
        requestNo: first?.request_no,
        displayNo: first?.display_no,
        objectName: first?.object_name,
        object: first?.object,
        siteAddress: first?.site_address_snapshot,
        levelCode: first?.level_code,
        systemCode: first?.system_code,
        zoneCode: first?.zone_code,
        status: first?.status || "procurement_ready",
        createdAt: first?.created_at,
        submittedAt: first?.submitted_at,
        approvedAt: first?.approved_at,
        neededBy: first?.need_by,
      },
      noteContext,
    );
    return buildRequestContextLines(context, { includeRequestNo: true, maxLines: 8 });
  }, [sheetGroup?.items, sheetGroup?.request_id]);
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

  const renderCell = React.useCallback<InboxCellRenderer>(
    ({
      children,
      style,
      index,
      ...rest
    }) => (
      <View
        {...rest}
        style={[
          style,
          styles.cellRenderer,
          getLayerStyle(index ?? 0),
        ]}
      >
        {children}
      </View>
    ),
    [],
  );

  const keyExtractor = React.useCallback((item: InboxSheetRow, idx: number) => {
    if ("__kind" in item && item.__kind === "attachments") return "hdr:attachments";
    const row = item as BuyerLineLite;
    return row?.request_item_id ? `ri:${row.request_item_id}` : `f:${String(sheetGroup?.request_id ?? "x")}:${idx}`;
  }, [sheetGroup?.request_id]);

  const handleScrollToIndexFailed = React.useCallback((info: { averageItemLength: number; index: number }) => {
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
  }, []);

  const renderItem = React.useCallback(
    ({ item, index }: { item: InboxSheetRow; index: number }) => {
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
        <View style={[styles.sheetRowWrap, getLayerStyle(realIndex)]}>
          {renderItemRow(item as BuyerLineLite, realIndex, () => scrollToRow(realIndex))}
        </View>
      );
    },
    [
      attachFilledCount,
      attachMissingCount,
      attachSlotsTotal,
      attachments,
      creating,
      kbOpen,
      missingAttachSuppliers,
      needAttachWarn,
      pickedIdsLen,
      renderItemRow,
      requiredSuppliers,
      s,
      scrollToRow,
      setAttachments,
      setShowAttachBlock,
      showAttachBlock,
    ],
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
        stickyHeaderIndices={STICKY_HEADER_INDICES}
        estimatedItemSize={184}
        getItemType={getInboxSheetItemType}
        {...BUYER_INBOX_SHEET_FLATLIST_TUNING}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        ListHeaderComponent={
          <View>
            <BuyerReadyBuyOptionsBlock
              bundle={readyBuyOptions ?? null}
              variant="detail"
            />
            {!kbOpen && requestContextLines.length ? (
              <View style={s.reqNoteBox}>
                {requestContextLines.map((t, i) => (
                  <Text key={i} style={s.reqNoteLine} numberOfLines={1}>
                    {t}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        }
        renderItem={renderItem}
      />

      {footer ? <View style={styles.footerInset}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cellRenderer: {
    position: "relative",
    overflow: "visible",
    pointerEvents: "box-none",
  },
  footerInset: {
    paddingBottom: FOOTER_BOTTOM_INSET,
  },
  listContent: {
    overflow: "visible",
  },
  sheetRowWrap: {
    marginBottom: 10,
    position: "relative",
    overflow: "visible",
    pointerEvents: "box-none",
  },
});
