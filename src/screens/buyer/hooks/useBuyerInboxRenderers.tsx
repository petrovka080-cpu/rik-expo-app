import { useCallback, useState } from "react";

import type { Supplier, BuyerInboxRow } from "../../../lib/catalog_api";
import {
  selectBuyerCounterpartyUi,
  selectBuyerGroupHeaderMeta,
  selectBuyerItemPrettyText,
  selectBuyerItemRejectedByDirector,
  selectBuyerMobileEditorViewModel,
  selectBuyerSupplierAutoText,
  selectBuyerSupplierMetaPatch,
} from "../buyer.inbox.presentation";
import type { BuyerGroup, BuyerSheetKind, DraftAttachmentMap, LineMeta } from "../buyer.types";
import type { StylesBag } from "../components/component.types";
import { BuyerGroupBlock, BuyerItemRow } from "../buyer.components";
import { BuyerMobileItemEditorModal } from "../components/BuyerMobileItemEditorModal";
import { normName } from "../buyerUtils";

export function useBuyerInboxRenderers(params: {
  s: StylesBag;
  picked: Record<string, boolean>;
  meta: Record<string, Partial<LineMeta>>;
  lineTotal: (row: BuyerInboxRow) => number;
  togglePick: (row: BuyerInboxRow) => void;
  setLineMeta: (key: string, patch: Partial<LineMeta>) => void;
  getSupplierSuggestions: (q: string, roleGate?: "supplier" | "contractor" | null) => string[];
  suppliers: Supplier[];
  isSheetOpen: boolean;
  sheetKind: BuyerSheetKind;
  setShowAttachBlock: (v: boolean) => void;
  requestSum: (group: BuyerGroup) => number;
  prettyLabel: (requestId: string | number | null | undefined, requestIdOld?: number | null) => string;
  openInboxSheet: (group: BuyerGroup) => void;
  supplierGroups: string[];
  attachments: DraftAttachmentMap;
  setAttachments: React.Dispatch<React.SetStateAction<DraftAttachmentMap>>;
  isWeb: boolean;
  hasAnyCounterpartyOptions: boolean;
  counterpartyHardFailure: boolean;
  onFocusRow?: (index: number) => void;
}) {
  const {
    s,
    picked,
    meta,
    lineTotal,
    togglePick,
    setLineMeta,
    getSupplierSuggestions,
    suppliers,
    isSheetOpen,
    sheetKind,
    setShowAttachBlock,
    requestSum,
    prettyLabel,
    openInboxSheet,
    supplierGroups,
    attachments,
    setAttachments,
    isWeb,
    hasAnyCounterpartyOptions,
    counterpartyHardFailure,
    onFocusRow,
  } = params;

  const [editingItem, setEditingItem] = useState<BuyerInboxRow | null>(null);

  const applySupplierSelection = useCallback((row: BuyerInboxRow, currentMeta: Partial<LineMeta>, name: string) => {
    const key = String(row.request_item_id ?? "");
    const match = suppliers.find((sp) => normName(sp.name) === normName(name)) || null;
    const auto = selectBuyerSupplierAutoText(match);
    setLineMeta(key, selectBuyerSupplierMetaPatch(currentMeta, name, auto));
  }, [setLineMeta, suppliers]);

  const renderItemRow = useCallback(
    (it: BuyerInboxRow, idx: number, onFocusRowForSheet?: () => void) => {
      const key = String(it.request_item_id ?? "");
      const selected = !!picked[key];
      const m = (key && meta[key]) || {};
      const sum = lineTotal(it);
      const prettyText = selectBuyerItemPrettyText(it);
      const rejectedByDirector = selectBuyerItemRejectedByDirector(it);
      const { counterpartyLabel, roleGate } = selectBuyerCounterpartyUi(it);
      const sugg = getSupplierSuggestions("", roleGate);

      return (
        <BuyerItemRow
          s={s}
          it={it}
          selected={selected}
          inSheet={isSheetOpen && sheetKind === "inbox"}
          m={m}
          sum={sum}
          prettyText={prettyText}
          rejectedByDirector={rejectedByDirector}
          onTogglePick={() => togglePick(it)}
          onSetPrice={(v) => setLineMeta(key, { price: v })}
          onSetSupplier={(v) => setLineMeta(key, { supplier: v })}
          onSetNote={(v) => setLineMeta(key, { note: v })}
          counterpartyLabel={counterpartyLabel}
          supplierSuggestions={sugg}
          hasAnyCounterpartyOptions={hasAnyCounterpartyOptions}
          counterpartyHardFailure={counterpartyHardFailure}
          onPickSupplier={(name) => applySupplierSelection(it, m, name)}
          showInlineEditor={false}
          onEditMobile={() => setEditingItem(it)}
          isMobileEditorOpen={editingItem?.request_item_id === it.request_item_id}
          onFocusField={() => {
            if (isSheetOpen && sheetKind === "inbox" && !isWeb) {
              onFocusRowForSheet?.();
              onFocusRow?.(idx);
            }
            if (isWeb) {
              setShowAttachBlock(false);
            }
          }}
        />
      );
    },
    [
      picked,
      meta,
      lineTotal,
      togglePick,
      setLineMeta,
      getSupplierSuggestions,
      isSheetOpen,
      sheetKind,
      hasAnyCounterpartyOptions,
      counterpartyHardFailure,
      s,
      onFocusRow,
      setShowAttachBlock,
      isWeb,
      editingItem,
      applySupplierSelection,
    ]
  );

  const renderMobileEditorModal = useCallback(() => {
    if (!editingItem) return null;
    const key = String(editingItem.request_item_id ?? "");
    const m = meta[key] || {};
    const baseUi = selectBuyerCounterpartyUi(editingItem);
    const sugg = getSupplierSuggestions("", baseUi.roleGate);
    const { counterpartyLabel } = selectBuyerMobileEditorViewModel(editingItem, m, sugg, "");

    return (
      <BuyerMobileItemEditorModal
        it={editingItem}
        m={m}
        s={s}
        counterpartyLabel={counterpartyLabel}
        supplierSuggestions={sugg}
        hasAnyCounterpartyOptions={hasAnyCounterpartyOptions}
        counterpartyHardFailure={counterpartyHardFailure}
        onSetPrice={(v) => setLineMeta(key, { price: v })}
        onSetSupplier={(v) => setLineMeta(key, { supplier: v })}
        onSetNote={(v) => setLineMeta(key, { note: v })}
        onPickSupplier={(name) => applySupplierSelection(editingItem, m, name)}
        onClose={() => setEditingItem(null)}
      />
    );
  }, [
    editingItem,
    meta,
    hasAnyCounterpartyOptions,
    counterpartyHardFailure,
    setLineMeta,
    getSupplierSuggestions,
    s,
    applySupplierSelection,
  ]);

  const renderGroupBlock = useCallback(
    (group: BuyerGroup, index: number) => {
      const isOpen = false;
      const { gsum, headerMeta } = selectBuyerGroupHeaderMeta(group, requestSum);
      const reqLabel = prettyLabel(group.request_id, group.request_id_old ?? null);
      const headerTitle = reqLabel;

      return (
        <BuyerGroupBlock
          s={s}
          g={group}
          index={index}
          isOpen={isOpen}
          gsum={gsum}
          headerTitle={headerTitle}
          headerMeta={headerMeta}
          onToggle={() => openInboxSheet(group)}
          renderItemRow={renderItemRow}
          isWeb={isWeb}
          supplierGroups={supplierGroups}
          attachments={attachments}
          onPickAttachment={(nextKey, att) => setAttachments((prev) => ({ ...prev, [nextKey]: att }))}
        />
      );
    },
    [
      requestSum,
      prettyLabel,
      openInboxSheet,
      renderItemRow,
      isWeb,
      supplierGroups,
      attachments,
      setAttachments,
      s,
    ]
  );

  return {
    renderItemRow,
    renderGroupBlock,
    editingItem,
    setEditingItem,
    renderMobileEditorModal,
    isMobileEditorVisible: !!editingItem,
  };
}
