import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";

import { reopenRequestDraft } from "../../../lib/api/request.repository";
import type {
  ForemanRequestSummary,
  RequestDetails,
} from "../../../lib/catalog_api";
import { recordCatchDiscipline } from "../../../lib/observability/catchDiscipline";
import { supabase } from "../../../lib/supabaseClient";
import type { BusyCtx } from "../../../ui/GlobalBusy";
import { ridStr } from "../foreman.helpers";
import { previewForemanHistoryPdf } from "../foreman.requestPdf.service";
import { FOREMAN_TEXT } from "../foreman.ui";
import type { ForemanMainTab } from "../foremanUi.store";

type RunRequestPdf = (
  mode: "share" | "preview",
  requestId: string,
  requestDetails: RequestDetails | null,
  syncMeta: (rid: string, context: string) => Promise<void>,
  onBeforeNavigate?: (() => void | Promise<void>) | null,
) => Promise<void>;

type UseForemanNavigationFlowArgs = {
  authIdentityFullName: string;
  historyRequests: ForemanRequestSummary[];
  requestDetails: RequestDetails | null;
  closeHistory: () => void;
  busyContext: BusyCtx;
  openRequestById: (targetId: string | number | null | undefined) => Promise<string | null>;
  openDraft: () => void;
  setHistoryReopenBusyId: (requestId: string | null) => void;
  alertError: (error: unknown, fallback: string) => void;
  ensureHeaderReady: () => boolean;
  syncPendingQtyDrafts: () => Promise<void>;
  ensureRequestId: () => Promise<string>;
  syncRequestHeaderMeta: (rid: string, context: string) => Promise<void>;
  closeDraft: () => void;
  runRequestPdf: RunRequestPdf;
  requestId: string;
  discardWholeDraft: () => Promise<void>;
  submitToDirector: () => Promise<void>;
  setDraftDeleteBusy: (value: boolean) => void;
  setDraftSendBusy: (value: boolean) => void;
  busy: boolean;
  ensureEditableContext: () => boolean;
  openWorkTypePicker: () => void;
  closeCatalog: () => void;
  setIsFioConfirmVisible: (value: boolean) => void;
  foremanMainTab: ForemanMainTab;
  setForemanMainTab: (value: ForemanMainTab) => void;
  foreman: string;
  fetchHistory: (foremanName: string) => Promise<void>;
  fetchSubcontractHistory: (userId?: string | null) => Promise<void>;
  showRequestHistoryDetails: (requestId: string) => void;
};

export function useForemanNavigationFlow(args: UseForemanNavigationFlowArgs) {
  const router = useRouter();
  const {
    authIdentityFullName,
    historyRequests,
    requestDetails,
    closeHistory,
    busyContext,
    openRequestById,
    openDraft,
    setHistoryReopenBusyId,
    alertError,
    ensureHeaderReady,
    syncPendingQtyDrafts,
    ensureRequestId,
    syncRequestHeaderMeta,
    closeDraft,
    runRequestPdf,
    requestId,
    discardWholeDraft,
    submitToDirector,
    setDraftDeleteBusy,
    setDraftSendBusy,
    busy,
    ensureEditableContext,
    openWorkTypePicker,
    closeCatalog,
    setIsFioConfirmVisible,
    foremanMainTab,
    setForemanMainTab,
    foreman,
    fetchHistory,
    fetchSubcontractHistory,
    showRequestHistoryDetails,
  } = args;

  const openHistoryPdfSafe = useCallback(async (reqId: string) => {
    await previewForemanHistoryPdf({
      requestId: reqId,
      authIdentityFullName,
      historyRequests,
      requestDetails,
      closeHistory,
      busy: busyContext,
      supabase,
      router,
    });
  }, [
    authIdentityFullName,
    busyContext,
    closeHistory,
    historyRequests,
    requestDetails,
    router,
  ]);

  const handleHistorySelect = useCallback(async (request: ForemanRequestSummary) => {
    const openedDraftId = await openRequestById(request.id);
    closeHistory();
    if (openedDraftId) openDraft();
  }, [closeHistory, openDraft, openRequestById]);

  const handleHistoryReopen = useCallback(async (request: ForemanRequestSummary) => {
    const requestKey = ridStr(request.id);
    if (!requestKey) return;
    setHistoryReopenBusyId(requestKey);
    try {
      await reopenRequestDraft({
        requestId: requestKey,
        sourcePath: "foreman.history.reopen",
        draftScopeKey: requestKey,
      });
      const openedDraftId = await openRequestById(requestKey);
      closeHistory();
      if (openedDraftId) openDraft();
    } catch (error) {
      recordCatchDiscipline({
        screen: "foreman",
        surface: "foreman_history_reopen",
        event: "foreman_history_reopen_failed",
        kind: "critical_fail",
        error,
        category: "ui",
        sourceKind: "foreman:request",
        errorStage: "reopen_draft",
        extra: {
          requestId: requestKey,
          action: "handleHistoryReopen",
        },
      });
      alertError(error, "Не удалось вернуть черновик");
    } finally {
      setHistoryReopenBusyId(null);
    }
  }, [alertError, closeHistory, openDraft, openRequestById, setHistoryReopenBusyId]);

  const onPdf = useCallback(async () => {
    if (!ensureHeaderReady()) return;
    await syncPendingQtyDrafts();
    // XR-PDF: pass closeDraft so the DraftModal is dismissed before the PDF viewer route is pushed
    await runRequestPdf("preview", await ensureRequestId(), requestDetails, syncRequestHeaderMeta, closeDraft);
  }, [
    closeDraft,
    ensureHeaderReady,
    ensureRequestId,
    requestDetails,
    runRequestPdf,
    syncPendingQtyDrafts,
    syncRequestHeaderMeta,
  ]);

  const draftPdfBusy = useMemo(() => {
    const ridKey = ridStr(requestId);
    return busyContext.isBusy(`pdf:request:${ridKey || "draft"}`);
  }, [busyContext, requestId]);

  const handleCancelWholeDraft = useCallback(async () => {
    setDraftDeleteBusy(true);
    try {
      await discardWholeDraft();
      closeDraft();
    } catch (error) {
      alertError(error, FOREMAN_TEXT.deleteDraftError);
    } finally {
      setDraftDeleteBusy(false);
    }
  }, [alertError, closeDraft, discardWholeDraft, setDraftDeleteBusy]);

  const handleSendDraftFromSheet = useCallback(async () => {
    setDraftSendBusy(true);
    try {
      await submitToDirector();
      closeDraft();
    } catch (error) {
      alertError(error, FOREMAN_TEXT.sendToDirectorError);
    } finally {
      setDraftSendBusy(false);
    }
  }, [alertError, closeDraft, setDraftSendBusy, submitToDirector]);

  const handleCalcPress = useCallback(() => {
    if (busy) return;
    if (!ensureEditableContext()) return;
    openWorkTypePicker();
  }, [busy, ensureEditableContext, openWorkTypePicker]);

  const openDraftFromCatalog = useCallback(() => {
    closeCatalog();
    openDraft();
  }, [closeCatalog, openDraft]);

  const openFioModal = useCallback(() => {
    setIsFioConfirmVisible(true);
  }, [setIsFioConfirmVisible]);

  const openMaterialsTab = useCallback(() => {
    setForemanMainTab("materials");
  }, [setForemanMainTab]);

  const openSubcontractsTab = useCallback(() => {
    setForemanMainTab("subcontracts");
  }, [setForemanMainTab]);

  const closeMainTab = useCallback(() => {
    setForemanMainTab(null);
  }, [setForemanMainTab]);

  const openRequestHistory = useCallback(async () => {
    await fetchHistory(foreman);
  }, [fetchHistory, foreman]);

  const openSubcontractHistory = useCallback(() => {
    void fetchSubcontractHistory();
  }, [fetchSubcontractHistory]);

  const handleHistoryShowDetails = useCallback((request: ForemanRequestSummary) => {
    showRequestHistoryDetails(request.id);
  }, [showRequestHistoryDetails]);

  const screenTitle = useMemo(() => {
    if (foremanMainTab === "materials") return "Материалы";
    if (foremanMainTab === "subcontracts") return "Подряды";
    return "Заявка";
  }, [foremanMainTab]);

  return {
    openHistoryPdfSafe,
    handleHistorySelect,
    handleHistoryReopen,
    onPdf,
    draftPdfBusy,
    handleCancelWholeDraft,
    handleSendDraftFromSheet,
    handleCalcPress,
    openDraftFromCatalog,
    openFioModal,
    openMaterialsTab,
    openSubcontractsTab,
    closeMainTab,
    openRequestHistory,
    openSubcontractHistory,
    handleHistoryShowDetails,
    screenTitle,
  };
}
