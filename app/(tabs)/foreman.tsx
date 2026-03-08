// app/(tabs)/foreman.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import CalcModal from "../../src/components/foreman/CalcModal";
import WorkTypePicker from "../../src/components/foreman/WorkTypePicker";
import { runPdfTop } from "../../src/lib/pdfRunner";
import CatalogModal from '../../src/components/foreman/CatalogModal';
import ForemanReqItemRow from "../../src/screens/foreman/ForemanReqItemRow";
import ForemanHistoryModal from "../../src/screens/foreman/ForemanHistoryModal";
import ForemanDraftModal from "../../src/screens/foreman/ForemanDraftModal";
import ForemanEditorSection from "../../src/screens/foreman/ForemanEditorSection";
import ForemanSubcontractTab from "../../src/screens/foreman/ForemanSubcontractTab";
import WarehouseFioModal from "../../src/screens/warehouse/components/WarehouseFioModal";
import { useForemanDicts } from "../../src/screens/foreman/useForemanDicts";
import { resolveForemanContext } from "../../src/screens/foreman/foreman.context.resolver";
import { adaptFormContext } from "../../src/screens/foreman/foreman.locator.adapter";
import { debugForemanLog } from "../../src/screens/foreman/foreman.debug";
import { s } from "../../src/screens/foreman/foreman.styles";
import { FOREMAN_TEXT, REQUEST_STATUS_STYLES, UI } from "../../src/screens/foreman/foreman.ui";
import { useCollapsingHeader } from "../../src/screens/shared/useCollapsingHeader";
import { useGlobalBusy } from '../../src/ui/GlobalBusy';
import { supabase } from '../../src/lib/supabaseClient';
import {
  rikQuickSearch,
  fetchRequestDetails,
  updateRequestMeta,
  exportRequestPdf,
  getLocalDraftId,
  clearLocalDraftId,
  clearCachedDraftRequestId,
  type ReqItemRow,
  type RequestDetails,
} from '../../src/lib/catalog_api';
import type { CalcRow, PickedRow, RequestDraftMeta, RefOption } from "../../src/screens/foreman/foreman.types";
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

import { useForemanHeader } from '../../src/screens/foreman/hooks/useForemanHeader';
import { useForemanHistory } from '../../src/screens/foreman/hooks/useForemanHistory';
import { useForemanDisplayNo } from '../../src/screens/foreman/hooks/useForemanDisplayNo';
import { useForemanItemsState } from '../../src/screens/foreman/hooks/useForemanItemsState';
import { useForemanPdf } from '../../src/screens/foreman/hooks/useForemanPdf';
import { useForemanActions } from '../../src/screens/foreman/hooks/useForemanActions';

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

const webUi = (globalThis as any) as WebUiApi;

export default function ForemanScreen() {
  const gbusy = useGlobalBusy();

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
    setHistoryVisible,
    fetchHistory,
    closeHistory,
  } = useForemanHistory();

  const {
    displayNoByReq,
    setDisplayNoByReq,
    preloadDisplayNo,
    getDisplayNo,
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
    removeRowLocal,
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

  const { objOptions, lvlOptions, sysOptions, zoneOptions, appOptions } = useForemanDicts();

  const refreshForemanHistory = useCallback(async () => {
    setForemanHistory(await loadForemanHistory());
  }, []);

  useEffect(() => { refreshForemanHistory(); }, [refreshForemanHistory]);

  const labelForApp = useCallback((code?: string | null) => {
    if (!code) return '';
    return appOptions.find((o) => o.code === code)?.label || code;
  }, [appOptions]);

  const isDraftActive = useMemo(() => isDraftLikeStatus(requestDetails?.status), [requestDetails?.status]);
  const screenLock = busy || draftDeleteBusy || draftSendBusy;

  const canEditRequestItem = useCallback((row?: ReqItemRow | null) => {
    if (!row) return false;
    const activeRequestId = String(requestDetails?.id ?? '').trim();
    if (!activeRequestId || !isDraftLikeStatus(requestDetails?.status)) return false;
    const itemRequest = String(row.request_id ?? '').trim();
    return itemRequest === activeRequestId && isDraftLikeStatus(row.status);
  }, [requestDetails?.id, requestDetails?.status]);

  const resetDraftState = useCallback(() => {
    setRequestId('');
    setRequestDetails(null);
    setItems([]);
    setQtyDrafts({});
    setQtyBusyMap({});
    resetHeader();
  }, [resetHeader, setItems, setQtyBusyMap, setQtyDrafts, setRequestId]);

  const clearDraftCache = useCallback(() => {
    clearLocalDraftId();
    clearCachedDraftRequestId();
  }, []);

  const showHint = useCallback((title: string, message: string) => {
    if (Platform.OS === 'web') webUi.alert?.(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  }, []);

  const ensureHeaderReady = useCallback(() => {
    if (!foreman.trim()) { showHint(FOREMAN_TEXT.fillHeaderTitle, FOREMAN_TEXT.fillForeman); return false; }
    if (!objectType) { showHint(FOREMAN_TEXT.fillHeaderTitle, "Пожалуйста, выберите Объект / Блок"); return false; }
    // Now level can be empty if "Not required" is chosen (which is our empty code)
    // We only block if it's absolutely necessary, but usually Object is the key.
    return true;
  }, [foreman, objectType, showHint]);

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

  const syncRequestHeaderMeta = useCallback(async (rid: string, context: string) => {
    const meta: RequestDraftMeta = {
      foreman_name: foreman.trim() || null,
      comment: comment.trim() || null,
      object_type_code: objectType || null,
      level_code: level || null,
      system_code: system || null,
      zone_code: zone || null,
    };
    await updateRequestMeta(rid, meta).catch((e) => console.warn(`[Foreman] updateMeta err in ${context}:`, e));
  }, [foreman, comment, objectType, level, system, zone]);

  const loadDetails = useCallback(async (rid?: string | number | null) => {
    const key = rid != null ? ridStr(rid) : requestId;
    if (!key) { setRequestDetails(null); return null; }
    try {
      const details = await fetchRequestDetails(key);
      if (!details) { setRequestDetails(null); return null; }
      setRequestDetails(details);
      if (details.display_no) setDisplayNoByReq((prev) => ({ ...prev, [key]: String(details.display_no) }));
      syncHeaderFromDetails(details);
      return details;
    } catch (e) {
      console.warn('[Foreman] loadDetails:', toErrorText(e, ""));
      return null;
    }
  }, [requestId, setDisplayNoByReq, syncHeaderFromDetails]);

  const alertError = useCallback((error: unknown, fallback: string) => {
    Alert.alert(FOREMAN_TEXT.errorTitle, toErrorText(error, fallback));
  }, []);

  const ensureRequestId = useCallback(async () => {
    const meta: RequestDraftMeta = {
      foreman_name: foreman.trim() || null,
      comment: comment.trim() || null,
      object_type_code: objectType || null,
      level_code: level || null,
      system_code: system || null,
      zone_code: zone || null,
    };
    return await ensureAndGetId(meta, (id, no) => setDisplayNoByReq(p => ({ ...p, [id]: no })));
  }, [foreman, comment, objectType, level, system, zone, ensureAndGetId, setDisplayNoByReq]);

  const finalizeAfterSubmit = useCallback(async () => {
    clearDraftCache();
    await saveForemanToHistory(foreman);
    await refreshForemanHistory();
    resetDraftState();
  }, [clearDraftCache, foreman, refreshForemanHistory, resetDraftState]);

  const applySubmittedRequestState = useCallback((rid: string, submitted: any) => {
    if (submitted?.display_no) setDisplayNoByReq(p => ({ ...p, [rid]: String(submitted.display_no) }));
    setRequestDetails(prev => prev ? {
      ...prev,
      status: submitted?.status ?? 'pending',
      display_no: submitted?.display_no ?? prev.display_no ?? null,
      foreman_name: submitted?.foreman_name ?? prev.foreman_name ?? foreman,
      comment: submitted?.comment ?? prev.comment ?? comment,
    } : prev);
  }, [comment, foreman, setDisplayNoByReq]);

  const ensureCanSubmitToDirector = useCallback(() => {
    if (!ensureEditableContext({ draftFirst: true, draftMessage: FOREMAN_TEXT.submitNeedDraftHint })) return false;
    if (!items.length) { Alert.alert(FOREMAN_TEXT.submitEmptyTitle, FOREMAN_TEXT.submitEmptyHint); return false; }
    return true;
  }, [ensureEditableContext, items.length]);

  const [selectedObjectName, setSelectedObjectName] = useState('');
  const displayObjectName = selectedObjectName || objOptions.find(o => o.code === objectType)?.name || requestDetails?.object_name_ru || '';
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

  // --- SCOPE NOTE: Unified display string using SAFE values ---
  const levelName = useMemo(() => formUi.locator.options.find(o => o.code === safeLevel)?.name || '', [formUi.locator.options, safeLevel]);
  const systemName = useMemo(() => filteredSysOptions.find(o => o.code === safeSystem)?.name || '', [filteredSysOptions, safeSystem]);
  const zoneName = useMemo(() => formUi.zone.options.find(o => o.code === safeZone)?.name || '', [formUi.zone.options, safeZone]);

  useEffect(() => {
    debugForemanLog("[FOREMAN_MAIN_4_FIELDS]", {
      objectName: displayObjectName,
      objectType,
      objectClass: contextResult?.config?.objectClass,

      field1_object: {
        label: 'Объект / Блок',
        value: objectType,
        selectedName: objOptions.find(o => o.code === objectType)?.name || '',
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
    });
  }, [displayObjectName, objectType, contextResult, formUi, level, system, zone, filteredSysOptions, objOptions, safeLevel, safeSystem, safeZone]);
  const scopeNote = useMemo(() => buildScopeNote(objectName, levelName, systemName, zoneName) || '—', [objectName, levelName, systemName, zoneName]);

  const actions = useForemanActions({
    requestId, ensureRequestId, loadItems, syncRequestHeaderMeta, scopeNote,
    isDraftActive, canEditRequestItem, setItems, setQtyDrafts, setRowBusy, items, qtyDrafts,
    ensureEditableContext, ensureCanSubmitToDirector, applySubmittedRequestState, finalizeAfterSubmit,
    showHint, setBusy, alertError, webUi
  });

  const {
    commitCatalogToDraft, commitQtyChange, syncPendingQtyDrafts,
    submitToDirector, handleRemoveDraftRow, handleCalcAddToRequest
  } = actions;

  const openRequestById = useCallback((targetId: string | number | null | undefined) => {
    const id = ridStr(targetId);
    if (id) { setRequestId(id); loadItems(id); }
  }, [loadItems, setRequestId]);

  const handleObjectChange = useCallback((code: string) => {
    setObjectType(code);
    const opt = objOptions.find(o => o.code === code);
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
  }, [objOptions, lvlOptions, setObjectType, setLevel, setSystem, setZone]);

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
    const opt = sysOptions.find(o => o.code === code);
    setRequestDetails(prev => prev ? { ...prev, system_code: code || null, system_name_ru: opt?.name ?? prev.system_name_ru ?? null } : prev);
  }, [sysOptions, setSystem]);

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

  const handleHistorySelect = useCallback((reqId: string) => { openRequestById(reqId); closeHistory(); }, [openRequestById, closeHistory]);

  const openHistoryPdf = useCallback(async (reqId: string) => {
    const rid = ridStr(reqId);
    if (!rid) return;
    await runPdfTop({
      busy: gbusy, supabase, key: `pdf:history:${rid}`, label: "Готовлю PDF...", mode: "preview",
      fileName: `Заявка_${rid}`, getRemoteUrl: () => exportRequestPdf(rid, "preview"),
    });
  }, [gbusy]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
      } catch (e: unknown) { clearDraftCache(); }
    })();
    return () => { cancelled = true; };
  }, [clearDraftCache, setRequestId, setDisplayNoByReq]);

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
    if (!requestId) return;
    const rid = ridStr(requestId);
    preloadDisplayNo(rid);
    loadDetails(rid);
  }, [requestId, preloadDisplayNo, loadDetails]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const onPdfShare = useCallback(async () => {
    if (!ensureHeaderReady()) return;
    await runRequestPdf("share", await ensureRequestId(), requestDetails, syncRequestHeaderMeta);
  }, [runRequestPdf, ensureHeaderReady, ensureRequestId, requestDetails, syncRequestHeaderMeta]);

  const onPdf = useCallback(async () => {
    if (!ensureHeaderReady()) return;
    await runRequestPdf("preview", await ensureRequestId(), requestDetails, syncRequestHeaderMeta);
  }, [runRequestPdf, ensureHeaderReady, ensureRequestId, requestDetails, syncRequestHeaderMeta]);

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

  const openDraftFromCatalog = useCallback(() => {
    setCatalogVisible(false);
    setDraftOpen(true);
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[s.container, { backgroundColor: UI.bg }]}>
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
                    <Text style={{ fontSize: 13, color: UI.accent, fontWeight: "800", marginTop: 2 }}>
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
                  <Text style={{ color: UI.text, fontWeight: '900', fontSize: 24, lineHeight: 24 }}>×</Text>
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
                height: 78,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.14)',
                backgroundColor: '#121A2A',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: UI.text, fontWeight: '900', fontSize: 38, lineHeight: 42 }}>[ Материалы ]</Text>
            </Pressable>

            <Pressable
              onPress={() => setForemanMainTab('subcontracts')}
              style={{
                width: '100%',
                maxWidth: 370,
                height: 78,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.14)',
                backgroundColor: '#121A2A',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: UI.text, fontWeight: '900', fontSize: 38, lineHeight: 42 }}>[ Подряды ]</Text>
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
              setDraftOpen={setDraftOpen}
              currentDisplayLabel={currentDisplayLabel}
              itemsCount={items.length}
              onOpenHistory={() => fetchHistory(foreman)}
              ui={UI} styles={s}
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
      </View>
    </KeyboardAvoidingView>
  );
}
