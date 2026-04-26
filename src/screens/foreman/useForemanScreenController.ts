import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  Alert,
  Platform,
  type ListRenderItem,
} from "react-native";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

import ForemanReqItemRow from "./ForemanReqItemRow";
import ForemanMaterialsContent from "./ForemanMaterialsContent";
import ForemanSubcontractTab from "./ForemanSubcontractTab";
import { useForemanDicts } from "./useForemanDicts";
import { resolveForemanContext } from "./foreman.context.resolver";
import { adaptFormContext } from "./foreman.locator.adapter";
import { debugForemanLogLazy } from "./foreman.debug";
import {
  resolveForemanHeaderRequirements,
  type ForemanHeaderRequirementResult,
} from "./foreman.headerRequirements";
import { getObjectDisplayName } from "./foreman.options";
import { s } from "./foreman.styles";
import { FOREMAN_TEXT, REQUEST_STATUS_STYLES, UI } from "./foreman.ui";
import { useForemanSubcontractHistory } from "./hooks/useForemanSubcontractHistory";
import { useCollapsingHeader } from "../shared/useCollapsingHeader";
import { useGlobalBusy } from "../../ui/GlobalBusy";
import { supabase } from "../../lib/supabaseClient";
import {
  rikQuickSearch,
  type ForemanRequestSummary,
  type ReqItemRow,
} from "../../lib/catalog_api";
import { reopenRequestDraft } from "../../lib/api/request.repository";
import type { RefOption } from "./foreman.types";
import {
  buildScopeNote,
  isDraftLikeStatus,
  loadForemanHistory,
  resolveStatusInfo as resolveStatusHelper,
  ridStr,
  saveForemanToHistory,
  shortId,
  toErrorText,
} from "./foreman.helpers";
import { buildForemanSyncUiStatus } from "../../lib/offline/foremanSyncRuntime";
import { useForemanHistory } from "./hooks/useForemanHistory";
import { useForemanDisplayNo } from "./hooks/useForemanDisplayNo";
import { useForemanDraftBoundary } from "./hooks/useForemanDraftBoundary";
import { useForemanPdf } from "./hooks/useForemanPdf";
import { useForemanActions } from "./hooks/useForemanActions";
import { isForemanQuickRequestConfigured } from "./foreman.ai";
import { useForemanBaseUi } from "./hooks/useForemanBaseUi";
import { useForemanDraftUi } from "./hooks/useForemanDraftUi";
import { useForemanHistoryUi } from "./hooks/useForemanHistoryUi";
import { useForemanAiQuickFlow } from "./hooks/useForemanAiQuickFlow";
import {
  loadStoredFioState,
  saveStoredFioState,
} from "../../lib/storage/fioPersistence";
import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";
import { previewForemanHistoryPdf } from "./foreman.requestPdf.service";

type WebUiApi = {
  onZoneChange: (v: string) => void;
  onOpenFioModal: () => void;
  objectType: string;
  level: string;
  system: string;
  zone: string;
  objOptions: RefOption[];
  lvlOptions: RefOption[];
  sysOptions: RefOption[];
  zoneOptions: RefOption[];
  onObjectChange: (v: string) => void;
  onLevelChange: (v: string) => void;
  onSystemChange: (v: string) => void;
  ensureHeaderReady: () => boolean;
  alert?: (msg: string) => void;
  confirm?: (msg: string) => boolean;
};

type ForemanMaterialsContentProps = ComponentProps<typeof ForemanMaterialsContent>;
type ForemanSubcontractTabProps = ComponentProps<typeof ForemanSubcontractTab>;

function buildFioBootstrapScopeKey(userId?: string | null, date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${userId || "anonymous"}:${year}-${month}-${day}`;
}

declare global {
  var webUi: WebUiApi;
}

export function useForemanScreenController() {
  const gbusy = useGlobalBusy();
  const router = useRouter();
  const isScreenFocused = useIsFocused();
  const [authIdentity, setAuthIdentity] = useState<{
    fullName: string;
    email: string;
    phone: string;
  }>({
    fullName: "",
    email: "",
    phone: "",
  });
  const safeWebUi = typeof webUi !== "undefined" ? webUi : undefined;

  const {
    historyRequests,
    historyLoading,
    historyVisible,
    fetchHistory,
    closeHistory,
  } = useForemanHistory();
  const {
    history: subcontractHistory,
    historyLoading: subcontractHistoryLoading,
    historyVisible: subcontractHistoryVisible,
    fetchHistory: fetchSubcontractHistory,
    closeHistory: closeSubcontractHistory,
  } = useForemanSubcontractHistory();

  const {
    displayNoByReq,
    setDisplayNoByReq,
    preloadDisplayNo,
  } = useForemanDisplayNo();

  const {
    foreman,
    setForeman,
    objectType,
    level,
    system,
    zone,
    requestId,
    items,
    qtyDrafts,
    setQtyDrafts,
    qtyBusyMap,
    setRowBusy,
    requestDetails,
    canEditRequestItem,
    networkOnline,
    isDraftActive,
    localDraftBootstrapReady,
    draftSyncStatus,
    draftLastSyncAt,
    draftLastErrorAt,
    draftLastErrorStage,
    draftConflictType,
    draftRetryCount,
    pendingOperationsCount,
    draftSyncAttentionNeeded,
    availableDraftRecoveryActions,
    syncLocalDraftNow,
    retryDraftSyncNow,
    rehydrateDraftFromServer,
    restoreLocalDraftAfterConflict,
    discardLocalDraftNow,
    clearFailedQueueTailNow,
    discardWholeDraft,
    ensureRequestId,
    syncRequestHeaderMeta,
    appendLocalDraftRows,
    updateLocalDraftQty,
    removeLocalDraftRow,
    openRequestById,
    applyObjectTypeSelection,
    applyLevelSelection,
    applySystemSelection,
    applyZoneSelection,
    activeDraftOwnerId,
  } = useForemanDraftBoundary({
    isScreenFocused,
    preloadDisplayNo,
    setDisplayNoByReq,
  });

  const draftSyncUi = useMemo(
    () =>
      buildForemanSyncUiStatus({
        status: draftSyncStatus,
        conflictType: draftConflictType,
        pendingOperationsCount,
        lastSyncAt: draftLastSyncAt,
        lastErrorAt: draftLastErrorAt,
        attentionNeeded: draftSyncAttentionNeeded,
        lastErrorStage: draftLastErrorStage,
        retryCount: draftRetryCount,
      }),
    [
      draftConflictType,
      draftLastErrorAt,
      draftLastErrorStage,
      draftLastSyncAt,
      draftRetryCount,
      draftSyncAttentionNeeded,
      draftSyncStatus,
      pendingOperationsCount,
    ],
  );

  const { runRequestPdf } = useForemanPdf(gbusy);

  const {
    isFioConfirmVisible,
    setIsFioConfirmVisible,
    isFioLoading,
    setIsFioLoading,
    fioBootstrapScopeKey,
    setFioBootstrapScopeKey,
    foremanHistory,
    setForemanHistory,
    foremanMainTab,
    setForemanMainTab,
    headerAttention,
    setHeaderAttention,
    selectedObjectName,
    setSelectedObjectName,
  } = useForemanBaseUi();
  const {
    draftOpen,
    openDraft,
    closeDraft,
    busy,
    setBusy,
    draftDeleteBusy,
    setDraftDeleteBusy,
    draftSendBusy,
    setDraftSendBusy,
    calcVisible,
    catalogVisible,
    openCatalog,
    closeCatalog,
    workTypePickerVisible,
    closeWorkTypePicker,
    selectedWorkType,
    showCalcForWorkType,
    closeCalc,
    backToWorkTypePicker,
    openWorkTypePicker,
    screenLock,
  } = useForemanDraftUi();
  const {
    requestHistoryMode,
    selectedHistoryRequestId,
    showRequestHistoryDetails,
    backToRequestHistoryList,
    historyReopenBusyId,
    setHistoryReopenBusyId,
  } = useForemanHistoryUi();
  const headerRequirementsRef = useRef<ForemanHeaderRequirementResult>({
    missing: [],
    focusKey: null,
    message: "",
  });

  const {
    objOptions,
    lvlOptions,
    sysOptions,
    zoneOptions,
    objAllOptions,
    sysAllOptions,
    appOptions,
  } = useForemanDicts();

  const refreshForemanHistory = useCallback(async () => {
    setForemanHistory(await loadForemanHistory());
  }, [setForemanHistory]);

  const openHistoryPdfSafe = useCallback(async (reqId: string) => {
    await previewForemanHistoryPdf({
      requestId: reqId,
      authIdentityFullName: authIdentity.fullName,
      historyRequests,
      requestDetails,
      closeHistory,
      busy: gbusy,
      supabase,
      router,
    });
  }, [
    authIdentity.fullName,
    closeHistory,
    gbusy,
    historyRequests,
    requestDetails,
    router,
  ]);

  useEffect(() => {
    void refreshForemanHistory();
  }, [refreshForemanHistory]);

  const labelForApp = useCallback((code?: string | null) => {
    if (!code) return "";
    return appOptions.find((option) => option.code === code)?.label || code;
  }, [appOptions]);

  const showWebAlert = useCallback((message: string) => {
    if (Platform.OS !== "web") return false;
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(message);
      return true;
    }
    const alertFn = safeWebUi?.alert;
    if (typeof alertFn === "function") {
      try {
        alertFn.call(globalThis, message);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, [safeWebUi]);

  const showHint = useCallback((title: string, message: string) => {
    if (showWebAlert(`${title}\n\n${message}`)) return;
    Alert.alert(title, message);
  }, [showWebAlert]);

  const clearHeaderAttention = useCallback(() => {
    setHeaderAttention(null);
  }, [setHeaderAttention]);

  const activateHeaderAttention = useCallback((messageOverride?: string) => {
    const current = headerRequirementsRef.current;
    if (!current.missing.length) return false;

    setHeaderAttention((prev) => ({
      version: (prev?.version ?? 0) + 1,
      missingKeys: current.missing.map((item) => item.key),
      focusKey: current.focusKey,
      message: messageOverride || current.message,
    }));

    if (current.focusKey === "foreman") {
      setIsFioConfirmVisible(true);
    }

    return true;
  }, [setHeaderAttention, setIsFioConfirmVisible]);

  const ensureHeaderReady = useCallback(() => {
    const current = headerRequirementsRef.current;
    if (current.missing.length) {
      activateHeaderAttention(current.message);
      showHint(FOREMAN_TEXT.fillHeaderTitle, current.message);
      return false;
    }
    return true;
  }, [activateHeaderAttention, showHint]);

  const ensureEditableContext = useCallback((opts?: { draftMessage?: string; draftFirst?: boolean }) => {
    if (!localDraftBootstrapReady) return false;
    const checkDraft = () => {
      const canStartFreshDraft = !requestDetails && !ridStr(requestId);
      if (isDraftActive || canStartFreshDraft) return true;
      Alert.alert(FOREMAN_TEXT.readonlyTitle, opts?.draftMessage ?? FOREMAN_TEXT.readonlyHint);
      return false;
    };
    if (opts?.draftFirst) return checkDraft() && ensureHeaderReady();
    return ensureHeaderReady() && checkDraft();
  }, [ensureHeaderReady, isDraftActive, localDraftBootstrapReady, requestDetails, requestId]);

  const resolveStatusInfo = useCallback(
    (raw?: string | null) => resolveStatusHelper(raw, REQUEST_STATUS_STYLES),
    [],
  );

  const labelForRequest = useCallback((rid?: string | number | null) => {
    const key = ridStr(rid);
    if (!key) return "";
    if (requestId && key === ridStr(requestId)) {
      const current = String(requestDetails?.display_no ?? "").trim();
      if (current) return current;
    }
    const displayNo = displayNoByReq[key];
    return (displayNo && displayNo.trim()) || `#${shortId(key)}`;
  }, [displayNoByReq, requestDetails?.display_no, requestId]);

  const alertError = useCallback((error: unknown, fallback: string) => {
    Alert.alert(FOREMAN_TEXT.errorTitle, toErrorText(error, fallback));
  }, []);

  const finalizeAfterSubmit = useCallback(async () => {
    await saveForemanToHistory(foreman);
    await refreshForemanHistory();
  }, [foreman, refreshForemanHistory]);

  const ensureCanSubmitToDirector = useCallback(() => {
    if (!ensureEditableContext({ draftFirst: true, draftMessage: FOREMAN_TEXT.submitNeedDraftHint })) {
      return false;
    }
    if (!items.length) {
      Alert.alert(FOREMAN_TEXT.submitEmptyTitle, FOREMAN_TEXT.submitEmptyHint);
      return false;
    }
    return true;
  }, [ensureEditableContext, items.length]);

  const displayObjectName = selectedObjectName || getObjectDisplayName(objectType, objAllOptions);
  const objectName = displayObjectName;

  const contextResult = useMemo(
    () => resolveForemanContext(objectType || "", displayObjectName),
    [displayObjectName, objectType],
  );
  const { config: ctxConfig } = contextResult;

  const formUi = useMemo(
    () => adaptFormContext(contextResult, lvlOptions, zoneOptions),
    [contextResult, lvlOptions, zoneOptions],
  );

  const safeLevel = useMemo(
    () => (formUi.locator.isValidValue(level) ? level : ""),
    [formUi.locator, level],
  );
  const safeZone = useMemo(
    () => (formUi.zone.isValidValue(zone) ? zone : ""),
    [formUi.zone, zone],
  );

  const filteredSysOptions = useMemo(() => {
    if (!objectType) return sysOptions;
    const normalizedOptions = sysOptions.map((option) =>
      !option.code ? { ...option, name: "— Весь раздел —" } : option,
    );
    const priority = ctxConfig.systemPriorityTags.map((tag) => tag.toUpperCase());

    return [...normalizedOptions].sort((left, right) => {
      if (!left.code || !right.code) return 0;
      const leftName = (left.name || "").toUpperCase();
      const rightName = (right.name || "").toUpperCase();
      const score = (name: string) =>
        priority.reduce((acc, tag) => acc + (name.includes(tag) ? 1 : 0), 0);
      const diff = score(rightName) - score(leftName);
      if (diff !== 0) return diff;
      return 0;
    });
  }, [ctxConfig, objectType, sysOptions]);

  const safeSystem = useMemo(
    () => (filteredSysOptions.some((option) => option.code === system) ? system : ""),
    [filteredSysOptions, system],
  );

  const headerRequirements = useMemo(
    () =>
      resolveForemanHeaderRequirements({
        foreman,
        objectType,
        level: safeLevel,
        formUi,
      }),
    [foreman, formUi, objectType, safeLevel],
  );

  useEffect(() => {
    headerRequirementsRef.current = headerRequirements;
  }, [headerRequirements]);

  const levelName = useMemo(
    () => formUi.locator.options.find((option) => option.code === safeLevel)?.name || "",
    [formUi.locator.options, safeLevel],
  );
  const systemName = useMemo(
    () => filteredSysOptions.find((option) => option.code === safeSystem)?.name || "",
    [filteredSysOptions, safeSystem],
  );
  const zoneName = useMemo(
    () => formUi.zone.options.find((option) => option.code === safeZone)?.name || "",
    [formUi.zone.options, safeZone],
  );

  useEffect(() => {
    debugForemanLogLazy("[FOREMAN_MAIN_4_FIELDS]", () => ({
      objectName: displayObjectName,
      objectType,
      objectClass: contextResult?.config?.objectClass,
      field1_object: {
        label: "Объект / Блок",
        value: objectType,
        selectedName: getObjectDisplayName(objectType, objAllOptions),
        options: objOptions.map((option) => ({ code: option.code, name: option.name })),
      },
      field2_locator: {
        label: formUi?.locator?.label,
        rawValue: level,
        safeValue: formUi?.locator?.isValidValue(level) ? level : "",
        selectedName: formUi?.locator?.options?.find((option) => option.code === level)?.name || "",
        options: formUi?.locator?.options?.map((option) => ({
          code: option.code,
          name: option.name,
        })),
      },
      field3_system: {
        label: "Раздел / Вид работ",
        rawValue: system,
        safeValue: safeSystem,
        selectedName: filteredSysOptions.find((option) => option.code === safeSystem)?.name || "",
        options: filteredSysOptions.map((option) => ({ code: option.code, name: option.name })),
      },
      field4_zone: {
        label: formUi?.zone?.label,
        rawValue: zone,
        safeValue: formUi?.zone?.isValidValue(zone) ? zone : "",
        selectedName: formUi?.zone?.options?.find((option) => option.code === zone)?.name || "",
        options: formUi?.zone?.options?.map((option) => ({ code: option.code, name: option.name })),
      },
    }));
  }, [
    contextResult,
    displayObjectName,
    filteredSysOptions,
    formUi,
    level,
    objAllOptions,
    objOptions,
    objectType,
    safeSystem,
    system,
    zone,
  ]);

  const scopeNote = useMemo(
    () => buildScopeNote(objectName, levelName, systemName, zoneName) || "—",
    [levelName, objectName, systemName, zoneName],
  );

  const canStartDraftFlow = localDraftBootstrapReady && (isDraftActive || (!requestDetails && !ridStr(requestId)));

  const actions = useForemanActions({
    requestId,
    scopeNote,
    isDraftActive,
    canEditRequestItem,
    setQtyDrafts,
    setRowBusy,
    items,
    qtyDrafts,
    ensureEditableContext,
    ensureCanSubmitToDirector,
    finalizeAfterSubmit,
    showHint,
    setBusy,
    alertError,
    appendLocalDraftRows,
    updateLocalDraftQty,
    removeLocalDraftRow,
    syncLocalDraftNow,
    webUi: safeWebUi,
  });

  const {
    commitCatalogToDraft,
    syncPendingQtyDrafts,
    submitToDirector,
    handleRemoveDraftRow,
    handleCalcAddToRequest,
  } = actions;

  const handleObjectChange = useCallback((code: string) => {
    const option = objAllOptions.find((item) => item.code === code);
    setSelectedObjectName(option?.name || "");
    applyObjectTypeSelection(code, option?.name ?? null);
  }, [applyObjectTypeSelection, objAllOptions, setSelectedObjectName]);

  const handleLevelChange = useCallback((code: string) => {
    const option = formUi.locator.options.find((item) => item.code === code);
    applyLevelSelection(code, option?.name ?? null);
  }, [applyLevelSelection, formUi.locator.options]);

  const handleSystemChange = useCallback((code: string) => {
    const option = sysAllOptions.find((item) => item.code === code);
    applySystemSelection(code, option?.name ?? null);
  }, [applySystemSelection, sysAllOptions]);

  const handleZoneChange = useCallback((code: string) => {
    const option = formUi.zone.options.find((item) => item.code === code);
    applyZoneSelection(code, option?.name ?? null);
  }, [applyZoneSelection, formUi.zone.options]);

  useEffect(() => {
    if (!objectType) return;
    if (level && !formUi.locator.isValidValue(level)) handleLevelChange("");
    if (system && !filteredSysOptions.some((option) => option.code === system)) handleSystemChange("");
    if (zone && !formUi.zone.isValidValue(zone)) handleZoneChange("");
  }, [
    filteredSysOptions,
    formUi,
    handleLevelChange,
    handleSystemChange,
    handleZoneChange,
    level,
    objectType,
    system,
    zone,
  ]);

  useEffect(() => {
    if (!headerAttention) return;

    const remaining = headerRequirements.missing.filter((item) =>
      headerAttention.missingKeys.includes(item.key),
    );
    if (!remaining.length) {
      setHeaderAttention(null);
      return;
    }

    const remainingKeys = remaining.map((item) => item.key);
    const sameKeys =
      remainingKeys.length === headerAttention.missingKeys.length &&
      remainingKeys.every((key, index) => key === headerAttention.missingKeys[index]);

    if (
      sameKeys &&
      remaining[0]?.focusKey === headerAttention.focusKey &&
      headerAttention.message === headerRequirements.message
    ) {
      return;
    }

    setHeaderAttention((prev) => ({
      version: prev && prev.focusKey !== remaining[0]?.focusKey ? prev.version + 1 : prev?.version ?? 1,
      missingKeys: remainingKeys,
      focusKey: remaining[0]?.focusKey ?? null,
      message: headerRequirements.message,
    }));
  }, [headerAttention, headerRequirements, setHeaderAttention]);

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

  useEffect(() => {
    let active = true;
    void (async () => {
      const authUserResult = await supabase.auth.getUser();
      const authUser = authUserResult.data.user ?? null;
      const nextIdentity = {
        fullName: String(authUser?.user_metadata?.full_name ?? "").trim(),
        email: String(authUser?.email ?? "").trim(),
        phone: String(authUser?.phone ?? authUser?.user_metadata?.phone ?? "").trim(),
      };
      if (active) {
        setAuthIdentity(nextIdentity);
      }
      const scopeKey = buildFioBootstrapScopeKey(authUserResult.data.user?.id);
      if (!active || fioBootstrapScopeKey === scopeKey) return;
      const sixAM = new Date();
      sixAM.setHours(6, 0, 0, 0);
      const {
        currentFio,
        history,
        lastConfirmIso,
      } = await loadStoredFioState({
        screen: "foreman",
        surface: "foreman_fio_confirm",
        keys: {
          currentKey: "foreman_fio",
          confirmKey: "foreman_confirm_ts",
          historyKey: "foreman_name_history_v1",
        },
      });
      const lastConfirm = lastConfirmIso ? new Date(lastConfirmIso) : null;
      if (!active) return;
      if (currentFio) setForeman(currentFio);
      setForemanHistory(history);
      if (!lastConfirm || Number.isNaN(lastConfirm.getTime()) || lastConfirm < sixAM) {
        setIsFioConfirmVisible(true);
      }
      setFioBootstrapScopeKey(scopeKey);
    })();
    return () => {
      active = false;
    };
  }, [
    fioBootstrapScopeKey,
    setFioBootstrapScopeKey,
    setForeman,
    setForemanHistory,
    setIsFioConfirmVisible,
  ]);

  const handleFioConfirm = useCallback(async (fio: string) => {
    setIsFioLoading(true);
    try {
      setForeman(fio);
      const nextHistory = await saveStoredFioState({
        screen: "foreman",
        surface: "foreman_fio_confirm",
        keys: {
          currentKey: "foreman_fio",
          confirmKey: "foreman_confirm_ts",
          historyKey: "foreman_name_history_v1",
        },
        fio,
        history: await loadForemanHistory(),
      });
      setForemanHistory(nextHistory);
      const authUserResult = await supabase.auth.getUser();
      setFioBootstrapScopeKey(buildFioBootstrapScopeKey(authUserResult.data.user?.id));
      setIsFioConfirmVisible(false);
    } finally {
      setIsFioLoading(false);
    }
  }, [
    setFioBootstrapScopeKey,
    setForeman,
    setForemanHistory,
    setIsFioConfirmVisible,
    setIsFioLoading,
  ]);

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

  const buildReqItemMetaLine = useCallback((item: ReqItemRow) => {
    return [
      `${item.qty ?? "-"} ${item.uom ?? ""}`.trim(),
      item.app_code ? labelForApp(item.app_code) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [labelForApp]);

  const renderReqItem: ListRenderItem<ReqItemRow> = useCallback(({ item }) =>
    React.createElement(ForemanReqItemRow, {
      item,
      busy,
      updating: !!qtyBusyMap[item.id],
      canEdit: canEditRequestItem(item),
      metaLine: buildReqItemMetaLine(item),
      onCancel: handleRemoveDraftRow,
      ui: UI,
      styles: s,
    }),
  [buildReqItemMetaLine, busy, canEditRequestItem, handleRemoveDraftRow, qtyBusyMap]);

  const currentDisplayLabel = useMemo(() => {
    if (requestDetails?.display_no) return requestDetails.display_no;
    if (requestId) return labelForRequest(requestId);
    return "Черновик";
  }, [labelForRequest, requestDetails?.display_no, requestId]);

  const currentRequestIsTerminal = Boolean(requestDetails?.status && !isDraftLikeStatus(requestDetails.status));
  const terminalReadOnlyDraftSurface = currentRequestIsTerminal && !isDraftActive;
  const activeDraftDisplayLabel = terminalReadOnlyDraftSurface
    ? "Новый черновик"
    : requestId || requestDetails?.display_no
      ? currentDisplayLabel
      : "Новый черновик";
  const draftSurfaceItems = terminalReadOnlyDraftSurface ? [] : items;
  const safeDraftSyncUi = terminalReadOnlyDraftSurface
    ? {
        label: "Local draft ready",
        detail: null,
        tone: "neutral" as const,
      }
    : draftSyncUi;
  const safeDraftRecoveryActions = terminalReadOnlyDraftSurface ? [] : availableDraftRecoveryActions;

  const headerIdentityPrimary = useMemo(() => {
    return (
      String(foreman || "").trim() ||
      authIdentity.fullName ||
      authIdentity.email ||
      authIdentity.phone ||
      "Прораб"
    );
  }, [authIdentity.email, authIdentity.fullName, authIdentity.phone, foreman]);

  const headerIdentitySecondary = useMemo(() => {
    const primary = headerIdentityPrimary.trim().toLowerCase();
    const candidates = [authIdentity.email, authIdentity.phone].map((value) => String(value || "").trim());
    return candidates.find((value) => value && value.toLowerCase() !== primary) || "";
  }, [authIdentity.email, authIdentity.phone, headerIdentityPrimary]);

  const {
    headerHeight,
    titleSize,
    headerShadow,
    onScroll,
    contentTopPad,
  } = useCollapsingHeader({
    headerMax: 84,
    headerMin: 64,
    contentTopOffset: 12,
  });

  const draftPdfBusy = useMemo(() => {
    const ridKey = ridStr(requestId);
    return gbusy.isBusy(`pdf:request:${ridKey || "draft"}`);
  }, [gbusy, requestId]);

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

  const {
    aiQuickVisible,
    aiQuickMode,
    aiQuickText,
    aiQuickLoading,
    aiQuickApplying,
    aiQuickError,
    aiQuickNotice,
    aiQuickPreview,
    aiQuickOutcomeType,
    aiQuickReviewGroups,
    aiQuickQuestions,
    aiQuickSessionHint,
    aiUnavailableReason,
    aiQuickDegradedMode,
    aiQuickCanApply,
    openAiQuick,
    closeAiQuick,
    handleAiQuickTextChange,
    handleAiQuickBackToCompose,
    handleAiQuickSelectCandidate,
    handleAiQuickParse,
    handleAiQuickApply,
  } = useForemanAiQuickFlow({
    headerRequirements,
    activateHeaderAttention,
    clearHeaderAttention,
    showHint,
    requestDetails,
    isDraftActive,
    scopeNote,
    itemsCount: items.length,
    appendLocalDraftRows,
    syncLocalDraftNow,
    activeDraftOwnerId,
    requestId,
    labelForRequest,
    currentDisplayLabel: activeDraftDisplayLabel,
    openDraft,
    networkOnline,
  });

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

  const screenTitle = useMemo(() => {
    if (foremanMainTab === "materials") return "Материалы";
    if (foremanMainTab === "subcontracts") return "Подряды";
    return "Заявка";
  }, [foremanMainTab]);
  const keyboardBehavior: "padding" | undefined = Platform.OS === "ios" ? "padding" : undefined;

  const materialsContentProps: ForemanMaterialsContentProps = {
    contentTopPad,
    onScroll,
    foreman,
    onOpenFioModal: openFioModal,
    objectType,
    objectDisplayName: displayObjectName,
    level: safeLevel,
    system: safeSystem,
    zone: safeZone,
    contextResult,
    formUi,
    objOptions,
    sysOptions: filteredSysOptions,
    onObjectChange: handleObjectChange,
    onLevelChange: handleLevelChange,
    onSystemChange: handleSystemChange,
    onZoneChange: handleZoneChange,
    ensureHeaderReady,
    isDraftActive,
    canStartDraftFlow,
    showHint,
    busy,
    onOpenCatalog: openCatalog,
    onCalcPress: handleCalcPress,
    onAiQuickPress: openAiQuick,
    onOpenDraft: openDraftFromCatalog,
    currentDisplayLabel: activeDraftDisplayLabel,
    itemsCount: draftSurfaceItems.length,
    draftSyncStatusLabel: safeDraftSyncUi.label,
    draftSyncStatusDetail: safeDraftSyncUi.detail,
    draftSyncStatusTone: safeDraftSyncUi.tone,
    draftSendBusy,
    headerAttention,
    onOpenRequestHistory: () => fetchHistory(foreman),
    onOpenSubcontractHistory: () => void fetchSubcontractHistory(),
    historyVisible,
    historyMode: requestHistoryMode,
    historySelectedRequestId: selectedHistoryRequestId,
    onHistoryShowDetails: (request) => showRequestHistoryDetails(request.id),
    onHistoryBackToList: backToRequestHistoryList,
    onHistoryResetView: backToRequestHistoryList,
    historyLoading,
    historyRequests,
    resolveStatusInfo,
    onHistorySelect: handleHistorySelect,
    onHistoryReopen: handleHistoryReopen,
    historyReopenBusyId,
    onOpenHistoryPdf: openHistoryPdfSafe,
    isHistoryPdfBusy: (key) => gbusy.isBusy(key),
    shortId,
    closeHistory,
    subcontractHistoryVisible,
    closeSubcontractHistory,
    subcontractHistoryLoading,
    subcontractHistory,
    catalogVisible,
    closeCatalog,
    rikQuickSearch,
    onCommitToDraft: commitCatalogToDraft,
    workTypePickerVisible,
    closeWorkTypePicker,
    onSelectWorkType: showCalcForWorkType,
    calcVisible,
    closeCalc,
    backToWorkTypePicker,
    selectedWorkType,
    onAddCalcToRequest: handleCalcAddToRequest,
    aiQuickVisible,
    aiQuickMode,
    closeAiQuick,
    aiQuickText,
    onAiQuickTextChange: handleAiQuickTextChange,
    onAiQuickParse: handleAiQuickParse,
    onAiQuickApply: handleAiQuickApply,
    onAiQuickBackToCompose: handleAiQuickBackToCompose,
    onAiQuickSelectCandidate: handleAiQuickSelectCandidate,
    aiQuickLoading,
    aiQuickApplying,
    aiQuickError,
    aiQuickNotice,
    aiQuickPreview,
    aiQuickOutcomeType,
    aiQuickReviewGroups,
    aiQuickQuestions,
    aiQuickSessionHint,
    aiUnavailableReason,
    aiQuickDegradedMode,
    aiQuickCanApply,
    onlineConfigured: isForemanQuickRequestConfigured(),
    draftOpen,
    closeDraft,
    objectName,
    levelName,
    systemName,
    zoneName,
    items: draftSurfaceItems,
    renderReqItem,
    screenLock,
    draftDeleteBusy,
    onDeleteDraft: handleCancelWholeDraft,
    onPdf,
    pdfBusy: draftPdfBusy,
    onSendDraft: handleSendDraftFromSheet,
    availableDraftRecoveryActions: safeDraftRecoveryActions,
    onRetryDraftSync: retryDraftSyncNow,
    onRehydrateDraftFromServer: rehydrateDraftFromServer,
    onRestoreLocalDraft: restoreLocalDraftAfterConflict,
    onDiscardLocalDraft: discardLocalDraftNow,
    onClearFailedQueueTail: clearFailedQueueTailNow,
    isFioConfirmVisible,
    handleFioConfirm,
    isFioLoading,
    foremanHistory,
    ui: UI,
    styles: s,
  };

  const subcontractTabProps: ForemanSubcontractTabProps = {
    contentTopPad,
    onScroll,
    dicts: {
      objOptions,
      lvlOptions,
      sysOptions,
    },
  };

  return {
    ui: UI,
    styles: s,
    keyboardBehavior,
    mainTab: foremanMainTab,
    screenTitle,
    headerHeight,
    titleSize,
    headerShadow,
    contentTopPad,
    openFioModal,
    headerIdentityPrimary,
    headerIdentitySecondary,
    openMaterialsTab,
    openSubcontractsTab,
    closeMainTab,
    materialsContentProps,
    subcontractTabProps,
  };
}
