import { useCallback, useMemo, useState } from "react";
import type { BuyerGroup, BuyerSheetKind } from "../buyer.types";

type UseBuyerSheetsParams = {
  onCloseExtras?: () => void;
};

export function useBuyerSheets(params?: UseBuyerSheetsParams) {
  const [sheetKind, setSheetKind] = useState<BuyerSheetKind>("none");
  const [sheetGroup, setSheetGroup] = useState<BuyerGroup | null>(null);
  const [sheetPid, setSheetPid] = useState<string | null>(null);

  const isSheetOpen = sheetKind !== "none";

  const closeSheet = useCallback(() => {
    setSheetKind("none");
    setSheetGroup(null);
    setSheetPid(null);
    params?.onCloseExtras?.();
  }, [params]);

  const openInboxSheet = useCallback((g: BuyerGroup) => {
    setSheetGroup(g);
    setSheetPid(null);
    setSheetKind("inbox");
  }, []);

  const openAccountingSheet = useCallback((pid: string | number) => {
    setSheetPid(String(pid));
    setSheetGroup(null);
    setSheetKind("accounting");
  }, []);

  const openReworkSheet = useCallback((pid: string | number) => {
    setSheetPid(String(pid));
    setSheetGroup(null);
    setSheetKind("rework");
  }, []);

  const openPropDetailsSheet = useCallback((pid: string | number) => {
    setSheetPid(String(pid));
    setSheetGroup(null);
    setSheetKind("prop_details");
  }, []);

  const openRfqSheet = useCallback(() => {
    setSheetPid(null);
    setSheetGroup(null);
    setSheetKind("rfq");
  }, []);

  return useMemo(
    () => ({
      sheetKind,
      setSheetKind,
      sheetGroup,
      setSheetGroup,
      sheetPid,
      setSheetPid,
      isSheetOpen,
      closeSheet,
      openInboxSheet,
      openAccountingSheet,
      openReworkSheet,
      openPropDetailsSheet,
      openRfqSheet,
    }),
    [
      sheetKind,
      sheetGroup,
      sheetPid,
      isSheetOpen,
      closeSheet,
      openInboxSheet,
      openAccountingSheet,
      openReworkSheet,
      openPropDetailsSheet,
      openRfqSheet,
    ],
  );
}

