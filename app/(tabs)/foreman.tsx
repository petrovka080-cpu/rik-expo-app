// app/(tabs)/foreman.tsx — экран прораба: заявка + поиск по РИК + корзина + калькулятор

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
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { LogBox } from 'react-native';
import { Link } from 'expo-router';

import {
  rikQuickSearch,
  addRequestItemFromRik,
  listRequestItems,
  ensureRequestSmart, // авто-ID/дата/ФИО (как было)
  requestSubmit, // RPC: отправить директору
  exportRequestPdf, // PDF
  getOrCreateDraftRequestId, // безопасный ensure для черновика
  type CatalogItem,
  type ReqItemRow,
} from '../../src/lib/catalog_api';

// --- если нужен вход — выполняется внутри ensureRequestSmart/getOrCreateDraftRequestId
if (__DEV__) LogBox.ignoreAllLogs(true);

type Timer = ReturnType<typeof setTimeout>;

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

const KIND_TABS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'Материал', label: 'Материалы' },
  { key: 'Работа', label: 'Работы' },
  { key: 'Услуга', label: 'Услуги' },
];

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

// === helpers: уникализация и стабильные ключи ===
function uniqBy<T>(arr: T[], key: (x: T) => string) {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
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
        style={[s.input, { paddingVertical: 10, width }]}
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
                  <Text style={{ color: COLORS.sub }}>{item.code}</Text>
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

export default function ForemanScreen() {
  // ===== Шапка заявки =====
  const [requestId, setRequestId] = useState<string>(''); // создадим автоматически
  const [foreman, setForeman] = useState<string>(''); // ФИО прораба (обяз.)
  const [needBy, setNeedBy] = useState<string>(''); // YYYY-MM-DD
  const [comment, setComment] = useState<string>(''); // общий комментарий

  // ===== Новые справочные поля (Объект/Этаж/Система/Зона) =====
  const [objectType, setObjectType] = useState<string>(''); // required
  const [level, setLevel] = useState<string>(''); // required
  const [system, setSystem] = useState<string>(''); // optional
  const [zone, setZone] = useState<string>(''); // optional

  const [objOptions, setObjOptions] = useState<RefOption[]>([]);
  const [lvlOptions, setLvlOptions] = useState<RefOption[]>([]);
  const [sysOptions, setSysOptions] = useState<RefOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<RefOption[]>([]);

  // ===== Поиск =====
  const [query, setQuery] = useState('');
  const [activeKind, setActiveKind] = useState<string>('all');
  const [suggests, setSuggests] = useState<CatalogItem[]>([]);
  const [loadingSuggests, setLoadingSuggests] = useState(false);
  const canSearch = query.trim().length >= 2;
  const timerRef = useRef<Timer | null>(null);
  const reqIdRef = useRef(0);

  // ===== Глобальный фильтр по области применения (РИК) =====
  const [appOptions, setAppOptions] = useState<AppOption[]>([]);
  const [appFilter, setAppFilter] = useState<string>('');
  const appFilterCode = useMemo(() => {
    const t = appFilter.trim();
    if (!t) return '';
    const found = appOptions.find(
      (o) => o.code === t || o.label.toLowerCase() === t.toLowerCase(),
    );
    return found ? found.code : t;
  }, [appFilter, appOptions]);

  const labelForApp = useCallback(
    (code?: string | null) => {
      if (!code) return '';
      return appOptions.find((o) => o.code === code)?.label || code;
    },
    [appOptions],
  );

  // ===== Корзина (мультивыбор) =====
  const [cart, setCart] = useState<Record<string, PickedRow>>({});
  const cartArray = useMemo(() => Object.values(cart), [cart]);
  const cartCount = cartArray.length;

  // ===== Уже добавленные строки заявки =====
  const [items, setItems] = useState<ReqItemRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  // ===== Режим отображения =====
  const [viewMode, setViewMode] = useState<'raw' | 'grouped'>('raw');

  // ===== Модал выбора применения для строки =====
  const [appPickerFor, setAppPickerFor] = useState<string | null>(null);
  const [appPickerQ, setAppPickerQ] = useState<string>('');

  // --- безопасный RID как строка (универсально для uuid/bigint) ---
  const ridStr = useCallback((val: string | number) => String(val).trim(), []);

  // ====== КЭШ и подгрузка display_no для текущей заявки ======
  const [displayNoByReq, setDisplayNoByReq] = useState<Record<string, string>>(
    {},
  );
  const labelForRequest = useCallback(
    (rid?: string | number | null) => {
      const key = String(rid ?? '').trim();
      if (!key) return '';
      const dn = displayNoByReq[key];
      if (dn && dn.trim()) return dn.trim();
      return `#${shortId(key)}`;
    },
    [displayNoByReq],
  );

  const preloadDisplayNo = useCallback(
    async (rid?: string | number | null) => {
      const key = String(rid ?? '').trim();
      if (!key || displayNoByReq[key] != null) return;
      try {
        // @ts-ignore
        const { supabase } = await import('../../src/lib/supabaseClient');
        const { data, error } = await supabase
          .from('v_requests_display')
          .select('id, display_no')
          .eq('id', key)
          .single();
        if (!error && data && data.display_no) {
          setDisplayNoByReq((prev) => ({
            ...prev,
            [key]: String(data.display_no),
          }));
        }
      } catch (e) {
        console.warn(
          '[Foreman] preloadDisplayNo:',
          (e as any)?.message ?? e,
        );
      }
    },
    [displayNoByReq],
  );

  const loadItems = useCallback(async () => {
    if (!requestId) return;
    try {
      const rows = await listRequestItems(ridStr(requestId));
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error('[Foreman] listRequestItems error:', e);
      setItems([]);
    }
  }, [requestId, ridStr]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // создаём/получаем черновик при монтировании
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = await getOrCreateDraftRequestId();
        if (!cancelled) setRequestId(String(id));
      } catch (e) {
        console.warn(
          '[Foreman] draft ensure failed:',
          (e as any)?.message || e,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // подгружаем display_no при появлении requestId
  useEffect(() => {
    if (requestId) preloadDisplayNo(requestId);
  }, [requestId, preloadDisplayNo]);

  // нормальный ensure, если надо создать прямо сейчас (с сохранением шапки)
  async function ensureAndGetId() {
    const name = foreman.trim() || 'Прораб (не указан)';
    try {
      const rid = await ensureRequestSmart(undefined, {
        foreman_name: name,
        need_by: needBy.trim() || undefined,
        comment: comment.trim() || undefined,
        object_type_code: objectType || (undefined as any),
        level_code: level || (undefined as any),
        system_code: system || (undefined as any),
        zone_code: zone || (undefined as any),
      } as any);

      const idStr = String(rid || '').trim();
      if (idStr) {
        setRequestId(idStr);
        if (!foreman.trim()) setForeman(name);
        preloadDisplayNo(idStr);
        return idStr;
      }

      const rid2 = await getOrCreateDraftRequestId();
      setRequestId(String(rid2));
      if (!foreman.trim()) setForeman(name);
      preloadDisplayNo(String(rid2));
      return String(rid2);
    } catch (e: any) {
      try {
        const rid3 = await getOrCreateDraftRequestId();
        setRequestId(String(rid3));
        if (!foreman.trim()) setForeman(name);
        preloadDisplayNo(String(rid3));
        return String(rid3);
      } catch {}
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

        const [obj, lvl, sys, zn] = await Promise.all([
          supabase
            .from('ref_object_types')
            .select('code,name')
            .order('name'),
          supabase
            .from('ref_levels')
            .select('code,name,sort')
            .order('sort', { ascending: true }),
          supabase
            .from('ref_systems')
            .select('code,name')
            .order('name'),
          supabase
            .from('ref_zones')
            .select('code,name')
            .order('name'),
        ]);

        if (!cancelled) {
          if (!obj.error && Array.isArray(obj.data))
            setObjOptions(obj.data as RefOption[]);
          if (!lvl.error && Array.isArray(lvl.data))
            setLvlOptions(
              (lvl.data as any[]).map((r) => ({
                code: r.code,
                name: r.name,
              })),
            );
          if (!sys.error && Array.isArray(sys.data))
            setSysOptions(sys.data as RefOption[]);
          if (!zn.error && Array.isArray(zn.data))
            setZoneOptions(zn.data as RefOption[]);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Варианты применений (РИК) ----------
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
              label:
                (r.name_human && String(r.name_human).trim()) || r.app_code,
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
          const uniq = Array.from(
            new Set(b.data.map((r: any) => r.app_code)),
          ).filter(Boolean);
          setAppOptions(
            uniq.map((code: string) => ({ code, label: code })),
          );
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Поиск с дебаунсом ----------
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!canSearch) {
      setSuggests([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      const current = ++reqIdRef.current;
      try {
        setLoadingSuggests(true);
        const isKnown =
          !!appFilterCode &&
          appOptions.some((o) => o.code === appFilterCode);
        const appsParam = isKnown ? [appFilterCode] : undefined;

        const rows = await rikQuickSearch(query, 60, appsParam);
        let list = Array.isArray(rows) ? rows : [];
        if (activeKind !== 'all') {
          list = list.filter(
            (r: any) =>
              (r.kind ?? '').toLowerCase() ===
              activeKind.toLowerCase(),
          );
        }
        if (current === reqIdRef.current) setSuggests(list);
      } catch (e) {
        if (current === reqIdRef.current) setSuggests([]);
        console.error('[Foreman] rikQuickSearch]:', e);
      } finally {
        if (current === reqIdRef.current) setLoadingSuggests(false);
      }
    }, 240);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, activeKind, canSearch, appFilterCode, appOptions]);

  // ---------- ЧЕЛОВЕЧЕСКИЕ НАЗВАНИЯ ТЕКУЩЕГО ВЫБОРА ----------
  const objectName = useMemo(
    () => objOptions.find((o) => o.code === objectType)?.name || '',
    [objOptions, objectType],
  );
  const levelName = useMemo(
    () => lvlOptions.find((o) => o.code === level)?.name || '',
    [lvlOptions, level],
  );
  const systemName = useMemo(
    () => sysOptions.find((o) => o.code === system)?.name || '',
    [sysOptions, system],
  );
  const zoneName = useMemo(
    () => zoneOptions.find((o) => o.code === zone)?.name || '',
    [zoneOptions, zone],
  );

  // ---------- Корзина ----------
  const toggleToCart = useCallback(
    (it: CatalogItem) => {
      setCart((prev) => {
        const code = (it as any).rik_code as string | undefined;
        if (!code) return prev;
        if (prev[code]) {
          const copy = { ...prev };
          delete copy[code];
          return copy;
        }
        const name = (it as any).name_human ?? code;
        const kind = (it as any).kind ?? null;
        const uom = (it as any).uom_code ?? null;
        const apps = (it as any).apps ?? null;

        const isKnown =
          !!appFilterCode &&
          appOptions.some((o) => o.code === appFilterCode);
        const appDefault = isKnown
          ? appFilterCode
          : (Array.isArray(apps) && apps[0] ? apps[0] : null);

        const autoNote = buildScopeNote(
          objectName,
          levelName,
          systemName,
          zoneName,
        );

        return {
          ...prev,
          [code]: {
            rik_code: code,
            name,
            uom,
            kind,
            qty: '',
            app_code: appDefault,
            note: autoNote,
            appsFromItem: Array.isArray(apps) ? apps : undefined,
          },
        };
      });
    },
    [
      appFilterCode,
      appOptions,
      objectName,
      levelName,
      systemName,
      zoneName,
    ],
  );

  // если прораб поменял выбор — обновляем ПУСТЫЕ примечания в корзине
  useEffect(() => {
    const note = buildScopeNote(
      objectName,
      levelName,
      systemName,
      zoneName,
    );
    if (!note) return;
    setCart((prev) => {
      let changed = false;
      const next: typeof prev = { ...prev };
      for (const k of Object.keys(next)) {
        const row = next[k];
        if (!row.note || !row.note.trim()) {
          next[k] = { ...row, note };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [objectName, levelName, systemName, zoneName]);

  const setQtyFor = useCallback(
    (code: string, qty: string) =>
      setCart((prev) =>
        prev[code] ? { ...prev, [code]: { ...prev[code], qty } } : prev,
      ),
    [],
  );
  const setNoteFor = useCallback(
    (code: string, note: string) =>
      setCart((prev) =>
        prev[code] ? { ...prev, [code]: { ...prev[code], note } } : prev,
      ),
    [],
  );
  const setAppFor = useCallback(
    (code: string, app_code: string | null) =>
      setCart((prev) =>
        prev[code]
          ? { ...prev, [code]: { ...prev[code], app_code } }
          : prev,
      ),
    [],
  );

  // ---------- Массовое добавление ----------
  const addCartToRequest = useCallback(async () => {
    if (!cartCount) {
      Alert.alert('Корзина пуста', 'Выбери позиции из поиска');
      return;
    }

    for (const row of cartArray) {
      const q = Number((row.qty || '').replace(',', '.'));
      if (!Number.isFinite(q) || q <= 0) {
        Alert.alert(
          'Ошибка количества',
          `Неверное количество у "${row.name}": ${
            row.qty || '(пусто)'
          }`,
        );
        return;
      }
      if (!row.note || row.note.trim().length < 2) {
        Alert.alert(
          'Примечание обязательно',
          `Добавь примечание для "${row.name}"`,
        );
        return;
      }
    }

    let rid: string;
    try {
      setBusy(true);
      rid = requestId ? ridStr(requestId) : await ensureAndGetId();

      // сохранить актуальные поля шапки
      try {
        // @ts-ignore
        const { supabase } = await import('../../src/lib/supabaseClient');
        const patch: any = {};
        if (needBy.trim()) patch.need_by = needBy.trim();
        if (comment.trim()) patch.comment = comment.trim();
        if (objectType) patch.object_type_code = objectType;
        if (level) patch.level_code = level;
        if (system) patch.system_code = system;
        if (zone) patch.zone_code = zone;
        if (Object.keys(patch).length) {
          const { error } = await supabase
            .from('requests')
            .update(patch)
            .eq('id', rid);
          if (error)
            console.warn('[Foreman] requests meta:', error.message);
        }
      } catch {}

      // добавление позиций
      for (const row of cartArray) {
        const q = Number(row.qty.replace(',', '.'));
        const ok = await addRequestItemFromRik(rid, row.rik_code, q, {
          note: row.note.trim(),
          app_code: row.app_code ?? undefined,
          kind: row.kind ?? undefined,
          name_human: row.name,
          uom: row.uom ?? null,
        });
        if (!ok) {
          Alert.alert('Ошибка', `Не удалось добавить: ${row.name}`);
          return;
        }
      }

      setCart({});
      await loadItems();
      preloadDisplayNo(rid);
      Alert.alert('Готово', `Добавлено позиций: ${cartCount}`);
    } catch (e: any) {
      console.error(
        '[Foreman] addCartToRequest:',
        e?.message ?? e,
      );
      Alert.alert('Ошибка', e?.message ?? 'Не удалось добавить позиции');
    } finally {
      setBusy(false);
    }
  }, [
    cartArray,
    cartCount,
    requestId,
    needBy,
    comment,
    objectType,
    level,
    system,
    zone,
    ridStr,
    loadItems,
    preloadDisplayNo,
    ensureAndGetId,
  ]);

  // ---------- Отправка директору ----------
  const submitToDirector = useCallback(async () => {
    try {
      if (!foreman.trim()) {
        Alert.alert(
          'ФИО прораба',
          'Заполни ФИО прораба перед отправкой',
        );
        return;
      }
      if (!objectType) {
        Alert.alert(
          'Объект',
          'Выбери «Объект строительства» (обязательно)',
        );
        return;
      }
      if (!level) {
        Alert.alert(
          'Этаж/уровень',
          'Выбери «Этаж/уровень» (обязательно)',
        );
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
      let rid: string = requestId
        ? ridStr(requestId)
        : await ensureAndGetId();

      try {
        // @ts-ignore
        const { supabase } = await import('../../src/lib/supabaseClient');
        await supabase
          .from('requests')
          .update({
            object_type_code: objectType || null,
            level_code: level || null,
            system_code: system || null,
            zone_code: zone || null,
            comment: comment.trim() || null,
          })
          .eq('id', rid);
      } catch {}

      await requestSubmit(rid);
      await preloadDisplayNo(rid);
      Alert.alert(
        'Отправлено директору',
        `Заявка ${labelForRequest(
          rid,
        )} отправлена на утверждение`,
      );
      await loadItems();
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
    loadItems,
    foreman,
    objectType,
    level,
    system,
    zone,
    comment,
    items,
    preloadDisplayNo,
    labelForRequest,
    ensureAndGetId,
  ]);

  // ---------- PDF ----------
  const onPdf = useCallback(async () => {
    try {
      const rid = requestId ? ridStr(requestId) : await ensureAndGetId();
      try {
        const { supabase } = await import(
          '../../src/lib/supabaseClient'
        );
        await supabase
          .from('requests')
          .update({
            object_type_code: objectType || null,
            level_code: level || null,
            system_code: system || null,
            zone_code: zone || null,
            comment: comment.trim() || null,
          })
          .eq('id', rid);
      } catch {}
      await preloadDisplayNo(rid);
      await exportRequestPdf(rid);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'PDF не сформирован');
    }
  }, [
    requestId,
    ridStr,
    ensureAndGetId,
    objectType,
    level,
    system,
    zone,
    comment,
    preloadDisplayNo,
  ]);

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
          name_human: it.name_human || (code || '—'),
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
    return Array.from(map.values()).sort(
      (a, b) =>
        (a.name_human || '').localeCompare(b.name_human || '') ||
        (a.rik_code || '').localeCompare(b.rik_code || ''),
    );
  }, [items]);

  const suggestsUniq = useMemo(
    () =>
      uniqBy(
        suggests,
        (it) =>
          String((it as any)?.rik_code ?? (it as any)?.code ?? ''),
      ),
    [suggests],
  );

  const SuggestRow = useCallback(
    ({ it }: { it: CatalogItem }) => {
      const selected = !!cart[(it as any).rik_code];
      const uom = (it as any).uom_code ?? null;
      const kind = (it as any).kind ?? '';
      return (
        <Pressable
          onPress={() => toggleToCart(it)}
          style={[
            s.suggest,
            selected && s.suggestSelected,
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
                s.suggestTitle,
                { color: COLORS.text },
              ]}
            >
              {(it as any).name_human ??
                (it as any).rik_code}
            </Text>
            {kind ? <Chip label={kind} /> : null}
          </View>
          <Text
            style={[s.suggestMeta, { color: COLORS.sub }]}
          >
            {(it as any).rik_code}{' '}
            {uom ? `• Ед.: ${uom}` : ''}
          </Text>
        </Pressable>
      );
    },
    [cart, toggleToCart],
  );

  const CartRow = useCallback(
    ({ row }: { row: PickedRow }) => {
      const dec = () => {
        const cur =
          Number((row.qty || '0').replace(',', '.')) || 0;
        const next = Math.max(0, cur - 1);
        setQtyFor(
          row.rik_code,
          next ? String(next) : '',
        );
      };
      const inc = () => {
        const cur =
          Number((row.qty || '0').replace(',', '.')) || 0;
        const next = cur + 1;
        setQtyFor(row.rik_code, String(next));
      };

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
              {ruName({
                name_human: row.name,
                rik_code: row.rik_code,
              }) || row.name}
            </Text>
            {row.kind ? <Chip label={row.kind} /> : null}
            {row.uom ? (
              <Chip
                label={`Ед.: ${row.uom}`}
                bg="#E0E7FF"
                fg="#3730A3"
              />
            ) : null}
          </View>
          <Text
            style={[
              s.cardMeta,
              { color: COLORS.sub },
            ]}
          >
            {row.rik_code}
          </Text>

          {/* Кол-во */}
          <View style={s.row}>
            <Text
              style={[
                s.rowLabel,
                { color: COLORS.sub },
              ]}
            >
              Кол-во:
            </Text>
            <View style={s.qtyWrap}>
              <Pressable
                onPress={dec}
                style={[
                  s.qtyBtn,
                  { borderColor: COLORS.border },
                ]}
              >
                <Text style={s.qtyBtnTxt}>−</Text>
              </Pressable>
              <TextInput
                value={row.qty}
                onChangeText={(v) =>
                  setQtyFor(row.rik_code, v)
                }
                keyboardType="decimal-pad"
                placeholder="введите кол-во"
                style={[
                  s.qtyInput,
                  {
                    borderColor: COLORS.border,
                    backgroundColor: '#fff',
                  },
                ]}
              />
              <Pressable
                onPress={inc}
                style={[
                  s.qtyBtn,
                  { borderColor: COLORS.border },
                ]}
              >
                <Text style={s.qtyBtnTxt}>＋</Text>
              </Pressable>
            </View>
          </View>

          {/* Применение */}
          <View style={s.row}>
            <Text
              style={[
                s.rowLabel,
                { color: COLORS.sub },
              ]}
            >
              Применение:
            </Text>
            <View style={{ flex: 1, gap: 6 }}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                <Pressable
                  onPress={() => {
                    setAppPickerFor(row.rik_code);
                    setAppPickerQ('');
                  }}
                  style={[
                    s.chip,
                    {
                      backgroundColor: '#f1f5f9',
                      borderColor: COLORS.border,
                    },
                  ]}
                >
                  <Text style={{ color: COLORS.text }}>
                    {row.app_code
                      ? labelForApp(row.app_code)
                      : 'Выбрать…'}
                  </Text>
                </Pressable>
                {row.app_code ? (
                  <Pressable
                    onPress={() =>
                      setAppFor(row.rik_code, null)
                    }
                    style={[
                      s.chip,
                      { borderColor: COLORS.border },
                    ]}
                  >
                    <Text style={{ color: COLORS.text }}>
                      Очистить
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                value={row.app_code ?? ''}
                onChangeText={(v) =>
                  setAppFor(
                    row.rik_code,
                    v || null,
                  )
                }
                placeholder="или введите свою метку…"
                style={s.input}
              />
            </View>
          </View>

          {/* Примечание */}
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: COLORS.sub }}>
              Примечание (обязательно):
            </Text>
            <TextInput
              value={row.note}
              onChangeText={(v) =>
                setNoteFor(row.rik_code, v)
              }
              placeholder={
                buildScopeNote(
                  objectName,
                  levelName,
                  systemName,
                  zoneName,
                ) ||
                'этаж, сектор, точка применения…'
              }
              multiline
              style={s.note}
            />
          </View>
        </View>
      );
    },
    [
      setQtyFor,
      setAppFor,
      setNoteFor,
      labelForApp,
      objectName,
      levelName,
      systemName,
      zoneName,
    ],
  );

  const ReqItemRowView = useCallback(
    ({ it }: { it: ReqItemRow }) => (
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
        <Text
          style={[
            s.cardMeta,
            { color: COLORS.sub, marginTop: 2 },
          ]}
        >
          Кол-во:{' '}
          <Text
            style={{
              color: COLORS.text,
              fontWeight: '700',
            }}
          >
            {it.qty ?? '-'}
          </Text>{' '}
          {it.uom ?? ''} · Статус:{' '}
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
    ),
    [labelForApp],
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
          {g.rik_code ? <Chip label={g.rik_code} /> : null}
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
  const filteredAppOptions = useMemo(() => {
    const q = appPickerQ.trim().toLowerCase();
    if (!q) return appOptions;
    return appOptions.filter((o) =>
      (o.label + ' ' + o.code)
        .toLowerCase()
        .includes(q),
    );
  }, [appPickerQ, appOptions]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[s.container, { backgroundColor: COLORS.bg }]}>
        <ScrollView
          contentContainerStyle={s.pagePad}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.header, { color: COLORS.text }]}>
            Прораб — заявка и поиск по РИК
          </Text>

          {/* Шапка заявки */}
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  s.small,
                  { color: COLORS.sub },
                ]}
              >
                Заявка:
              </Text>
              <Text
                style={[
                  s.input,
                  { paddingVertical: 12 },
                ]}
              >
                {requestId
                  ? labelForRequest(requestId)
                  : 'будет создана автоматически'}
              </Text>
            </View>
            <View
              style={{
                width:
                  Platform.OS === 'web' ? 220 : 180,
              }}
            >
              <Text
                style={[
                  s.small,
                  { color: COLORS.sub },
                ]}
              >
                Нужно к (YYYY-MM-DD):
              </Text>
              <TextInput
                value={needBy}
                onChangeText={setNeedBy}
                placeholder="(по умолчанию — сегодня)"
                style={s.input}
              />
            </View>
          </View>

          <Text
            style={[
              s.small,
              { color: COLORS.sub },
            ]}
          >
            ФИО прораба (обязательно):
          </Text>
          <TextInput
            value={foreman}
            onChangeText={setForeman}
            placeholder="Иванов И.И."
            style={s.input}
          />

          {/* Новый блок: Объект/Этаж/Система/Зона */}
          <View style={{ marginTop: 10, gap: 6 }}>
            <Dropdown
              label="Объект строительства (обязательно)"
              options={objOptions}
              value={objectType}
              onChange={setObjectType}
              placeholder="Выберите объект"
              width={360}
            />
            <Dropdown
              label="Этаж / уровень (обязательно)"
              options={lvlOptions}
              value={level}
              onChange={setLevel}
              placeholder="Выберите этаж/уровень"
              width={360}
            />
            <Dropdown
              label="Система / вид работ (опционально)"
              options={sysOptions}
              value={system}
              onChange={setSystem}
              placeholder="Выберите систему/вид работ"
              width={360}
            />
            <Dropdown
              label="Зона / участок (опционально)"
              options={zoneOptions}
              value={zone}
              onChange={setZone}
              placeholder="Выберите зону/участок"
              width={360}
            />
          </View>

          {/* Комментарий */}
          <Text
            style={[
              s.small,
              {
                marginTop: 12,
                marginBottom: 4,
                color: COLORS.sub,
              },
            ]}
          >
            Комментарий к заявке (необязательно):
          </Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="общее примечание по заявке…"
            multiline
            style={s.note}
          />

          {/* Фильтры по типу */}
          <View style={s.tabs}>
            {KIND_TABS.map((tab) => {
              const active = activeKind === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() =>
                    setActiveKind(tab.key)
                  }
                  style={[
                    s.tab,
                    active && s.tabActive,
                  ]}
                >
                  <Text
                    style={{
                      color: active
                        ? '#fff'
                        : COLORS.tabInactiveText,
                      fontWeight: '600',
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Глобальный фильтр по области применения (РИК) */}
          <View
            style={{ marginTop: 8, marginBottom: 8 }}
          >
            <Text
              style={[
                s.small,
                { color: COLORS.sub },
              ]}
            >
              Область применения (фильтр):
            </Text>
            <TextInput
              value={appFilter}
              onChangeText={setAppFilter}
              placeholder={
                appOptions.length
                  ? `Например: ${
                      appOptions[0]?.label ||
                      'Отделка'
                    }`
                  : 'введите название или код'
              }
              style={s.input}
            />
            {appOptions.length > 0 ? (
              <View
                style={[
                  s.appsWrap,
                  { marginTop: 8 },
                ]}
              >
                {appOptions.slice(0, 12).map(
                  (opt, idx) => {
                    const active =
                      appFilter === opt.code;
                    return (
                      <Pressable
                        key={`app:${opt.code}:${idx}`}
                        onPress={() =>
                          setAppFilter(opt.code)
                        }
                        style={[
                          s.chip,
                          active
                            ? s.chipActive
                            : null,
                        ]}
                      >
                        <Text
                          style={{
                            color: COLORS.text,
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
                {appFilter ? (
                  <Pressable
                    onPress={() =>
                      setAppFilter('')
                    }
                    style={[
                      s.chip,
                      { borderColor: COLORS.border },
                    ]}
                  >
                    <Text
                      style={{
                        color: COLORS.text,
                      }}
                    >
                      Сбросить
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Поиск */}
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="бетон М250, окно ПВХ, штукатурка, доставка…"
            style={s.input}
          />
          {loadingSuggests ? (
            <ActivityIndicator style={{ marginTop: 6 }} />
          ) : null}

          {canSearch && suggestsUniq.length > 0 && (
            <View style={s.suggestBox}>
              <FlatList
                data={suggestsUniq}
                keyExtractor={(it, idx) =>
                  stableKey(it, idx, 'sug')
                }
                renderItem={({ item }) => (
                  <SuggestRow it={item} />
                )}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews
                nestedScrollEnabled
                windowSize={9}
                maxToRenderPerBatch={14}
                updateCellsBatchingPeriod={50}
                style={{ maxHeight: 300 }}
              />
            </View>
          )}

          {/* Корзина */}
          <View style={{ marginBottom: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text
                style={[
                  s.blockTitle,
                  { color: COLORS.text },
                ]}
              >
                Корзина
              </Text>
              <Chip
                label={`${cartCount}`}
                bg="#E0F2FE"
                fg="#075985"
              />
            </View>
            {cartCount === 0 ? (
              <Text style={{ color: COLORS.sub }}>
                Выбери позиции из поиска и настрой
                количество/применение/примечание.
              </Text>
            ) : (
              <FlatList
                data={cartArray}
                keyExtractor={(it, idx) =>
                  stableKey(it, idx, 'cart')
                }
                renderItem={({ item }) => (
                  <CartRow row={item} />
                )}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews
                nestedScrollEnabled
                windowSize={7}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
              />
            )}
          </View>

          {/* Уже добавленные позиции — режимы */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              marginBottom: 6,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text
                style={[
                  s.blockTitle,
                  { color: COLORS.text },
                ]}
              >
                Позиции заявки{' '}
                {requestId
                  ? labelForRequest(requestId)
                  : ''}
              </Text>
            </View>
            <View
              style={{ flexDirection: 'row', gap: 8 }}
            >
              <Pressable
                onPress={() => setViewMode('raw')}
                style={[
                  s.tab,
                  viewMode === 'raw' &&
                    s.tabActive,
                ]}
              >
                <Text
                  style={{
                    color:
                      viewMode === 'raw'
                        ? '#fff'
                        : COLORS.tabInactiveText,
                    fontWeight: '600',
                  }}
                >
                  Позиции
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setViewMode('grouped')
                }
                style={[
                  s.tab,
                  viewMode === 'grouped' &&
                    s.tabActive,
                ]}
              >
                <Text
                  style={{
                    color:
                      viewMode === 'grouped'
                        ? '#fff'
                        : COLORS.tabInactiveText,
                    fontWeight: '600',
                  }}
                >
                  Сгруппировано
                </Text>
              </Pressable>
            </View>
          </View>

          {viewMode === 'raw' ? (
            <FlatList
              data={items}
              keyExtractor={(it, idx) =>
                it?.id
                  ? `ri:${it.id}`
                  : `ri:${it.request_id}-${idx}`
              }
              renderItem={({ item }) => (
                <ReqItemRowView it={item} />
              )}
              ListEmptyComponent={
                <Text
                  style={{
                    textAlign: 'center',
                    marginTop: 16,
                    color: COLORS.sub,
                  }}
                >
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
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews
              nestedScrollEnabled
              windowSize={9}
              maxToRenderPerBatch={12}
              updateCellsBatchingPeriod={50}
            />
          ) : (
            <FlatList
              data={grouped}
              keyExtractor={(g, idx) =>
                `grp:${g.key}:${idx}`
              }
              renderItem={({ item }) => (
                <GroupedRowView g={item} />
              )}
              ListEmptyComponent={
                <Text
                  style={{
                    textAlign: 'center',
                    marginTop: 16,
                    color: COLORS.sub,
                  }}
                >
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
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews
              nestedScrollEnabled
              windowSize={9}
              maxToRenderPerBatch={12}
              updateCellsBatchingPeriod={50}
            />
          )}
        </ScrollView>

        {/* Панель действий внизу (только UI, логика та же) */}
        <View style={s.stickyBar}>
          <View style={s.stickyRow}>
            {/* 1) Рассчитать (смета) */}
            <Link href="/calculator" asChild>
              <Pressable style={[s.btn, s.btnNeutral]}>
                <Text style={s.btnTxtNeutral}>
                  Рассчитать (смета)
                </Text>
              </Pressable>
            </Link>

            {/* 2) Добавить */}
            <Pressable
              onPress={addCartToRequest}
              disabled={busy || cartCount === 0}
              style={[
                s.btn,
                busy || cartCount === 0
                  ? s.btnDisabled
                  : s.btnPrimary,
              ]}
            >
              <Text
                style={
                  busy || cartCount === 0
                    ? s.btnTxtDisabled
                    : s.btnTxtPrimary
                }
              >
                Добавить{' '}
                {cartCount
                  ? `(${cartCount})`
                  : ''}
              </Text>
            </Pressable>

            {/* 3) Отправить директору */}
            <Pressable
              onPress={submitToDirector}
              disabled={busy || (items?.length ?? 0) === 0}
              style={[
                s.btn,
                busy || (items?.length ?? 0) === 0
                  ? s.btnDisabled
                  : s.btnSecondary,
              ]}
            >
              <Text
                style={
                  busy || (items?.length ?? 0) === 0
                    ? s.btnTxtDisabled
                    : s.btnTxtPrimary
                }
              >
                Отправить директору
              </Text>
            </Pressable>

            {/* 4) PDF */}
            <Pressable
              onPress={onPdf}
              disabled={busy || !requestId}
              style={[
                s.btn,
                busy || !requestId
                  ? s.btnDisabled
                  : s.btnNeutral,
              ]}
            >
              <Text
                style={
                  busy || !requestId
                    ? s.btnTxtDisabled
                    : s.btnTxtNeutral
                }
              >
                PDF
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ===== МОДАЛ ВЫБОРА ОБЛАСТИ ПРИМЕНЕНИЯ ===== */}
      <Modal
        visible={!!appPickerFor}
        transparent
        animationType="fade"
        onRequestClose={() => setAppPickerFor(null)}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setAppPickerFor(null)}
        >
          <View style={s.backdrop} />
        </Pressable>
        <View style={s.modalSheet}>
          <Text
            style={{
              fontWeight: '700',
              fontSize: 16,
              marginBottom: 8,
              color: COLORS.text,
            }}
          >
            Выбрать область применения
          </Text>
          <TextInput
            value={appPickerQ}
            onChangeText={setAppPickerQ}
            placeholder="Поиск по названию/коду…"
            style={s.input}
          />
          <FlatList
            data={filteredAppOptions}
            keyExtractor={(o, idx) =>
              `appopt:${o.code}:${idx}`
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  if (appPickerFor)
                    setAppFor(appPickerFor, item.code);
                  setAppPickerFor(null);
                }}
                style={[
                  s.suggest,
                  { borderBottomColor: '#f0f0f0' },
                ]}
              >
                <Text
                  style={{
                    fontWeight: '600',
                    color: COLORS.text,
                  }}
                >
                  {item.label}
                </Text>
                <Text style={{ color: COLORS.sub }}>
                  {item.code}
                </Text>
              </Pressable>
            )}
            style={{ maxHeight: 320, marginTop: 6 }}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginTop: 8,
              gap: 8,
            }}
          >
            <Pressable
              onPress={() => setAppPickerFor(null)}
              style={[
                s.chip,
                {
                  backgroundColor: '#eee',
                  borderColor: COLORS.border,
                },
              ]}
            >
              <Text>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/* ======================= Styles (только UI, логика не тронута) ======================= */
const s = StyleSheet.create({
  container: { flex: 1 },
  pagePad: { padding: 16, paddingBottom: 120 },
  header: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  small: { fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
    color: '#0F172A',
  },
  note: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    minHeight: 44,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    marginBottom: 10,
    color: '#0F172A',
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },

  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
    flexWrap: 'wrap',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: '#111827' },

  suggestBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  suggest: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  suggestSelected: { backgroundColor: '#E0F2FE' },
  suggestTitle: { fontWeight: '700' },
  suggestMeta: {},

  blockTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },

  card: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontWeight: '700', fontSize: 15 },
  cardMeta: { marginTop: 4 },

  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  rowLabel: { width: 110 },

  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  qtyBtnTxt: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  qtyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    backgroundColor: '#fff',
    color: '#0F172A',
  },

  appsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#DEF7EC',
    borderColor: '#9AE6B4',
  },

  // ===== Панель действий прораба внизу =====
  stickyBar: {
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stickyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  btnSecondary: {
    backgroundColor: '#0B7285',
    borderColor: '#0B7285',
  },
  btnNeutral: {
    backgroundColor: '#E5E7EB',
    borderColor: '#CBD5E1',
  },
  btnDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#CBD5E1',
  },
  btnTxtPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnTxtNeutral: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },
  btnTxtDisabled: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 14,
  },

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
});

