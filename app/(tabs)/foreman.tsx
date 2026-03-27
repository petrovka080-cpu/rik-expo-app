// app/(tabs)/foreman.tsx

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Alert,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  Animated,
  ListRenderItem,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from "@react-navigation/native";
import ForemanReqItemRow from "../../src/screens/foreman/ForemanReqItemRow";
import ForemanMaterialsContent from "../../src/screens/foreman/ForemanMaterialsContent";
import ForemanSubcontractTab from "../../src/screens/foreman/ForemanSubcontractTab";
import RoleScreenLayout from "../../src/components/layout/RoleScreenLayout";
import { useForemanDicts } from "../../src/screens/foreman/useForemanDicts";
import { resolveForemanContext } from "../../src/screens/foreman/foreman.context.resolver";
import { adaptFormContext } from "../../src/screens/foreman/foreman.locator.adapter";
import { debugForemanLogLazy } from "../../src/screens/foreman/foreman.debug";
import {
  resolveForemanHeaderRequirements,
  type ForemanHeaderRequirementResult,
} from "../../src/screens/foreman/foreman.headerRequirements";
import { getObjectDisplayName } from "../../src/screens/foreman/foreman.options";
import { s } from "../../src/screens/foreman/foreman.styles";
import { FOREMAN_TEXT, REQUEST_STATUS_STYLES, UI } from "../../src/screens/foreman/foreman.ui";
import { useForemanSubcontractHistory } from "../../src/screens/foreman/hooks/useForemanSubcontractHistory";
import { useCollapsingHeader } from "../../src/screens/shared/useCollapsingHeader";
import { useGlobalBusy } from '../../src/ui/GlobalBusy';
import { supabase } from '../../src/lib/supabaseClient';
import {
  rikQuickSearch,
  type ReqItemRow,
  type ForemanRequestSummary,
} from '../../src/lib/catalog_api';
import { reopenRequestDraft } from "../../src/lib/api/request.repository";
import type { RefOption } from "../../src/screens/foreman/foreman.types";
import {
  loadForemanHistory,
  ridStr,
  saveForemanToHistory,
  shortId,
  toErrorText,
  buildScopeNote,
  resolveStatusInfo as resolveStatusHelper,
} from "../../src/screens/foreman/foreman.helpers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildPdfFileName } from "../../src/lib/documents/pdfDocument";
import {
  getPdfFlowErrorMessage,
} from "../../src/lib/documents/pdfDocumentActions";
import { generateRequestPdfDocument } from "../../src/lib/documents/pdfDocumentGenerators";
import { buildForemanSyncUiStatus } from "../../src/lib/offline/foremanSyncRuntime";
import { prepareAndPreviewGeneratedPdf } from "../../src/lib/pdf/pdf.runner";

import { useForemanHistory } from '../../src/screens/foreman/hooks/useForemanHistory';
import { useForemanDisplayNo } from '../../src/screens/foreman/hooks/useForemanDisplayNo';
import { useForemanDraftBoundary } from '../../src/screens/foreman/hooks/useForemanDraftBoundary';
import { useForemanPdf } from '../../src/screens/foreman/hooks/useForemanPdf';
import { useForemanActions } from '../../src/screens/foreman/hooks/useForemanActions';
import { isForemanQuickRequestConfigured } from "../../src/screens/foreman/foreman.ai";
import { useForemanBaseUi } from "../../src/screens/foreman/hooks/useForemanBaseUi";
import { useForemanDraftUi } from "../../src/screens/foreman/hooks/useForemanDraftUi";
import { useForemanHistoryUi } from "../../src/screens/foreman/hooks/useForemanHistoryUi";
import { useForemanAiQuickFlow } from "../../src/screens/foreman/hooks/useForemanAiQuickFlow";

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

function buildFioBootstrapScopeKey(userId?: string | null, date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${userId || "anonymous"}:${year}-${month}-${day}`;
}

declare global {
  var webUi: WebUiApi;
}

export default function ForemanScreen() {
  const gbusy = useGlobalBusy();
  const router = useRouter();
  const isScreenFocused = useIsFocused();
  // Safe global access for web-specific UI bridge
  const safeWebUi = typeof webUi !== 'undefined' ? webUi : undefined;

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
      draftLastErrorAt,
      draftLastErrorStage,
      draftConflictType,
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
    objOptions, lvlOptions, sysOptions, zoneOptions,
    objAllOptions, sysAllOptions,
    appOptions,
  } = useForemanDicts();

  const refreshForemanHistory = useCallback(async () => {
    setForemanHistory(await loadForemanHistory());
  }, [setForemanHistory]);

  useEffect(() => { refreshForemanHistory(); }, [refreshForemanHistory]);

  const labelForApp = useCallback((code?: string | null) => {
    if (!code) return '';
    return appOptions.find((o) => o.code === code)?.label || code;
  }, [appOptions]);

  const showWebAlert = useCallback((message: string) => {
    if (Platform.OS !== 'web') return false;
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message);
      return true;
    }
    const alertFn = safeWebUi?.alert;
    if (typeof alertFn === 'function') {
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

  const resolveStatusInfo = useCallback((raw?: string | null) => resolveStatusHelper(raw, REQUEST_STATUS_STYLES), []);

  const labelForRequest = useCallback((rid?: string | number | null) => {
    const key = ridStr(rid);
    if (!key) return '';
    if (requestId && key === ridStr(requestId)) {
      const current = String(requestDetails?.display_no ?? '').trim();
      if (current) return current;
    }
    const dn = displayNoByReq[key];
    return (dn && dn.trim()) || `#${shortId(key)}`;
  }, [displayNoByReq, requestDetails?.display_no, requestId]);

  const alertError = useCallback((error: unknown, fallback: string) => {
    Alert.alert(FOREMAN_TEXT.errorTitle, toErrorText(error, fallback));
  }, []);

  const finalizeAfterSubmit = useCallback(async () => {
    await saveForemanToHistory(foreman);
    await refreshForemanHistory();
  }, [foreman, refreshForemanHistory]);

  const ensureCanSubmitToDirector = useCallback(() => {
    if (!ensureEditableContext({ draftFirst: true, draftMessage: FOREMAN_TEXT.submitNeedDraftHint })) return false;
    if (!items.length) { Alert.alert(FOREMAN_TEXT.submitEmptyTitle, FOREMAN_TEXT.submitEmptyHint); return false; }
    return true;
  }, [ensureEditableContext, items.length]);

  const displayObjectName = selectedObjectName || getObjectDisplayName(objectType, objAllOptions);
  const objectName = displayObjectName; // Alias for backward compatibility

  // --- Construction Context Engine (CCE) v2.0 Integration ---
  const contextResult = useMemo(() => {
    return resolveForemanContext(objectType || '', displayObjectName);
  }, [objectType, displayObjectName]);

  const { config: ctxConfig } = contextResult;

  const formUi = useMemo(() => {
    return adaptFormContext(contextResult, lvlOptions, zoneOptions);
  }, [contextResult, lvlOptions, zoneOptions]);

  // Synchronous UI State Sanitization
  const safeLevel = useMemo(() => formUi.locator.isValidValue(level) ? level : '', [formUi.locator, level]);
  const safeZone = useMemo(() => formUi.zone.isValidValue(zone) ? zone : '', [formUi.zone, zone]);


  const filteredSysOptions = useMemo(() => {
    if (!objectType) return sysOptions;
    const items = sysOptions.map(o => !o.code ? { ...o, name: "— Весь раздел —" } : o);
    const priority = ctxConfig.systemPriorityTags.map((t) => t.toUpperCase());

    return [...items].sort((a, b) => {
      if (!a.code || !b.code) return 0;
      const aName = (a.name || "").toUpperCase();
      const bName = (b.name || "").toUpperCase();
      const score = (name: string) => priority.reduce((acc, tag) => acc + (name.includes(tag) ? 1 : 0), 0);
      const diff = score(bName) - score(aName);
      if (diff !== 0) return diff;
      return 0;
    });
  }, [sysOptions, objectType, ctxConfig]);
  const safeSystem = useMemo(() => filteredSysOptions.some((o) => o.code === system) ? system : "", [filteredSysOptions, system]);

  const headerRequirements = useMemo(
    () =>
      resolveForemanHeaderRequirements({
        foreman,
        objectType,
        level: safeLevel,
        formUi,
      }),
    [foreman, objectType, safeLevel, formUi],
  );

  useEffect(() => {
    headerRequirementsRef.current = headerRequirements;
  }, [headerRequirements]);

  // --- SCOPE NOTE: Unified display string using SAFE values ---
  const levelName = useMemo(() => formUi.locator.options.find(o => o.code === safeLevel)?.name || '', [formUi.locator.options, safeLevel]);
  const systemName = useMemo(() => filteredSysOptions.find(o => o.code === safeSystem)?.name || '', [filteredSysOptions, safeSystem]);
  const zoneName = useMemo(() => formUi.zone.options.find(o => o.code === safeZone)?.name || '', [formUi.zone.options, safeZone]);

  useEffect(() => {
    debugForemanLogLazy("[FOREMAN_MAIN_4_FIELDS]", () => ({
      objectName: displayObjectName,
      objectType,
      objectClass: contextResult?.config?.objectClass,

      field1_object: {
        label: 'Объект / Блок',
        value: objectType,
        selectedName: getObjectDisplayName(objectType, objAllOptions),
        options: objOptions.map(o => ({ code: o.code, name: o.name })),
      },

      field2_locator: {
        label: formUi?.locator?.label,
        rawValue: level,
        safeValue: formUi?.locator?.isValidValue(level) ? level : '',
        selectedName: formUi?.locator?.options?.find(o => o.code === level)?.name || '',
        options: formUi?.locator?.options?.map(o => ({ code: o.code, name: o.name })),
      },

      field3_system: {
        label: 'Раздел / Вид работ',
        rawValue: system,
        safeValue: safeSystem,
        selectedName: filteredSysOptions.find(o => o.code === safeSystem)?.name || '',
        options: filteredSysOptions.map(o => ({ code: o.code, name: o.name })),
      },

      field4_zone: {
        label: formUi?.zone?.label,
        rawValue: zone,
        safeValue: formUi?.zone?.isValidValue(zone) ? zone : '',
        selectedName: formUi?.zone?.options?.find(o => o.code === zone)?.name || '',
        options: formUi?.zone?.options?.map(o => ({ code: o.code, name: o.name })),
      },
    }));
  }, [displayObjectName, objectType, contextResult, formUi, level, system, zone, filteredSysOptions, objOptions, objAllOptions, safeLevel, safeSystem, safeZone]);
  const scopeNote = useMemo(() => buildScopeNote(objectName, levelName, systemName, zoneName) || '—', [objectName, levelName, systemName, zoneName]);

  const canStartDraftFlow = localDraftBootstrapReady && (isDraftActive || (!requestDetails && !ridStr(requestId)));

  const actions = useForemanActions({
    requestId, scopeNote,
    isDraftActive, canEditRequestItem, setQtyDrafts, setRowBusy, items, qtyDrafts,
    ensureEditableContext, ensureCanSubmitToDirector, finalizeAfterSubmit,
    showHint, setBusy, alertError,
    appendLocalDraftRows,
    updateLocalDraftQty,
    removeLocalDraftRow,
    syncLocalDraftNow,
    webUi: safeWebUi,
  });

  const {
    commitCatalogToDraft, syncPendingQtyDrafts,
    submitToDirector, handleRemoveDraftRow, handleCalcAddToRequest
  } = actions;

  const handleObjectChange = useCallback((code: string) => {
    const opt = objAllOptions.find(o => o.code === code);
    setSelectedObjectName(opt?.name || ''); // Immediate sync for CCE
    applyObjectTypeSelection(code, opt?.name ?? null);
  }, [applyObjectTypeSelection, objAllOptions, setSelectedObjectName]);

  const handleLevelChange = useCallback((code: string) => {
    const opt = formUi.locator.options.find(o => o.code === code);
    applyLevelSelection(code, opt?.name ?? null);
  }, [applyLevelSelection, formUi.locator.options]);

  const handleSystemChange = useCallback((code: string) => {
    const opt = sysAllOptions.find(o => o.code === code);
    applySystemSelection(code, opt?.name ?? null);
  }, [applySystemSelection, sysAllOptions]);

  const handleZoneChange = useCallback((code: string) => {
    const opt = formUi.zone.options.find(o => o.code === code);
    applyZoneSelection(code, opt?.name ?? null);
  }, [applyZoneSelection, formUi.zone.options]);

  // ATOMIC CONTEXT RESET: Level and Zone must follow formUi semantic rules
  useEffect(() => {
    if (objectType) {
      if (level && !formUi.locator.isValidValue(level)) handleLevelChange("");
      if (system && !filteredSysOptions.some((o) => o.code === system)) handleSystemChange("");
      if (zone && !formUi.zone.isValidValue(zone)) handleZoneChange("");
    }
  }, [objectType, level, system, zone, formUi, filteredSysOptions, handleLevelChange, handleSystemChange, handleZoneChange]);

  useEffect(() => {
    if (!headerAttention) return;

    const remaining = headerRequirements.missing.filter((item) => headerAttention.missingKeys.includes(item.key));
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

  const handleHistorySelect = useCallback((request: ForemanRequestSummary) => {
    openRequestById(request.id);
    closeHistory();
    openDraft();
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
      openRequestById(requestKey);
      closeHistory();
      openDraft();
    } catch (error) {
      alertError(error, "Не удалось вернуть черновик");
    } finally {
      setHistoryReopenBusyId(null);
    }
  }, [alertError, closeHistory, openDraft, openRequestById, setHistoryReopenBusyId]);

  const openHistoryPdf = useCallback(async (reqId: string) => {
    const rid = ridStr(reqId);
    if (!rid) return;
    try {
      const template = await generateRequestPdfDocument({
        requestId: rid,
        originModule: "foreman",
      });
      await prepareAndPreviewGeneratedPdf({
        busy: gbusy,
        supabase,
        key: `pdf:history:${rid}`,
        label: "Готовлю PDF...",
        descriptor: {
          ...template,
          title: `Заявка ${rid}`,
          fileName: buildPdfFileName({
            documentType: "request",
            title: rid,
            entityId: rid,
          }),
        },
        router,
      });
    } catch (error) {
      Alert.alert("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
    }
  }, [gbusy, router]);

  useEffect(() => {
    let active = true;
    (async () => {
      const authUserResult = await supabase.auth.getUser();
      const scopeKey = buildFioBootstrapScopeKey(authUserResult.data.user?.id);
      if (!active || fioBootstrapScopeKey === scopeKey) return;
      const sixAM = new Date();
      sixAM.setHours(6, 0, 0, 0);
      const saved = await AsyncStorage.getItem("foreman_fio");
      const lastConfirmStr = await AsyncStorage.getItem("foreman_confirm_ts");
      const lastConfirm = lastConfirmStr ? new Date(lastConfirmStr) : null;
      if (!active) return;
      if (saved) setForeman(saved);
      if (!lastConfirm || Number.isNaN(lastConfirm.getTime()) || lastConfirm < sixAM) {
        setIsFioConfirmVisible(true);
      }
      setFioBootstrapScopeKey(scopeKey);
    })();
    return () => { active = false; };
  }, [fioBootstrapScopeKey, setFioBootstrapScopeKey, setForeman, setIsFioConfirmVisible]);

  const handleFioConfirm = useCallback(async (fio: string) => {
    setIsFioLoading(true);
    try {
      setForeman(fio);
      const now = new Date().toISOString();
      await Promise.all([
        AsyncStorage.setItem("foreman_fio", fio),
        AsyncStorage.setItem("foreman_confirm_ts", now),
        saveForemanToHistory(fio)
      ]);
      setForemanHistory(await loadForemanHistory());
      const authUserResult = await supabase.auth.getUser();
      setFioBootstrapScopeKey(buildFioBootstrapScopeKey(authUserResult.data.user?.id));
      setIsFioConfirmVisible(false);
    } finally { setIsFioLoading(false); }
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
    await runRequestPdf("preview", await ensureRequestId(), requestDetails, syncRequestHeaderMeta);
  }, [ensureHeaderReady, ensureRequestId, requestDetails, runRequestPdf, syncPendingQtyDrafts, syncRequestHeaderMeta]);

  const buildReqItemMetaLine = useCallback((item: ReqItemRow) => {
    return [`${item.qty ?? '-'} ${item.uom ?? ''}`.trim(), item.app_code ? labelForApp(item.app_code) : null].filter(Boolean).join(' · ');
  }, [labelForApp]);

  const renderReqItem: ListRenderItem<ReqItemRow> = useCallback(({ item }) => (
    <ForemanReqItemRow
      item={item} busy={busy} updating={!!qtyBusyMap[item.id]}
      canEdit={canEditRequestItem(item)}
      metaLine={buildReqItemMetaLine(item)}
      onCancel={handleRemoveDraftRow}
      ui={UI} styles={s}
    />
  ), [busy, qtyBusyMap, canEditRequestItem, buildReqItemMetaLine, handleRemoveDraftRow]);

  // ---------- UI ----------

  const currentDisplayLabel = useMemo(() => {
    if (requestDetails?.display_no) return requestDetails.display_no;
    if (requestId) return labelForRequest(requestId);
    return 'будет создана автоматически';
  }, [labelForRequest, requestDetails?.display_no, requestId]);

  const HEADER_MAX = 84;
  const HEADER_MIN = 64;
  const {
    headerHeight,
    titleSize,
    headerShadow,
    onScroll,
    contentTopPad,
  } = useCollapsingHeader({
    headerMax: HEADER_MAX,
    headerMin: HEADER_MIN,
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
    } catch (e: unknown) {
      alertError(e, FOREMAN_TEXT.deleteDraftError);
    } finally {
      setDraftDeleteBusy(false);
    }
  }, [alertError, closeDraft, discardWholeDraft, setDraftDeleteBusy]);

  const handleSendDraftFromSheet = useCallback(async () => {
    setDraftSendBusy(true);
    try {
      await submitToDirector();
      closeDraft();
    } catch (e: unknown) {
      alertError(e, FOREMAN_TEXT.sendToDirectorError);
    } finally {
      setDraftSendBusy(false);
    }
  }, [submitToDirector, alertError, closeDraft, setDraftSendBusy]);

  const handleCalcPress = useCallback(() => {
    if (busy) return;
    if (!ensureEditableContext()) return;
    openWorkTypePicker();
  }, [busy, ensureEditableContext, openWorkTypePicker]);

  const {
    aiQuickVisible,
    aiQuickText,
    aiQuickLoading,
    aiQuickError,
    aiQuickNotice,
    aiQuickPreview,
    aiQuickOutcomeType,
    aiQuickCandidateGroups,
    aiQuickQuestions,
    aiQuickSessionHint,
    aiUnavailableReason,
    aiQuickDegradedMode,
    openAiQuick,
    closeAiQuick,
    handleAiQuickTextChange,
    handleAiQuickSubmit,
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
    requestId,
    labelForRequest,
    currentDisplayLabel,
    openDraft,
    networkOnline,
  });

  const openDraftFromCatalog = useCallback(() => {
    closeCatalog();
    openDraft();
  }, [closeCatalog, openDraft]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <RoleScreenLayout style={[s.container, { backgroundColor: UI.bg }]}>
        <View pointerEvents="none" style={s.bgGlow} />
        <Animated.View
          style={[
            s.cHeader,
            {
              height: headerHeight,
              shadowOpacity: headerShadow,
              elevation: 8,
            },
          ]}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Animated.Text
                  style={[s.cTitle, { fontSize: titleSize, color: UI.text }]}
                  numberOfLines={1}
                >
                  {foremanMainTab === 'materials' ? 'Материалы' : foremanMainTab === 'subcontracts' ? 'Подряды' : 'Заявка'}
                </Animated.Text>
                {!!foreman && (
                  <Pressable onPress={() => setIsFioConfirmVisible(true)}>
                    <Text style={{ fontSize: 13, color: UI.sub, fontWeight: "500", marginTop: 4 }}>
                      👤 {foreman}
                    </Text>
                  </Pressable>
                )}
              </View>
              {foremanMainTab ? (
                <Pressable
                  onPress={() => setForemanMainTab(null)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.14)',
                  }}
                >
                  <Text style={{ color: UI.text, fontWeight: '600', fontSize: 20, lineHeight: 22 }}>×</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Animated.View>

        {!foremanMainTab ? (
          <View
            style={{
              flex: 1,
              paddingTop: contentTopPad + 56,
              paddingHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 14,
            }}
          >
            <Pressable
              onPress={() => setForemanMainTab('materials')}
              style={{
                width: '100%',
                maxWidth: 370,
                height: 72,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.14)',
                backgroundColor: '#121A2A',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: UI.text, fontWeight: '600', fontSize: 22, lineHeight: 28 }}>[ Материалы ]</Text>
            </Pressable>

            <Pressable
              onPress={() => setForemanMainTab('subcontracts')}
              style={{
                width: '100%',
                maxWidth: 370,
                height: 72,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.14)',
                backgroundColor: '#121A2A',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: UI.text, fontWeight: '600', fontSize: 22, lineHeight: 28 }}>[ Подряды ]</Text>
            </Pressable>
          </View>
        ) : null}

        {foremanMainTab === 'subcontracts' ? (
          <ForemanSubcontractTab
            contentTopPad={contentTopPad}
            onScroll={onScroll}
            dicts={{ objOptions, lvlOptions, sysOptions }}
          />
        ) : null}

        {foremanMainTab === 'materials' ? (
          <ForemanMaterialsContent
            contentTopPad={contentTopPad}
            onScroll={onScroll}
            foreman={foreman}
            onOpenFioModal={() => setIsFioConfirmVisible(true)}
            objectType={objectType}
            objectDisplayName={displayObjectName}
            level={safeLevel}
            system={safeSystem}
            zone={safeZone}
            contextResult={contextResult}
            formUi={formUi}
            objOptions={objOptions}
            sysOptions={filteredSysOptions}
            onObjectChange={handleObjectChange}
            onLevelChange={handleLevelChange}
            onSystemChange={handleSystemChange}
            onZoneChange={handleZoneChange}
            ensureHeaderReady={ensureHeaderReady}
            isDraftActive={isDraftActive}
            canStartDraftFlow={canStartDraftFlow}
            showHint={showHint}
            busy={busy}
            onOpenCatalog={openCatalog}
            onCalcPress={handleCalcPress}
            onAiQuickPress={openAiQuick}
            onOpenDraft={openDraftFromCatalog}
            currentDisplayLabel={currentDisplayLabel}
            itemsCount={items.length}
            draftSyncStatusLabel={draftSyncUi.label}
            draftSyncStatusDetail={draftSyncUi.detail}
            draftSyncStatusTone={draftSyncUi.tone}
            headerAttention={headerAttention}
            onOpenRequestHistory={() => fetchHistory(foreman)}
            onOpenSubcontractHistory={() => void fetchSubcontractHistory()}
            historyVisible={historyVisible}
            historyMode={requestHistoryMode}
            historySelectedRequestId={selectedHistoryRequestId}
            onHistoryShowDetails={(request) => showRequestHistoryDetails(request.id)}
            onHistoryBackToList={backToRequestHistoryList}
            onHistoryResetView={backToRequestHistoryList}
            historyLoading={historyLoading}
            historyRequests={historyRequests}
            resolveStatusInfo={resolveStatusInfo}
            onHistorySelect={handleHistorySelect}
            onHistoryReopen={handleHistoryReopen}
            historyReopenBusyId={historyReopenBusyId}
            onOpenHistoryPdf={openHistoryPdf}
            isHistoryPdfBusy={(key) => gbusy.isBusy(key)}
            shortId={shortId}
            closeHistory={closeHistory}
            subcontractHistoryVisible={subcontractHistoryVisible}
            closeSubcontractHistory={closeSubcontractHistory}
            subcontractHistoryLoading={subcontractHistoryLoading}
            subcontractHistory={subcontractHistory}
            catalogVisible={catalogVisible}
            closeCatalog={closeCatalog}
            rikQuickSearch={rikQuickSearch}
            onCommitToDraft={commitCatalogToDraft}
            workTypePickerVisible={workTypePickerVisible}
            closeWorkTypePicker={closeWorkTypePicker}
            onSelectWorkType={showCalcForWorkType}
            calcVisible={calcVisible}
            closeCalc={closeCalc}
            backToWorkTypePicker={backToWorkTypePicker}
            selectedWorkType={selectedWorkType}
            onAddCalcToRequest={handleCalcAddToRequest}
            aiQuickVisible={aiQuickVisible}
            closeAiQuick={closeAiQuick}
            aiQuickText={aiQuickText}
            onAiQuickTextChange={handleAiQuickTextChange}
            onAiQuickSubmit={handleAiQuickSubmit}
            aiQuickLoading={aiQuickLoading}
            aiQuickError={aiQuickError}
            aiQuickNotice={aiQuickNotice}
            aiQuickPreview={aiQuickPreview}
            aiQuickOutcomeType={aiQuickOutcomeType}
            aiQuickCandidateGroups={aiQuickCandidateGroups}
            aiQuickQuestions={aiQuickQuestions}
            aiQuickSessionHint={aiQuickSessionHint}
            aiUnavailableReason={aiUnavailableReason}
            aiQuickDegradedMode={aiQuickDegradedMode}
            onlineConfigured={isForemanQuickRequestConfigured()}
            draftOpen={draftOpen}
            closeDraft={closeDraft}
            objectName={objectName}
            levelName={levelName}
            systemName={systemName}
            zoneName={zoneName}
            items={items}
            renderReqItem={renderReqItem}
            screenLock={screenLock}
            draftDeleteBusy={draftDeleteBusy}
            draftSendBusy={draftSendBusy}
            onDeleteDraft={handleCancelWholeDraft}
            onPdf={onPdf}
            pdfBusy={draftPdfBusy}
            onSendDraft={handleSendDraftFromSheet}
            availableDraftRecoveryActions={availableDraftRecoveryActions}
            onRetryDraftSync={retryDraftSyncNow}
            onRehydrateDraftFromServer={rehydrateDraftFromServer}
            onRestoreLocalDraft={restoreLocalDraftAfterConflict}
            onDiscardLocalDraft={discardLocalDraftNow}
            onClearFailedQueueTail={clearFailedQueueTailNow}
            isFioConfirmVisible={isFioConfirmVisible}
            handleFioConfirm={handleFioConfirm}
            isFioLoading={isFioLoading}
            foremanHistory={foremanHistory}
            ui={UI}
            styles={s}
          />
        ) : null}
      </RoleScreenLayout>
    </KeyboardAvoidingView>
  );
}
