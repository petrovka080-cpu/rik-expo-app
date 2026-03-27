import { useCallback, useMemo } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useIssuedRefreshLifecycle } from "../contractor.issuedRefreshLifecycle";
import type { ContractorWorkRow } from "../contractor.loadWorksService";
import type { IssuedItemRow, LinkedReqCard } from "../types";

type RefreshResult = {
  issuedItemCount: number;
  linkedRequestCount: number;
  hasHint: boolean;
};

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

export function useContractorIssuedRefresh(params: Params) {
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
    async (row: ContractorWorkRow): Promise<RefreshResult> => {
      const issueSeq = ++issuedLoadSeqRef.current;
      setLoadingIssued(true);

      try {
        const data = await loadIssuedTodayDataForRow(row);
        const isCurrent =
          issueSeq === issuedLoadSeqRef.current &&
          activeWorkModalProgressRef.current === String(row.progress_id || "").trim();

        if (!isCurrent) {
          return {
            issuedItemCount: 0,
            linkedRequestCount: 0,
            hasHint: false,
          };
        }

        setIssuedItems(data.issuedItems);
        setLinkedReqCards(data.linkedReqCards);
        setIssuedHint(data.issuedHint || "");

        return {
          issuedItemCount: data.issuedItems.length,
          linkedRequestCount: data.linkedReqCards.length,
          hasHint: Boolean(String(data.issuedHint || "").trim()),
        };
      } finally {
        const isCurrent =
          issueSeq === issuedLoadSeqRef.current &&
          activeWorkModalProgressRef.current === String(row.progress_id || "").trim();
        if (isCurrent) {
          setLoadingIssued(false);
        }
      }
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

  const issuedRefreshProgressId = useMemo(() => {
    if (!workModalVisible || !issuedOpen) return "";
    return String(workModalRowProgressId || "").trim();
  }, [workModalVisible, issuedOpen, workModalRowProgressId]);

  useIssuedRefreshLifecycle({
    enabled: workModalVisible && issuedOpen,
    progressId: issuedRefreshProgressId,
    looksLikeUuid: (value) => looksLikeUuid(value),
    getCurrentRow: () => workModalRowRef.current,
    getRowProgressId: (row) => String(row?.progress_id || "").trim(),
    onTick: async (row) => await refreshIssuedTodayForCurrentRow(row),
  });

  return { refreshIssuedTodayForCurrentRow };
}
