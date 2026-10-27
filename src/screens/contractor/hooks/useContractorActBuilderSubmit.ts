import { useCallback } from "react";
import { Alert } from "react-native";
import { submitActBuilderFlow } from "../contractor.actBuilderSubmitFlow";
import { buildActMetaNote, pickErr } from "../contractor.utils";
import type { ContractorWorkRow } from "../contractor.loadWorksService";

type ScreenLoadState = "init" | "loading" | "ready" | "error";

export function useContractorActBuilderSubmit(params: {
  supabaseClient: any;
  workModalRow: ContractorWorkRow | null;
  actBuilderLoadState: ScreenLoadState;
  actBuilderWorks: any[];
  actBuilderItems: any[];
  actBuilderSelectedMatCount: number;
  jobHeader: any;
  rows: ContractorWorkRow[];
  resolveContractorJobId: (row: ContractorWorkRow) => Promise<string>;
  resolveRequestId: (row: ContractorWorkRow) => Promise<string>;
  isRejectedOrCancelledRequestStatus: (status: unknown) => boolean;
  looksLikeUuid: (value: unknown) => boolean;
  pickFirstNonEmpty: (...values: (string | null | undefined)[]) => string | null;
  loadWorks: () => Promise<void>;
  showErr: (error: unknown) => void;
  setActBuilderHint: (next: string) => void;
  setActBuilderSaving: (next: boolean) => void;
  setWorkModalHint: (next: string) => void;
  setActBuilderVisible: (next: boolean) => void;
}) {
  const {
    supabaseClient,
    workModalRow,
    actBuilderLoadState,
    actBuilderWorks,
    actBuilderItems,
    actBuilderSelectedMatCount,
    jobHeader,
    rows,
    resolveContractorJobId,
    resolveRequestId,
    isRejectedOrCancelledRequestStatus,
    looksLikeUuid,
    pickFirstNonEmpty,
    loadWorks,
    showErr,
    setActBuilderHint,
    setActBuilderSaving,
    setWorkModalHint,
    setActBuilderVisible,
  } = params;

  const submitActBuilder = useCallback(async () => {
    if (!workModalRow) return;
    try {
      setActBuilderHint("");
      setActBuilderSaving(true);
      const result = await submitActBuilderFlow({
        supabaseClient,
        actBuilderLoadState,
        actBuilderWorks,
        actBuilderItems,
        actBuilderSelectedMatCount,
        workModalRow,
        jobHeader,
        rows,
        resolveContractorJobId,
        resolveRequestId,
        isRejectedOrCancelledRequestStatus,
        looksLikeUuid,
        pickFirstNonEmpty,
        buildActMetaNote,
        pickErr,
        notify: (title, message) => Alert.alert(title, message),
      });

      if (result.actBuilderHint) setActBuilderHint(result.actBuilderHint);
      if (result.workModalHint) setWorkModalHint(result.workModalHint);
      if (result.alert) Alert.alert(result.alert.title, result.alert.message);
      if (!result.ok) return;
      if (result.closeActBuilder) setActBuilderVisible(false);
      if (result.reloadWorks) await loadWorks();
    } catch (error) {
      setActBuilderHint(`Ошибка формирования акта: ${pickErr(error)}`);
      showErr(error);
    } finally {
      setActBuilderSaving(false);
    }
  }, [
    workModalRow,
    setActBuilderHint,
    setActBuilderSaving,
    supabaseClient,
    actBuilderLoadState,
    actBuilderWorks,
    actBuilderItems,
    actBuilderSelectedMatCount,
    jobHeader,
    rows,
    resolveContractorJobId,
    resolveRequestId,
    isRejectedOrCancelledRequestStatus,
    looksLikeUuid,
    pickFirstNonEmpty,
    setWorkModalHint,
    setActBuilderVisible,
    loadWorks,
    showErr,
  ]);

  return { submitActBuilder };
}
