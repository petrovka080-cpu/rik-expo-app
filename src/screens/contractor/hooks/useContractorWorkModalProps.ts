import { useCallback, useMemo } from "react";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import ContractorWorkModal from "../components/ContractorWorkModal";

type WorkModalCoreProps = Omit<
  ComponentProps<typeof ContractorWorkModal>,
  "visible" | "onClose" | "onDismiss" | "modalHeaderTopPad"
>;

type Params = Omit<
  WorkModalCoreProps,
  "resolvedObjectInfo" | "onOpenSummaryPdf" | "onToggleHistory" | "onOpenHistoryPdf" | "getVisibleNote" | "onToggleIssued"
> & {
  textOrDash: (value: unknown) => string;
  parseActMeta: (note: string | null | undefined) => { visibleNote: string };
  setHistoryOpen: Dispatch<SetStateAction<boolean>>;
  setIssuedOpen: Dispatch<SetStateAction<boolean>>;
  handleGenerateSummaryPdf: () => Promise<void>;
  handleGenerateHistoryPdf: (log: WorkModalCoreProps["workLog"][number]) => Promise<void>;
};

export function useContractorWorkModalProps(params: Params): WorkModalCoreProps {
  const onOpenSummaryPdf = useCallback(() => {
    void params.handleGenerateSummaryPdf();
  }, [params]);

  const onToggleHistory = useCallback(() => {
    params.setHistoryOpen((v) => !v);
  }, [params]);

  const onOpenHistoryPdf = useCallback(
    (log: WorkModalCoreProps["workLog"][number]) => {
      void params.handleGenerateHistoryPdf(log);
    },
    [params],
  );

  const getVisibleNote = useCallback(
    (note: string | null | undefined) => params.parseActMeta(note).visibleNote,
    [params],
  );

  const onToggleIssued = useCallback(() => {
    params.setIssuedOpen((v) => !v);
  }, [params]);

  return useMemo(
    () => ({
      workModalRow: params.workModalRow,
      workModalLoading: params.workModalLoading,
      resolvedObjectName: params.resolvedObjectName,
      resolvedObjectInfo: params.textOrDash(params.resolvedObjectName),
      jobHeader: params.jobHeader,
      workModalSaving: params.workModalSaving,
      loadingIssued: params.loadingIssued,
      workModalHint: params.workModalHint,
      progressSyncLabel: params.progressSyncLabel,
      progressSyncDetail: params.progressSyncDetail,
      progressSyncTone: params.progressSyncTone,
      canSubmitProgress: params.canSubmitProgress,
      canRetryProgress: params.canRetryProgress,
      onSubmitProgress: params.onSubmitProgress,
      onRetryProgress: params.onRetryProgress,
      onOpenContract: params.onOpenContract,
      onOpenActBuilder: params.onOpenActBuilder,
      onOpenSummaryPdf,
      historyOpen: params.historyOpen,
      onToggleHistory,
      workLog: params.workLog,
      onOpenHistoryPdf,
      getVisibleNote,
      issuedOpen: params.issuedOpen,
      onToggleIssued,
      linkedReqCards: params.linkedReqCards,
      issuedItems: params.issuedItems,
      issuedHint: params.issuedHint,
      onOpenEstimate: params.onOpenEstimate,
      styles: params.styles,
    }),
    [params, onOpenSummaryPdf, onToggleHistory, onOpenHistoryPdf, getVisibleNote, onToggleIssued],
  );
}
