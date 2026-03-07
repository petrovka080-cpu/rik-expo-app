import { useCallback, useMemo } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useIssuedPolling } from "../contractor.issuedPolling";
import type { ContractorWorkRow } from "../contractor.loadWorksService";
import type { IssuedItemRow, LinkedReqCard } from "../types";

type Params = {
  loadIssuedTodayDataForRow: (row: ContractorWorkRow) => Promise<{
    issuedItems: IssuedItemRow[];
    linkedReqCards: LinkedReqCard[];
    issuedHint: string;
  }>;
  issuedLoadSeqRef: MutableRefObject<number>;
  activeWorkModalProgressRef: MutableRefObject<string>;
  workModalRowRef: MutableRefObject<ContractorWorkRow | null>;
  workModalVisible: boolean;
  issuedOpen: boolean;
  workModalRowProgressId: string | null | undefined;
  looksLikeUuid: (value: unknown) => boolean;
  setLoadingIssued: Dispatch<SetStateAction<boolean>>;
  setIssuedItems: Dispatch<SetStateAction<IssuedItemRow[]>>;
  setLinkedReqCards: Dispatch<SetStateAction<LinkedReqCard[]>>;
  setIssuedHint: Dispatch<SetStateAction<string>>;
};

export function useContractorIssuedPolling(params: Params) {
  const {
    loadIssuedTodayDataForRow,
    issuedLoadSeqRef,
    activeWorkModalProgressRef,
    workModalRowRef,
    workModalVisible,
    issuedOpen,
    workModalRowProgressId,
    looksLikeUuid,
    setLoadingIssued,
    setIssuedItems,
    setLinkedReqCards,
    setIssuedHint,
  } = params;

  const refreshIssuedTodayForCurrentRow = useCallback(
    async (row: ContractorWorkRow) => {
      const issueSeq = ++issuedLoadSeqRef.current;
      setLoadingIssued(true);
      const data = await loadIssuedTodayDataForRow(row);
      const isCurrent =
        issueSeq === issuedLoadSeqRef.current &&
        activeWorkModalProgressRef.current === String(row.progress_id || "").trim();
      if (!isCurrent) return;
      setIssuedItems(data.issuedItems);
      setLinkedReqCards(data.linkedReqCards);
      setIssuedHint(data.issuedHint || "");
      setLoadingIssued(false);
    },
    [
      issuedLoadSeqRef,
      setLoadingIssued,
      loadIssuedTodayDataForRow,
      activeWorkModalProgressRef,
      setIssuedItems,
      setLinkedReqCards,
      setIssuedHint,
    ],
  );

  const issuedPollingProgressId = useMemo(() => {
    if (!workModalVisible || !issuedOpen) return "";
    return String(workModalRowProgressId || "").trim();
  }, [workModalVisible, issuedOpen, workModalRowProgressId]);

  useIssuedPolling({
    progressId: issuedPollingProgressId,
    looksLikeUuid,
    getCurrentRow: () => workModalRowRef.current,
    getRowProgressId: (row) => String(row?.progress_id || "").trim(),
    onTick: async (row) => {
      await refreshIssuedTodayForCurrentRow(row);
    },
    intervalMs: 25000,
  });

  return { refreshIssuedTodayForCurrentRow };
}
