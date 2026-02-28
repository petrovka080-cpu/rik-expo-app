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
import { useForemanDicts } from "../../src/screens/foreman/useForemanDicts";
import { s } from "../../src/screens/foreman/foreman.styles";
import { REQUEST_STATUS_STYLES, TYPO, UI } from "../../src/screens/foreman/foreman.ui";
import { useCollapsingHeader } from "../../src/screens/shared/useCollapsingHeader";
import { useGlobalBusy } from '../../src/ui/GlobalBusy';
import { supabase } from '../../src/lib/supabaseClient';
import {
  rikQuickSearch,
  listRequestItems,
  fetchRequestDisplayNo,
  fetchRequestDetails,
  updateRequestMeta,
  requestSubmit,
  exportRequestPdf,
  getLocalDraftId,
  requestCreateDraft,
  clearLocalDraftId,
  clearCachedDraftRequestId,
  setLocalDraftId,
  listForemanRequests,
  requestItemUpdateQty,
  requestItemCancel,
  type ReqItemRow,
  type ForemanRequestSummary,
  type RequestDetails,
} from '../../src/lib/catalog_api';
import type { CalcRow, PickedRow, RequestDraftMeta } from "../../src/screens/foreman/foreman.types";
import {
  aggCalcRows,
  aggPickedRows,
  buildScopeNote,
  isDraftLikeStatus,
  loadForemanHistory,
  requestItemAddOrIncAndPatchMeta,
  ruName,
  runPool,
  saveForemanToHistory,
  shortId,
} from "../../src/screens/foreman/foreman.helpers";

type DraftAppendRow = {
  rik_code: string;
  qty: number;
  errorLabel: string;
  meta: {
    note?: string | null;
    app_code?: string | null;
    kind?: string | null;
    name_human?: string | null;
    uom?: string | null;
  };
};
type ErrorLike = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};
const toErrorText = (error: unknown, fallback = "unknown error") => {
  if (error && typeof error === "object") {
    const e = error as ErrorLike;
    const raw = e.message ?? e.details ?? e.hint ?? e.code;
    if (raw != null && String(raw).trim()) return String(raw).trim();
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return fallback;
};
const FOREMAN_TEXT = {
  errorTitle: "Ошибка",
  fillHeaderTitle: "Заполни шапку",
  fillForeman: "Укажи ФИО прораба.",
  fillObject: "Выбери объект строительства.",
  fillLevel: "Выбери этаж/уровень.",
  readonlyTitle: "Просмотр заявки",
  readonlyHint: "Редактирование доступно только в текущем черновике.",
  historyTitle: "История",
  historyLoadError: "Не удалось загрузить историю заявок.",
  draftCreateError: "Не удалось создать черновик",
  calcAddError: "Не удалось добавить рассчитанные позиции",
  catalogAddError: "Не удалось добавить позиции",
  qtyTitle: "Количество",
  qtyPositiveHint: "Значение должно быть больше нуля.",
  qtyUpdateError: "Не удалось обновить количество.",
  submitEmptyTitle: "Пустая заявка",
  submitEmptyHint: "Сначала добавь хотя бы одну позицию.",
  submitSentTitle: "Отправлено",
  submitError: "Не удалось отправить на утверждение",
  deleteConfirmTitle: "Отменить позицию?",
  deleteConfirmFallback: "Позиция",
  deleteDone: "Позиция удалена",
  deleteDraftError: "Не удалось удалить черновик",
  sendToDirectorError: "Не удалось отправить директору",
  submitNeedDraftHint: "Чтобы отправить, вернись к текущему черновику.",
} as const;

type WebUiApi = {
  alert?: (message?: string) => void;
  confirm?: (message?: string) => boolean;
};

const webUi = globalThis as typeof globalThis & WebUiApi;

// UI composition only; business logic unchanged.
export default function ForemanScreen() {

  const gbusy = useGlobalBusy();
  // Request header
  const [requestId, setRequestId] = useState<string>('');
  const [foreman, setForeman] = useState<string>('');
  const [foremanHistory, setForemanHistory] = useState<string[]>([]);
  const [foremanFocus, setForemanFocus] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshForemanHistory = useCallback(async () => {
    setForemanHistory(await loadForemanHistory());
  }, []);

  useEffect(() => {
    refreshForemanHistory();
  }, [refreshForemanHistory]);

  const [comment, setComment] = useState<string>('');

  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);

  // Scope fields
  const [objectType, setObjectType] = useState<string>(''); // required
  const [level, setLevel] = useState<string>(''); // required
  const [system, setSystem] = useState<string>(''); // optional
  const [zone, setZone] = useState<string>(''); // optional

  const { objOptions, lvlOptions, sysOptions, zoneOptions, appOptions } = useForemanDicts();
  const [draftOpen, setDraftOpen] = useState(false);

  const openDraftFromCatalog = useCallback(() => {
    setCatalogVisible(false);
    setDraftOpen(true);
  }, []);

  const labelForApp = useCallback(
    (code?: string | null) => {
      if (!code) return '';
      return appOptions.find((o) => o.code === code)?.label || code;
    },
    [appOptions],
  );

  const formatQtyInput = useCallback((value?: number | null) => {
    if (value == null) return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    if (Number.isInteger(num)) return String(num);
    return num.toString();
  }, []);

  const parseQtyValue = useCallback((value: string | number | null | undefined) => {
    if (typeof value === 'number') return value;
    const str = String(value ?? '').trim().replace(',', '.');
    if (!str) return Number.NaN;
    const num = Number(str);
    return Number.isFinite(num) ? num : Number.NaN;
  }, []);

  // Existing request items
  const [items, setItems] = useState<ReqItemRow[]>([]);
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [qtyBusyMap, setQtyBusyMap] = useState<Record<string, boolean>>({});
  const cancelLockRef = useRef<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  // Таб прораба: Материалы | Подряды
  const [foremanMainTab, setForemanMainTab] = useState<'materials' | 'subcontracts'>('materials');

  // Separate spinners
  const [draftDeleteBusy, setDraftDeleteBusy] = useState(false);
  const [draftSendBusy, setDraftSendBusy] = useState(false);

  // Global screen lock
  const screenLock = busy || draftDeleteBusy || draftSendBusy;

  const [historyRequests, setHistoryRequests] = useState<ForemanRequestSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  // Calculator / catalog modals
  const [calcVisible, setCalcVisible] = useState(false);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [workTypePickerVisible, setWorkTypePickerVisible] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState<
    { code: string; name: string } | null
  >(null);

  // Safe RID conversion (uuid/bigint -> string)
  const ridStr = useCallback((val: string | number) => String(val).trim(), []);
  const isDraftActive = useMemo(() => {
    return isDraftLikeStatus(requestDetails?.status);
  }, [requestDetails?.status]);

  const canEditRequestItem = useCallback(
    (row?: ReqItemRow | null) => {
      if (!row) return false;
      const activeRequestId = String(requestDetails?.id ?? '').trim();
      if (!activeRequestId) return false;
      if (!isDraftLikeStatus(requestDetails?.status)) return false;
      const itemRequest = String(row.request_id ?? '').trim();
      if (!itemRequest || itemRequest !== activeRequestId) return false;
      return isDraftLikeStatus(row.status);
    },
    [requestDetails?.id, requestDetails?.status],
  );

  const resetDraftState = useCallback(() => {
    setRequestId('');
    setRequestDetails(null);
    setItems([]);
    setQtyDrafts({});
    setQtyBusyMap({});
    setComment('');
    setObjectType('');
    setLevel('');
    setSystem('');
    setZone('');
  }, []);
  const clearDraftCache = useCallback(() => {
    clearLocalDraftId();
    clearCachedDraftRequestId();
  }, [clearCachedDraftRequestId, clearLocalDraftId]);

  const showHint = useCallback((title: string, message: string) => {
    if (Platform.OS === 'web') {
      webUi.alert?.(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }, []);


  const ensureHeaderReady = useCallback(() => {
    if (!foreman.trim()) {
      showHint(FOREMAN_TEXT.fillHeaderTitle, FOREMAN_TEXT.fillForeman);
      return false;
    }
    if (!objectType) {
      showHint(FOREMAN_TEXT.fillHeaderTitle, FOREMAN_TEXT.fillObject);
      return false;
    }
    if (!level) {
      showHint(FOREMAN_TEXT.fillHeaderTitle, FOREMAN_TEXT.fillLevel);
      return false;
    }
    return true;
  }, [foreman, objectType, level, showHint]);
  const requireDraftEditable = useCallback(
    (message?: string) => {
      if (isDraftActive) return true;
      Alert.alert(
        FOREMAN_TEXT.readonlyTitle,
        message ?? FOREMAN_TEXT.readonlyHint,
      );
      return false;
    },
    [isDraftActive],
  );
  const ensureEditableContext = useCallback(
    (opts?: { draftMessage?: string; draftFirst?: boolean }) => {
      if (opts?.draftFirst) {
        if (!requireDraftEditable(opts?.draftMessage)) return false;
        return ensureHeaderReady();
      }
      if (!ensureHeaderReady()) return false;
      return requireDraftEditable(opts?.draftMessage);
    },
    [ensureHeaderReady, requireDraftEditable],
  );


  const resolveStatusInfo = useCallback((raw?: string | null) => {
    const base = String(raw ?? '').trim();
    const key = base.toLowerCase();
    const normalized =
      key === 'черновик'
        ? 'draft'
        : key === 'на утверждении'
          ? 'pending'
          : key === 'утверждена' || key === 'утверждено'
            ? 'approved'
            : key === 'отклонена' || key === 'отклонено'
              ? 'rejected'
              : key;
    const info = REQUEST_STATUS_STYLES[normalized];
    if (info) return info;
    if (!base) return { label: '—', bg: '#E2E8F0', fg: '#0F172A' };
    return { label: base, bg: '#E2E8F0', fg: '#0F172A' };
  }, []);

  // display_no cache and preload
  const [displayNoByReq, setDisplayNoByReq] = useState<Record<string, string>>(
    {},
  );

  // Ref cache to avoid repeated display_no fetches
  const displayNoCacheRef = useRef<Record<string, string>>({});
  const displayNoStateRef = useRef<Record<string, string>>({});
  useEffect(() => {
    displayNoStateRef.current = displayNoByReq;
  }, [displayNoByReq]);

  const labelForRequest = useCallback(
    (rid?: string | number | null) => {
      const key = String(rid ?? '').trim();
      if (!key) return '';
      if (requestId && key === String(requestId).trim()) {
        const current = String(requestDetails?.display_no ?? '').trim();
        if (current) return current;
      }
      const dn = displayNoByReq[key];
      if (dn && dn.trim()) return dn.trim();
      return `#${shortId(key)}`;
    },
    [displayNoByReq, requestDetails?.display_no, requestId],
  );

  const preloadDisplayNo = useCallback(async (rid?: string | number | null) => {
    const key = String(rid ?? '').trim();
    if (!key) return;

    // 1) already present in state
    if (displayNoStateRef.current[key] != null) return;

    // 2) cached in ref: mirror to state and return
    const cached = displayNoCacheRef.current[key];
    if (cached !== undefined) {
      setDisplayNoByReq((prev) => ({ ...prev, [key]: cached }));
      return;
    }

    try {
      const display = await fetchRequestDisplayNo(key);

      if (display) {
        displayNoCacheRef.current[key] = display;
        setDisplayNoByReq((prev) => ({ ...prev, [key]: display }));
      } else {
        displayNoCacheRef.current[key] = '';
        setDisplayNoByReq((prev) => ({ ...prev, [key]: '' }));
      }
    } catch (e) {
      console.warn('[Foreman] preloadDisplayNo:', toErrorText(e, String(e ?? "")));
    }
  }, []);


  const loadDetails = useCallback(
    async (rid?: string | number | null) => {
      const key = rid != null ? ridStr(rid) : requestId;
      if (!key) {
        setRequestDetails(null);
        return null;
      }
      try {
        const details = await fetchRequestDetails(key);
        if (!details) {
          setRequestDetails(null);
          return null;
        }
        setRequestDetails(details);
        const display = String(details.display_no ?? '').trim();
        if (display) {
          setDisplayNoByReq((prev) => ({ ...prev, [key]: display }));
        }
        setForeman(details.foreman_name ?? '');
        setComment(details.comment ?? '');
        setObjectType(details.object_type_code ?? '');
        setLevel(details.level_code ?? '');
        setSystem(details.system_code ?? '');
        setZone(details.zone_code ?? '');
        return details;
      } catch (e) {
        console.warn('[Foreman] loadDetails:', toErrorText(e, String(e ?? "")));
        return null;
      } finally {
      }
    },
    [requestId, ridStr, setDisplayNoByReq],
  );

  const loadItems = useCallback(
    async (ridOverride?: string | number | null) => {
      const target = ridOverride ?? requestId;
      const key = target != null ? ridStr(target) : '';
      if (!key) {
        setItems([]);
        return;
      }
      try {
        const rows = await listRequestItems(key);
        setItems(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error('[Foreman] listRequestItems error:', e);
        setItems([]);
      }
    },
    [requestId, ridStr],
  );
  const openRequestById = useCallback(
    (targetId: string | number | null | undefined) => {
      const id = targetId != null ? String(targetId).trim() : '';
      if (!id) return;
      setRequestId(id);
      loadItems(id);
    },
    [loadItems],
  );


  useEffect(() => {
    setQtyDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const row of items) {
        const key = String(row.id);
        const prevVal = prev[key];
        next[key] = typeof prevVal !== 'undefined' ? prevVal : formatQtyInput(row.qty);
      }
      return next;
    });
    setQtyBusyMap((prev) => {
      const next: Record<string, boolean> = {};
      for (const row of items) {
        const key = String(row.id);
        if (prev[key]) next[key] = prev[key];
      }
      return next;
    });
  }, [items, formatQtyInput]);

  const handleObjectChange = useCallback(
    (code: string) => {
      setObjectType(code);
      const opt = objOptions.find((o) => o.code === code);
      setRequestDetails((prev) =>
        prev
          ? {
            ...prev,
            object_type_code: code || null,
            object_name_ru: opt?.name ?? prev.object_name_ru ?? null,
          }
          : prev,
      );
    },
    [objOptions],
  );

  const handleLevelChange = useCallback(
    (code: string) => {
      setLevel(code);
      const opt = lvlOptions.find((o) => o.code === code);
      setRequestDetails((prev) =>
        prev
          ? {
            ...prev,
            level_code: code || null,
            level_name_ru: opt?.name ?? prev.level_name_ru ?? null,
          }
          : prev,
      );
    },
    [lvlOptions],
  );

  const handleSystemChange = useCallback(
    (code: string) => {
      setSystem(code);
      const opt = sysOptions.find((o) => o.code === code);
      setRequestDetails((prev) =>
        prev
          ? {
            ...prev,
            system_code: code || null,
            system_name_ru: opt?.name ?? prev.system_name_ru ?? null,
          }
          : prev,
      );
    },
    [sysOptions],
  );

  const handleZoneChange = useCallback(
    (code: string) => {
      setZone(code);
      const opt = zoneOptions.find((o) => o.code === code);
      setRequestDetails((prev) =>
        prev
          ? {
            ...prev,
            zone_code: code || null,
            zone_name_ru: opt?.name ?? prev.zone_name_ru ?? null,
          }
          : prev,
      );
    },
    [zoneOptions],
  );

  const handleForemanChange = useCallback((value: string) => {
    setForeman(value);
    setRequestDetails((prev) =>
      prev
        ? {
          ...prev,
          foreman_name: value,
        }
        : prev,
    );
  }, []);

  const handleOpenHistory = useCallback(() => {
    const name = foreman.trim();

    if (!name) {
      Alert.alert(
        'История заявок',
        'Укажи ФИО прораба в шапке, чтобы посмотреть его историю.',
      );
      return;
    }

    setHistoryVisible(true);
    setHistoryLoading(true);

    (async () => {
      try {
        const rows = await listForemanRequests(name, 50);
        if (Array.isArray(rows)) {
          setHistoryRequests(rows);
        } else {
          setHistoryRequests([]);
        }
      } catch (e) {
        console.warn('[Foreman] listForemanRequests:', e);
        Alert.alert(FOREMAN_TEXT.historyTitle, FOREMAN_TEXT.historyLoadError);
        setHistoryRequests([]);
      } finally {
        setHistoryLoading(false);
      }

    })();
  }, [foreman]);

  const handleCloseHistory = useCallback(() => setHistoryVisible(false), []);

  const handleHistorySelect = useCallback(
    (reqId: string) => {
      openRequestById(reqId);
      setHistoryVisible(false);
    },
    [openRequestById],
  );
  const openHistoryPdf = useCallback(async (reqId: string) => {
    const rid = String(reqId).trim();
    if (!rid) return;

    await runPdfTop({
      busy: gbusy,
      supabase,
      key: `pdf:history:${rid}`,
      label: "Готовлю PDF...",
      mode: "preview",
      fileName: `Заявка_${rid}`,
      getRemoteUrl: () => exportRequestPdf(rid, "preview"),
    });
  }, [gbusy, supabase]);




  // Восстанавливаем только уже существующий локальный черновик.
  // Новый черновик создается лениво при первом действии пользователя.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const localId = String(getLocalDraftId() ?? '').trim();
        if (!localId) return;
        const details = await fetchRequestDetails(localId);
        if (cancelled) return;

        if (details && isDraftLikeStatus(details.status)) {
          setRequestId(localId);
          setRequestDetails(details);
          const display = String(details.display_no ?? '').trim();
          if (display) {
            setDisplayNoByReq((prev) => ({ ...prev, [localId]: display }));
          }
          return;
        }

        clearDraftCache();
      } catch (e: unknown) {
        console.warn('[Foreman] restore local draft failed:', toErrorText(e, String(e ?? "")));
        clearDraftCache();
      }
    })();

    return () => { cancelled = true; };
  }, [clearDraftCache]);


  const lastPreloadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!requestId) return;

    const rid = String(requestId).trim();
    if (lastPreloadRef.current !== rid) {
      lastPreloadRef.current = rid;
      preloadDisplayNo(rid);
    }

    loadDetails(rid);
  }, [requestId, preloadDisplayNo, loadDetails]);


  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const requestDraftMeta = useMemo<RequestDraftMeta>(
    () => ({
      foreman_name: foreman.trim() || null,
      comment: comment.trim() || null,
      object_type_code: objectType || null,
      level_code: level || null,
      system_code: system || null,
      zone_code: zone || null,
    }),
    [comment, foreman, level, objectType, system, zone],
  );

  // Ensure draft request id, creating draft lazily if needed.
  const ensureAndGetId = useCallback(async () => {
    const existing = requestId ? ridStr(requestId) : '';
    if (existing) return existing;

    try {
      const created = await requestCreateDraft(requestDraftMeta);
      if (created?.id) {
        const idStr = String(created.id);
        setRequestId(idStr);
        setLocalDraftId(idStr);
        const display = String(created.display_no ?? '').trim();
        if (display) {
          setDisplayNoByReq((prev) => ({ ...prev, [idStr]: display }));
        }
        await loadDetails(idStr);
        return idStr;
      }
    } catch (e: unknown) {
      console.warn('[Foreman] ensureAndGetId/createDraft:', toErrorText(e, String(e ?? "")));
    }

    Alert.alert(
      FOREMAN_TEXT.errorTitle,
      FOREMAN_TEXT.draftCreateError,
    );
    throw new Error('Failed to create draft');
  }, [loadDetails, requestDraftMeta, requestId, ridStr]);
  const ensureRequestId = useCallback(async () => {
    return requestId ? ridStr(requestId) : await ensureAndGetId();
  }, [ensureAndGetId, requestId, ridStr]);

  // Human-readable labels for selected scope
  const objectName = useMemo(() => {
    const opt = objOptions.find((o) => o.code === objectType);
    if (opt?.name) return opt.name;
    return requestDetails?.object_name_ru ?? '';
  }, [objOptions, objectType, requestDetails?.object_name_ru]);
  const levelName = useMemo(() => {
    const opt = lvlOptions.find((o) => o.code === level);
    if (opt?.name) return opt.name;
    return requestDetails?.level_name_ru ?? '';
  }, [level, lvlOptions, requestDetails?.level_name_ru]);
  const systemName = useMemo(() => {
    const opt = sysOptions.find((o) => o.code === system);
    if (opt?.name) return opt.name;
    return requestDetails?.system_name_ru ?? '';
  }, [requestDetails?.system_name_ru, sysOptions, system]);
  const zoneName = useMemo(() => {
    const opt = zoneOptions.find((o) => o.code === zone);
    if (opt?.name) return opt.name;
    return requestDetails?.zone_name_ru ?? '';
  }, [requestDetails?.zone_name_ru, zone, zoneOptions]);
  const scopeNote = useMemo(
    () => buildScopeNote(objectName, levelName, systemName, zoneName) || '—',
    [levelName, objectName, systemName, zoneName],
  );

  const syncRequestHeaderMeta = useCallback(
    async (rid: string, context: string) => {
      await updateRequestMeta(rid, requestDraftMeta).catch((e) =>
        console.warn(`[Foreman] updateMeta err in ${context}:`, e),
      );
    },
    [requestDraftMeta],
  );

  const appendRowsToDraft = useCallback(
    async (rid: string, rows: DraftAppendRow[]) => {
      const POOL = Platform.OS === 'web' ? 10 : 6;
      const results = await runPool(rows, POOL, async (row) => {
        await requestItemAddOrIncAndPatchMeta(rid, row.rik_code, row.qty, row.meta);
        return true;
      });

      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;
      const failLines: string[] = [];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const src = rows[i];
        const code = String(src?.rik_code ?? '—');
        const name = String(src?.errorLabel ?? '').trim() || code;
        if (!("error" in r)) continue;
        const msg = toErrorText(r.error).replace(/\s+/g, ' ').trim();
        failLines.push(`• ${name} (${code}) — ${msg}`);
        if (failLines.length >= 4) break;
      }

      return { okCount, failCount, failLines };
    },
    [],
  );
  const getCalcDisplayName = useCallback((row: CalcRow) => {
    return (
      row.item_name_ru ??
      row.name_human ??
      row.name_ru ??
      row.name ??
      ruName(row) ??
      '—'
    );
  }, []);
  const buildPreparedCalcRows = useCallback(
    (rows: ReturnType<typeof aggCalcRows>): DraftAppendRow[] =>
      rows.map((row) => {
        const displayName = getCalcDisplayName(row);
        return {
          rik_code: row.rik_code,
          qty: row.qty,
          errorLabel:
            String(row.item_name_ru ?? row.name_human ?? row.name_ru ?? row.name ?? '').trim() ||
            displayName,
          meta: {
            note: scopeNote,
            app_code: null,
            kind: null,
            name_human: displayName,
            uom: row.uom_code ?? null,
          },
        };
      }),
    [getCalcDisplayName, scopeNote],
  );
  const buildPreparedPickedRows = useCallback(
    (rows: ReturnType<typeof aggPickedRows>): DraftAppendRow[] =>
      rows.map((x) => {
        const r = x.base;
        return {
          rik_code: r.rik_code,
          qty: x.qty,
          errorLabel: r.name,
          meta: {
            note: scopeNote,
            app_code: r.app_code ?? null,
            kind: r.kind ?? null,
            name_human: r.name,
            uom: r.uom ?? null,
          },
        };
      }),
    [scopeNote],
  );
  const runWithBusy = useCallback(async <T,>(task: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await task();
    } finally {
      setBusy(false);
    }
  }, []);
  const alertError = useCallback((error: unknown, fallback: string) => {
    Alert.alert(FOREMAN_TEXT.errorTitle, toErrorText(error, fallback));
  }, []);
  const logAndAlertError = useCallback(
    (scope: string, error: unknown, fallback: string) => {
      const msg = toErrorText(error, fallback);
      console.error(`[Foreman] ${scope}:`, msg);
      alertError(error, fallback);
    },
    [alertError],
  );

  // Calculator: append aggregated rows to draft
  const handleCalcAddToRequest = useCallback(
    async (rows: CalcRow[]) => {
      if (!rows || rows.length === 0) {
        setCalcVisible(false);
        return;
      }

      if (!ensureEditableContext()) return;

      try {
        await runWithBusy(async () => {
          const rid = await ensureRequestId();

          await syncRequestHeaderMeta(rid, "handleCalcAddToRequest");

          const aggregated = aggCalcRows(rows);
          const prepared = buildPreparedCalcRows(aggregated);
          const { okCount, failCount, failLines } = await appendRowsToDraft(rid, prepared);
          await loadItems(rid);
          setCalcVisible(false);
          setSelectedWorkType(null);

          if (failCount > 0) {
            const tail = failCount > failLines.length ? `\n…ещё ${failCount - failLines.length} ошибок` : '';
            Alert.alert(
              'Готово (частично)',
              `Добавлено: ${okCount}\nОшибок: ${failCount}\n\nПроблемные позиции:\n${failLines.join('\n')}${tail}`
            );
          } else {
            Alert.alert('Готово', `Добавлено позиций: ${okCount}`);
          }
        });
      } catch (e: unknown) {
        logAndAlertError('handleCalcAddToRequest', e, FOREMAN_TEXT.calcAddError);
      }

    },
    [
      ensureRequestId,
      loadItems,
      ensureEditableContext,
      syncRequestHeaderMeta,
      appendRowsToDraft,
      buildPreparedCalcRows,
      runWithBusy,
      logAndAlertError,
    ],
  );
  const commitCatalogToDraft = useCallback(async (rows: PickedRow[]) => {
    if (!rows?.length) return;

    if (!ensureEditableContext()) return;

    try {
      await runWithBusy(async () => {
        const rid = await ensureRequestId();
        await syncRequestHeaderMeta(rid, "commitCatalogToDraft");
        const aggregated = aggPickedRows(rows);
        const prepared = buildPreparedPickedRows(aggregated);
        const { okCount, failCount } = await appendRowsToDraft(rid, prepared);
        if (failCount > 0) {
          Alert.alert('Каталог (частично)', `Добавлено: ${okCount}\nОшибок: ${failCount}`);
        }
        await loadItems(rid);
      });
    } catch (e: unknown) {
      logAndAlertError('commitCatalogToDraft', e, FOREMAN_TEXT.catalogAddError);
    }
  }, [
    ensureRequestId,
    ensureEditableContext,
    loadItems,
    syncRequestHeaderMeta,
    appendRowsToDraft,
    buildPreparedPickedRows,
    runWithBusy,
    logAndAlertError,
  ]);


  const setQtyDraftFromItem = useCallback(
    (item: ReqItemRow) => {
      const key = String(item.id);
      setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
    },
    [formatQtyInput],
  );
  const setRowBusy = useCallback((itemId: string | number, value: boolean) => {
    const key = String(itemId);
    setQtyBusyMap((prev) => ({ ...prev, [key]: value }));
  }, []);
  const commitQtyChange = useCallback(
    async (item: ReqItemRow, draftValue: string) => {
      const key = String(item.id);
      const currentRequest = String(requestDetails?.id ?? '').trim();
      if (!isDraftActive || !currentRequest || !canEditRequestItem(item)) {
        setQtyDraftFromItem(item);
        return;
      }

      const parsed = parseQtyValue(draftValue);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        Alert.alert(FOREMAN_TEXT.qtyTitle, FOREMAN_TEXT.qtyPositiveHint);
        setQtyDraftFromItem(item);
        return;
      }

      const original = Number(item.qty ?? 0);
      if (Math.abs(parsed - original) < 1e-9) {
        setQtyDraftFromItem(item);
        return;
      }

      setRowBusy(item.id, true);
      try {
        const updated = await requestItemUpdateQty(key, parsed, currentRequest);
        if (updated) {
          setItems((prev) =>
            prev.map((row) =>
              row.id === updated.id ? { ...row, qty: updated.qty } : row,
            ),
          );
          setQtyDrafts((prev) => ({
            ...prev,
            [key]: formatQtyInput(updated.qty),
          }));
        }
      } catch (e: unknown) {
        alertError(e, FOREMAN_TEXT.qtyUpdateError);
        setQtyDraftFromItem(item);
      } finally {
        setRowBusy(item.id, false);
      }
    },
    [
      canEditRequestItem,
      formatQtyInput,
      isDraftActive,
      parseQtyValue,
      requestDetails?.id,
      requestItemUpdateQty,
      setItems,
      alertError,
      setQtyDraftFromItem,
      setRowBusy,
    ],
  );
  const syncPendingQtyDrafts = useCallback(async () => {
    for (const item of items) {
      if (!canEditRequestItem(item)) continue;
      const key = String(item.id);
      const draftVal = qtyDrafts[key];
      const currentFormatted = formatQtyInput(item.qty);

      if (
        typeof draftVal === 'string' &&
        draftVal.trim() !== '' &&
        draftVal.trim() !== currentFormatted
      ) {
        await commitQtyChange(item, draftVal);
      }
    }
  }, [canEditRequestItem, commitQtyChange, formatQtyInput, items, qtyDrafts]);
  const applySubmittedRequestState = useCallback(
    (rid: string, submitted: Awaited<ReturnType<typeof requestSubmit>>) => {
      if (submitted?.display_no) {
        setDisplayNoByReq((prev) => ({
          ...prev,
          [rid]: String(submitted.display_no),
        }));
      }
      setRequestDetails((prev) =>
        prev
          ? {
            ...prev,
            status: submitted?.status ?? 'pending',
            display_no: submitted?.display_no ?? prev.display_no ?? null,
            foreman_name: submitted?.foreman_name ?? prev.foreman_name ?? foreman,
            comment: submitted?.comment ?? prev.comment ?? comment,
          }
          : prev,
      );
    },
    [comment, foreman],
  );
  const finalizeAfterSubmit = useCallback(async () => {
    clearDraftCache();
    await saveForemanToHistory(foreman);
    await refreshForemanHistory();
    resetDraftState();
  }, [clearDraftCache, foreman, refreshForemanHistory, resetDraftState]);
  const ensureCanSubmitToDirector = useCallback(() => {
    if (!ensureEditableContext({ draftFirst: true, draftMessage: FOREMAN_TEXT.submitNeedDraftHint })) {
      return false;
    }
    if ((items?.length ?? 0) === 0) {
      Alert.alert(
        FOREMAN_TEXT.submitEmptyTitle,
        FOREMAN_TEXT.submitEmptyHint,
      );
      return false;
    }
    return true;
  }, [ensureEditableContext, items]);

  // Submit to director
  const submitToDirector = useCallback(async () => {
    try {
      if (!ensureCanSubmitToDirector()) return;

      await runWithBusy(async () => {
        const rid: string = await ensureRequestId();
        await syncPendingQtyDrafts();
        await syncRequestHeaderMeta(rid, 'submitToDirector');
        const submitted = await requestSubmit(rid);
        applySubmittedRequestState(rid, submitted);
        const submittedLabel = submitted?.display_no ?? labelForRequest(rid);
        showHint(
          FOREMAN_TEXT.submitSentTitle,
          `Заявка ${submittedLabel} отправлена на утверждение`,
        );
        await finalizeAfterSubmit();
      });
    } catch (e: unknown) {
      logAndAlertError('submitToDirector', e, FOREMAN_TEXT.submitError);
    }
  }, [
    ensureRequestId,
    runWithBusy,
    applySubmittedRequestState,
    finalizeAfterSubmit,
    labelForRequest,
    ensureCanSubmitToDirector,
    syncPendingQtyDrafts,
    syncRequestHeaderMeta,
    logAndAlertError,
  ]);

  const handleCalcPress = useCallback(() => {
    if (busy) return;
    if (!ensureEditableContext()) return;
    setWorkTypePickerVisible(true);
  }, [busy, ensureEditableContext]);

  // ---------- PDF ----------
  const runRequestPdf = useCallback(
    async (mode: "share" | "preview") => {
      if (!ensureHeaderReady()) return;

      const rid = await ensureRequestId();
      const ridKey = String(rid).trim();
      const fileName = requestDetails?.display_no ? `Заявка_${requestDetails.display_no}` : `Заявка_${ridKey}`;

      await syncRequestHeaderMeta(ridKey, mode === "share" ? "onPdfShare" : "onPdfExport");

      await runPdfTop({
        busy: gbusy,
        supabase,
        key: mode === "share" ? `pdfshare:request:${ridKey}` : `pdf:request:${ridKey}`,
        label: mode === "share" ? "Подготавливаю файл..." : "Готовлю PDF...",
        mode,
        fileName,
        getRemoteUrl: () => exportRequestPdf(ridKey, mode),
      });
    },
    [ensureHeaderReady, ensureRequestId, requestDetails?.display_no, syncRequestHeaderMeta, gbusy],
  );

  const onPdfShare = useCallback(async () => {
    await runRequestPdf("share");
  }, [runRequestPdf]);

  const onPdf = useCallback(async () => {
    await runRequestPdf("preview");
  }, [runRequestPdf]);
  const removeDraftRowLocal = useCallback((itemId: string | number) => {
    const key = String(itemId);
    setItems((prev) => prev.filter((x) => String(x.id) !== key));
    setQtyDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);
  const buildReqItemMetaLine = useCallback(
    (item: ReqItemRow) => {
      return [
        `${item.qty ?? '-'} ${item.uom ?? ''}`.trim(),
        item.app_code ? labelForApp(item.app_code) : null,
      ]
        .filter(Boolean)
        .join(' · ');
    },
    [labelForApp],
  );
  const cancelRowAndRemove = useCallback(
    async (itemId: string | number) => {
      setRowBusy(itemId, true);
      try {
        await requestItemCancel(String(itemId));
        removeDraftRowLocal(itemId);
      } finally {
        setRowBusy(itemId, false);
      }
    },
    [removeDraftRowLocal, requestItemCancel, setRowBusy],
  );

  const handleRemoveDraftRow = useCallback(
    async (it: ReqItemRow) => {
      const key = String(it.id);
      if (cancelLockRef.current[key]) return;
      cancelLockRef.current[key] = true;

      try {
        if (Platform.OS === 'web') {
          const ok = webUi.confirm?.(`${FOREMAN_TEXT.deleteConfirmTitle}\n\n${it.name_human || FOREMAN_TEXT.deleteConfirmFallback}`) ?? false;
          if (!ok) return;

          await cancelRowAndRemove(it.id);
          webUi.alert?.(FOREMAN_TEXT.deleteDone);
          return;
        }

        Alert.alert(FOREMAN_TEXT.deleteConfirmTitle, it.name_human || FOREMAN_TEXT.deleteConfirmFallback, [
          { text: 'Нет', style: 'cancel' },
          {
            text: 'Отменить',
            style: 'destructive',
            onPress: async () => {
              await cancelRowAndRemove(it.id);
            },
          },
        ]);
      } finally {
        cancelLockRef.current[key] = false;
      }
    },
    [cancelRowAndRemove],
  );

  const renderReqItem = useCallback(
    ({ item }: { item: ReqItemRow }) => {
      const key = String(item.id);
      const metaLine = buildReqItemMetaLine(item);

      return (
        <ForemanReqItemRow
          item={item}
          busy={busy}
          updating={!!qtyBusyMap[key]}
          canEdit={canEditRequestItem(item)}
          metaLine={metaLine}
          onCancel={handleRemoveDraftRow}
          ui={UI}
          styles={s}
        />
      );
    },
    [busy, qtyBusyMap, canEditRequestItem, buildReqItemMetaLine, handleRemoveDraftRow],
  );

  // ---------- UI ----------

  const currentDisplayLabel = useMemo(() => {
    if (requestDetails?.display_no) return requestDetails.display_no;
    if (requestId) return labelForRequest(requestId);
    return 'будет создана автоматически';
  }, [labelForRequest, requestDetails?.display_no, requestId]);

  const HEADER_MAX = 98;
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
    const ridKey = String(requestId || "").trim();
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[s.container, { backgroundColor: UI.bg }]}>
        <View pointerEvents="none" style={s.bgGlow} />
        {/* Fixed collapsing header */}
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
          {/* Title row */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <Animated.Text style={[s.cTitle, { fontSize: titleSize, color: UI.text }]} numberOfLines={1}>
              {foremanMainTab === 'materials' ? 'Заявка' : 'Подряды'}
            </Animated.Text>
            {/* Табы: Материалы / Подряды */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              {(['materials', 'subcontracts'] as const).map((tab) => {
                const isActive = foremanMainTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setForemanMainTab(tab)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      borderRadius: 10,
                      backgroundColor: isActive ? '#0EA5E9' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Text style={{ color: isActive ? '#fff' : UI.sub, fontWeight: '800', fontSize: 13 }}>
                      {tab === 'materials' ? 'Материалы' : 'Подряды'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

        </Animated.View>

        {/* Таб Подряды */}
        {foremanMainTab === 'subcontracts' ? (
          <ForemanSubcontractTab
            contentTopPad={contentTopPad}
            onScroll={onScroll}
            dicts={{
              objOptions,
              lvlOptions,
              sysOptions,
            }}
          />
        ) : null}

        {/* Таб Материалы — весь существующий черновик без изменений */}
        {foremanMainTab === 'materials' ? (
          <>
            <ForemanEditorSection
              contentTopPad={contentTopPad}
              onScroll={onScroll}
              foreman={foreman}
              onForemanChange={handleForemanChange}
              foremanFocus={foremanFocus}
              setForemanFocus={setForemanFocus}
              blurTimerRef={blurTimerRef}
              foremanHistory={foremanHistory}
              objectType={objectType}
              level={level}
              system={system}
              zone={zone}
              objOptions={objOptions}
              lvlOptions={lvlOptions}
              sysOptions={sysOptions}
              zoneOptions={zoneOptions}
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
              itemsCount={items?.length ?? 0}
              onOpenHistory={handleOpenHistory}
              ui={UI}
              styles={s}
            />

            <ForemanHistoryModal
              visible={historyVisible}
              onClose={handleCloseHistory}
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
              draftCount={items?.length ?? 0}
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
              onClose={() => {
                setCalcVisible(false);
                setSelectedWorkType(null);
              }}
              onBack={() => {
                setCalcVisible(false);
                setSelectedWorkType(null);
                setWorkTypePickerVisible(true);
              }}
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
              ui={UI}
              styles={s}
            />
          </>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
