// app/(tabs)/foreman.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import CalcModal from "../../src/components/foreman/CalcModal";
import WorkTypePicker from "../../src/components/foreman/WorkTypePicker";
import { runPdfTop } from "../../src/lib/pdfRunner";
import CatalogModal from '../../src/components/foreman/CatalogModal';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalBusy } from '../../src/ui/GlobalBusy';
import { supabase } from '../../src/lib/supabaseClient';
import RNModal from "react-native-modal";
import SendPrimaryButton from "../../src/ui/SendPrimaryButton";
import DeleteAllButton from "../../src/ui/DeleteAllButton";
import {
  rikQuickSearch,
  listRequestItems,
  fetchRequestDisplayNo,
  fetchRequestDetails,
  updateRequestMeta,
  requestSubmit,
  exportRequestPdf,
  getOrCreateDraftRequestId,
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

type PickedRow = {
  rik_code: string;
  name: string;
  uom?: string | null;
  kind?: string | null; // Материал | Работа | Услуга
  qty: string; // ввод
  app_code?: string | null; // применение
  note: string; // примечание (обязательно)
  appsFromItem?: string[]; // чипсы из rik_quick_search
};
type AppOption = { code: string; label: string };
type RefOption = { code: string; name: string };

type CalcRow = {
  rik_code: string;
  qty: number;
  uom_code?: string | null;
  name?: string | null;
  name_ru?: string | null;
  name_human?: string | null;
  item_name_ru?: string | null;
  work_type_code?: string | null;
  hint?: string | null;
};

type RequestDraftMeta = Parameters<typeof requestCreateDraft>[0];


const UI = {
  bg: '#0B0F14',        // общий фон (почти чёрный)
  cardBg: '#101826',    // карточки/хедер (чуть светлее)
  text: '#F8FAFC',      // основной текст (белый)
  sub: '#9CA3AF',       // вторичный текст (серый)
  border: '#1F2A37',    // границы (тёмные)

  btnApprove: '#22C55E', // зелёный
  btnReject:  '#EF4444', // красный
  btnNeutral: 'rgba(255,255,255,0.08)',
  accent: '#22C55E',
};
const TYPO = {
  titleLg: { fontSize: 24, fontWeight: '800' as const },
  titleSm: { fontSize: 16, fontWeight: '900' as const },

  sectionTitle: { fontSize: 20, fontWeight: '800' as const },
  groupTitle: { fontSize: 18, fontWeight: '900' as const },

  bodyStrong: { fontSize: 16, fontWeight: '800' as const },
  body: { fontSize: 14, fontWeight: '700' as const },

  meta: { fontSize: 12, fontWeight: '800' as const, letterSpacing: 0.2 },
  kpiLabel: { fontSize: 12, fontWeight: '700' as const },
  kpiValue: { fontSize: 12, fontWeight: '900' as const },

  btn: { fontSize: 13, fontWeight: '900' as const, letterSpacing: 0.2 },
};
const REQUEST_STATUS_STYLES: Record<string, { label: string; bg: string; fg: string }> = {
  draft: { label: 'Черновик', bg: '#E2E8F0', fg: '#0F172A' },
  pending: { label: 'На утверждении', bg: '#FEF3C7', fg: '#92400E' },
  approved: { label: 'Утверждена', bg: '#DCFCE7', fg: '#166534' },
  rejected: { label: 'Отклонена', bg: '#FEE2E2', fg: '#991B1B' },
};
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
// ===== DEV LOG (не влияет на прод) =====
const DEV_LOG = typeof __DEV__ !== "undefined" ? __DEV__ : (process.env.NODE_ENV !== "production");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dlog(...args: any[]) {
  if (!DEV_LOG) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}


// ——— Русское отображение названий (UI only; бизнес-логика не меняется)
function ruName(it: any): string {
  const direct =
    it?.name_ru ??
    it?.name_human_ru ??
    it?.display_name ??
    it?.alias_ru ??
    it?.name_human;
  if (direct && String(direct).trim()) return String(direct).trim();
  const code: string = String(it?.rik_code ?? it?.code ?? '').toUpperCase();
  if (!code) return '';
  const dict: Record<string, string> = {
    MAT: '',
    WRK: '',
    SRV: '',
    BETON: 'Бетон',
    CONC: 'Бетон',
    MORTAR: 'Раствор',
    ROOF: 'Кровля',
    TILE: 'Плитка',
    FOUND: 'Фундамент',
    WALL: 'Стена',
    FLOOR: 'Пол',
    STEEL: 'Сталь',
    METAL: 'Металл',
    FRAME: 'Каркас',
    FORM: 'Опалубка',
    POUR: 'Заливка',
    CURE: 'Уход',
    EXT: 'Наружн.',
    INT: 'Внутр.',
  };
  const parts = code
    .split(/[-_]/g)
    .filter(Boolean)
    .map((t) => dict[t] ?? t)
    .filter(Boolean);
  const human = parts.join(' ').replace(/\s+/g, ' ').trim();
  return human ? human[0].toUpperCase() + human.slice(1) : code;
}
async function requestItemAddOrIncAndPatchMeta(
  rid: string,
  rik_code: string,
  qtyAdd: number,
  meta?: { note?: string | null; app_code?: string | null; kind?: string | null; name_human?: string | null; uom?: string | null }
): Promise<string> {
  if (!rik_code) throw new Error('rik_code is empty');
  const q = Number(qtyAdd);
  if (!Number.isFinite(q) || q <= 0) throw new Error('qty must be > 0');

  // 1) железно: инкремент/вставка по UNIQUE(request_id, rik_code)
  const { data: id, error } = await supabase.rpc('request_item_add_or_inc' as any, {
    p_request_id: rid,
    p_rik_code: rik_code,
    p_qty_add: q,
  } as any);

  if (error) throw error;
  const itemId = String(id ?? '').trim();
  if (!itemId) throw new Error('request_item_add_or_inc returned empty id');

  // 2) meta-поля: пытаемся обновить (если RLS запрещает — не роняем добавление qty)
  const patch: Record<string, any> = {};
  if (meta) {
    if (Object.prototype.hasOwnProperty.call(meta, 'note')) patch.note = meta.note ?? null;
    if (Object.prototype.hasOwnProperty.call(meta, 'app_code')) patch.app_code = meta.app_code ?? null;
    if (Object.prototype.hasOwnProperty.call(meta, 'kind')) patch.kind = meta.kind ?? null;
    if (Object.prototype.hasOwnProperty.call(meta, 'name_human') && meta.name_human) patch.name_human = meta.name_human;
    if (Object.prototype.hasOwnProperty.call(meta, 'uom')) patch.uom = meta.uom ?? null;
  }

  // статус на всякий (чтобы новая строка была черновик)
  patch.status = 'Черновик';

  if (Object.keys(patch).length) {
    try {
      await supabase
        .from('request_items' as any)
        .update(patch)
        .eq('id', itemId);
    } catch {
      // не критично
    }
  }

  return itemId;
}
function aggCalcRows(rows: CalcRow[]) {
  const map = new Map<string, {
    rik_code: string;
    qty: number;
    uom_code?: string | null;
    name_human?: string | null;
    item_name_ru?: string | null;
    name_ru?: string | null;
    name?: string | null;
  }>();

  for (const r of (rows || [])) {
    const code = String(r?.rik_code ?? '').trim();
    if (!code) continue;

    const q = Number(r?.qty ?? 0);
    if (!Number.isFinite(q) || q <= 0) continue;

    const prev = map.get(code);
    if (!prev) {
      map.set(code, {
        rik_code: code,
        qty: q,
        uom_code: r?.uom_code ?? null,
        name_human: (r as any)?.name_human ?? null,
        item_name_ru: (r as any)?.item_name_ru ?? null,
        name_ru: (r as any)?.name_ru ?? null,
        name: (r as any)?.name ?? null,
      });
    } else {
      prev.qty += q;

      // “дотягиваем” недостающие поля (чтобы было красивое имя/uom)
      if (!prev.uom_code && r?.uom_code) prev.uom_code = r.uom_code;
      if (!prev.item_name_ru && (r as any)?.item_name_ru) prev.item_name_ru = (r as any).item_name_ru;
      if (!prev.name_human && (r as any)?.name_human) prev.name_human = (r as any).name_human;
      if (!prev.name_ru && (r as any)?.name_ru) prev.name_ru = (r as any).name_ru;
      if (!prev.name && (r as any)?.name) prev.name = (r as any).name;
    }
  }

  return Array.from(map.values());
}
// ===== Catalog aggregation (ANTI-DUPLICATE) =====
function aggPickedRows(rows: PickedRow[]) {
  const map = new Map<string, { base: PickedRow; qty: number }>();

  for (const r of (rows || [])) {
    const code = String(r?.rik_code ?? '').trim();
    if (!code) continue;

    const q = Number(String(r.qty ?? '').trim().replace(',', '.'));
    if (!Number.isFinite(q) || q <= 0) continue;

    const prev = map.get(code);
    if (!prev) map.set(code, { base: r, qty: q });
    else prev.qty += q;
  }

  return Array.from(map.values());
}
// ===== Concurrency pool (чтобы не застрелить сеть/мобилку) =====
async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<Array<{ ok: true; value: R } | { ok: false; error: any }>> {
  const n = Math.max(1, Math.min(20, Number(limit) || 6));
  const results: Array<{ ok: true; value: R } | { ok: false; error: any }> = new Array(items.length);

  let i = 0;
  const next = async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        const value = await worker(items[idx], idx);
        results[idx] = { ok: true, value };
      } catch (error) {
        results[idx] = { ok: false, error };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => next()));
  return results;
}


/* -------------------- Dropdown (универсальный) -------------------- */
function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Выбрать...',
  searchable = true,
  width = 280,
}: {
  label: string;
  options: { code: string; name: string }[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  searchable?: boolean;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const picked = options.find((o) => o.code === value);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter((o) =>
      (o.name + ' ' + o.code).toLowerCase().includes(qq),
    );
  }, [q, options]);

  return (
    <View style={{ marginTop: 6, marginBottom: 8 }}>
      <Text style={s.small}>{label}</Text>

      <Pressable
  onPress={() => setOpen(true)}
  style={[s.input, s.selectRow, { width: Platform.OS === 'web' ? width : '100%' }]}
>
  <Text
    style={{
      color: UI.text,
      opacity: picked ? 1 : 0.55,
      fontWeight: '800',
      fontSize: 14,
      flex: 1,
    }}
    numberOfLines={1}
  >
    {picked ? picked.name : placeholder}
  </Text>

  <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.55)" />
</Pressable>


      {open && (
        <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
            <View style={s.backdrop} />
          </Pressable>
          <View style={[s.modalSheet, { maxWidth: 420, left: 16, right: 16 }]}>
            <Text
  style={{
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 8,
    color: UI.text,
  }}
>
  {label}
</Text>

            {searchable && (
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Поиск…"
                style={s.input}
              />
            )}
            <FlatList
              data={filtered}
              keyExtractor={(o, idx) => `ref:${o.code}:${idx}`}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                  style={[s.suggest, { borderBottomColor: '#f0f0f0' }]}
                >
                  <Text style={{ fontWeight: '900', color: UI.text }}>
  {item.name}
</Text>

                </Pressable>
              )}
              style={{ maxHeight: 360, marginTop: 6 }}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: 8,
                gap: 8,
              }}
            >
              {value ? (
                <Pressable
                  onPress={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  style={[
  s.chip,
  { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' },
]}

                >
                  <Text style={{ color: UI.text, fontWeight: '900' }}>Сбросить</Text>

                </Pressable>
              ) : null}
              <Pressable
  onPress={() => setOpen(false)}
  style={[
    s.chip,
    { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' },
  ]}
>
  <Text style={{ color: UI.text, fontWeight: '900' }}>Закрыть</Text>
</Pressable>

            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

/* ---------- ВСПОМОГАТЕЛЬНОЕ: собираем текст области применения ---------- */
function buildScopeNote(
  objName?: string,
  lvlName?: string,
  sysName?: string,
  zoneName?: string,
) {
  const parts = [
    objName ? `Объект: ${objName}` : '',
    lvlName ? `Этаж/уровень: ${lvlName}` : '',
    sysName ? `Система: ${sysName}` : '',
    zoneName ? `Зона: ${zoneName}` : '',
  ].filter(Boolean);
  return parts.join('; ');
}

// ====== Утилиты отображения номера заявки ======
const shortId = (rid: string | number | null | undefined) => {
  const s = String(rid ?? '');
  if (!s) return '';
  return /^\d+$/.test(s) ? s : s.slice(0, 8);
};

const DISPLAY_NUMBER_RE = /^(REQ-\d{4}\/\d{4}|[A-ZА-Я]-\d{4,})$/i;

const DRAFT_STATUS_KEYS = new Set(['draft', 'черновик', '']);
const isDraftLikeStatus = (value?: string | null) =>
  DRAFT_STATUS_KEYS.has(String(value ?? '').trim().toLowerCase());

const FOREMAN_HISTORY_KEY = "foreman_name_history_v1";

async function loadForemanHistory(): Promise<string[]> {
  try {
    if (Platform.OS === "web") {
      const raw = window.localStorage.getItem(FOREMAN_HISTORY_KEY) || "[]";
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
    }

    const raw = await AsyncStorage.getItem(FOREMAN_HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

async function saveForemanToHistory(name: string) {
  const v = String(name ?? "").trim();
  if (!v) return;

  const list = await loadForemanHistory();
  const next = [v, ...list.filter((x) => String(x).trim() && x !== v)].slice(0, 12);

  if (Platform.OS === "web") {
    window.localStorage.setItem(FOREMAN_HISTORY_KEY, JSON.stringify(next));
  } else {
    await AsyncStorage.setItem(FOREMAN_HISTORY_KEY, JSON.stringify(next));
  }
}
export default function ForemanScreen() {

 const gbusy = useGlobalBusy();
  // ===== Шапка заявки =====
  const [requestId, setRequestId] = useState<string>(''); // создадим автоматически
  const [foreman, setForeman] = useState<string>(''); // ФИО прораба (обяз.)
const [foremanHistory, setForemanHistory] = useState<string[]>([]);
const [foremanFocus, setForemanFocus] = useState(false);
const blurTimerRef = useRef<any>(null);

const refreshForemanHistory = useCallback(async () => {
  setForemanHistory(await loadForemanHistory());
}, []);

useEffect(() => {
  refreshForemanHistory();
}, [refreshForemanHistory]);

  const [comment, setComment] = useState<string>(''); // общий комментарий

  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [lastDetailsLoadedId, setLastDetailsLoadedId] = useState<string | null>(null);
  const [initialDraftEnsured, setInitialDraftEnsured] = useState(false);

  // ===== Новые справочные поля (Объект/Этаж/Система/Зона) =====
  const [objectType, setObjectType] = useState<string>(''); // required
  const [level, setLevel] = useState<string>(''); // required
  const [system, setSystem] = useState<string>(''); // optional
  const [zone, setZone] = useState<string>(''); // optional

  const [objOptions, setObjOptions] = useState<RefOption[]>([]);
  const [lvlOptions, setLvlOptions] = useState<RefOption[]>([]);
  const [sysOptions, setSysOptions] = useState<RefOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<RefOption[]>([]);
const [draftOpen, setDraftOpen] = useState(false);

  
// ===== Справочник применений (для корзины/модалки) =====
const [appOptions, setAppOptions] = useState<AppOption[]>([]);

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

  // ===== Уже добавленные строки заявки =====
  const [items, setItems] = useState<ReqItemRow[]>([]);
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [qtyBusyMap, setQtyBusyMap] = useState<Record<string, boolean>>({});
  const cancelLockRef = useRef<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

// ✅ раздельные спиннеры как в Director
const [draftDeleteBusy, setDraftDeleteBusy] = useState(false);
const [draftSendBusy, setDraftSendBusy] = useState(false);

// ✅ общий лок экрана/действий
const screenLock = busy || draftDeleteBusy || draftSendBusy;

  const [historyRequests, setHistoryRequests] = useState<ForemanRequestSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
 
  // ===== Калькулятор =====
  const [calcVisible, setCalcVisible] = useState(false);
const [catalogVisible, setCatalogVisible] = useState(false);
  const [workTypePickerVisible, setWorkTypePickerVisible] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState<
    { code: string; name: string } | null
  >(null);

    // --- безопасный RID как строка (универсально для uuid/bigint) ---
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
    setLastDetailsLoadedId(null);
    setItems([]);
    setQtyDrafts({});
    setQtyBusyMap({});
    setComment('');
    setObjectType('');
    setLevel('');
    setSystem('');
    setZone('');
    setInitialDraftEnsured(false);
    }, []);

const showHint = useCallback((title: string, message: string) => {
  if (Platform.OS === 'web') {
    // @ts-ignore
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}, []);


 const ensureHeaderReady = useCallback(() => {
  if (!foreman.trim()) {
    showHint('Заполни шапку', 'Укажи ФИО прораба.');
    return false;
  }
  if (!objectType) {
    showHint('Заполни шапку', 'Выбери объект строительства.');
    return false;
  }
  if (!level) {
    showHint('Заполни шапку', 'Выбери этаж/уровень.');
    return false;
  }
  return true;
}, [foreman, objectType, level, showHint]);


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

  // ====== КЭШ и подгрузка display_no для текущей заявки ======
  const [displayNoByReq, setDisplayNoByReq] = useState<Record<string, string>>(
  {},
);

// ✅ NEW: ref-кеш, чтобы один requestId дергался только 1 раз
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

  // ✅ 1) если уже есть в state — не дергаем
  if (displayNoStateRef.current[key] != null) return;

  // ✅ 2) если уже есть в ref-кеше — кладём в state и выходим
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
    console.warn('[Foreman] preloadDisplayNo:', (e as any)?.message ?? e);
  }
}, []);


  const loadDetails = useCallback(
    async (rid?: string | number | null) => {
      const key = rid != null ? ridStr(rid) : requestId;
      if (!key) {
        setRequestDetails(null);
        setLastDetailsLoadedId(null);
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
        console.warn('[Foreman] loadDetails:', (e as any)?.message ?? e);
        return null;
      } finally {
        setLastDetailsLoadedId(key);
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
  
  const handleNewRequest = useCallback(async (opts?: { silent?: boolean; keepBusy?: boolean; resetMeta?: boolean }) => {
    try {
      if (!opts?.keepBusy) setBusy(true);
      const meta: RequestDraftMeta = opts?.resetMeta
        ? {
            foreman_name: foreman.trim() || null,
            comment: null,
            object_type_code: null,
            level_code: null,
            system_code: null,
            zone_code: null,
          }
        : {
            foreman_name: foreman.trim() || null,
            comment: comment.trim() || null,
            object_type_code: objectType || null,
            level_code: level || null,
            system_code: system || null,
            zone_code: zone || null,
          };
      const created = await requestCreateDraft(meta);
      if (!created?.id) throw new Error('Не удалось создать черновик');
      const idStr = String(created.id);
      setRequestId(idStr);
      setLocalDraftId(idStr);
      setItems([]);
      setQtyDrafts({});
      setQtyBusyMap({});
      const display = String(created.display_no ?? '').trim();
      if (display) {
        setDisplayNoByReq((prev) => ({ ...prev, [idStr]: display }));
      }
      setRequestDetails({
        id: idStr,
        status: created.status ?? 'Черновик',
        display_no: display || created.display_no || null,
        created_at: created.created_at ?? new Date().toISOString(),
        comment: created.comment ?? meta.comment ?? undefined,
        foreman_name: created.foreman_name ?? meta.foreman_name ?? undefined,
        object_type_code: created.object_type_code ?? meta.object_type_code ?? undefined,
        level_code: created.level_code ?? meta.level_code ?? undefined,
        system_code: created.system_code ?? meta.system_code ?? undefined,
        zone_code: created.zone_code ?? meta.zone_code ?? undefined,
      });
      
      await loadItems(idStr);
      setInitialDraftEnsured(true);
      const label = display || `#${shortId(idStr)}`;
      if (!opts?.silent) {
        Alert.alert('Новая заявка', `Создан черновик ${label}`);
      }
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось создать новую заявку');
    } finally {
      if (!opts?.keepBusy) setBusy(false);
    }
  }, [
    foreman,
    comment,
    objectType,
    level,
    system,
    zone,
    loadDetails,
    loadItems,
    setDisplayNoByReq,
  ]);

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

          // считаем заявки "На утверждении"
          const pending = rows.filter(r => {
            const raw = String(r.status ?? '').trim().toLowerCase();
            return raw === 'на утверждении' || raw === 'pending';
          }).length;
           } else {
          setHistoryRequests([]);
           }
      } catch (e) {
        console.warn('[Foreman] listForemanRequests:', e);
        Alert.alert('История', 'Не удалось загрузить историю заявок.');
        setHistoryRequests([]);
        } finally {
        setHistoryLoading(false);
      }

    })();
  }, [foreman, listForemanRequests]);

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
    label: "Готовлю PDF…",
    mode: "preview",
    fileName: `Заявка_${rid}`,
    getRemoteUrl: () => exportRequestPdf(rid, "preview"),
  });
}, [gbusy, supabase]);


  useEffect(() => {
    if (initialDraftEnsured) return;
    const rid = requestId ? ridStr(requestId) : '';
    if (!rid) return;
    if (lastDetailsLoadedId !== rid) return;
    const display = String(requestDetails?.display_no ?? '').trim();
    const hasValidDisplay = display && DISPLAY_NUMBER_RE.test(display);
    if (requestDetails && hasValidDisplay) {
      setInitialDraftEnsured(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await handleNewRequest({ silent: true });
      } finally {
        if (!cancelled) setInitialDraftEnsured(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    handleNewRequest,
    initialDraftEnsured,
    lastDetailsLoadedId,
    requestDetails,
    requestId,
    ridStr,
  ]);

  // создаём/получаем черновик при монтировании
 useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      dlog('[Foreman] ensure draft: start');

      const idAny = await getOrCreateDraftRequestId(); // должно дернуть БД
      const rid = String(idAny).trim();

      dlog('[Foreman] ensure draft: got id', rid);

      if (!rid) throw new Error('draft id is empty');

      if (cancelled) return;

      // 1) ставим requestId
      setRequestId(rid);

      // 2) сразу пробуем подгрузить номер/детали
      //    (чтобы не зависеть от других эффектов)
      const d = await fetchRequestDetails(rid);
      dlog('[Foreman] draft details', d);

      if (!cancelled && d) {
        setRequestDetails(d);
        const dn = String(d.display_no ?? '').trim();
        if (dn) {
          setDisplayNoByReq((prev) => ({ ...prev, [rid]: dn }));
        }
      } else {
        // если details не вернулись — хотя бы дернем номер
        const dn2 = await fetchRequestDisplayNo(rid);
        dlog('[Foreman] draft display_no', dn2);
        if (!cancelled && dn2) {
          setDisplayNoByReq((prev) => ({ ...prev, [rid]: String(dn2) }));
        }
      }

    } catch (e: any) {
      console.error('[Foreman] ensure draft failed:', e?.message ?? e);

      if (!cancelled) {
        // WEB: alert чтобы ты точно увидел
        if (Platform.OS === 'web') window.alert(e?.message ?? 'Не удалось создать черновик');
        else Alert.alert('Ошибка', e?.message ?? 'Не удалось создать черновик');
      }
    }
  })();

  return () => { cancelled = true; };
}, []);


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

  // нормальный ensure, если надо создать прямо сейчас (с сохранением шапки)
  async function ensureAndGetId() {
    const existing = requestId ? ridStr(requestId) : '';
    if (existing) return existing;

    const meta = {
      foreman_name: foreman.trim() || null,
      comment: comment.trim() || null,
      object_type_code: objectType || null,
      level_code: level || null,
      system_code: system || null,
      zone_code: zone || null,
    };

    try {
      const created = await requestCreateDraft(meta);
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
    } catch (e: any) {
      console.warn('[Foreman] ensureAndGetId/createDraft:', e?.message ?? e);
    }

    try {
      const rid2 = await getOrCreateDraftRequestId();
const rid2Str = String(rid2);
setRequestId(rid2Str);
setLocalDraftId(rid2Str);
return rid2Str;

    } catch (e: any) {
      Alert.alert(
        'Ошибка',
        e?.message ?? 'Не удалось создать/получить заявку',
      );
      throw e;
    }
  }

  // ---------- Справочники (Объект/Этаж/Система/Зона) ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // @ts-ignore
        const { supabase } = await import('../../src/lib/supabaseClient');

        const fetchWithFallback = async (
          table: string,
          select: string,
          orderColumn: string,
          fallbackSelect: string,
        ) => {
          const run = (cols: string) =>
            supabase.from(table as any).select(cols).order(orderColumn);
          let result = await run(select);
          if (result.error) {
            const msg = String(result.error.message ?? '').toLowerCase();
            if (msg.includes('name_ru')) {
              result = await run(fallbackSelect);
            }
          }
          return result;
        };

        const [obj, lvl, sys, zn] = await Promise.all([
          fetchWithFallback('ref_object_types', 'code,name,name_ru', 'name', 'code,name'),
          fetchWithFallback('ref_levels', 'code,name,name_ru,sort', 'sort', 'code,name,sort'),
          fetchWithFallback('ref_systems', 'code,name,name_ru', 'name', 'code,name'),
          fetchWithFallback('ref_zones', 'code,name,name_ru', 'name', 'code,name'),
        ]);

        if (!cancelled) {
          const mapName = (r: any) =>
            String(r?.name_ru ?? r?.name ?? r?.code ?? '')
              .trim();
          if (!obj.error && Array.isArray(obj.data))
            setObjOptions(
              (obj.data as any[])
                .map((r) => ({ code: r.code, name: mapName(r) }))
                .filter((r) => r.code && r.name),
            );
          if (!lvl.error && Array.isArray(lvl.data))
            setLvlOptions(
              (lvl.data as any[])
                .map((r) => ({ code: r.code, name: mapName(r) }))
                .filter((r) => r.code && r.name),
            );
          if (!sys.error && Array.isArray(sys.data))
            setSysOptions(
              (sys.data as any[])
                .map((r) => ({ code: r.code, name: mapName(r) }))
                .filter((r) => r.code && r.name),
            );
          if (!zn.error && Array.isArray(zn.data))
            setZoneOptions(
              (zn.data as any[])
                .map((r) => ({ code: r.code, name: mapName(r) }))
                .filter((r) => r.code && r.name),
            );
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

// ---------- Варианты применений (РИК) — для модалки/лейбла ----------
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      // @ts-ignore
      const { supabase } = await import('../../src/lib/supabaseClient');

      const a = await supabase
        .from('rik_apps' as any)
        .select('app_code, name_human')
        .order('app_code', { ascending: true });

      if (!cancelled && !a.error && Array.isArray(a.data) && a.data.length) {
        setAppOptions(
          a.data.map((r: any) => ({
            code: r.app_code,
            label: (r.name_human && String(r.name_human).trim()) || r.app_code,
          })),
        );
        return;
      }

      const b = await supabase
        .from('rik_item_apps' as any)
        .select('app_code')
        .not('app_code', 'is', null)
        .order('app_code', { ascending: true });

      if (!cancelled && !b.error && Array.isArray(b.data)) {
        const uniq = Array.from(new Set(b.data.map((r: any) => r.app_code))).filter(Boolean);
        setAppOptions(uniq.map((code: string) => ({ code, label: code })));
      }
    } catch {}
  })();
  return () => { cancelled = true; };
}, []);


    // ---------- ЧЕЛОВЕЧЕСКИЕ НАЗВАНИЯ ТЕКУЩЕГО ВЫБОРА ----------
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
  // ---------- Калькулятор: добавить рассчитанные позиции ----------
  const handleCalcAddToRequest = useCallback(
    async (rows: CalcRow[]) => {
      if (!rows || rows.length === 0) {
        setCalcVisible(false);
        return;
      }

      if (!ensureHeaderReady()) {
        return;
      }

      if (!isDraftActive) {
        Alert.alert(
          'Просмотр заявки',
          'Редактирование доступно только в текущем черновике.',
        );
        return;
      }

      try {
  setBusy(true);
  const rid = requestId ? ridStr(requestId) : await ensureAndGetId();

  await updateRequestMeta(rid, {
    comment: comment.trim() || null,
    object_type_code: objectType || null,
    level_code: level || null,
    system_code: system || null,
    zone_code: zone || null,
    foreman_name: foreman.trim() || null,
  }).catch(() => null);

  const aggregated = aggCalcRows(rows);

  const noteToUse =
    buildScopeNote(objectName, levelName, systemName, zoneName) || '—';

  const POOL = Platform.OS === 'web' ? 10 : 6;

  const results = await runPool(aggregated, POOL, async (row) => {
  const displayName =
    (row.item_name_ru ??
      row.name_human ??
      row.name_ru ??
      row.name ??
      ruName(row)) || '—';

  await requestItemAddOrIncAndPatchMeta(rid, row.rik_code, row.qty, {
    note: noteToUse,
    app_code: null,
    kind: null,
    name_human: displayName,
    uom: row.uom_code ?? null,
  });

  return true;
});

const okCount = results.filter((r) => (r as any)?.ok).length;
const failCount = results.length - okCount;

// ✅ собираем первые ошибки с названием позиции
const failLines: string[] = [];
for (let i = 0; i < results.length; i++) {
  const r: any = results[i];
  if (r?.ok) continue;

  const src = aggregated[i];
  const code = String(src?.rik_code ?? '—');
  const name =
    String(src?.item_name_ru ?? src?.name_human ?? src?.name_ru ?? src?.name ?? '').trim() || code;

  const msgRaw =
    (r?.error?.message ??
      r?.error?.details ??
      r?.error?.hint ??
      r?.error?.code ??
      String(r?.error ?? ''));

  const msg = String(msgRaw || 'unknown error').replace(/\s+/g, ' ').trim();

  failLines.push(`• ${name} (${code}) — ${msg}`);
  if (failLines.length >= 4) break; // ✅ не спамим алерт
}

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

} catch (e: any) {
  console.error('[Foreman] handleCalcAddToRequest:', e?.message ?? e);
  Alert.alert('Ошибка', e?.message ?? 'Не удалось добавить рассчитанные позиции');
} finally {
  setBusy(false);
}

    },
    [
      requestId,
      ridStr,
      ensureAndGetId,
      comment,
      objectType,
      level,
      system,
      zone,
      foreman,
      objectName,
      levelName,
      systemName,
      zoneName,
      loadItems,
      isDraftActive,
      ensureHeaderReady,
    ],
  );
const commitCatalogToDraft = useCallback(async (rows: PickedRow[]) => {
  if (!rows?.length) return;

  if (!ensureHeaderReady()) {
    Alert.alert('Заполни шапку', 'ФИО + объект + этаж обязательны перед добавлением.');
    return;
  }

  if (!isDraftActive) {
    Alert.alert('Просмотр заявки', 'Редактирование доступно только в текущем черновике.');
    return;
  }

  try {
    setBusy(true);

    const rid = requestId ? ridStr(requestId) : await ensureAndGetId();

    await updateRequestMeta(rid, {
      comment: comment.trim() || null,
      object_type_code: objectType || null,
      level_code: level || null,
      system_code: system || null,
      zone_code: zone || null,
      foreman_name: foreman.trim() || null,
    }).catch(() => null);

    const noteToUse = buildScopeNote(objectName, levelName, systemName, zoneName) || '—';
const aggregated = aggPickedRows(rows);
const POOL = Platform.OS === 'web' ? 10 : 6;

const results = await runPool(aggregated, POOL, async (x) => {
  const r = x.base;

  await requestItemAddOrIncAndPatchMeta(
    rid,
    r.rik_code,
    x.qty,
    {
      note: noteToUse,
      app_code: r.app_code ?? null,
      kind: r.kind ?? null,
      name_human: r.name,
      uom: r.uom ?? null,
    }
  );

  return true;
});

const okCount = results.filter((r) => r?.ok).length;
const failCount = results.length - okCount;

await loadItems(rid);

if (failCount > 0) {
  Alert.alert('Каталог (частично)', `Добавлено: ${okCount}\nОшибок: ${failCount}`);
}
    await loadItems(rid);
  } catch (e: any) {
    console.error('[Foreman] commitCatalogToDraft:', e?.message ?? e);
    Alert.alert('Ошибка', e?.message ?? 'Не удалось добавить позиции');
  } finally {
    setBusy(false);
  }
}, [
  requestId,
  ridStr,
  ensureAndGetId,
  ensureHeaderReady,
  isDraftActive,
  comment,
  objectType,
  level,
  system,
  zone,
  foreman,
  objectName,
  levelName,
  systemName,
  zoneName,
  loadItems,
]);
  
 
  const commitQtyChange = useCallback(
    async (item: ReqItemRow, draftValue: string) => {
      const key = String(item.id);
      const currentRequest = String(requestDetails?.id ?? '').trim();
      if (!isDraftActive || !currentRequest || !canEditRequestItem(item)) {
        setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
        return;
      }

      const parsed = parseQtyValue(draftValue);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        Alert.alert('Количество', 'Значение должно быть больше нуля.');
        setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
        return;
      }

      const original = Number(item.qty ?? 0);
      if (Math.abs(parsed - original) < 1e-9) {
        setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
        return;
      }

      setQtyBusyMap((prev) => ({ ...prev, [key]: true }));
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
      } catch (e: any) {
        Alert.alert('Ошибка', e?.message ?? 'Не удалось обновить количество.');
        setQtyDrafts((prev) => ({ ...prev, [key]: formatQtyInput(item.qty) }));
      } finally {
        setQtyBusyMap((prev) => ({ ...prev, [key]: false }));
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
    ],
  );

  // ---------- Отправка директору ----------
  const submitToDirector = useCallback(async () => {
    try {
      if (!isDraftActive) {
        Alert.alert(
          'Просмотр заявки',
          'Чтобы отправить, вернись к текущему черновику.',
        );
        return;
      }
      if (!ensureHeaderReady()) {
        return;
      }
      if ((items?.length ?? 0) === 0) {
        Alert.alert(
          'Пустая заявка',
          'Сначала добавь хотя бы одну позицию.',
        );
        return;
      }

      setBusy(true);
      const rid: string = requestId
        ? ridStr(requestId)
        : await ensureAndGetId();

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

      await updateRequestMeta(rid, {
        object_type_code: objectType || null,
        level_code: level || null,
        system_code: system || null,
        zone_code: zone || null,
        comment: comment.trim() || null,
        foreman_name: foreman.trim() || null,
      }).catch(() => null);

      const submitted = await requestSubmit(rid);
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
     
      const submittedLabel = submitted?.display_no ?? labelForRequest(rid);
      showHint(
  'Отправлено',
  `Заявка ${submittedLabel} отправлена на утверждение`,
);

      clearLocalDraftId();
      clearCachedDraftRequestId();
await saveForemanToHistory(foreman);
await refreshForemanHistory();
      resetDraftState();

      await handleNewRequest({ silent: true, keepBusy: true, resetMeta: true });
    } catch (e: any) {
      console.error(
        '[Foreman] submitToDirector:',
        e?.message ?? e,
      );
      Alert.alert(
        'Ошибка',
        e?.message ?? 'Не удалось отправить на утверждение',
      );
    } finally {
      setBusy(false);
    }
  }, [
    requestId,
    ridStr,
    foreman,
    objectType,
    level,
    system,
    zone,
    comment,
    items,
   
    labelForRequest,
    ensureAndGetId,
    isDraftActive,
    handleNewRequest,
    ensureHeaderReady,
    qtyDrafts,
    formatQtyInput,
    commitQtyChange,
    resetDraftState,
    clearLocalDraftId,
    clearCachedDraftRequestId,
    canEditRequestItem,
  ]);

  const handleCalcPress = useCallback(() => {
    if (busy) return;
    if (!ensureHeaderReady()) {
      return;
    }
    if (!isDraftActive) {
      Alert.alert('Просмотр заявки', 'Редактирование доступно только в текущем черновике.');
      return;
    }
    setWorkTypePickerVisible(true);
  }, [busy, ensureHeaderReady, isDraftActive]);

  // ---------- PDF ----------
const onPdfShare = useCallback(async () => {
  if (!ensureHeaderReady()) return;

  const rid = requestId ? ridStr(requestId) : await ensureAndGetId();
  const ridKey = String(rid).trim();
  const fileName = requestDetails?.display_no ? `Заявка_${requestDetails.display_no}` : `Заявка_${ridKey}`;

  await updateRequestMeta(ridKey, {
    object_type_code: objectType || null,
    level_code: level || null,
    system_code: system || null,
    zone_code: zone || null,
    comment: comment.trim() || null,
    foreman_name: foreman.trim() || null,
  }).catch(() => null);

  // ✅ runPdfTop сам скрывает overlay ДО share sheet
  await runPdfTop({
    busy: gbusy,
    supabase,
    key: `pdfshare:request:${ridKey}`,
    label: "Подготавливаю файл…",
    mode: "share",
    fileName,
    getRemoteUrl: () => exportRequestPdf(ridKey, "share"),
  });
}, [
  gbusy,
  ensureHeaderReady,
  requestId,
  requestDetails?.display_no,
  ridStr,
  ensureAndGetId,
  objectType,
  level,
  system,
  zone,
  comment,
  foreman,
]);
const onPdf = useCallback(async () => {
  if (!ensureHeaderReady()) return;

  const rid = requestId ? ridStr(requestId) : await ensureAndGetId();
  const ridKey = String(rid).trim(); // ✅ всегда определён
  const fileName = requestDetails?.display_no ? `Заявка_${requestDetails.display_no}` : `Заявка_${ridKey}`;

  await updateRequestMeta(ridKey, {
    object_type_code: objectType || null,
    level_code: level || null,
    system_code: system || null,
    zone_code: zone || null,
    comment: comment.trim() || null,
    foreman_name: foreman.trim() || null,
  }).catch(() => null);

  await runPdfTop({
    busy: gbusy,
    supabase,
    key: `pdf:request:${ridKey}`,
    label: "Готовлю PDF…",
    mode: "preview",
    fileName,
    getRemoteUrl: () => exportRequestPdf(ridKey, "preview"),
  });
}, [
  gbusy,
  ensureHeaderReady,
  requestId,
  requestDetails?.display_no,
  ridStr,
  ensureAndGetId,
  objectType,
  level,
  system,
  zone,
  comment,
  foreman,
]);
  
  const ReqItemRowView = useCallback(
  ({ it }: { it: ReqItemRow }) => {
    const key = String(it.id);
    const updating = !!qtyBusyMap[key];
    const canEdit = canEditRequestItem(it);

    const metaLine = [
      `${it.qty ?? '-'} ${it.uom ?? ''}`.trim(),
      it.app_code ? labelForApp(it.app_code) : null,
    ].filter(Boolean).join(' · ');

    return (
      <View style={s.draftRowCard}>
        <View style={s.draftRowMain}>
          <Text style={s.draftRowTitle} numberOfLines={2} ellipsizeMode="tail">
            {it.name_human}
          </Text>

          <Text style={s.draftRowMeta} numberOfLines={2} ellipsizeMode="tail">
            {metaLine || '—'}
          </Text>

          <Text style={s.draftRowStatus} numberOfLines={1}>
            Статус: <Text style={s.draftRowStatusStrong}>{it.status ?? '—'}</Text>
          </Text>
        </View>

        {canEdit ? (
          <Pressable
            disabled={busy || updating}
            onPress={async () => {
              if (cancelLockRef.current[key]) return;
              cancelLockRef.current[key] = true;

              try {
                if (Platform.OS === 'web') {
                  // @ts-ignore
                  const ok = window.confirm(`Отменить позицию?\n\n${it.name_human || 'Позиция'}`);
                  if (!ok) return;

                  setQtyBusyMap((prev) => ({ ...prev, [key]: true }));
                  await requestItemCancel(String(it.id));

                  setItems((prev) => prev.filter((x) => String(x.id) !== String(it.id)));
                  setQtyDrafts((prev) => {
                    const n = { ...prev };
                    delete n[key];
                    return n;
                  });

                  // @ts-ignore
                  window.alert('Позиция удалена');
                  return;
                }

                Alert.alert('Отменить позицию?', it.name_human || 'Позиция', [
                  { text: 'Нет', style: 'cancel' },
                  {
                    text: 'Отменить',
                    style: 'destructive',
                    onPress: async () => {
                      setQtyBusyMap((prev) => ({ ...prev, [key]: true }));
                      try {
                        await requestItemCancel(String(it.id));

                        setItems((prev) => prev.filter((x) => String(x.id) !== String(it.id)));
                        setQtyDrafts((prev) => {
                          const n = { ...prev };
                          delete n[key];
                          return n;
                        });
                      } finally {
                        setQtyBusyMap((prev) => ({ ...prev, [key]: false }));
                      }
                    },
                  },
                ]);
              } finally {
                cancelLockRef.current[key] = false;
              }
            }}
            style={[s.rejectBtn, { opacity: busy || updating ? 0.6 : 1 }]}
          >
            <Text style={s.rejectIcon}>✕</Text>
          </Pressable>
        ) : null}
      </View>
    );
  },
  [canEditRequestItem, qtyBusyMap, busy, labelForApp, requestItemCancel],
);
 
  // ---------- UI ----------
  
  const currentDisplayLabel = useMemo(() => {
    if (requestDetails?.display_no) return requestDetails.display_no;
    if (requestId) return labelForRequest(requestId);
    return 'будет создана автоматически';
  }, [labelForRequest, requestDetails?.display_no, requestId]);

  const statusInfo = resolveStatusInfo(
    requestDetails?.status ?? (isDraftActive ? 'draft' : undefined),
  );
  const createdDisplay = useMemo(() => {
    if (!requestDetails?.created_at) return '—';
    try {
      return new Date(requestDetails.created_at).toLocaleString('ru-RU');
    } catch {
      return requestDetails.created_at;
    }
  }, [requestDetails?.created_at]);
// ===== Collapsing header (Animated) =====
const HEADER_MAX = 126;   // развернутая высота шапки
const HEADER_MIN = 64;    // свернутая высота
const HEADER_SCROLL = HEADER_MAX - HEADER_MIN;

const scrollY = useRef(new Animated.Value(0)).current;
const clampedY = useMemo(() => Animated.diffClamp(scrollY, 0, HEADER_SCROLL), [scrollY]);

const headerHeight = useMemo(() => (
  clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL],
    outputRange: [HEADER_MAX, HEADER_MIN],
    extrapolate: 'clamp',
  })
), [clampedY]);

// Заголовок: плавно уменьшается
const titleSize = useMemo(() => (
  clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL],
    outputRange: [24, 16],
    extrapolate: 'clamp',
  })
), [clampedY]);

// Подстрока/детали: плавно исчезают
const subOpacity = useMemo(() => (
  clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL * 0.7],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })
), [clampedY]);

// Тень при скролле (как ты спросил)
const headerShadow = useMemo(() => (
  clampedY.interpolate({
    inputRange: [0, 8],
    outputRange: [0, 0.12],
    extrapolate: 'clamp',
  })
), [clampedY]);

 return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <View style={[s.container, { backgroundColor: UI.bg }]}>
    <View pointerEvents="none" style={s.bgGlow} />
      {/* ✅ FIXED Collapsing Header */}
      <Animated.View
        style={[
          s.cHeader,
          {
            height: headerHeight,
            shadowOpacity: headerShadow as any,
            elevation: 8,
          },
        ]}
      >
        {/* Title row */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Animated.Text style={[s.cTitle, { fontSize: titleSize, color: UI.text }]} numberOfLines={1}>
  Заявка
</Animated.Text>

        </View>

        {/* Details row (fade out) */}
        <Animated.View style={{ opacity: subOpacity, paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={s.requestSummaryBox}>
            <View style={s.requestSummaryTop}>
              <Text
                style={[s.requestNumber, { flex: 1, flexShrink: 1 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {currentDisplayLabel}
              </Text>

              <View
  style={[
    s.historyStatusBadge,
    {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
  ]}
>
  <Text style={{ color: UI.text, fontWeight: '900' }}>
    {statusInfo.label}
  </Text>
</View>

            </View>

            <Text style={s.requestMeta}>Создана: {createdDisplay}</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ✅ SCROLL */}
      <AnimatedScrollView
        contentContainerStyle={[
          s.pagePad,
          { paddingTop: HEADER_MAX + 12 }, // место под фикс-шапку
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* ✅ дальше — твой старый контент БЕЗ старого заголовка и БЕЗ блока requestSummaryBox */}

        <Text style={s.small}>
  ФИО прораба (обязательно):
</Text>
<TextInput
  value={foreman}
  onChangeText={handleForemanChange}
  onFocus={() => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setForemanFocus(true);
  }}
  onBlur={() => {
    // ✅ даём успеть нажать по подсказке
    blurTimerRef.current = setTimeout(() => setForemanFocus(false), 180);
  }}
  placeholder="Иванов И.И."
  style={s.input}
/>

{foremanFocus && foremanHistory.length > 0 && (
  <View style={s.foremanSuggestBox}>
    {foremanHistory.map((name) => (
      <Pressable
        key={name}
        // ✅ важно: НЕ даём blur закрыть список раньше клика
        onPressIn={() => {
          if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        }}
        onPress={() => {
          handleForemanChange(name);
          setForemanFocus(false);
        }}
        style={s.foremanSuggestRow}
      >
        <Text style={s.foremanSuggestText} numberOfLines={1}>
          {name}
        </Text>
      </Pressable>
    ))}
  </View>
)}
        {/* Объект/Этаж/Система/Зона */}
        <View style={{ marginTop: 10, gap: 6 }}>
          <Dropdown
            label="Объект строительства (обязательно)"
            options={objOptions}
            value={objectType}
            onChange={handleObjectChange}
            placeholder="Выберите объект"
            width={360}
          />
          <Dropdown
            label="Этаж / уровень (обязательно)"
            options={lvlOptions}
            value={level}
            onChange={handleLevelChange}
            placeholder="Выберите этаж/уровень"
            width={360}
          />
          <Dropdown
            label="Система / вид работ (опционально)"
            options={sysOptions}
            value={system}
            onChange={handleSystemChange}
            placeholder="Выберите систему/вид работ"
            width={360}
          />
          <Dropdown
            label="Зона / участок (опционально)"
            options={zoneOptions}
            value={zone}
            onChange={handleZoneChange}
            placeholder="Выберите зону/участок"
            width={360}
          />
        </View>
{/* ===== Выбор позиций ===== */}
<View style={s.section}>
  <Text style={s.sectionTitle}>ВЫБОР ПОЗИЦИЙ ИЗ:</Text>

  <View style={s.pickTabsRow}>
    <Pressable
      onPress={() => {
  if (!ensureHeaderReady()) return;
  if (!isDraftActive) {
    showHint('Просмотр заявки', 'Редактирование доступно только в текущем черновике.');
    return;
  }
  setCatalogVisible(true);
}}

      disabled={busy}
      style={[s.pickTabBtn, s.pickTabCatalog, busy && { opacity: 0.5 }]}

    >
      <Ionicons name="list" size={18} color={UI.text} />
      <Text style={s.pickTabText}>Каталог</Text>
    </Pressable>

    <Pressable
      onPress={handleCalcPress}
      disabled={busy}
      style={[s.pickTabBtn, s.pickTabSoft, busy && { opacity: 0.5 }]}
    >
      <Ionicons name="calculator-outline" size={18} color={UI.text} />
      <Text style={s.pickTabText}>Смета</Text>
    </Pressable>
  </View>
</View>
{/* ===== Черновик (карточка, без списка) ===== */}
<Pressable
  onPress={() => setDraftOpen(true)}
  style={s.draftCard}
  android_ripple={{ color: "rgba(255,255,255,0.06)" }}
>
  <View style={{ flex: 1, minWidth: 0 }}>
    <Text style={s.draftTitle}>ЧЕРНОВИК</Text>

    <Text style={s.draftNo} numberOfLines={1}>
      {currentDisplayLabel}
    </Text>

    <Text style={s.draftHint} numberOfLines={2}>
      {items?.length
        ? "Открыть позиции и действия"
        : "Пока пусто — добавь позиции из Каталога или Сметы."}
    </Text>
  </View>

  <View style={{ alignItems: "flex-end", gap: 10 }}>
    <View style={s.posPill}>
  <Ionicons name="list" size={18} color={UI.text} />
  <Text style={s.posPillText}>Позиции</Text>
  <View style={s.posCountPill}>
    <Text style={s.posCountText}>{items?.length ?? 0}</Text>
  </View>
</View>

    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.55)" />
  </View>
</Pressable>
      </AnimatedScrollView>

      {/* ✅ Нижняя панель — как было */}
      <View style={s.stickyBar}>
  <View style={s.miniBar}>
    <Pressable
      onPress={handleOpenHistory}
      disabled={busy}
      style={[s.miniBtn, busy && { opacity: 0.5 }]}
    >
      <Ionicons name="time-outline" size={18} color={UI.text} />
      <Text style={s.miniText}>История</Text>
    </Pressable>

     </View>
</View>


       <RNModal
  isVisible={historyVisible}
  onBackdropPress={handleCloseHistory}
  onBackButtonPress={handleCloseHistory}
  backdropOpacity={0.55}
  useNativeDriver={Platform.OS !== "web"}
  useNativeDriverForBackdrop={Platform.OS !== "web"}
  hideModalContentWhileAnimating
  style={{ margin: 0, justifyContent: "flex-end" }}
>

  <View style={s.historyModal}>
    <View style={s.historyModalHeader}>
      <Text style={s.historyModalTitle}>История заявок</Text>
      <Pressable onPress={handleCloseHistory}>
        <Text style={s.historyModalClose}>Закрыть</Text>
      </Pressable>
    </View>

    <View style={s.historyModalBody}>
      {historyLoading ? (
        <ActivityIndicator />
      ) : historyRequests.length === 0 ? (
        <Text style={s.historyModalEmpty}>Заявок пока нет</Text>
      ) : (
        <ScrollView style={s.historyModalList}>
          {historyRequests.map((req) => {
            const info = resolveStatusInfo(req.status);
            const created = req.created_at
              ? new Date(req.created_at).toLocaleDateString('ru-RU')
              : '—';
            const hasRejected =
              req.has_rejected === true ||
              req.has_rejected === 1 ||
              req.has_rejected === 't';

            return (
              <View key={req.id} style={s.historyModalRow}>
                <Pressable style={{ flex: 1 }} onPress={() => handleHistorySelect(req.id)}>
                  <Text style={s.historyModalPrimary}>
                    {req.display_no ?? shortId(req.id)}
                  </Text>
                  <Text style={s.historyModalMeta}>{req.object_name_ru || '—'}</Text>
                  <Text style={s.historyModalMetaSecondary}>{created}</Text>

                  {hasRejected ? (
                    <Text style={{ color: '#B91C1C', fontSize: 12, marginTop: 2, fontWeight: '600' }}>
                      Есть отклонённые позиции
                    </Text>
                  ) : null}
                </Pressable>

                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[s.historyStatusBadge, { backgroundColor: hasRejected ? '#FEE2E2' : info.bg }]}>
                    <Text style={{ color: info.fg, fontWeight: '700' }}>{info.label}</Text>
                  </View>

                  {(() => {
  const pdfKey = `pdf:history:${String(req.id).trim()}`;
  const pdfBusy = gbusy.isBusy(pdfKey);

  return (
    <Pressable
      disabled={pdfBusy}
      onPress={() => openHistoryPdf(req.id)}
      style={[s.historyPdfBtn, pdfBusy && { opacity: 0.6 }]}
    >
      <Text style={s.historyPdfBtnText}>{pdfBusy ? "PDF…" : "PDF"}</Text>
    </Pressable>
  );
})()}

                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  </View>
</RNModal>

<CatalogModal
  visible={catalogVisible}
  onClose={() => setCatalogVisible(false)}
  rikQuickSearch={rikQuickSearch as any}
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
<RNModal
  isVisible={draftOpen}
  onBackdropPress={() => setDraftOpen(false)}
  onBackButtonPress={() => setDraftOpen(false)}
  backdropOpacity={0.55}
  useNativeDriver={Platform.OS !== "web"}
  useNativeDriverForBackdrop={Platform.OS !== "web"}
  hideModalContentWhileAnimating
  style={{ margin: 0, justifyContent: "flex-end" }}
>  
<View style={s.sheet}>
    <View style={s.sheetHandle} />

    <View style={s.sheetTopBar}>
      <Text style={s.sheetTitle} numberOfLines={1}>
        Черновик {currentDisplayLabel}
      </Text>

      <Pressable onPress={() => setDraftOpen(false)} style={s.sheetCloseBtn}>
        <Text style={s.sheetCloseText}>Свернуть</Text>
      </Pressable>
    </View>

    {/* ✅ META 1:1 как у директора */}
    <View style={s.sheetMetaBox}>
      {!!objectName && (
        <Text style={s.sheetMetaLine} numberOfLines={1}>
          Объект: <Text style={s.sheetMetaValue}>{objectName}</Text>
        </Text>
      )}
      {!!levelName && (
        <Text style={s.sheetMetaLine} numberOfLines={1}>
          Этаж/уровень: <Text style={s.sheetMetaValue}>{levelName}</Text>
        </Text>
      )}
      {!!systemName && (
        <Text style={s.sheetMetaLine} numberOfLines={1}>
          Система: <Text style={s.sheetMetaValue}>{systemName}</Text>
        </Text>
      )}
      {!!zoneName && (
        <Text style={s.sheetMetaLine} numberOfLines={1}>
          Зона: <Text style={s.sheetMetaValue}>{zoneName}</Text>
        </Text>
      )}
    </View>
<View style={{ flex: 1, minHeight: 0 }}>
  <FlatList
    data={items}
    keyExtractor={(it, idx) => (it?.id ? `ri:${String(it.id)}` : `ri:${idx}`)}
    renderItem={({ item }) => <ReqItemRowView it={item} />}
    contentContainerStyle={{ paddingBottom: 12 }}
    keyboardShouldPersistTaps="handled"
    nestedScrollEnabled
    showsVerticalScrollIndicator={false}
    ListEmptyComponent={
      <Text style={{ color: UI.sub, fontWeight: "800", paddingVertical: 12 }}>
        Позиции не найдены
      </Text>
    }
  />
</View>

   {/* ===== ACTIONS (как у директора) ===== */}
<View style={s.reqActionsBottom}>
  {/* ✅ Delete — LEFT */}
  <View style={s.actionBtnSquare}>
    <DeleteAllButton
      disabled={screenLock}
      loading={draftDeleteBusy}
      accessibilityLabel="Удалить черновик"
      onPress={() => {
        const doIt = async () => {
          setDraftDeleteBusy(true);
          try {
            clearLocalDraftId();
            clearCachedDraftRequestId();
            resetDraftState();
            await handleNewRequest({ silent: true, keepBusy: true, resetMeta: true });
            setDraftOpen(false);
          } catch (e: any) {
            Alert.alert("Ошибка", e?.message ?? "Не удалось удалить черновик");
          } finally {
            setDraftDeleteBusy(false);
          }
        };

        if (Platform.OS === "web") {
          // @ts-ignore
          const ok = window.confirm("Удалить черновик?\n\nВсе позиции будут удалены, будет создан новый черновик.");
          if (!ok) return;
          void doIt();
          return;
        }

        Alert.alert(
          "Удалить черновик?",
          "Все позиции будут удалены, будет создан новый черновик.",
          [
            { text: "Отмена", style: "cancel" },
            { text: "Да, удалить", style: "destructive", onPress: () => void doIt() },
          ],
        );
      }}
    />
  </View>

  <View style={s.sp8} />

  {/* PDF — CENTER */}
  {(() => {
    const ridKey = String(requestId || "").trim();
    const pdfKey = `pdf:req:${ridKey || "draft"}`;
    const pdfBusy = gbusy.isBusy(pdfKey);

    return (
      <Pressable
        disabled={screenLock || pdfBusy}
        onPress={async () => {
          if (screenLock || pdfBusy) return;
          try {
            await onPdf();
          } catch (e: any) {
            if (String(e?.message ?? "").toLowerCase().includes("busy")) return;
            Alert.alert("Ошибка", e?.message ?? "PDF не сформирован");
          }
        }}
        style={[
          s.actionBtnWide,
          { backgroundColor: UI.btnNeutral, opacity: (screenLock || pdfBusy) ? 0.6 : 1 },
        ]}
      >
        <Text style={s.actionText}>{pdfBusy ? "PDF…" : "PDF"}</Text>
      </Pressable>
    );
  })()}

  <View style={s.sp8} />

  {/* Excel — CENTER */}
  <Pressable
    disabled={screenLock}
    onPress={() => {
      if (screenLock) return;
      Alert.alert("Excel", "Экспорт Excel будет добавлен позже (UI уже готов).");
    }}
    style={[
      s.actionBtnWide,
      { backgroundColor: UI.btnNeutral, opacity: screenLock ? 0.6 : 1 },
    ]}
  >
    <Text style={s.actionText}>Excel</Text>
  </Pressable>

  <View style={s.sp8} />

  {/* ✅ Send — RIGHT */}
  <View style={s.actionBtnSquare}>
    <SendPrimaryButton
      variant="green"
      disabled={screenLock || (items?.length ?? 0) === 0}
      loading={draftSendBusy}
      onPress={async () => {
        if (screenLock || (items?.length ?? 0) === 0) return;

        setDraftSendBusy(true);
        try {
          await submitToDirector();
          setDraftOpen(false);
        } catch (e: any) {
          Alert.alert("Ошибка", e?.message ?? "Не удалось отправить директору");
        } finally {
          setDraftSendBusy(false);
        }
      }}
    />
  </View>
</View>
 </View>
</RNModal>
              </View>
       </KeyboardAvoidingView>
  );
}
/* ======================= Styles (CLEAN, UI-only) ======================= */
const s = StyleSheet.create({
  container: { flex: 1 },
  pagePad: { padding: 16, paddingBottom: 120 },

  small: {
    color: UI.sub,
    fontSize: TYPO.kpiLabel.fontSize,
    fontWeight: TYPO.kpiLabel.fontWeight,
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: UI.text,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0,
  },

  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  suggest: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },

  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  // ===== dropdown overlay
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },

  modalSheet: Platform.select({
    web: {
      position: "absolute" as any,
      left: 16,
      right: 16,
      top: 90,
      backgroundColor: UI.cardBg,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      boxShadow: "0 12px 24px rgba(0,0,0,0.35)",
    },
    default: {
      position: "absolute" as any,
      left: 16,
      right: 16,
      top: 90,
      backgroundColor: UI.cardBg,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      elevation: 8,
      shadowColor: "#000",
      shadowOpacity: 0.22,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
  }),

  // ===== collapsing header (dark)
  cHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 50,
    backgroundColor: UI.cardBg,
    borderBottomWidth: 1,
    borderColor: UI.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    paddingBottom: 10,
  },
  cTitle: { color: UI.text, fontWeight: TYPO.titleSm.fontWeight },

  requestSummaryBox: {
    borderWidth: 1.25,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginTop: 4,
    gap: 6,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },

  requestSummaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  requestNumber: { fontSize: 16, fontWeight: "900", color: UI.text },

  requestMeta: {
    marginTop: 6,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  bgGlow: {
    position: "absolute",
    left: -80,
    right: -80,
    top: -120,
    height: 260,
    backgroundColor: "rgba(34,197,94,0.10)",
    borderBottomLeftRadius: 260,
    borderBottomRightRadius: 260,
    opacity: 0.9,
  },

  // ===== section blocks
  section: {
    marginTop: 14,
    marginBottom: 8,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  sectionTitle: {
    color: UI.sub,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.4,
  },

  pickTabsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  pickTabBtn: {
    flex: 1,
    height: 46,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  // ✅ ДОБАВЛЕНО: чтобы JSX не ссылался на отсутствующие ключи
  pickTabCatalog: {},
  pickTabSoft: {},

  pickTabText: { color: UI.text, fontWeight: "900", fontSize: 14 },

  // ===== bottom bar (dark)
  stickyBar: {
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: UI.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  miniBar: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  miniBtn: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  miniText: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.2,
  },

  // ===== history modal (bottom sheet dark)
  historyModal: {
    backgroundColor: UI.cardBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    ...Platform.select({
      web: { boxShadow: "0px -4px 24px rgba(0, 0, 0, 0.35)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowOffset: { width: 0, height: -6 },
        shadowRadius: 18,
        elevation: 10,
      },
    }),
  },
  historyModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  historyModalTitle: { fontSize: 18, fontWeight: "900", color: UI.text },
  historyModalClose: { color: "#E5E7EB", fontWeight: "900" },
  historyModalBody: { flexGrow: 1 },
  historyModalEmpty: {
    color: UI.sub,
    textAlign: "center",
    marginTop: 16,
    fontWeight: "800",
  },
  historyModalList: { maxHeight: 360 },
  historyModalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
    gap: 12,
  },
  historyModalPrimary: { fontWeight: "900", fontSize: 15, color: UI.text },
  historyModalMeta: { color: UI.sub, fontSize: 13, marginTop: 2, fontWeight: "800" },
  historyModalMetaSecondary: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "800",
  },

  historyStatusBadge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  historyPdfBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  historyPdfBtnText: { fontSize: 12, fontWeight: "900", color: UI.text },

  // ===== draft list row
  draftRowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,

    borderWidth: 1.25,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "rgba(16,24,38,0.92)",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },

  draftRowMain: {
    flex: 1,
    minWidth: 0,
  },

  draftRowTitle: {
    fontWeight: "800",
    fontSize: 16,
    color: UI.text,
    lineHeight: 20,
  },

  draftRowMeta: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: UI.sub,
    lineHeight: 18,
  },

  draftRowStatus: {
    marginTop: 6,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    lineHeight: 16,
  },

  draftRowStatusStrong: {
    color: UI.text,
    fontWeight: "900",
  },

  rejectBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.btnReject,
  },
  rejectIcon: { color: "#fff", fontSize: 22, fontWeight: "900", lineHeight: 22 },

  // ===== draft card (entry)
  draftCard: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,

    padding: 14,
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(16,24,38,0.92)",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  draftTitle: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  draftNo: {
    marginTop: 6,
    color: UI.text,
    fontWeight: "900",
    fontSize: 18,
  },
  draftHint: {
    marginTop: 8,
    color: "rgba(255,255,255,0.78)",
    fontWeight: "800",
    fontSize: 13,
    lineHeight: 18,
  },

  posPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  posPillText: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  posCountPill: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  posCountText: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 13,
  },

  // ===== draft sheet (bottom)
  sheet: {
    height: "88%",
    backgroundColor: UI.cardBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 10,
  },
  sheetTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  sheetTitle: {
    flex: 1,
    minWidth: 0,
    color: UI.text,
    fontWeight: "900",
    fontSize: 18,
  },
  sheetCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    flexShrink: 0,
  },
  sheetCloseText: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 13,
  },

  sheetMetaBox: {
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: UI.border,
    borderLeftWidth: 4,
    borderLeftColor: UI.accent,
  },
  sheetMetaLine: {
    color: UI.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  sheetMetaValue: {
    color: UI.text,
    fontWeight: "900",
  },

  sheetActions: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  actionText: {
    color: UI.text,
    fontWeight: "900",
  },

  sheetSendPrimary: {
    marginTop: 10,
    height: 52,
    borderRadius: 18,
    backgroundColor: UI.btnApprove,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  sheetSendPrimaryText: {
    color: "#0B0F14",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.2,
  },
foremanSuggestBox: {
  marginTop: 6,
  borderRadius: 14,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.12)",
  backgroundColor: UI.cardBg,
},

foremanSuggestRow: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255,255,255,0.08)",
},

foremanSuggestText: {
  color: UI.text,
  fontWeight: "800",
  fontSize: 14,
},
reqActionsBottom: {
  marginTop: 12,
  flexDirection: "row",
  alignItems: "center",
  padding: 10,
  borderRadius: 18,
  backgroundColor: "rgba(255,255,255,0.04)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.10)",
},

actionBtnWide: {
  flex: 1,
  minWidth: 0,
  paddingVertical: 12,
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.08)",
},

sp8: { width: 8 },

actionBtnSquare: {
  width: 46,
  height: 46,
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
},

});
