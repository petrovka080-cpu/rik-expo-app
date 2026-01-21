// app/(tabs)/foreman.tsx — экран прораба

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { LogBox } from 'react-native';
import { Linking } from 'react-native';
import CalcModal from "../../src/components/foreman/CalcModal";
import WorkTypePicker from "../../src/components/foreman/WorkTypePicker";
import { useCalcFields } from "../../src/components/foreman/useCalcFields";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import CatalogModal from '../../src/components/foreman/CatalogModal';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../src/lib/supabaseClient';
import {
  rikQuickSearch,
  listRequestItems,
  fetchRequestDisplayNo,
  fetchRequestDetails,
  updateRequestMeta,
  requestSubmit, // RPC: отправить директору
  exportRequestPdf, // PDF
  getOrCreateDraftRequestId, // безопасный ensure для черновика
  requestCreateDraft,
  clearLocalDraftId,
  clearCachedDraftRequestId,
  setLocalDraftId,
  listForemanRequests,
  requestItemUpdateQty,
  requestItemCancel,
  type CatalogItem,
  type ReqItemRow,
  type ForemanRequestSummary,
  type RequestDetails,
} from '../../src/lib/catalog_api';

// --- если нужен вход — выполняется внутри getOrCreateDraftRequestId
if (__DEV__) LogBox.ignoreAllLogs(true);



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

type GroupedRow = {
  key: string;
  name_human: string;
  rik_code?: string | null;
  uom?: string | null;
  app_code?: string | null;
  total_qty: number;
  items: Array<{ id: string; qty: number; status?: string | null }>;
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


/* ===== Палитра + чипы (в унисон с buyer/accountant) ===== */
const COLORS = {
  bg: '#F8FAFC',
  text: '#0F172A',
  sub: '#475569',
  border: '#E2E8F0',
  primary: '#111827',
  tabInactiveBg: '#E5E7EB',
  tabInactiveText: '#111827',
  green: '#22C55E',
  yellow: '#CA8A04',
  red: '#EF4444',
  blue: '#3B82F6',
  amber: '#F59E0B',
};

const REQUEST_STATUS_STYLES: Record<string, { label: string; bg: string; fg: string }> = {
  draft: { label: 'Черновик', bg: '#E2E8F0', fg: '#0F172A' },
  pending: { label: 'На утверждении', bg: '#FEF3C7', fg: '#92400E' },
  approved: { label: 'Утверждена', bg: '#DCFCE7', fg: '#166534' },
  rejected: { label: 'Отклонена', bg: '#FEE2E2', fg: '#991B1B' },
};

const Chip = ({
  label,
  bg = '#E5E7EB',
  fg = '#111827',
}: {
  label: string;
  bg?: string;
  fg?: string;
}) => (
  <View
    style={{
      backgroundColor: bg,
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 10,
    }}
  >
    <Text style={{ color: fg, fontWeight: '600', fontSize: 12 }}>
      {label}
    </Text>
  </View>
);
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// === helpers: уникализация и стабильные ключи ===
function stableKey(it: any, idx: number, prefix = 'rk') {
  if (it?.request_item_id != null) return `ri:${it.request_item_id}`;
  if (it?.id != null) return `id:${it.id}`;
  if (it?.rik_code) return `${prefix}:${it.rik_code}:${idx}`;
  if (it?.code) return `${prefix}:${it.code}:${idx}`;
  return `${prefix}:idx:${idx}`;
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

function formatDateForUi(value?: string | null) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('ru-RU');
    }
  } catch {}
  return String(value);
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
      <Text style={[s.small, { color: COLORS.sub }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[s.input, { paddingVertical: 10, width: Platform.OS === 'web' ? width : '100%' }]}

      >
        <Text
          style={{
            color: COLORS.text,
            opacity: picked ? 1 : 0.6,
          }}
        >
          {picked ? picked.name : placeholder}
        </Text>
      </Pressable>

      {open && (
        <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
            <View style={s.backdrop} />
          </Pressable>
          <View style={[s.modalSheet, { maxWidth: 420, left: 16, right: 16 }]}>
            <Text
              style={{
                fontWeight: '700',
                fontSize: 16,
                marginBottom: 8,
                color: COLORS.text,
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
                  <Text
                    style={{ fontWeight: '600', color: COLORS.text }}
                  >
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
                    { backgroundColor: '#eee', borderColor: COLORS.border },
                  ]}
                >
                  <Text>Сбросить</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setOpen(false)}
                style={[
                  s.chip,
                  { backgroundColor: '#eee', borderColor: COLORS.border },
                ]}
              >
                <Text>Закрыть</Text>
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

export default function ForemanScreen() {
  // ===== Шапка заявки =====
  const [requestId, setRequestId] = useState<string>(''); // создадим автоматически
  const [foreman, setForeman] = useState<string>(''); // ФИО прораба (обяз.)
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

  
// ===== Справочник применений (для корзины/модалки) =====
const [appOptions, setAppOptions] = useState<AppOption[]>([]);


  
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
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [historyRequests, setHistoryRequests] = useState<ForemanRequestSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
    const [pendingCount, setPendingCount] = useState<number>(0);
const [submitOkFlash, setSubmitOkFlash] = useState(false);

  // ===== Режим отображения =====
 const [viewMode, setViewMode] = useState<'raw' | 'grouped'>('raw');


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

  const handleCommentChange = useCallback((value: string) => {
    setComment(value);
    setRequestDetails((prev) =>
      prev
        ? {
            ...prev,
            comment: value,
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
      setViewMode('raw');
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
          setPendingCount(pending);
        } else {
          setHistoryRequests([]);
          setPendingCount(0);
        }
      } catch (e) {
        console.warn('[Foreman] listForemanRequests:', e);
        Alert.alert('История', 'Не удалось загрузить историю заявок.');
        setHistoryRequests([]);
        setPendingCount(0);
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
  const openHistoryPdf = useCallback(
    async (reqId: string) => {
      try {
        const rid = String(reqId).trim();
        if (!rid) return;

        const url = await exportRequestPdf(rid, 'preview');

if (!url) {
  Alert.alert('PDF', 'Не удалось сформировать PDF-документ');
  return;
}

if (Platform.OS === 'web') {
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    Alert.alert('PDF', 'Не удалось открыть PDF. Разрешите всплывающие окна.');
  }
  return;
}

// ✅ iOS/Android: скачиваем и открываем как file://
await openPdfPreviewOrFallbackShare(url);

      } catch (e: any) {
        Alert.alert('Ошибка', e?.message ?? 'PDF не сформирован');
      }
    },
    [],
  );

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
      console.log('[Foreman] ensure draft: start');

      const idAny = await getOrCreateDraftRequestId(); // должно дернуть БД
      const rid = String(idAny).trim();

      console.log('[Foreman] ensure draft: got id', rid);

      if (!rid) throw new Error('draft id is empty');

      if (cancelled) return;

      // 1) ставим requestId
      setRequestId(rid);

      // 2) сразу пробуем подгрузить номер/детали
      //    (чтобы не зависеть от других эффектов)
      const d = await fetchRequestDetails(rid);
      console.log('[Foreman] draft details', d);

      if (!cancelled && d) {
        setRequestDetails(d);
        const dn = String(d.display_no ?? '').trim();
        if (dn) {
          setDisplayNoByReq((prev) => ({ ...prev, [rid]: dn }));
        }
      } else {
        // если details не вернулись — хотя бы дернем номер
        const dn2 = await fetchRequestDisplayNo(rid);
        console.log('[Foreman] draft display_no', dn2);
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

  const okCount = results.filter((r) => r?.ok).length;
  const failCount = results.length - okCount;

  await loadItems(rid);
  setCalcVisible(false);
  setSelectedWorkType(null);

  if (failCount > 0) {
    Alert.alert('Готово (частично)', `Добавлено: ${okCount}\nОшибок: ${failCount}`);
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
  
  const updateQtyDraftValue = useCallback((itemId: string, value: string) => {
    setQtyDrafts((prev) => ({ ...prev, [itemId]: value }));
  }, []);

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

setSubmitOkFlash(true);
setTimeout(() => setSubmitOkFlash(false), 1200);


      clearLocalDraftId();
      clearCachedDraftRequestId();
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
  try {
    if (!ensureHeaderReady()) return;

    const rid = requestId ? ridStr(requestId) : await ensureAndGetId();

    await updateRequestMeta(rid, {
      object_type_code: objectType || null,
      level_code: level || null,
      system_code: system || null,
      zone_code: zone || null,
      comment: comment.trim() || null,
      foreman_name: foreman.trim() || null,
    }).catch(() => null);

    const uri = await exportRequestPdf(rid, 'share');

    if (!uri) {
      Alert.alert('PDF', 'Не удалось сформировать PDF-документ');
      return;
    }

    if (Platform.OS === 'web') {
      const win = window.open(uri, '_blank', 'noopener,noreferrer');
      if (!win) Alert.alert('PDF', 'Не удалось открыть PDF. Разрешите всплывающие окна.');
      return;
    }

    const ok = await Sharing.isAvailableAsync();
    if (!ok) {
      Alert.alert('PDF', 'Отправка недоступна на этом устройстве.');
      return;
    }
    await Sharing.shareAsync(uri);
  } catch (e: any) {
    Alert.alert('Ошибка', e?.message ?? 'PDF не сформирован');
  }
}, [
  requestId,
  ridStr,
  ensureAndGetId,
  foreman,
  objectType,
  level,
  system,
  zone,
  comment,
  ensureHeaderReady,
]);

  const onPdf = useCallback(async () => {
  try {
    if (!ensureHeaderReady()) return;

    const rid = requestId ? ridStr(requestId) : await ensureAndGetId();

    await updateRequestMeta(rid, {
      object_type_code: objectType || null,
      level_code: level || null,
      system_code: system || null,
      zone_code: zone || null,
      comment: comment.trim() || null,
      foreman_name: foreman.trim() || null,
    }).catch(() => null);

    const uri = await exportRequestPdf(rid, 'preview');

    if (!uri) {
      Alert.alert('PDF', 'Не удалось сформировать PDF-документ');
      return;
    }

    if (Platform.OS === 'web') {
      const win = window.open(uri, '_blank', 'noopener,noreferrer');
      if (!win) Alert.alert('PDF', 'Не удалось открыть PDF. Разрешите всплывающие окна.');
      return;
    }

    // ✅ iOS/Android: просмотр (или fallback на ShareSheet)
    await openPdfPreviewOrFallbackShare(uri);
  } catch (e: any) {
    Alert.alert('Ошибка', e?.message ?? 'PDF не сформирован');
  }
}, [
  requestId,
  ridStr,
  ensureAndGetId,
  foreman,
  objectType,
  level,
  system,
  zone,
  comment,
  ensureHeaderReady,
]);

async function openPdfPreviewOrFallbackShare(uri: string) {
  // WEB
  if (Platform.OS === 'web') {
    const win = window.open(uri, '_blank', 'noopener,noreferrer');
    if (!win) Alert.alert('PDF', 'Не удалось открыть PDF. Разрешите всплывающие окна.');
    return;
  }

  // ✅ 1) лок на повторные тапы (чтобы не было гонок)
  // (можешь вынести наверх компонента как useRef, но так тоже ок)
  // @ts-ignore
  if ((openPdfPreviewOrFallbackShare as any).__busy) return;
  // @ts-ignore
  (openPdfPreviewOrFallbackShare as any).__busy = true;

  try {
    // ✅ JWT (если PDF защищен)
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    // ✅ если уже file:// — не качаем
    let localUri = uri;
    const isRemote = /^https?:\/\//i.test(uri);

    if (isRemote) {
      const localPath = `${FileSystem.cacheDirectory}request_${Date.now()}.pdf`;
      await FileSystem.downloadAsync(uri, localPath, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      localUri = localPath;
    }

    // ✅ микропаузa — реально помогает Expo/Router не “дергаться”
    await new Promise((r) => setTimeout(r, 150));

    // ✅ PREVIEW через Share Sheet (это и есть нормальный просмотр на iOS/Android)
    const ok = await Sharing.isAvailableAsync();
    if (!ok) {
      // fallback: если вдруг шаринг недоступен — хотя бы печать
      await Print.printAsync({ uri: localUri });
      return;
    }

    await Sharing.shareAsync(localUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'PDF',
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e ?? '');
    // ✅ если юзер отменил — не ругаемся
    if (msg.toLowerCase().includes('canceled') || msg.toLowerCase().includes('cancel')) return;

    console.warn('[PDF] open failed:', msg);
    Alert.alert('PDF', 'PDF сформирован, но не удалось открыть на устройстве.');
  } finally {
    // @ts-ignore
    (openPdfPreviewOrFallbackShare as any).__busy = false;
  }
}
  // ---------- Группировка для режима «Сгруппировано» ----------
  const grouped = useMemo<GroupedRow[]>(() => {
    if (!items?.length) return [];
    const map = new Map<string, GroupedRow>();
    for (const it of items) {
      const code = (it as any).rik_code ?? null;
      const uom = it.uom ?? null;
      const app = it.app_code ?? null;
      const baseKey = code
        ? `code:${code}`
        : `name:${(it.name_human || '').toLowerCase()}`;
      const key = `${baseKey}|uom:${uom || ''}|app:${app || ''}`;
      const qtyNum = Number(it.qty) || 0;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          key,
          name_human: it.name_human || ruName(it) || '—',
          rik_code: code,
          uom,
          app_code: app,
          total_qty: qtyNum,
          items: [
            { id: it.id, qty: qtyNum, status: it.status ?? null },
          ],
        });
      } else {
        cur.total_qty += qtyNum;
        cur.items.push({
          id: it.id,
          qty: qtyNum,
          status: it.status ?? null,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.name_human || '').localeCompare(b.name_human || ''),
    );
  }, [items]);

 
  const ReqItemRowView = useCallback(
    ({ it }: { it: ReqItemRow }) => {
      const key = String(it.id);
      const updating = !!qtyBusyMap[key];
      const canEdit = canEditRequestItem(it);

      return (
        <View
          style={[
            s.card,
            {
              backgroundColor: '#fff',
              borderColor: COLORS.border,
            },
          ]}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <Text
              style={[
                s.cardTitle,
                { color: COLORS.text },
              ]}
            >
              {it.name_human}
            </Text>
            {it.uom ? (
              <Chip
                label={`Ед.: ${it.uom}`}
                bg="#E0E7FF"
                fg="#3730A3"
              />
            ) : null}
            {it.app_code ? (
              <Chip label={labelForApp(it.app_code)} />
            ) : null}
          </View>

         <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
  {/* слева: Кол-во + значение */}
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 }}>
    <Text style={{ color: COLORS.sub, fontWeight: '700' }}>Кол-во:</Text>
    <Text style={{ color: COLORS.text, fontWeight: '900' }}>
      {it.qty ?? '-'} {it.uom ?? ''}
    </Text>
  </View>

  {/* справа: короткая кнопка Отменить */}
    {canEdit ? (
    <Pressable
      disabled={busy || updating}
      onPress={async () => {
        if (cancelLockRef.current[key]) return;
        cancelLockRef.current[key] = true;

        try {
          if (Platform.OS === 'web') {
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

          <Text
            style={[
              s.cardMeta,
              { color: COLORS.sub, marginTop: 4 },
            ]}
          >
            Статус:{' '}
            <Text
              style={{
                color: COLORS.text,
                fontWeight: '700',
              }}
            >
              {it.status ?? '—'}
            </Text>
          </Text>

          {it.note ? (
            <Text
              style={[
                s.cardMeta,
                { color: COLORS.sub, marginTop: 2 },
              ]}
            >
              Примечание:{' '}
              <Text style={{ color: COLORS.text }}>
                {it.note}
              </Text>
            </Text>
          ) : null}
        </View>
      );
    },
        [
      canEditRequestItem,
      qtyBusyMap,
      busy,
      labelForApp,
      requestItemCancel,
    ],

  );

  const GroupedRowView = useCallback(
    ({ g }: { g: GroupedRow }) => (
      <View
        style={[
          s.card,
          {
            backgroundColor: '#fff',
            borderColor: COLORS.border,
          },
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <Text
            style={[
              s.cardTitle,
              { color: COLORS.text },
            ]}
          >
            {g.name_human}
          </Text>
          {g.uom ? (
            <Chip
              label={`Ед.: ${g.uom}`}
              bg="#E0E7FF"
              fg="#3730A3"
            />
          ) : null}
          {g.app_code ? (
            <Chip label={labelForApp(g.app_code)} />
          ) : null}
        </View>
        <Text
          style={[
            s.cardMeta,
            {
              color: COLORS.sub,
              marginTop: 6,
              fontWeight: '700',
            },
          ]}
        >
          Итого:{' '}
          <Text style={{ color: COLORS.text }}>
            {g.total_qty} {g.uom || ''}
          </Text>
        </Text>
        <View style={{ marginTop: 6 }}>
          {g.items.map((r, i) => (
            <Text
              key={g.key + ':' + r.id}
              style={{ color: COLORS.sub }}
            >
              {i + 1}. #{r.id} — {r.qty}{' '}
              {g.uom || ''}
              {r.status ? ` · ${r.status}` : ''}
            </Text>
          ))}
        </View>
      </View>
    ),
    [labelForApp],
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
    outputRange: [22, 16],
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
    <View style={[s.container, { backgroundColor: COLORS.bg }]}>

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
          <Animated.Text style={[s.cTitle, { fontSize: titleSize }]} numberOfLines={1}>
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

              <View style={[s.historyStatusBadge, { backgroundColor: statusInfo.bg }]}>
                <Text style={{ color: statusInfo.fg, fontWeight: '600' }}>
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

        <Text style={[s.small, { color: COLORS.sub }]}>
          ФИО прораба (обязательно):
        </Text>

        <TextInput
          value={foreman}
          onChangeText={handleForemanChange}
          placeholder="Иванов И.И."
          style={s.input}
        />

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
      <Ionicons name="list" size={18} color="#0F172A" />
      <Text style={s.pickTabText}>Каталог</Text>
    </Pressable>

    <Pressable
      onPress={handleCalcPress}
      disabled={busy}
      style={[s.pickTabBtn, s.pickTabSoft, busy && { opacity: 0.5 }]}
    >
      <Ionicons name="calculator-outline" size={18} color="#0F172A" />
      <Text style={s.pickTabText}>Смета</Text>
    </Pressable>
  </View>
</View>
{/* ===== Черновик ===== */}
<View style={s.section}>
  <View style={s.sectionRow}>
    <Text style={s.sectionTitle}>ЧЕРНОВИК</Text>
    <View style={s.badge}>
      <Text style={s.badgeText}>{items?.length ?? 0}</Text>
    </View>
  </View>

  {(!items || items.length === 0) ? (
    <Text style={s.sectionHint}>
      Пока пусто — добавь позиции из <Text style={{ fontWeight: '900' }}>Каталога</Text> или <Text style={{ fontWeight: '900' }}>Сметы</Text>.
    </Text>
  ) : null}
</View>

            {/* Items */}
        <FlatList
          data={items}
          keyExtractor={(it, idx) => (it?.id ? `ri:${it.id}` : `ri:${it.request_id}-${idx}`)}
          renderItem={({ item }) => <ReqItemRowView it={item} />}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 16, color: COLORS.sub }}>
              Пока пусто
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadItems();
                setRefreshing(false);
              }}
            />
          }
          keyboardShouldPersistTaps="always"
          scrollEnabled={false}
          nestedScrollEnabled={false}
          removeClippedSubviews
          windowSize={9}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={50}
        />
      </AnimatedScrollView>

      {/* ✅ Нижняя панель — как было */}
      <View style={s.stickyBar}>
  
  {/* ✅ Строка 2: mini-bar как мессенджер */}
  <View style={s.miniBar}>
    <Pressable onPress={onPdf} disabled={busy} style={[s.miniBtn, busy && { opacity: 0.5 }]}>
      <Ionicons name="document-text-outline" size={18} color="#0F172A" />
      <Text style={s.miniText}>PDF</Text>
    </Pressable>

    <Pressable onPress={handleOpenHistory} disabled={busy} style={[s.miniBtn, busy && { opacity: 0.5 }]}>
      <Ionicons name="time-outline" size={18} color="#0F172A" />
      <Text style={s.miniText}>История</Text>
    </Pressable>

  <Pressable
  onPress={submitToDirector}
  disabled={busy || (items?.length ?? 0) === 0}
  style={[
    s.sendBtn,
    submitOkFlash && s.sendBtnOk,
    (busy || (items?.length ?? 0) === 0) && { opacity: 0.4 },
  ]}
>
  <Ionicons name={submitOkFlash ? "checkmark" : "send"} size={18} color="#fff" />
</Pressable>


  </View>
</View>

        <Modal
          visible={historyVisible}
          animationType="fade"
          transparent
          onRequestClose={handleCloseHistory}
        >
          <View style={s.historyModalOverlay}>
            <Pressable style={s.historyModalBackdrop} onPress={handleCloseHistory} />
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
                            <Text style={s.historyModalMetaSecondary}>
                              {created}
                              </Text>

                            {hasRejected ? (
                              <Text
                                style={{
                                  color: '#B91C1C',
                                  fontSize: 12,
                                  marginTop: 2,
                                  fontWeight: '600',
                                }}
                              >
                                Есть отклонённые позиции
                              </Text>
                            ) : null}
                          </Pressable>

                          <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            <View
                              style={[
                                s.historyStatusBadge,
                                { backgroundColor: hasRejected ? '#FEE2E2' : info.bg },
                              ]}
                            >
                              <Text style={{ color: info.fg, fontWeight: '700' }}>
                                {info.label}
                              </Text>
                            </View>

                            <Pressable onPress={() => openHistoryPdf(req.id)} style={s.historyPdfBtn}>
                              <Text style={s.historyPdfBtnText}>PDF</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </View>
          </View>
        </Modal>
<CatalogModal
  visible={catalogVisible}
  onClose={() => setCatalogVisible(false)}
  rikQuickSearch={rikQuickSearch as any}
  onCommitToDraft={commitCatalogToDraft}
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

              </View>
       </KeyboardAvoidingView>
  );
}

/* ======================= Styles (только UI, логика не тронута) ======================= */
const s = StyleSheet.create({
  container: { flex: 1 },
  pagePad: { padding: 16, paddingBottom: 120 },
  small: { fontSize: 12 },

  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
    color: '#0F172A',
  },
      suggest: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  
  blockTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },

  requestSummaryBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    marginTop: 4,
    gap: 6,
  },
  requestSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  requestNumber: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  requestMeta: { color: '#64748B', fontSize: 12 },

  historyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'flex-end',
  },
  historyModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  historyModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '80%',
    ...Platform.select({
      web: { boxShadow: '0px -4px 24px rgba(0, 0, 0, 0.16)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: -4 },
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  historyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyModalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  historyModalClose: { color: '#2563EB', fontWeight: '600' },
  historyModalBody: { flexGrow: 1 },
  historyModalEmpty: {
    color: '#475569',
    textAlign: 'center',
    marginTop: 16,
  },
  historyModalList: { maxHeight: 360 },
  historyModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  historyModalPrimary: { fontWeight: '700', fontSize: 15, color: '#0F172A' },
  historyModalMeta: { color: '#475569', fontSize: 13, marginTop: 2 },
  historyModalMetaSecondary: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  historyStatusBadge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  historyPdfBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F9FAFB',
  },
  historyPdfBtnText: { fontSize: 12, fontWeight: '600', color: '#1D4ED8' },

  card: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontWeight: '700', fontSize: 15 },
  cardMeta: { marginTop: 4 },

  rejectBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
  },
  rejectIcon: { color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 22 },

  row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  rowLabel: { width: 110 },

  qtyWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  qtyBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  qtyBtnTxt: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  qtyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    backgroundColor: '#fff',
    color: '#0F172A',
  },

  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },

  stickyBar: {
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stickyRow2: { flexDirection: 'row', gap: 10, marginBottom: 10 },

  cHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },
  cTitle: { fontWeight: '900', color: '#0F172A' },

  btnHalf: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimarySoft: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  btnNeutral: { backgroundColor: '#F3F4F6', borderColor: '#CBD5E1' },
  btnDisabled: { backgroundColor: '#E5E7EB', borderColor: '#D1D5DB' },
  btnTxtDark: { color: '#111827', fontWeight: '800', fontSize: 14 },
  btnTxtDisabled: { color: '#9CA3AF', fontWeight: '600', fontSize: 14 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },

  modalSheet: Platform.select({
    web: {
      position: 'absolute' as any,
      left: 16,
      right: 16,
      top: 90,
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      boxShadow: '0 12px 24px rgba(0,0,0,0.18)',
    },
    default: {
      position: 'absolute' as any,
      left: 16,
      right: 16,
      top: 90,
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 12,
      elevation: 6,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
  }),

  // ✅ mini keyboard bar
  miniBar: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  miniText: { color: '#0F172A', fontWeight: '900', fontSize: 13 },
  sendBtn: {
    width: 54,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
sendBtnOk: {
  backgroundColor: '#0EA5E9', // синий “успех”, не зелёный
},

section: {
  marginTop: 14,
  marginBottom: 8,
  padding: 12,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  backgroundColor: '#fff',
},
sectionTitle: {
  fontSize: 12,
  fontWeight: '900',
  letterSpacing: 0.6,
  color: '#0F172A',
},
sectionHint: {
  marginTop: 8,
  color: '#64748B',
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '700',
},
sectionRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
badge: {
  minWidth: 28,
  height: 22,
  paddingHorizontal: 8,
  borderRadius: 999,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#E0F2FE',
},
badgeText: {
  color: '#075985',
  fontWeight: '900',
  fontSize: 12,
},
pickTabsRow: {
  flexDirection: 'row',
  gap: 10,
  marginTop: 10,
},
pickTabBtn: {
  flex: 1,
  height: 46,
  borderRadius: 14,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  gap: 10,
},
pickTabNeutral: { backgroundColor: '#F3F4F6', borderColor: '#CBD5E1' },
pickTabSoft: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
pickTabText: { color: '#0F172A', fontWeight: '900', fontSize: 14 },
pickTabCatalog: { backgroundColor: '#E0F2FE', borderColor: '#7DD3FC' }, // голубой

});
