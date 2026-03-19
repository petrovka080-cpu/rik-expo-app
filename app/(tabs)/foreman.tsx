// app/(tabs)/foreman.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Alert,
  AppState,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  Animated,
  ListRenderItem,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from "@react-navigation/native";
import CalcModal from "../../src/components/foreman/CalcModal";
import WorkTypePicker from "../../src/components/foreman/WorkTypePicker";
import CatalogModal from '../../src/components/foreman/CatalogModal';
import ForemanReqItemRow from "../../src/screens/foreman/ForemanReqItemRow";
import ForemanHistoryBar from "../../src/screens/foreman/ForemanHistoryBar";
import ForemanHistoryModal from "../../src/screens/foreman/ForemanHistoryModal";
import ForemanSubcontractHistoryModal from "../../src/screens/foreman/ForemanSubcontractHistoryModal";
import ForemanDraftModal from "../../src/screens/foreman/ForemanDraftModal";
import ForemanAiQuickModal from "../../src/screens/foreman/ForemanAiQuickModal";
import ForemanEditorSection from "../../src/screens/foreman/ForemanEditorSection";
import ForemanSubcontractTab from "../../src/screens/foreman/ForemanSubcontractTab";
import WarehouseFioModal from "../../src/screens/warehouse/components/WarehouseFioModal";
import RoleScreenLayout from "../../src/components/layout/RoleScreenLayout";
import { useForemanDicts } from "../../src/screens/foreman/useForemanDicts";
import { resolveForemanContext } from "../../src/screens/foreman/foreman.context.resolver";
import { adaptFormContext } from "../../src/screens/foreman/foreman.locator.adapter";
import { debugForemanLogLazy } from "../../src/screens/foreman/foreman.debug";
import {
  resolveForemanHeaderRequirements,
  type ForemanHeaderAttentionState,
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
  fetchRequestDetails,
  getLocalDraftId,
  clearLocalDraftId,
  clearCachedDraftRequestId,
  updateRequestMeta,
  type ReqItemRow,
  type RequestDetails,
} from '../../src/lib/catalog_api';
import type { RequestDraftMeta, RefOption } from "../../src/screens/foreman/foreman.types";
import {
  isDraftLikeStatus,
  loadForemanHistory,
  ridStr,
  saveForemanToHistory,
  shortId,
  toErrorText,
  buildScopeNote,
  formatQtyInput,
  resolveStatusInfo as resolveStatusHelper,
} from "../../src/screens/foreman/foreman.helpers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildPdfFileName } from "../../src/lib/documents/pdfDocument";
import {
  getPdfFlowErrorMessage,
  preparePdfDocument,
  previewPdfDocument,
} from "../../src/lib/documents/pdfDocumentActions";
import { generateRequestPdfDocument } from "../../src/lib/documents/pdfDocumentGenerators";

import { useForemanHeader } from '../../src/screens/foreman/hooks/useForemanHeader';
import { useForemanHistory } from '../../src/screens/foreman/hooks/useForemanHistory';
import { useForemanDisplayNo } from '../../src/screens/foreman/hooks/useForemanDisplayNo';
import { useForemanItemsState } from '../../src/screens/foreman/hooks/useForemanItemsState';
import { useForemanPdf } from '../../src/screens/foreman/hooks/useForemanPdf';
import { useForemanActions } from '../../src/screens/foreman/hooks/useForemanActions';
import {
  isForemanQuickRequestConfigured,
  resolveForemanQuickRequest,
  type ForemanAiQuickItem,
} from "../../src/screens/foreman/foreman.ai";
import {
  FOREMAN_LOCAL_ONLY_REQUEST_ID,
  appendRowsToForemanLocalDraft,
  buildForemanLocalDraftSnapshot,
  clearForemanLocalDraftSnapshot,
  hasForemanLocalDraftContent,
  loadForemanLocalDraftSnapshot,
  markForemanLocalDraftSubmitRequested,
  areForemanLocalDraftSnapshotsEqual,
  removeForemanLocalDraftItem,
  saveForemanLocalDraftSnapshot,
  snapshotToReqItems,
  syncForemanLocalDraftSnapshot,
  updateForemanLocalDraftItemQty,
  type ForemanDraftAppendInput,
  type ForemanLocalDraftSnapshot,
} from "../../src/screens/foreman/foreman.localDraft";

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
    foreman, setForeman,
    comment, setComment,
    objectType, setObjectType,
    level, setLevel,
    system, setSystem,
    zone, setZone,
    syncHeaderFromDetails,
    resetHeader,
  } = useForemanHeader();

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
    requestId,
    setRequestId,
    items,
    setItems,
    qtyDrafts,
    setQtyDrafts,
    qtyBusyMap,
    setQtyBusyMap,
    loadItems,
    setRowBusy,
    hydrateLocalDraft,
    ensureAndGetId,
  } = useForemanItemsState(formatQtyInput);

  const { runRequestPdf } = useForemanPdf(gbusy);
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);

  const [isFioConfirmVisible, setIsFioConfirmVisible] = useState(false);
  const [isFioLoading, setIsFioLoading] = useState(false);
  const [foremanHistory, setForemanHistory] = useState<string[]>([]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [foremanMainTab, setForemanMainTab] = useState<'materials' | 'subcontracts' | null>(null);
  const [draftDeleteBusy, setDraftDeleteBusy] = useState(false);
  const [draftSendBusy, setDraftSendBusy] = useState(false);
  const [calcVisible, setCalcVisible] = useState(false);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [workTypePickerVisible, setWorkTypePickerVisible] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState<{ code: string; name: string } | null>(null);
  const [aiQuickVisible, setAiQuickVisible] = useState(false);
  const [aiQuickText, setAiQuickText] = useState("");
  const [aiQuickLoading, setAiQuickLoading] = useState(false);
  const [aiQuickError, setAiQuickError] = useState("");
  const [aiQuickNotice, setAiQuickNotice] = useState("");
  const [aiQuickPreview, setAiQuickPreview] = useState<ForemanAiQuickItem[]>([]);
  const [headerAttention, setHeaderAttention] = useState<ForemanHeaderAttentionState | null>(null);
  const [localDraftBootstrapReady, setLocalDraftBootstrapReady] = useState(false);
  const [hasRestoredLocalDraft, setHasRestoredLocalDraft] = useState(false);
  const [, bumpLocalDraftRevision] = useState(0);
  const headerRequirementsRef = useRef<ForemanHeaderRequirementResult>({
    missing: [],
    focusKey: null,
    message: "",
  });
  const localDraftSnapshotRef = useRef<ForemanLocalDraftSnapshot | null>(null);
  const draftSyncInFlightRef = useRef<Promise<void> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const syncLocalDraftNowRef = useRef<((options?: { submit?: boolean; context?: string }) => Promise<{
    requestId?: string | null;
    submitted?: unknown | null;
  } | void>) | null>(null);
  const wasScreenFocusedRef = useRef(false);

  const {
    objOptions, lvlOptions, sysOptions, zoneOptions,
    objAllOptions, sysAllOptions,
    appOptions,
  } = useForemanDicts();

  const refreshForemanHistory = useCallback(async () => {
    setForemanHistory(await loadForemanHistory());
  }, []);

  useEffect(() => { refreshForemanHistory(); }, [refreshForemanHistory]);

  const labelForApp = useCallback((code?: string | null) => {
    if (!code) return '';
    return appOptions.find((o) => o.code === code)?.label || code;
  }, [appOptions]);

  const persistLocalDraftSnapshot = useCallback((snapshot: ForemanLocalDraftSnapshot | null) => {
    if (areForemanLocalDraftSnapshotsEqual(localDraftSnapshotRef.current, snapshot, { ignoreUpdatedAt: true })) {
      return;
    }
    localDraftSnapshotRef.current = snapshot;
    bumpLocalDraftRevision((prev) => prev + 1);
    void (snapshot && hasForemanLocalDraftContent(snapshot)
      ? saveForemanLocalDraftSnapshot(snapshot)
      : clearForemanLocalDraftSnapshot());
  }, []);

  const getActiveLocalDraftSnapshot = useCallback((targetRequestId?: string | null) => {
    const snapshot = localDraftSnapshotRef.current;
    if (!snapshot || !hasForemanLocalDraftContent(snapshot)) return null;

    const currentRequestId = ridStr(targetRequestId ?? requestId);
    const snapshotRequestId = ridStr(snapshot.requestId);

    if (!snapshotRequestId) {
      return currentRequestId ? null : snapshot;
    }

    return snapshotRequestId === currentRequestId ? snapshot : null;
  }, [requestId]);

  const applyLocalDraftSnapshotToUi = useCallback((snapshot: ForemanLocalDraftSnapshot | null, options?: {
    restoreHeader?: boolean;
    clearWhenEmpty?: boolean;
  }) => {
    persistLocalDraftSnapshot(snapshot);
    if (!snapshot) {
      if (options?.clearWhenEmpty) {
        hydrateLocalDraft({ requestId: "", items: [], qtyDrafts: {} });
      }
      return;
    }

    hydrateLocalDraft({
      requestId: snapshot.requestId,
      items: snapshotToReqItems(snapshot),
      qtyDrafts: snapshot.qtyDrafts,
    });
    if (snapshot.requestId && snapshot.displayNo) {
      setDisplayNoByReq((prev) => ({ ...prev, [snapshot.requestId]: snapshot.displayNo! }));
    }

    setRequestDetails((prev) => ({
      ...(prev ?? { id: snapshot.requestId || FOREMAN_LOCAL_ONLY_REQUEST_ID }),
      id: snapshot.requestId || FOREMAN_LOCAL_ONLY_REQUEST_ID,
      status: snapshot.status ?? prev?.status ?? "draft",
      display_no: snapshot.displayNo ?? prev?.display_no ?? null,
      foreman_name: snapshot.header.foreman || prev?.foreman_name || null,
      comment: snapshot.header.comment || prev?.comment || null,
      object_type_code: snapshot.header.objectType || prev?.object_type_code || null,
      level_code: snapshot.header.level || prev?.level_code || null,
      system_code: snapshot.header.system || prev?.system_code || null,
      zone_code: snapshot.header.zone || prev?.zone_code || null,
    }));

    if (options?.restoreHeader) {
      setForeman(snapshot.header.foreman);
      setComment(snapshot.header.comment);
      setObjectType(snapshot.header.objectType);
      setLevel(snapshot.header.level);
      setSystem(snapshot.header.system);
      setZone(snapshot.header.zone);
    }
  }, [
    hydrateLocalDraft,
    persistLocalDraftSnapshot,
    setDisplayNoByReq,
    setComment,
    setForeman,
    setLevel,
    setObjectType,
    setSystem,
    setZone,
  ]);

  const buildCurrentLocalDraftSnapshot = useCallback(() => {
    return buildForemanLocalDraftSnapshot({
      base: localDraftSnapshotRef.current,
      requestId,
      displayNo: requestDetails?.display_no ?? null,
      status: requestDetails?.status ?? (items.length ? "draft" : null),
      header: {
        foreman,
        comment,
        objectType,
        level,
        system,
        zone,
      },
      items,
      qtyDrafts,
    });
  }, [comment, foreman, items, level, objectType, qtyDrafts, requestDetails?.display_no, requestDetails?.status, requestId, system, zone]);

  const activeLocalDraftSnapshot = getActiveLocalDraftSnapshot();

  const hasLocalDraft = useMemo(
    () => Boolean(activeLocalDraftSnapshot && hasForemanLocalDraftContent(activeLocalDraftSnapshot)),
    [activeLocalDraftSnapshot],
  );

  const isDraftActive = useMemo(
    () => hasLocalDraft || isDraftLikeStatus(requestDetails?.status),
    [hasLocalDraft, requestDetails?.status],
  );
  const screenLock = busy || draftDeleteBusy || draftSendBusy;

  const canEditRequestItem = useCallback((row?: ReqItemRow | null) => {
    if (!row) return false;
    const activeRequestId = String(requestDetails?.id ?? '').trim();
    const localRequestId = String(requestId || FOREMAN_LOCAL_ONLY_REQUEST_ID).trim();
    if (!isDraftActive) return false;
    const itemRequest = String(row.request_id ?? '').trim();
    if (activeRequestId && itemRequest === activeRequestId && isDraftLikeStatus(requestDetails?.status)) return true;
    return itemRequest === localRequestId || itemRequest === FOREMAN_LOCAL_ONLY_REQUEST_ID;
  }, [isDraftActive, requestDetails?.id, requestDetails?.status, requestId]);

  const resetDraftState = useCallback(() => {
    setRequestId('');
    setRequestDetails(null);
    setItems([]);
    setQtyDrafts({});
    setQtyBusyMap({});
    resetHeader();
  }, [resetHeader, setItems, setQtyBusyMap, setQtyDrafts, setRequestId]);

  const showHint = useCallback((title: string, message: string) => {
    if (Platform.OS === 'web' && safeWebUi) safeWebUi.alert?.(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  }, [safeWebUi]);

  const clearHeaderAttention = useCallback(() => {
    setHeaderAttention(null);
  }, []);

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
  }, []);

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
    const checkDraft = () => {
      if (isDraftActive) return true;
      Alert.alert(FOREMAN_TEXT.readonlyTitle, opts?.draftMessage ?? FOREMAN_TEXT.readonlyHint);
      return false;
    };
    if (opts?.draftFirst) return checkDraft() && ensureHeaderReady();
    return ensureHeaderReady() && checkDraft();
  }, [isDraftActive, ensureHeaderReady]);

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

  const buildRequestDraftMeta = useCallback(
    (): RequestDraftMeta => ({
      foreman_name: foreman.trim() || null,
      comment: comment.trim() || null,
      object_type_code: objectType || null,
      level_code: level || null,
      system_code: system || null,
      zone_code: zone || null,
    }),
    [comment, foreman, level, objectType, system, zone],
  );

  const syncRequestHeaderMeta = useCallback(async (rid: string, context: string) => {
    await updateRequestMeta(rid, buildRequestDraftMeta()).catch((e) => {
      if (__DEV__) {
        console.warn(`[Foreman] updateMeta err in ${context}:`, e);
      }
    });
  }, [buildRequestDraftMeta]);

  const alertError = useCallback((error: unknown, fallback: string) => {
    Alert.alert(FOREMAN_TEXT.errorTitle, toErrorText(error, fallback));
  }, []);

  const appendLocalDraftRows = useCallback((rows: ForemanDraftAppendInput[]) => {
    const next = appendRowsToForemanLocalDraft(buildCurrentLocalDraftSnapshot(), rows);
    applyLocalDraftSnapshotToUi(next);
  }, [applyLocalDraftSnapshotToUi, buildCurrentLocalDraftSnapshot]);

  const updateLocalDraftQty = useCallback((item: ReqItemRow, qty: number) => {
    const next = updateForemanLocalDraftItemQty(buildCurrentLocalDraftSnapshot(), item.id, qty);
    applyLocalDraftSnapshotToUi(next);
  }, [applyLocalDraftSnapshotToUi, buildCurrentLocalDraftSnapshot]);

  const removeLocalDraftRow = useCallback((item: ReqItemRow) => {
    const next = removeForemanLocalDraftItem(buildCurrentLocalDraftSnapshot(), item.id);
    applyLocalDraftSnapshotToUi(next);
  }, [applyLocalDraftSnapshotToUi, buildCurrentLocalDraftSnapshot]);

  const syncLocalDraftNow = useCallback(async (options?: { submit?: boolean; context?: string }) => {
    if (draftSyncInFlightRef.current) {
      await draftSyncInFlightRef.current;
    }

    const run = (async () => {
      if (!isDraftActive) {
        return { requestId: ridStr(requestId) || null, submitted: null };
      }

      let snapshot = buildCurrentLocalDraftSnapshot();
      if (options?.submit) {
        snapshot = markForemanLocalDraftSubmitRequested(snapshot);
      }

      if (!snapshot || !hasForemanLocalDraftContent(snapshot)) {
        return { requestId: ridStr(requestId) || null, submitted: null };
      }

      persistLocalDraftSnapshot(snapshot);

      try {
        const result = await syncForemanLocalDraftSnapshot({
          snapshot,
          headerMeta: buildRequestDraftMeta(),
        });

        if (result.snapshot) {
          applyLocalDraftSnapshotToUi(result.snapshot);
          setHasRestoredLocalDraft(false);
          return {
            requestId: ridStr(result.snapshot.requestId) || ridStr(snapshot.requestId) || ridStr(requestId) || null,
            submitted: result.submitted ?? null,
          };
        }

        persistLocalDraftSnapshot(null);
        return {
          requestId: ridStr(snapshot.requestId) || ridStr(requestId) || null,
          submitted: result.submitted ?? null,
        };
      } catch (error) {
        persistLocalDraftSnapshot({
          ...snapshot,
          lastError: toErrorText(error, options?.context || "syncLocalDraftNow"),
          updatedAt: new Date().toISOString(),
        });
        throw error;
      } finally {
        draftSyncInFlightRef.current = null;
      }
    })();

    draftSyncInFlightRef.current = run.then(
      () => undefined,
      () => undefined,
    );

    return await run;
  }, [
    applyLocalDraftSnapshotToUi,
    buildCurrentLocalDraftSnapshot,
    buildRequestDraftMeta,
    isDraftActive,
    persistLocalDraftSnapshot,
    requestId,
  ]);

  useEffect(() => {
    syncLocalDraftNowRef.current = syncLocalDraftNow;
  }, [syncLocalDraftNow]);

  const loadDetails = useCallback(async (rid?: string | number | null) => {
    const key = rid != null ? ridStr(rid) : requestId;
    if (!key || key === FOREMAN_LOCAL_ONLY_REQUEST_ID) { setRequestDetails(null); return null; }
    try {
      const details = await fetchRequestDetails(key);
      if (!details) { setRequestDetails(null); return null; }
      setRequestDetails(details);
      if (details.display_no) setDisplayNoByReq((prev) => ({ ...prev, [key]: String(details.display_no) }));
      syncHeaderFromDetails(details);
      return details;
    } catch (e) {
      if (__DEV__) {
        console.warn('[Foreman] loadDetails:', toErrorText(e, ""));
      }
      return null;
    }
  }, [requestId, setDisplayNoByReq, syncHeaderFromDetails]);

  const clearDraftCache = useCallback(() => {
    clearLocalDraftId();
    clearCachedDraftRequestId();
    persistLocalDraftSnapshot(null);
    setHasRestoredLocalDraft(false);
  }, [persistLocalDraftSnapshot]);

  const ensureRequestId = useCallback(async () => {
    const snapshot = buildCurrentLocalDraftSnapshot();
    if (snapshot && hasForemanLocalDraftContent(snapshot)) {
      const synced = await syncLocalDraftNow({ context: "ensureRequestId" });
      const syncedRequestId = ridStr(synced?.requestId) || ridStr(snapshot.requestId) || ridStr(requestId);
      if (syncedRequestId) return syncedRequestId;
    }

    return await ensureAndGetId(
      buildRequestDraftMeta(),
      (id, no) => setDisplayNoByReq((prev) => ({ ...prev, [id]: no })),
    );
  }, [
    buildCurrentLocalDraftSnapshot,
    buildRequestDraftMeta,
    ensureAndGetId,
    requestId,
    setDisplayNoByReq,
    syncLocalDraftNow,
  ]);

  const finalizeAfterSubmit = useCallback(async () => {
    clearDraftCache();
    await saveForemanToHistory(foreman);
    await refreshForemanHistory();
    resetDraftState();
  }, [clearDraftCache, foreman, refreshForemanHistory, resetDraftState]);

  const applySubmittedRequestState = useCallback((rid: string, submitted: any) => {
    if (submitted?.display_no) setDisplayNoByReq((p) => ({ ...p, [rid]: String(submitted.display_no) }));
    setRequestId(rid);
    setRequestDetails((prev) => prev ? {
      ...prev,
      id: rid,
      status: submitted?.status ?? 'pending',
      display_no: submitted?.display_no ?? prev.display_no ?? null,
      foreman_name: submitted?.foreman_name ?? prev.foreman_name ?? foreman,
      comment: submitted?.comment ?? prev.comment ?? comment,
    } : {
      id: rid,
      status: submitted?.status ?? 'pending',
      display_no: submitted?.display_no ?? null,
      foreman_name: submitted?.foreman_name ?? foreman ?? null,
      comment: submitted?.comment ?? comment ?? null,
      object_type_code: objectType || null,
      level_code: level || null,
      system_code: system || null,
      zone_code: zone || null,
    });
  }, [comment, foreman, level, objectType, setDisplayNoByReq, setRequestId, system, zone]);

  const ensureCanSubmitToDirector = useCallback(() => {
    if (!ensureEditableContext({ draftFirst: true, draftMessage: FOREMAN_TEXT.submitNeedDraftHint })) return false;
    if (!items.length) { Alert.alert(FOREMAN_TEXT.submitEmptyTitle, FOREMAN_TEXT.submitEmptyHint); return false; }
    return true;
  }, [ensureEditableContext, items.length]);

  const [selectedObjectName, setSelectedObjectName] = useState('');

  const detailsRequestId = ridStr(requestDetails?.id);
  const skipRemoteDraftEffects = useMemo(() => {
    if (!localDraftBootstrapReady) return true;
    const snapshot = getActiveLocalDraftSnapshot();
    if (!snapshot) return false;
    if (ridStr(snapshot.requestId)) return ridStr(snapshot.requestId) === ridStr(requestId);
    return !ridStr(requestId);
  }, [getActiveLocalDraftSnapshot, localDraftBootstrapReady, requestId]);

  useEffect(() => {
    if (!localDraftBootstrapReady) return;
    if (!isDraftActive) return;
    if (requestDetails && detailsRequestId && ridStr(requestId) && detailsRequestId !== ridStr(requestId) && !hasLocalDraft) {
      return;
    }

    const snapshot = buildCurrentLocalDraftSnapshot();
    if (!snapshot || !hasForemanLocalDraftContent(snapshot)) return;
    persistLocalDraftSnapshot(snapshot);
  }, [
    buildCurrentLocalDraftSnapshot,
    detailsRequestId,
    hasLocalDraft,
    isDraftActive,
    localDraftBootstrapReady,
    persistLocalDraftSnapshot,
    requestDetails,
    requestId,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snapshot = await loadForemanLocalDraftSnapshot();
      if (cancelled) return;
      if (snapshot && hasForemanLocalDraftContent(snapshot)) {
        setHasRestoredLocalDraft(true);
        applyLocalDraftSnapshotToUi(snapshot, { restoreHeader: true });
      }
      setLocalDraftBootstrapReady(true);
    })();
    return () => { cancelled = true; };
  }, [applyLocalDraftSnapshotToUi]);

  useEffect(() => {
    const wasFocused = wasScreenFocusedRef.current;
    wasScreenFocusedRef.current = isScreenFocused;
    if (!isScreenFocused || wasFocused || !localDraftBootstrapReady) return;
    void syncLocalDraftNowRef.current?.({ context: "focus" }).catch(() => undefined);
  }, [isScreenFocused, localDraftBootstrapReady]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      if (!localDraftBootstrapReady) return;
      if (prevState !== "active" && nextState === "active") {
        void syncLocalDraftNow({ context: "appActive" }).catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [localDraftBootstrapReady, syncLocalDraftNow]);
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

  const actions = useForemanActions({
    requestId, scopeNote,
    isDraftActive, canEditRequestItem, setQtyDrafts, setRowBusy, items, qtyDrafts,
    ensureEditableContext, ensureCanSubmitToDirector, applySubmittedRequestState, finalizeAfterSubmit,
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

  const openRequestById = useCallback((targetId: string | number | null | undefined) => {
    const id = ridStr(targetId);
    if (!id) return;
    setRequestDetails(null);
    setRequestId(id);
    void loadItems(id, { forceRemote: true });
  }, [loadItems, setRequestId]);

  const handleObjectChange = useCallback((code: string) => {
    setObjectType(code);
    const opt = objAllOptions.find(o => o.code === code);
    setSelectedObjectName(opt?.name || ''); // Immediate sync for CCE

    setRequestDetails(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        object_type_code: code || null,
        object_name_ru: opt?.name ?? prev.object_name_ru ?? null,
        // TOTAL RESET: Kill all old building-logic fields immediately
        level_code: null,
        level_name_ru: null,
        system_code: null,
        system_name_ru: null,
        zone_code: null,
        zone_name_ru: null
      };
    });

    // Clear display state immediately
    setLevel("");
    setSystem("");
    setZone("");
  }, [objAllOptions, setObjectType, setLevel, setSystem, setZone]);

  const handleLevelChange = useCallback((code: string) => {
    setLevel(code);
    const opt = formUi.locator.options.find(o => o.code === code);
    setRequestDetails(prev => prev ? {
      ...prev,
      level_code: code || null,
      level_name_ru: opt?.name ?? null // USE CCE-ADAPTED NAME ONLY
    } : prev);
  }, [formUi.locator.options, setLevel]);

  const handleSystemChange = useCallback((code: string) => {
    setSystem(code);
    const opt = sysAllOptions.find(o => o.code === code);
    setRequestDetails(prev => prev ? { ...prev, system_code: code || null, system_name_ru: opt?.name ?? prev.system_name_ru ?? null } : prev);
  }, [sysAllOptions, setSystem]);

  const handleZoneChange = useCallback((code: string) => {
    setZone(code);
    const opt = formUi.zone.options.find(o => o.code === code);
    setRequestDetails(prev => prev ? {
      ...prev,
      zone_code: code || null,
      zone_name_ru: opt?.name ?? null // USE CCE-ADAPTED NAME ONLY
    } : prev);
  }, [formUi.zone.options, setZone]);

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
  }, [headerAttention, headerRequirements]);

  const handleHistorySelect = useCallback((reqId: string) => { openRequestById(reqId); closeHistory(); }, [openRequestById, closeHistory]);

  const openHistoryPdf = useCallback(async (reqId: string) => {
    const rid = ridStr(reqId);
    if (!rid) return;
    try {
      const template = await generateRequestPdfDocument({
        requestId: rid,
        originModule: "foreman",
      });
      const doc = await preparePdfDocument({
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
        getRemoteUrl: () => template.uri,
      });
      await previewPdfDocument(doc, { router });
    } catch (error) {
      Alert.alert("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
    }
  }, [gbusy, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!localDraftBootstrapReady || hasRestoredLocalDraft) return;
      try {
        const localId = ridStr(getLocalDraftId());
        if (!localId) return;
        const details = await fetchRequestDetails(localId);
        if (cancelled) return;
        if (details && isDraftLikeStatus(details.status)) {
          setRequestId(localId);
          setRequestDetails(details);
          if (details.display_no) setDisplayNoByReq(p => ({ ...p, [localId]: String(details.display_no) }));
          return;
        }
        clearDraftCache();
      } catch { clearDraftCache(); }
    })();
    return () => { cancelled = true; };
  }, [clearDraftCache, hasRestoredLocalDraft, localDraftBootstrapReady, setRequestId, setDisplayNoByReq]);

  useEffect(() => {
    let active = true;
    const sixAM = new Date(); sixAM.setHours(6, 0, 0, 0);
    (async () => {
      const saved = await AsyncStorage.getItem("foreman_fio");
      const lastConfirmStr = await AsyncStorage.getItem("foreman_confirm_ts");
      const lastConfirm = lastConfirmStr ? new Date(lastConfirmStr) : null;
      if (active) {
        if (saved) setForeman(saved);
        if (!lastConfirm || lastConfirm < sixAM) setIsFioConfirmVisible(true);
      }
    })();
    return () => { active = false; };
  }, [setForeman]);

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
      setIsFioConfirmVisible(false);
    } finally { setIsFioLoading(false); }
  }, [setForeman]);

  useEffect(() => {
    if (!localDraftBootstrapReady || !requestId || skipRemoteDraftEffects) return;
    const rid = ridStr(requestId);
    preloadDisplayNo(rid);
    void loadDetails(rid);
  }, [localDraftBootstrapReady, requestId, preloadDisplayNo, loadDetails, skipRemoteDraftEffects]);

  useEffect(() => {
    if (!localDraftBootstrapReady || skipRemoteDraftEffects) return;
    void loadItems();
  }, [loadItems, localDraftBootstrapReady, skipRemoteDraftEffects]);

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

  const handleDeleteDraftFromSheet = useCallback(async () => {
    setDraftDeleteBusy(true);
    try {
      clearDraftCache();
      resetDraftState();
      setDraftOpen(false);
    } catch (e: unknown) {
      alertError(e, FOREMAN_TEXT.deleteDraftError);
    } finally {
      setDraftDeleteBusy(false);
    }
  }, [clearDraftCache, resetDraftState, alertError]);

  const handleSendDraftFromSheet = useCallback(async () => {
    setDraftSendBusy(true);
    try {
      await submitToDirector();
      setDraftOpen(false);
    } catch (e: unknown) {
      alertError(e, FOREMAN_TEXT.sendToDirectorError);
    } finally {
      setDraftSendBusy(false);
    }
  }, [submitToDirector, alertError]);

  const handleCalcPress = useCallback(() => {
    if (busy) return;
    if (!ensureEditableContext()) return;
    setWorkTypePickerVisible(true);
  }, [busy, ensureEditableContext]);

  const handleAiQuickTextChange = useCallback((value: string) => {
    setAiQuickText(value);
    setAiQuickError("");
    setAiQuickNotice("");
    setAiQuickPreview([]);
  }, []);

  const handleAiQuickSubmit = useCallback(async () => {
    const promptText = aiQuickText.trim();
    if (!promptText || aiQuickLoading) return;

    if (headerRequirements.missing.length) {
      activateHeaderAttention(`${headerRequirements.message} Я перевел вас к этим полям.`);
      setAiQuickVisible(false);
      showHint(
        FOREMAN_TEXT.fillHeaderTitle,
        `${headerRequirements.message} Я перевел вас к этим полям сверху.`,
      );
      return;
    }
    if (requestDetails && !isDraftActive) {
      Alert.alert(FOREMAN_TEXT.readonlyTitle, FOREMAN_TEXT.readonlyHint);
      return;
    }

    setAiQuickLoading(true);
    setAiQuickError("");
    setAiQuickNotice("");

    try {
      const parsed = await resolveForemanQuickRequest(promptText);
      setAiQuickPreview(parsed.items);
      setAiQuickNotice(parsed.message);

      if (parsed.action === "clarify" || parsed.items.length === 0) {
        setAiQuickError(parsed.message || "Нужно уточнить позиции или количество.");
        return;
      }

      const prepared: ForemanDraftAppendInput[] = parsed.items.map((item) => ({
        rik_code: item.rik_code,
        qty: item.qty,
        meta: {
          note: [scopeNote, item.specs].filter(Boolean).join(" | ") || scopeNote || item.specs || null,
          app_code: null,
          kind: item.kind,
          name_human: item.name,
          uom: item.unit,
        },
      }));

      appendLocalDraftRows(prepared);

      let syncedRequestId = ridStr(requestId);
      try {
        const syncResult = await syncLocalDraftNow({ context: "foremanAiQuickRequest" });
        syncedRequestId = ridStr(syncResult?.requestId) || syncedRequestId;
      } catch {
        setAiQuickNotice("Позиции сохранены локально. Когда сеть восстановится, черновик синхронизируется автоматически.");
      }

      const draftLabel = String(
        (syncedRequestId && labelForRequest(syncedRequestId)) || currentDisplayLabel || syncedRequestId || "черновик",
      ).trim() || "черновик";
      setAiQuickNotice((prev) => prev || `Черновик ${draftLabel} сформирован. Проверьте позиции и отправьте его отдельно.`);
      clearHeaderAttention();

      setAiQuickVisible(false);
      setAiQuickText("");
      setAiQuickError("");
      setAiQuickPreview([]);
      setDraftOpen(true);
      showHint(
        "Черновик сформирован",
        `Черновик ${draftLabel} создан. Проверьте позиции и отправьте его отдельно из карточки черновика.`,
      );
    } catch (error) {
      setAiQuickError(toErrorText(error, "Не удалось сформировать AI-заявку."));
    } finally {
      setAiQuickLoading(false);
    }
  }, [
    aiQuickLoading,
    aiQuickText,
    activateHeaderAttention,
    appendLocalDraftRows,
    clearHeaderAttention,
    currentDisplayLabel,
    headerRequirements,
    isDraftActive,
    labelForRequest,
    requestId,
    requestDetails,
    setAiQuickVisible,
    showHint,
    scopeNote,
    syncLocalDraftNow,
  ]);

  const openDraftFromCatalog = useCallback(() => {
    setCatalogVisible(false);
    setDraftOpen(true);
  }, []);

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
          <>
            <ForemanEditorSection
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
              showHint={showHint}
              setCatalogVisible={setCatalogVisible}
              busy={busy}
              onCalcPress={handleCalcPress}
              onAiQuickPress={() => setAiQuickVisible(true)}
              setDraftOpen={setDraftOpen}
              currentDisplayLabel={currentDisplayLabel}
              itemsCount={items.length}
              headerAttention={headerAttention}
              ui={UI} styles={s}
            />

            <ForemanHistoryBar
              busy={busy}
              onOpenRequestHistory={() => fetchHistory(foreman)}
              onOpenSubcontractHistory={() => void fetchSubcontractHistory()}
              ui={UI}
              styles={s}
            />

            <ForemanHistoryModal
              visible={historyVisible}
              onClose={closeHistory}
              loading={historyLoading}
              requests={historyRequests}
              resolveStatusInfo={resolveStatusInfo}
              onSelect={handleHistorySelect}
              onOpenPdf={openHistoryPdf}
              isPdfBusy={(key) => gbusy.isBusy(key)}
              shortId={shortId}
              styles={s}
            />

            <ForemanSubcontractHistoryModal
              visible={subcontractHistoryVisible}
              onClose={closeSubcontractHistory}
              loading={subcontractHistoryLoading}
              history={subcontractHistory}
              styles={s}
              ui={UI}
            />

            <CatalogModal
              visible={catalogVisible}
              onClose={() => setCatalogVisible(false)}
              rikQuickSearch={rikQuickSearch}
              onCommitToDraft={commitCatalogToDraft}
              onOpenDraft={openDraftFromCatalog}
              draftCount={items.length}
            />
            <WorkTypePicker
              visible={workTypePickerVisible}
              onClose={() => setWorkTypePickerVisible(false)}
              onSelect={(wt) => {
                setSelectedWorkType(wt);
                setWorkTypePickerVisible(false);
                setCalcVisible(true);
              }}
            />
            <CalcModal
              visible={calcVisible}
              onClose={() => { setCalcVisible(false); setSelectedWorkType(null); }}
              onBack={() => { setCalcVisible(false); setSelectedWorkType(null); setWorkTypePickerVisible(true); }}
              workType={selectedWorkType}
              onAddToRequest={handleCalcAddToRequest}
            />
            <ForemanAiQuickModal
              visible={aiQuickVisible}
              onClose={() => {
                if (aiQuickLoading) return;
                setAiQuickVisible(false);
              }}
              value={aiQuickText}
              onChangeText={handleAiQuickTextChange}
              onSubmit={handleAiQuickSubmit}
              loading={aiQuickLoading}
              onlineConfigured={isForemanQuickRequestConfigured()}
              error={aiQuickError}
              notice={aiQuickNotice}
              preview={aiQuickPreview}
              ui={UI}
              styles={s}
            />
            <ForemanDraftModal
              visible={draftOpen}
              onClose={() => setDraftOpen(false)}
              currentDisplayLabel={currentDisplayLabel}
              objectName={objectName}
              levelName={levelName}
              systemName={systemName}
              zoneName={zoneName}
              items={items}
              renderReqItem={renderReqItem}
              screenLock={screenLock}
              draftDeleteBusy={draftDeleteBusy}
              draftSendBusy={draftSendBusy}
              onDeleteDraft={handleDeleteDraftFromSheet}
              onPdf={onPdf}
              pdfBusy={draftPdfBusy}
              onSend={handleSendDraftFromSheet}
              ui={UI} styles={s}
            />

            <WarehouseFioModal
              visible={isFioConfirmVisible}
              initialFio={foreman}
              onConfirm={handleFioConfirm}
              loading={isFioLoading}
              history={foremanHistory}
            />
          </>
        ) : null}
      </RoleScreenLayout>
    </KeyboardAvoidingView>
  );
}
