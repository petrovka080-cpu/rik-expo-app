import { useCallback, useMemo } from "react";
import { useBuyerStore } from "../buyer.store";
import type { BuyerGroup, BuyerSheetKind } from "../buyer.types";

type UseBuyerSheetsParams = {
  onCloseExtras?: () => void;
};

export function useBuyerSheets(params?: UseBuyerSheetsParams) {
  const modal = useBuyerStore((state) => state.modal);
  const selectedRequestId = useBuyerStore((state) => state.selectedRequestId);
  const setSelectedRequestId = useBuyerStore((state) => state.setSelectedRequestId);
  const openModal = useBuyerStore((state) => state.openModal);
  const closeModal = useBuyerStore((state) => state.closeModal);

  const sheetKind: BuyerSheetKind = modal.type;
  const sheetPid = modal.entityId ?? null;
  const isSheetOpen = sheetKind !== "none";

  const closeSheet = useCallback(() => {
    closeModal();
    setSelectedRequestId(null);
    params?.onCloseExtras?.();
  }, [closeModal, params, setSelectedRequestId]);

  const openInboxSheet = useCallback((g: BuyerGroup) => {
    const requestId = String(g?.request_id ?? "").trim() || null;
    setSelectedRequestId(requestId);
    openModal("inbox", requestId ?? undefined);
  }, [openModal, setSelectedRequestId]);

  const openAccountingSheet = useCallback((pid: string | number) => {
    const proposalId = String(pid ?? "").trim();
    setSelectedRequestId(null);
    openModal("accounting", proposalId || undefined);
  }, [openModal, setSelectedRequestId]);

  const openReworkSheet = useCallback((pid: string | number) => {
    const proposalId = String(pid ?? "").trim();
    setSelectedRequestId(null);
    openModal("rework", proposalId || undefined);
  }, [openModal, setSelectedRequestId]);

  const openPropDetailsSheet = useCallback((pid: string | number) => {
    const proposalId = String(pid ?? "").trim();
    setSelectedRequestId(null);
    openModal("prop_details", proposalId || undefined);
  }, [openModal, setSelectedRequestId]);

  const openRfqSheet = useCallback(() => {
    setSelectedRequestId(null);
    openModal("rfq");
  }, [openModal, setSelectedRequestId]);

  return useMemo(
    () => ({
      sheetKind,
      sheetPid,
      selectedRequestId,
      isSheetOpen,
      closeSheet,
      openInboxSheet,
      openAccountingSheet,
      openReworkSheet,
      openPropDetailsSheet,
      openRfqSheet,
    }),
    [
      closeSheet,
      isSheetOpen,
      openAccountingSheet,
      openInboxSheet,
      openPropDetailsSheet,
      openReworkSheet,
      openRfqSheet,
      selectedRequestId,
      sheetKind,
      sheetPid,
    ],
  );
}
