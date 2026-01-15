import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, ActivityIndicator,
  RefreshControl, Modal, TextInput, Platform, ScrollView, Alert,
  Animated
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabaseClient';
import { useFocusEffect } from 'expo-router';
import { useBusyAction } from '../../src/lib/useBusyAction';
import BusyButton from '../../src/components/BusyButton';

import {
  listAccountantInbox,
  type AccountantInboxRow,
  exportProposalPdf,   
  exportPaymentOrderPdf,
  ensureMyProfile,
  getMyRole,
  accountantReturnToBuyer,
  notifList,
  notifMarkRead,
} from '../../src/lib/catalog_api';
import { uploadProposalAttachment, openAttachment } from '../../src/lib/files';
// звук + вибро (если доступны)
import * as Haptics from 'expo-haptics';
import { initDing, playDing as playDingSound, unloadDing } from '../../src/lib/notify';

type Tab =
  | 'К оплате'
  | 'Частично'
  | 'Оплачено'
  | 'На доработке'
  | 'История';
const TABS: Tab[] = ['К оплате', 'Частично', 'Оплачено', 'На доработке', 'История'];


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
};

// ---------- helper: безопасные алерты на web ----------
const safeAlert = (title: string, msg?: string) => {
  if (Platform.OS === 'web') {
    window.alert([title, msg].filter(Boolean).join('\n'));
  } else {
    Alert.alert(title, msg ?? '');
  }
};

// ---------- SafeView: фильтрует сырой текст внутри View (фикс RNW) ----------
function SafeView({ children, ...rest }: any) {
  const kids = React.Children.toArray(children).map((c, i) => {
    if (typeof c === 'string') return c.trim() ? <Text key={`t${i}`}>{c}</Text> : null;
    if (typeof c === 'number') return <Text key={`n${i}`}>{String(c)}</Text>;
    // ✅ если случайно прилетел объект (например style), игнорируем
    if (c && typeof c === 'object' && !React.isValidElement(c)) return null;
    return c;
  });
  return <View {...rest}>{kids}</View>;
}

// ---------- Универсальная кнопка (web: гарантированный клик) ----------
function WButton({
  onPress, disabled, style, children,
}: { onPress: () => void; disabled?: boolean; style?: any; children: React.ReactNode; }) {
 return (
  <Pressable
    onPress={disabled ? undefined : onPress}
    accessibilityRole="button"
    disabled={disabled}
    hitSlop={8}
    style={[
      { justifyContent: 'center', alignItems: 'center' },
      style,
      Platform.OS === 'web'
        ? { cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none' }
        : null,
    ]}
  >
    {children}
  </Pressable>
);

}
// ---------- ActionButton (ТОЛЬКО ЗДЕСЬ, 1 РАЗ) ----------
function ActionButton({
  label,
  variant,
  onPress,
  actionKey,
  busyKey,
  runAction,
}: {
  label: string;
  variant: 'primary' | 'secondary' | 'danger';
  onPress: () => Promise<void> | void;
  actionKey: string;
  busyKey: string | null;
  runAction: (key: string, fn: () => Promise<void>) => Promise<void>;
}) {
  const loading = busyKey === actionKey;

  const base = {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 8,
  };

  const box =
    variant === 'primary'
      ? { backgroundColor: COLORS.primary }
      : variant === 'danger'
        ? { backgroundColor: COLORS.red }
        : { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border };

  const text =
    variant === 'primary' || variant === 'danger'
      ? { color: '#fff', fontWeight: '900' as const }
      : { color: COLORS.text, fontWeight: '900' as const };

  return (
    <WButton
      disabled={!!busyKey}
      onPress={() => runAction(actionKey, async () => { await onPress(); })}
      style={[
        base,
        box,
        Platform.OS === 'web'
          ? { cursor: busyKey ? 'not-allowed' : 'pointer', userSelect: 'none' }
          : null,
      ]}
    >
      {loading ? <ActivityIndicator /> : null}
      <Text style={text}>{label}</Text>
    </WButton>
  );
}

// ========= анти-мигание / утилиты =========
function rowsShallowEqual(a: AccountantInboxRow[], b: AccountantInboxRow[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i], bi = b[i];
    if (String(ai.proposal_id) !== String(bi.proposal_id)) return false;
    const aps = String(ai.payment_status ?? '').trim();
    const bps = String(bi.payment_status ?? '').trim();
    if (aps !== bps) return false;
    if (!!ai.has_invoice !== !!bi.has_invoice) return false;
    if (Number(ai.payments_count ?? 0) !== Number(bi.payments_count ?? 0)) return false;
  }
  return true;
}
type HistoryRow = {
  payment_id: number;
  paid_at: string;
  proposal_id: string;
  supplier: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_amount: number | null;
  invoice_currency: string | null;
  amount: number;
  method: string | null;
  note: string | null;
  has_invoice: boolean;

  accountant_fio?: string | null;
  purpose?: string | null;
};

export default function AccountantScreen() {
  const insets = useSafeAreaInsets();
const { busyKey, run: runAction } = useBusyAction({
  timeoutMs: 30000,
  onError: (e) => safeAlert('Ошибка', String(e?.message ?? e)),
});

  const [tab, setTab] = useState<Tab>('К оплате');
  const [rows, setRows] = useState<AccountantInboxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAccountant, setIsAccountant] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
const focusedRef = useRef(false);
const lastKickListRef = useRef(0);
const lastKickHistRef = useRef(0);
const cardScrollY = useRef(new Animated.Value(0)).current;

const inFlightRef = useRef(false);
const loadSeqRef = useRef(0);
const inflightKeyRef = useRef<string | null>(null);
const lastLoadedKeyRef = useRef<string | null>(null);
const cacheByTabRef = useRef<Record<string, AccountantInboxRow[]>>({});
const pendingTabRef = useRef<Tab | null>(null);

// ===== Collapsing header (как у директора), но с реальной высотой =====
const HEADER_MIN = 76;

// реальная высота шапки (меряем один раз)
const [measuredHeaderMax, setMeasuredHeaderMax] = useState<number>(260); // было 210
const HEADER_MAX = Math.max(measuredHeaderMax, 260);
const HEADER_SCROLL = Math.max(0, HEADER_MAX - HEADER_MIN);

const scrollY = useRef(new Animated.Value(0)).current;
const clampedY = Animated.diffClamp(scrollY, 0, HEADER_SCROLL);

const headerHeight = clampedY.interpolate({
  inputRange: [0, HEADER_SCROLL || 1],
  outputRange: [HEADER_MAX, HEADER_MIN],
  extrapolate: 'clamp',
});

const titleSize = clampedY.interpolate({
  inputRange: [0, HEADER_SCROLL || 1],
  outputRange: [22, 16],
  extrapolate: 'clamp',
});

const subOpacity = clampedY.interpolate({
  inputRange: [0, HEADER_SCROLL || 1],
  outputRange: [1, 0],
  extrapolate: 'clamp',
});

const headerShadow = clampedY.interpolate({
  inputRange: [0, 10],
  outputRange: [0, 0.12],
  extrapolate: 'clamp',
});

// ====== История платежей ======
const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
const [historyLoading, setHistoryLoading] = useState(false);
const [historyRefreshing, setHistoryRefreshing] = useState(false);

const [histSearch, setHistSearch] = useState('');
const [dateFrom, setDateFrom] = useState<string>(''); // YYYY-MM-DD
const [dateTo, setDateTo] = useState<string>('');     // YYYY-MM-DD
const [calOpen, setCalOpen] = useState(false);

  // карточка
  const [current, setCurrent] = useState<AccountantInboxRow | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null);

  // форма оплаты / возврат
  const [amount, setAmount] = useState<string>('');
   const [note, setNote] = useState<string>('');
const [accountantFio, setAccountantFio] = useState('');
const [purpose, setPurpose] = useState('');

// способ оплаты
const [payKind, setPayKind] = useState<'bank' | 'cash'>('bank');
const [docsOpen, setDocsOpen] = useState(false);
const [showPayForm, setShowPayForm] = useState(false);

  // ====== РОЛЬ ======
  const [role, setRole] = useState<string | null>(null);
 const canAct = true; // временно: не блокируем действия


  // freeze обновлений списка, пока открыта карточка (фикс «прыжков»)
  const [freezeWhileOpen, setFreezeWhileOpen] = useState(false);

 useEffect(() => {
  setIsAccountant(true);
  setRoleLoading(false);
}, []);
useEffect(() => {
  try {
    const saved = localStorage.getItem('acc_fio') || '';
    if (saved.trim()) setAccountantFio(saved.trim());
  } catch {}
}, []);
useEffect(() => {
  try {
    const v = (accountantFio || '').trim();
    if (v) localStorage.setItem('acc_fio', v);
  } catch {}
}, [accountantFio]);

  // запомним: RPC доступен/нет, чтобы не спамить 404
  const triedRpcOkRef = useRef<boolean>(true);
const loadHistory = useCallback(async (force?: boolean) => {
  if (!focusedRef.current) return;

  const now = Date.now();
  if (!force && now - lastKickHistRef.current < 900) return;
  lastKickHistRef.current = now;

  setHistoryLoading(true);
  try {
    const { data, error } = await supabase.rpc('list_accountant_payments_history_v2', {
  p_date_from: dateFrom ? dateFrom : null,
  p_date_to: dateTo ? dateTo : null,
  p_search: histSearch?.trim() ? histSearch.trim() : null,
  p_limit: 300,
});

    if (error) throw error;
    setHistoryRows(Array.isArray(data) ? (data as any) : []);
  } catch (e: any) {
    console.error('[history load]', e?.message ?? e);
    setHistoryRows([]);
  } finally {
    setHistoryLoading(false);
  }
}, [dateFrom, dateTo, histSearch]);

const onRefreshHistory = useCallback(async () => {
  setHistoryRefreshing(true);
  try { await loadHistory(); } finally { setHistoryRefreshing(false); }
}, [loadHistory]);

  // ====== загрузка ======
 const load = useCallback(async (force?: boolean) => {

  if (!focusedRef.current) return;
  if (freezeWhileOpen) return;
  if (inFlightRef.current) return;
const key = `tab:${tab}`;

// если прямо сейчас грузим то же самое — выходим
if (inflightKeyRef.current === key) return;

if (!force && lastLoadedKeyRef.current === key && Date.now() - lastKickListRef.current < 900) return;

inflightKeyRef.current = key;

  inFlightRef.current = true;
  const seq = ++loadSeqRef.current;

 const now = Date.now();
if (!force && now - lastKickListRef.current < 900) {
  inFlightRef.current = false;
  inflightKeyRef.current = null;
  return;
}
lastKickListRef.current = now;


  try {
    let data: AccountantInboxRow[] = [];
let rpcFailed = false;

    // --- RPC (если есть) ---
    if (triedRpcOkRef.current) {
      try {
        const list = await listAccountantInbox(tab);
triedRpcOkRef.current = true; // ← ВАЖНО: RPC живой
if (Array.isArray(list)) data = list;

      } catch (e: any) {
  rpcFailed = true; // ✅ ВАЖНО: RPC не отработал
  const msg = String(e?.message || e);
  if (
    msg.includes('Could not find') ||
    msg.includes('/rpc/list_accountant_inbox') ||
    msg.includes('404')
  ) {
    triedRpcOkRef.current = false;
  }
}
    }

  // --- fallback: только если RPC реально недоступен/упал ---
if (rpcFailed || !triedRpcOkRef.current) {

      const { data: props } = await supabase
        .from('proposals')
        .select('id, status, payment_status, invoice_number, invoice_date, invoice_amount, invoice_currency, supplier, sent_to_accountant_at')
        .not('sent_to_accountant_at', 'is', null)
        .or('payment_status.is.null,payment_status.eq.К оплате,payment_status.eq.Оплачено,payment_status.ilike.Частично%,payment_status.ilike.На доработке%')

        .order('sent_to_accountant_at', { ascending: false, nullsFirst: false });

      let tmp: AccountantInboxRow[] = [];

      if (Array.isArray(props) && props.length) {
        const ids = props.map((p: any) => String(p.id));

        // 1) агрегаты оплат
        const paidMap = new Map<string, { total_paid: number; payments_count: number }>();
// ✅ оплаты из proposal_payments (у тебя туда пишет acc_add_payment_min)
if (ids.length) {
  const { data: pays, error: paysErr } = await supabase
    .from('proposal_payments')
    .select('proposal_id, amount')
    .in('proposal_id', ids);

  if (!paysErr && Array.isArray(pays)) {
    for (const pay of pays as any[]) {
      const k = String(pay.proposal_id);
      const prev = paidMap.get(k) ?? { total_paid: 0, payments_count: 0 };
      prev.total_paid += Number(pay.amount ?? 0);
      prev.payments_count += 1;
      paidMap.set(k, prev);
    }
  }
}
// ✅ сумма по позициям (если invoice_amount пустой)
const itemsSumMap = new Map<string, number>();

if (ids.length) {
  const { data: items, error: itemsErr } = await supabase
    .from('proposal_items')
    .select('proposal_id, qty, price')
    .in('proposal_id', ids);

  if (!itemsErr && Array.isArray(items)) {
    for (const it of items as any[]) {
      const pid = String(it.proposal_id);
      const qty = Number(it.qty ?? 0);
      const price = Number(it.price ?? 0);
      itemsSumMap.set(pid, (itemsSumMap.get(pid) ?? 0) + qty * price);
    }
  }
}

       // 2) наличие инвойса (attachment)
        let haveInvoice = new Set<string>();
        if (ids.length) {
          const q = await supabase
            .from('proposal_attachments')
            .select('proposal_id')
            .eq('group_key', 'invoice')
            .in('proposal_id', ids);

          if (!q.error && Array.isArray(q.data)) {
            haveInvoice = new Set(q.data.map((r: any) => String(r.proposal_id)));
          }
        }

        // 3) собрать строки
        tmp = (props as any[]).map((p: any) => {
  const agg = paidMap.get(String(p.id));
  const calcSum = itemsSumMap.get(String(p.id)) ?? 0;
  const invoiceSum = Number(p.invoice_amount ?? 0) > 0 ? Number(p.invoice_amount) : calcSum;
  const paid = agg ? agg.total_paid : 0;

  const raw = String(p.payment_status ?? p.status ?? '').toLowerCase();
  let payStatus: string;
  if (raw.startsWith('на доработке')) payStatus = 'На доработке';
  else if (paid <= 0) payStatus = 'К оплате';
  else if (invoiceSum - paid > 0) payStatus = 'Частично оплачено';
  else payStatus = 'Оплачено';

  return {
    proposal_id: String(p.id),
    supplier: p.supplier ?? null,
    invoice_number: p.invoice_number ?? null,
    invoice_date: p.invoice_date ?? null,

    // 👇 вот это ключ: если invoice_amount нет — берём calcSum
    invoice_amount: (p.invoice_amount ?? (calcSum > 0 ? calcSum : null)),
    invoice_currency: p.invoice_currency ?? 'KGS',

    payment_status: payStatus,

    total_paid: agg ? agg.total_paid : 0,
    payments_count: agg ? agg.payments_count : 0,
    has_invoice: haveInvoice.has(String(p.id)),
    sent_to_accountant_at: p.sent_to_accountant_at ?? null,
  };
});

      }

      data = tmp;
    }

    // --- фильтр вкладок ---
    const filtered = (data || []).filter((r) => {
      const ps = String(r.payment_status ?? '').trim().toLowerCase();
      switch (tab) {
  case 'К оплате': return ps.startsWith('к оплате');
  case 'Частично': return ps.startsWith('частично');
  case 'Оплачено': return ps.startsWith('оплачено');
  case 'На доработке':
  return ps.startsWith('на доработке') || ps.startsWith('возврат');


  default: return true;
}
    });

    cacheByTabRef.current[tab] = filtered;
setRows(prev => (rowsShallowEqual(prev, filtered) ? prev : filtered));

  } catch (e: any) {
    console.error('[accountant load]', e?.message ?? e);
  } finally {
  setLoading(false);
  inFlightRef.current = false;
  lastLoadedKeyRef.current = key;
  inflightKeyRef.current = null;

  // ✅ если пользователь кликнул другой таб пока грузили — догружаем его
  const next = pendingTabRef.current;
  if (next && next !== tab && focusedRef.current && !freezeWhileOpen) {
    pendingTabRef.current = null;

    // мгновенно покажем кэш, если есть
    const cached = cacheByTabRef.current[next];
    if (cached) setRows(cached);

    setTab(next);
    setTimeout(() => load(true), 0);
  } else {
    pendingTabRef.current = null;
  }
}



}, [tab, freezeWhileOpen]);
useFocusEffect(
  useCallback(() => {
    focusedRef.current = true;

    // первичная загрузка при входе на экран
    if (tab === 'История') loadHistory();
    else load();
    
    return () => {
      // уходим со страницы — больше ничего не грузим
      focusedRef.current = false;
    };
  }, [tab, load, loadHistory])
);

   const onRefresh = useCallback(async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } }, [load]);

  // ====== 🔔 уведомления: список/звук/подписка ======
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const unread = notifs.length;
const loadNotifs = useCallback(async () => {
  if (!focusedRef.current) return;
  try {
    const list = await notifList('accountant', 20);
    setNotifs(Array.isArray(list) ? list : []);
  } catch {}
}, []);

  useEffect(() => {
  if (Platform.OS === 'web') return; // ✅ WEB: не грузим mp3 → нет 416 и лагов

  let mounted = true;
  (async () => {
    try { await initDing(); } catch {}
  })();

  return () => {
    if (!mounted) return;
    mounted = false;
    try { unloadDing(); } catch {}
  };
}, []);


  const playDing = useCallback(async () => {
    try { await playDingSound(); } catch {}
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
  }, []);

  
  const markAllRead = useCallback(async () => {
    try { await notifMarkRead('accountant'); setNotifs([]); } catch {}
    setBellOpen(false);
  }, []);



  // realtime-подписка
  useFocusEffect(
  useCallback(() => {
    const ch = supabase.channel('notif-accountant-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
        if (!focusedRef.current) return;
        const n = payload?.new || {};
        if (n?.role !== 'accountant') return;
        setNotifs(prev => [n, ...prev].slice(0, 20));
        playDing();

// ✅ на WEB не перезагружаем список на каждое уведомление (иначе DDoS)
if (Platform.OS !== 'web') {
  if (!freezeWhileOpen) load();
}

      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(ch); } catch {}
    };
  }, [playDing, load, freezeWhileOpen])
);


  const openCard = useCallback((row: AccountantInboxRow) => {
  setCurrent(row);
  setCardOpen(true);

  setAmount('');
setNote('');
setPayKind('bank');


setDocsOpen(false);
setShowPayForm(false);

setFreezeWhileOpen(true);

// автоподстановка ФИО из юзера
(async () => {
  try {
    const { data } = await supabase.auth.getUser();
    const fio =
      String(
        data?.user?.user_metadata?.full_name ??
        data?.user?.user_metadata?.name ??
        ''
      ).trim();
    if (fio) setAccountantFio((prev) => (prev?.trim() ? prev : fio));
  } catch {}
})();

// дефолтное назначение платежа
const invNo = String(row.invoice_number ?? '—').trim();
const invDt = String(row.invoice_date ?? '—').trim();
const supp  = String(row.supplier ?? '—').trim();
setPurpose((prev) =>
  prev?.trim()
    ? prev
    : `Оплата по счёту №${invNo} от ${invDt}. Поставщик: ${supp}.`
);

}, []);

const closeCard = useCallback(() => {
  setCardOpen(false);
  setCurrent(null);
  setCurrentPaymentId(null);

  setDocsOpen(false);
  setShowPayForm(false);

  setFreezeWhileOpen(false);
  setTimeout(() => { load(); }, 0);
}, [load]);

// ============================== DOCS (3 кнопки) ==============================

// аккуратно достаём последний payment_id по proposal_id (для вкладок не-История)
const fetchLastPaymentIdByProposal = useCallback(async (proposalId: string): Promise<number | null> => {
  const pid = String(proposalId || '').trim();
  if (!pid) return null;

  // Берём payment_id из истории (самый свежий платёж по этому proposal_id)
  try {
    const { data, error } = await supabase.rpc('list_accountant_payments_history_v2', {
      p_date_from: null,
      p_date_to: null,
      p_search: null,
      p_limit: 300,
    } as any);

    if (error) throw error;
    const rows = Array.isArray(data) ? (data as any[]) : [];

    const hit = rows
      .filter(r => String(r.proposal_id) === pid)
      .sort((a, b) => {
        const ta = Date.parse(String(a.paid_at ?? a.created_at ?? 0));
        const tb = Date.parse(String(b.paid_at ?? b.created_at ?? 0));
        return (tb || 0) - (ta || 0);
      })[0];

    const n = Number(hit?.payment_id ?? 0);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}, []);
// 1) PDF предложения
const onOpenProposalPdf = useCallback(async () => {
  const pid = String(current?.proposal_id ?? '').trim();
  if (!pid) return;
  await exportProposalPdf(pid);
}, [current]);

// 2) Платёжный отчёт (наш HTML/PDF)
const onOpenPaymentReport = useCallback(async () => {
  const propId = String(current?.proposal_id ?? '').trim();

  // если мы в Истории — payment_id уже есть
  let payId = currentPaymentId;

  // если не История — попробуем вытащить последний платёж по proposal_payments
  if (!payId && propId) {
    payId = await fetchLastPaymentIdByProposal(propId);
    if (payId) setCurrentPaymentId(payId);
  }

  if (!payId) {
    safeAlert('Платёжный отчёт', 'Нет payment_id. Сначала добавьте платёж или откройте из вкладки «История».');
    return;
  }

  await exportPaymentOrderPdf(payId);
}, [current, currentPaymentId, fetchLastPaymentIdByProposal]);

const onOpenPaymentDocsOrUpload = useCallback(async () => {
  const pid = String(current?.proposal_id ?? '').trim();
  if (!pid) return;

  // 1) сначала пробуем открыть (если файлы уже есть)
  try {
    await openAttachment(pid, 'payment', { all: true });
    return;
  } catch (e: any) {
    const msg = String(e?.message ?? e);

    // если ошибка НЕ про "не найдены" — покажем её
    const notFound =
      msg.toLowerCase().includes('не найдены') ||
      msg.toLowerCase().includes('не найден') ||
      msg.toLowerCase().includes('not found');

    if (!notFound) {
      safeAlert('Платёжные документы', msg);
      return;
    }
  }

  // 2) файлов нет → выбираем и загружаем
  const f = await pickAnyFile();
  if (!f) return;

  const filename = String((f as any)?.name ?? (f as any)?.fileName ?? 'payment.pdf');
  await uploadProposalAttachment(pid, f, filename, 'payment');

  // 3) обновим карточку/список и сразу откроем загруженное
  await load(true);

  try {
    await openAttachment(pid, 'payment', { all: false }); // откроем самый свежий
  } catch (e2: any) {
    safeAlert('Загружено', 'Файл загружен, но открыть не удалось. Откройте ещё раз.');
  }
}, [current, load]);


  // ====== действия ======
  const addPayment = useCallback(async () => {
    if (!canAct) { safeAlert('Нет прав', 'Нужна роль «accountant».'); return; }
    if (!current?.proposal_id) return;

    const val = Number(String(amount).replace(',', '.'));
    if (!val || val <= 0) { safeAlert('Введите сумму', 'Сумма оплаты должна быть больше 0'); return; }

    try {
      const fio = accountantFio.trim();
if (!fio) { safeAlert('ФИО бухгалтера', 'Поле обязательно'); return; }

const purp = purpose.trim();
if (!purp) { safeAlert('Назначение платежа', 'Поле обязательно'); return; }

const args: any = {
  p_proposal_id: current.proposal_id,
  p_amount: val,
  p_accountant_fio: fio,
  p_purpose: purp,
  p_method: payKind === 'bank' ? 'банк' : 'нал',
  p_note: note?.trim() ? note.trim() : null,
};

const { error } = await supabase.rpc('acc_add_payment_v2_uuid', args);
if (error) throw error;


      safeAlert('Оплата добавлена', 'Прикрепите платёжный документ, если нужно.');
      await load();
      closeCard();
    } catch (e: any) {
      const msg = e?.message ?? e?.error_description ?? e?.details ?? String(e);
      safeAlert('Ошибка оплаты', msg);
      console.error('[acc_add_payment_min]', msg);
    }
 }, [canAct, amount, note, current, load, closeCard, accountantFio, purpose, payKind]);

const payRest = useCallback(async () => {
  if (!canAct) { safeAlert('Нет прав', 'Нужна роль «accountant».'); return; }
  if (!current?.proposal_id) return;

  const sum = Number(current?.invoice_amount ?? 0);
  const paid = Number(current?.total_paid ?? 0);
  const rest = sum > 0 ? Math.max(0, sum - paid) : 0;

  if (!rest || rest <= 0) {
    safeAlert('Остаток', 'Нет суммы к оплате.');
    return;
  }

  const fio = accountantFio.trim();
  if (!fio) { safeAlert('ФИО бухгалтера', 'Поле обязательно'); return; }

  const purp = purpose.trim();
  if (!purp) { safeAlert('Назначение платежа', 'Поле обязательно'); return; }

  const { error } = await supabase.rpc('acc_add_payment_v2_uuid', {
    p_proposal_id: current.proposal_id,
    p_amount: rest,
    p_accountant_fio: fio,
    p_purpose: purp,
    p_method: payKind === 'bank' ? 'банк' : 'нал',
    p_note: note?.trim() ? note.trim() : null,
  });
  if (error) throw error;

  safeAlert('Готово', 'Оплата проведена.');
  await load();
  closeCard();
}, [canAct, current, payKind, note, load, closeCard, accountantFio, purpose]);



  // === ВОЗВРАТ НА ДОРАБОТКУ СНАБЖЕНЦУ (надёжный цепочный фолбэк)
  const onReturnToBuyer = useCallback(async () => {
    if (!canAct) { safeAlert('Нет прав', 'Нужна роль «accountant».'); return; }
    const pid = String(current?.proposal_id || '');
    if (!pid) return;

    try {
      // 1) основной адаптер (может сам дёргать нужные RPC)
      await accountantReturnToBuyer({ proposalId: pid, comment: (note || '').trim() || null });
    } catch (e1: any) {
      // 2) популярный RPC acc_return_min_auto
      try {
        const { error } = await supabase.rpc('acc_return_min_auto', {
          p_proposal_id: pid,
          p_comment: (note || '').trim() || null,
        });
        if (error) throw error;
      } catch (e2: any) {
        // 3) наш минимальный безопасный RPC (если 2-й отсутствует)
        try {
          const { error } = await supabase.rpc('proposal_return_to_buyer_min', {
            p_proposal_id: pid,
            p_comment: (note || '').trim() || null,
          });
          if (error) throw error;
        } catch (e3: any) {
          const msg = e3?.message ?? e3?.error_description ?? e3?.details ?? String(e3);
          safeAlert('Ошибка возврата', msg);
          console.error('[return_to_buyer chain failed]', msg);
          return;
        }
      }
    }

    // успех: мгновенно убираем карточку, закрываем и перезагружаем
    safeAlert('Готово', 'Отправлено на доработку снабженцу.');
    setRows(prev => prev.filter(r => String(r.proposal_id) !== pid));
    closeCard();
    await load();
  }, [canAct, current, note, load, closeCard]);

  const header = useMemo(() => (
  <SafeView style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 }}>
    {/* TOP ROW */}
    <SafeView style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Animated.Text style={{ fontSize: titleSize as any, fontWeight: '900', color: COLORS.text }}>
        Бухгалтер
      </Animated.Text>

      {/* кнопки справа */}
      <View style={{ marginLeft: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Pressable
          onPress={() => safeAlert('Excel', 'Скоро добавим.')}
          style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border }}
        >
          <Text style={{ fontWeight: '800', color: COLORS.text }}>Excel</Text>
        </Pressable>
      </View>

      {/* 🔔 */}
      <Pressable
        onPress={() => { setBellOpen(true); loadNotifs(); }}
        style={{
          marginLeft: 'auto',
          paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999,
          backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, position: 'relative'
        }}
      >
        <Text style={{ fontSize: 16 }}>🔔</Text>
        {unread > 0 && (
          <View style={{
            position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444',
            borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2
          }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 10 }}>{unread}</Text>
          </View>
        )}
      </Pressable>
    </SafeView>

    <SafeView style={{ height: 10 }} />


    {/* TABS (всегда видны) */}
    <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ gap: 8, paddingRight: 12 }}
>
  {TABS.map((t) => {
    const active = tab === t;
    return (
      <Pressable
        key={t}
        onPress={() => {
          setTab(t);

          const cached = cacheByTabRef.current[t];
          if (cached) setRows(cached);

          setTimeout(() => {
  if (t === 'История') {
    loadHistory(true);
    return;
  }

  // ✅ если сейчас идёт загрузка — запомним, что пользователь хотел этот таб
  if (inFlightRef.current) {
    pendingTabRef.current = t;
    return;
  }

  load(true);
}, 0);

        }}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 999,
          backgroundColor: active ? COLORS.primary : COLORS.tabInactiveBg,
        }}
      >
        <Text style={{ color: active ? '#fff' : COLORS.tabInactiveText, fontWeight: '800' }}>
          {t}
        </Text>
      </Pressable>
    );
  })}
</ScrollView>


    {/* SUB (исчезает при скролле) */}
    <Animated.View style={{ opacity: subOpacity, marginTop: 10 }}>
      {tab === 'История' ? (
        <Text style={{ color: COLORS.sub, fontWeight: '700' }}>
          Фильтры истории ниже в списке
        </Text>
      ) : (
        <Text style={{ color: COLORS.sub, fontWeight: '700' }}>
          {rows.length} документов • обновляй свайпом вниз
        </Text>
      )}
    </Animated.View>
  </SafeView>
), [tab, unread, loadNotifs, rows.length, titleSize, subOpacity]);


  type StatusKey = 'K_PAY' | 'PART' | 'PAID' | 'REWORK' | 'HISTORY';

const statusFromRaw = (raw?: string | null, isHistory?: boolean): { key: StatusKey; label: string } => {
  if (isHistory) return { key: 'HISTORY', label: 'ИСТОРИЯ' };

  const v = String(raw ?? '').trim().toLowerCase();

  if (v.startsWith('на доработке') || v.startsWith('возврат')) return { key: 'REWORK', label: 'НА ДОРАБОТКЕ' };
  if (v.startsWith('оплачено')) return { key: 'PAID', label: 'ОПЛАЧЕНО' };
  if (v.startsWith('частично')) return { key: 'PART', label: 'ЧАСТИЧНО' };

  return { key: 'K_PAY', label: 'К ОПЛАТЕ' };
};

const statusColors = (key: StatusKey) => {
  switch (key) {
    case 'PAID':   return { bg: '#DCFCE7', fg: '#166534' };
    case 'PART':   return { bg: '#FEF3C7', fg: '#92400E' };
    case 'REWORK': return { bg: '#FEE2E2', fg: '#991B1B' };
    case 'HISTORY':return { bg: '#E0E7FF', fg: '#3730A3' };
    default:       return { bg: '#DBEAFE', fg: '#1E3A8A' }; // K_PAY
  }
};


 const Chip = ({ label, bg, fg }: { label: string; bg: string; fg: string }) => (
  <View
    style={{
      height: 26,                 // ✅ фикс высота
      paddingHorizontal: 12,      // ✅ фикс паддинги
      borderRadius: 999,
      backgroundColor: bg,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Text style={{ color: fg, fontWeight: '900', fontSize: 12 }}>
      {String(label).toUpperCase()} {/* ✅ uppercase везде */}
    </Text>
  </View>
);


  const renderItem = useCallback(({ item }: { item: AccountantInboxRow }) => {
    try {
      const total = Number(item.total_paid ?? 0);
      const sum = Number(item.invoice_amount ?? 0);
      const rest = sum > 0 ? Math.max(0, sum - total) : 0;
      const st = statusFromRaw(item.payment_status, false);
const sc = statusColors(st.key);
const isPaidFull = rest === 0 && st.key === 'PAID';


      return (
        <Pressable onPress={() => openCard(item)}
          style={{ backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12 }}>

         {(() => {
  const st = statusFromRaw(item.payment_status, false);
  const sc = statusColors(st.key);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: COLORS.text }} numberOfLines={1}>
          {(item.supplier || '—') + ' • ' + (item.invoice_number || 'без №') + ' (' + (item.invoice_date || '—') + ')'}
        </Text>
      </View>

      {/* ✅ статус-чип всегда справа */}
      <Chip label={st.label} bg={sc.bg} fg={sc.fg} />
    </View>
  );
})()}





          <View style={{ height: 6 }} />
          <Text style={{ color: COLORS.sub }}>
            Счёт: <Text style={{ fontWeight: '700', color: COLORS.text }}>{(sum || 0) + ' ' + (item.invoice_currency || 'KGS')}</Text>{' '}
            • Оплачено: <Text style={{ fontWeight: '700', color: COLORS.text }}>{total}</Text>{' '}
            • <Text style={{ fontWeight: '700', color: isPaidFull ? COLORS.green : COLORS.yellow }}>{'Остаток: ' + rest}</Text>
          </Text>
        </Pressable>
      );
    } catch (e) {
      console.error('[accountant renderItem]', e);
      return <View />; // не валим весь список
    }
  }, [openCard]);

  const canOpenInvoice = !!current?.has_invoice;

  const canOpenPayments = (current?.payments_count ?? 0) > 0;
  const currentDisplayStatus = useMemo(() => (current?.payment_status ?? 'К оплате'), [current]);

  const EmptyState = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 40, marginBottom: 8 }}>📝</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 }}>Здесь пока пусто</Text>
      <Text style={{ color: COLORS.sub, textAlign: 'center' }}>Выберите другую вкладку или дождитесь предложений от снабженца.</Text>
    </View>
  );

return (
  <SafeView style={{ flex: 1, backgroundColor: COLORS.bg }}>
{/* ✅ hidden measurer: меряем натуральную высоту шапки (без анимации) */}
<View
  pointerEvents="none"
  style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: 0, zIndex: -1 }}
  onLayout={(e) => {
  const h = Math.round(e?.nativeEvent?.layout?.height ?? 0);
  if (h > 0 && Math.abs(h - measuredHeaderMax) > 2) {
    requestAnimationFrame(() => setMeasuredHeaderMax(h));
  }
}}

>
  {header}
</View>

    {/* ✅ Collapsing Header */}
    <Animated.View
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 50,
        height: headerHeight,
        backgroundColor: COLORS.bg,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        paddingTop: Platform.OS === 'web' ? 10 : 12,
        paddingBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
        shadowOpacity: headerShadow as any,
        elevation: 6,
      }}
    >
      {header}
    </Animated.View> 
<FlatList
      style={{ flex: 1 }}
      data={(tab === 'История' ? (historyRows as any) : (rows as any)) as any[]}
      keyExtractor={(item: any) =>
        tab === 'История'
          ? String(item.payment_id)
          : String(item.proposal_id)
      }
      ListHeaderComponent={
  tab === 'История' ? (
    <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
      {/* ✅ фильтры истории — БЕЗ {header} */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Pressable
          onPress={() => {
            const d = new Date();
            const s = d.toISOString().slice(0, 10);
            setDateFrom(s); setDateTo(s);
          }}
          style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border }}
        >
          <Text style={{ fontWeight: '700', color: COLORS.text }}>Сегодня</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const to = new Date();
            const from = new Date(); from.setDate(to.getDate() - 6);
            setDateFrom(from.toISOString().slice(0, 10));
            setDateTo(to.toISOString().slice(0, 10));
          }}
          style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border }}
        >
          <Text style={{ fontWeight: '700', color: COLORS.text }}>Неделя</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const to = new Date();
            const from = new Date(); from.setDate(to.getDate() - 29);
            setDateFrom(from.toISOString().slice(0, 10));
            setDateTo(to.toISOString().slice(0, 10));
          }}
          style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border }}
        >
          <Text style={{ fontWeight: '700', color: COLORS.text }}>Месяц</Text>
        </Pressable>

        <Pressable
          onPress={() => setCalOpen(true)}
          style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border }}
        >
          <Text style={{ fontWeight: '700', color: COLORS.text }}>📅 С/По</Text>
        </Pressable>
      </View>

      <View style={{ height: 8 }} />

      <TextInput
        placeholder="Поиск: поставщик / № счёта"
        value={histSearch}
        onChangeText={setHistSearch}
        style={{ borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', borderRadius: 12, padding: 10 }}
      />

      <View style={{ height: 8 }} />

      {(() => {
        const total = (historyRows || []).reduce((s, r) => s + Number((r as any)?.amount ?? 0), 0);
        const cur = (historyRows?.[0] as any)?.invoice_currency ?? 'KGS';
        return (
  <View style={{ paddingBottom: 4 }}>
    <Text style={{ color: COLORS.sub }}>
      Найдено:{' '}
      <Text style={{ fontWeight: '800', color: COLORS.text }}>
        {historyRows.length}
      </Text>
      {'  '}• Сумма:{' '}
      <Text style={{ fontWeight: '800', color: COLORS.text }}>
        {total.toFixed(2)} {cur}
      </Text>
    </Text>
  </View>
);
      })()}
    </View>
  ) : null
}

      renderItem={({ item }: any) => {
        if (tab === 'История') {
          return (
            <Pressable
              onPress={() => {
  setCurrentPaymentId(Number(item.payment_id));

  setAccountantFio(String(item.accountant_fio ?? '').trim());
  setPurpose(String(item.purpose ?? '').trim());

  openCard({
    proposal_id: item.proposal_id,
    supplier: item.supplier,
    invoice_number: item.invoice_number,
    invoice_date: item.invoice_date,
    invoice_amount: item.invoice_amount,
    invoice_currency: item.invoice_currency,
    payment_status: 'Оплачено',
    total_paid: item.amount,
    payments_count: 1,
    has_invoice: !!item.has_invoice,
    sent_to_accountant_at: null,
  } as any);
}}

              style={{ backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12 }}
            >
              <Text style={{ fontWeight: '800', color: COLORS.text }}>{item.supplier || '—'}</Text>
             <Text style={{ color: COLORS.sub, marginTop: 2 }}>
  Счёт:{' '}
  <Text style={{ color: COLORS.text, fontWeight: '700' }}>
    {item.invoice_number || 'без №'}
  </Text>
  {` • ${String(item.purpose || item.note || '—').trim()}`}
</Text>

<Text style={{ color: COLORS.sub, marginTop: 2 }}>
  Бухгалтер:{' '}
  <Text style={{ color: COLORS.text, fontWeight: '700' }}>
    {String(item.accountant_fio || '—').trim()}
  </Text>
</Text>

            </Pressable>
          );
        }

        // обычные строки (твоя функция renderItem)
        return renderItem({ item } as any) as any;
      }}
     refreshControl={
  <RefreshControl
    refreshing={tab === 'История' ? historyRefreshing : refreshing}
    onRefresh={tab === 'История' ? onRefreshHistory : onRefresh}
    title=""
    tintColor="transparent"
  />
}

      ListEmptyComponent={
        tab === 'История'
          ? (historyLoading ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator />
              </View>
            ) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: COLORS.sub }}>История пуста</Text>
              </View>
            ))
          : (loading ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator />
              </View>
            ) : (
              <EmptyState />
            ))
      }
      onScroll={Animated.event(
  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
  { useNativeDriver: false }
)}
scrollEventThrottle={16}
contentContainerStyle={{
  paddingTop: HEADER_MAX + 16,
  paddingBottom: 140,
}}

      removeClippedSubviews={Platform.OS === 'web' ? false : true}
    />

    {/* модалка С/По */}
    <Modal visible={calOpen} transparent animationType="fade" onRequestClose={() => setCalOpen(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ fontWeight: '900', fontSize: 16, color: COLORS.text }}>Период</Text>
          <View style={{ height: 10 }} />
          <TextInput
            placeholder="Дата С (YYYY-MM-DD)"
            value={dateFrom}
            onChangeText={setDateFrom}
            style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, marginBottom: 8 }}
          />
          <TextInput
            placeholder="Дата По (YYYY-MM-DD)"
            value={dateTo}
            onChangeText={setDateTo}
            style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, marginBottom: 8 }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => { setDateFrom(''); setDateTo(''); }}
              style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border }}
            >
              <Text style={{ fontWeight: '800', color: COLORS.text }}>Сброс</Text>
            </Pressable>
            <Pressable
              onPress={() => setCalOpen(false)}
              style={{ padding: 10, borderRadius: 10, backgroundColor: COLORS.primary }}
            >
              <Text style={{ fontWeight: '800', color: '#fff' }}>Готово</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

   {/* ✅ МОДАЛКА КАРТОЧКИ — хедер всегда ниже чёлки, ✕ кликабелен */}
<Modal
  visible={cardOpen}
  transparent
  animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
  onRequestClose={closeCard}
>
  {(() => {
    const topPad =
      Platform.OS === 'ios'
        ? Math.max(insets.top || 0, 44) // ✅ если insets.top вдруг 0 — всё равно опустим
        : (insets.top || 0);

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          zIndex: 9999,
          elevation: 9999,
        }}
      >
        {/* ✅ тап по фону — закрыть */}
        <Pressable style={{ flex: 1 }} onPress={closeCard} />

        {/* ✅ экран модалки */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: COLORS.bg,
          }}
        >
          <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            {/* ✅ SAFE AREA СПЕЙСЕР (ГАРАНТИЯ) */}
            <View style={{ height: topPad, backgroundColor: COLORS.bg }} />

            {/* ✅ ХЕДЕР */}
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.bg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 10,
                elevation: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '900',
                  color: COLORS.text,
                }}
                numberOfLines={1}
              >
                Карточка предложения
              </Text>

              <Pressable
                onPress={closeCard}
                hitSlop={30}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>✕</Text>
              </Pressable>
            </View>
{/* ✅ липкий мини-блок (появляется при скролле вниз) */}
<Animated.View
  pointerEvents="box-none"
  style={{
    position: 'absolute',
    top: topPad + 56, // под хедером (примерно)
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    zIndex: 20,
    opacity: cardScrollY.interpolate({
      inputRange: [0, 80, 140],
      outputRange: [0, 0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateY: cardScrollY.interpolate({
          inputRange: [0, 80, 140],
          outputRange: [-10, -10, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  }}
>
  <View
    style={{
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      padding: 10,
    }}
  >
    <Text style={{ color: COLORS.sub, fontWeight: '800', fontSize: 12 }}>
      ФИО: <Text style={{ color: COLORS.text, fontWeight: '900' }}>{accountantFio.trim() || '—'}</Text>
    </Text>
    <Text style={{ color: COLORS.sub, fontWeight: '800', fontSize: 12, marginTop: 4 }} numberOfLines={1}>
      Назначение: <Text style={{ color: COLORS.text, fontWeight: '900' }}>{purpose.trim() || '—'}</Text>
    </Text>
  </View>
</Animated.View>


            {/* ✅ СКРОЛЛ ТЕЛА */}
            <Animated.ScrollView
  keyboardShouldPersistTaps="always"
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: cardScrollY } } }],
    { useNativeDriver: false }
  )}
  scrollEventThrottle={16}
  contentContainerStyle={{
  paddingHorizontal: 12,
  paddingTop: 68,
  paddingBottom: Math.max(insets.bottom || 0, 16) + 24,
}}

>
          {/* ====== ТВОЙ КОНТЕНТ КАРТОЧКИ ====== */}
          <Text style={{ color: COLORS.sub, marginBottom: 6 }}>
            ID:{' '}
            <Text style={{ color: COLORS.text, fontFamily: 'monospace' }}>
              {current?.proposal_id || '—'}
            </Text>
          </Text>

          <Text style={{ color: COLORS.sub }}>
            Поставщик: <Text style={{ color: COLORS.text }}>{current?.supplier || '—'}</Text>
          </Text>

          <Text style={{ color: COLORS.sub }}>
            Счёт: <Text style={{ color: COLORS.text }}>{current?.invoice_number || '—'}</Text> от{' '}
            <Text style={{ color: COLORS.text }}>{current?.invoice_date || '—'}</Text>
          </Text>

          <Text style={{ color: COLORS.sub }}>
            Сумма:{' '}
            <Text style={{ color: COLORS.text }}>
              {Number(current?.invoice_amount ?? 0) + ' ' + (current?.invoice_currency || 'KGS')}
            </Text>
          </Text>

          {/* ✅ СТАТУС С ЧИПОМ */}
          {(() => {
            const isHist = tab === 'История';
            const st = statusFromRaw(current?.payment_status ?? currentDisplayStatus, isHist);
            const sc = statusColors(st.key);

            return (
              <View style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={{ color: COLORS.sub, fontWeight: '800' }}>
                    СТАТУС: <Text style={{ color: COLORS.text, fontWeight: '900' }}>{st.label}</Text>
                  </Text>
                  <Chip label={st.label} bg={sc.bg} fg={sc.fg} />
                </View>
              </View>
            );
          })()}

          {/* ✅ ЯКОРЬ */}
          {(() => {
            const sum = Number(current?.invoice_amount ?? 0);
            const paid = Number(current?.total_paid ?? 0);
            const rest = sum > 0 ? Math.max(0, sum - paid) : 0;

            const norm = statusFromRaw(current?.payment_status ?? currentDisplayStatus, tab === 'История');
            const stText = String(current?.payment_status ?? currentDisplayStatus ?? '');

            const reason =
              stText.toLowerCase().startsWith('на доработке')
                ? (stText.includes(':') ? stText.split(':').slice(1).join(':').trim() : 'не указана')
                : '—';

            if (norm.key === 'HISTORY') {
              return (
                <View style={{ marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ color: COLORS.sub }}>СУММА ПЛАТЕЖА</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>
                    {paid.toFixed(2)} {current?.invoice_currency || 'KGS'}
                  </Text>
                </View>
              );
            }

            if (norm.key === 'PAID') {
              return (
                <View style={{ marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ color: COLORS.sub }}>ОПЛАЧЕНО</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>
                    {paid.toFixed(2)} {current?.invoice_currency || 'KGS'}
                  </Text>
                </View>
              );
            }

            if (norm.key === 'REWORK') {
              return (
                <View style={{ marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ color: COLORS.sub }}>ПРИЧИНА</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.text }}>
                    {reason || 'не указана'}
                  </Text>
                </View>
              );
            }

            return (
              <View style={{ marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border }}>
                <Text style={{ color: COLORS.sub }}>ОСТАТОК</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>
                  {rest.toFixed(2)} {current?.invoice_currency || 'KGS'}
                </Text>
              </View>
            );
          })()}

          <View style={{ height: 12 }} />
<View style={{ height: 12 }} />

{/* ✅ ФИО + Назначение (всегда видно) */}
<Text style={{ fontWeight: '900', color: COLORS.text, marginBottom: 6 }}>
  ФИО бухгалтера (обязательно)
</Text>
<TextInput
  value={accountantFio}
  onChangeText={setAccountantFio}
  placeholder="Иванов Иван Иванович"
  style={{
    borderWidth: 1,
    borderColor: accountantFio.trim() ? COLORS.border : '#ef4444',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  }}
/>

<View style={{ height: 10 }} />

<Text style={{ fontWeight: '900', color: COLORS.text, marginBottom: 6 }}>
  Назначение платежа (обязательно)
</Text>
<TextInput
  value={purpose}
  onChangeText={setPurpose}
  placeholder="Оплата по счёту №..., за материалы/работы..."
  multiline
  style={{
    borderWidth: 1,
    borderColor: purpose.trim() ? COLORS.border : '#ef4444',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    minHeight: 70,
  }}
/>

<View style={{ height: 14 }} />

          {/* ✅ ДОКУМЕНТЫ */}
          <Text style={{ fontWeight: '600', marginBottom: 6, color: COLORS.text }}>Документы</Text>

         <SafeView style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
  {!!current?.proposal_id && (
    <View>
      <BusyButton
        label="PDF предложения"
        actionKey="doc_proposal_pdf"
        busyKey={busyKey}
        run={runAction}
        onPress={async () => { await onOpenProposalPdf(); }}
      />
    </View>
  )}

  <View>
    <BusyButton
      label="Платёжный отчёт"
      actionKey="doc_payment_report"
      busyKey={busyKey}
      run={runAction}
      onPress={async () => { await onOpenPaymentReport(); }}
    />
  </View>

  {!!current?.proposal_id && (
    <View>
      <BusyButton<any>
  label="Платёжные документы"
  actionKey="doc_payment_files"
  busyKey={busyKey}
  run={runAction}
  // ✅ prepare: сначала пытаемся открыть существующие; если нет — открываем picker
  prepare={async () => {
    const pid = String(current?.proposal_id ?? '').trim();
    if (!pid) return null;

    // 1) если уже есть файлы — откроем и выходим (без лоадера)
    try {
      await openAttachment(pid, 'payment', { all: true });
      return null;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const notFound =
        msg.toLowerCase().includes('не найдены') ||
        msg.toLowerCase().includes('не найден') ||
        msg.toLowerCase().includes('not found');

      if (!notFound) {
        safeAlert('Платёжные документы', msg);
        return null;
      }
    }

    // 2) файлов нет → открываем диалог выбора файла (БЕЗ busyKey)
    const f = await pickAnyFile();
    if (!f) return null; // ✅ нажал “Отмена” → всё остановилось
    return f;            // ✅ вернули файл → дальше будет busyKey и upload
  }}
  // ✅ этот код выполняется ПОД busyKey (показывает “Загрузка…”)
  onPressWithPayload={async (f) => {
    const pid = String(current?.proposal_id ?? '').trim();
    if (!pid) return;

    const filename = String((f as any)?.name ?? (f as any)?.fileName ?? 'payment.pdf');
    await uploadProposalAttachment(pid, f, filename, 'payment');
    await load(true);

    // откроем самый свежий
    await openAttachment(pid, 'payment', { all: false });
  }}
/>

    </View>
  )}
</SafeView>

          <View style={{ height: 16 }} />
          {/* ✅ ДЕЙСТВИЯ */}
          {(() => {
            const isHist = tab === 'История';
            const st = statusFromRaw(current?.payment_status ?? currentDisplayStatus, isHist);

            if (st.key === 'K_PAY') {
              return (
                <View style={{ gap: 10 }}>
                  <ActionButton
  label="Оплатить полностью"
  variant="primary"
  actionKey="pay_full"
  busyKey={busyKey}
  runAction={runAction}
  onPress={async () => { await payRest(); }}
/>

                  <ActionButton
                    label="Оплатить частично"
                    variant="secondary"
                    actionKey="open_part_form"
                    busyKey={busyKey}
                    runAction={runAction}
                    onPress={() => { setShowPayForm(true); }}
                  />
                  <ActionButton
                    label="Вернуть на доработку"
                    variant="danger"
                    actionKey="return_to_buyer"
                    busyKey={busyKey}
                    runAction={runAction}
                    onPress={async () => { await onReturnToBuyer(); }}
                  />
                </View>
              );
            }

            if (st.key === 'PART') {
              return (
                <View style={{ gap: 10 }}>
                  <ActionButton
                    label="Доплатить остаток"
                    variant="primary"
                    actionKey="pay_rest"
                    busyKey={busyKey}
                    runAction={runAction}
                    onPress={async () => { await payRest(); }}
                  />
                  <ActionButton
                    label="Добавить платёж"
                    variant="secondary"
                    actionKey="open_add_form"
                    busyKey={busyKey}
                    runAction={runAction}
                    onPress={() => { setShowPayForm(true); }}
                  />
                  <ActionButton
                    label="Вернуть на доработку"
                    variant="danger"
                    actionKey="return_to_buyer2"
                    busyKey={busyKey}
                    runAction={runAction}
                    onPress={async () => { await onReturnToBuyer(); }}
                  />
                </View>
              );
            }

            if (st.key === 'PAID') {
              return (
                <View style={{ gap: 10 }}>
                  <ActionButton
  label="Платёжные документы"
  variant="primary"
  actionKey="paid_docs"
  busyKey={busyKey}
  runAction={runAction}
  onPress={onOpenPaymentDocsOrUpload}
/>

                  ) : null}

                  <ActionButton
                    label="Закрыть"
                    variant={canOpenPayments ? 'secondary' : 'primary'}
                    actionKey="paid_close"
                    busyKey={busyKey}
                    runAction={runAction}
                    onPress={closeCard}
                  />
                </View>
              );
            }

            if (st.key === 'REWORK') {
              return (
                <View style={{ gap: 10 }}>
                  <ActionButton
                    label="Закрыть"
                    variant="primary"
                    actionKey="rework_close"
                    busyKey={busyKey}
                    runAction={runAction}
                    onPress={closeCard}
                  />
                </View>
              );
            }

            if (st.key === 'HISTORY') {
              return (
                <View style={{ gap: 10 }}>
                  <ActionButton
  label="Платёжный отчёт"
  variant="primary"
  actionKey="hist_pay_report"
  busyKey={busyKey}
  runAction={runAction}
  onPress={onOpenPaymentReport}
/>


                  <ActionButton
                    label="Закрыть"
                    variant="secondary"
                    actionKey="hist_close"
                    busyKey={busyKey}
                    runAction={runAction}
                    onPress={closeCard}
                  />
                </View>
              );
            }

            return null;
          })()}

          {/* ✅ ФОРМА ОПЛАТЫ */}
          {(() => {
            const isHist = tab === 'История';
            const st = statusFromRaw(current?.payment_status ?? currentDisplayStatus, isHist);
            const allowForm = (st.key === 'K_PAY' || st.key === 'PART');
            if (!allowForm || !showPayForm) return null;

            return (
              <>
                <View style={{ height: 16 }} />
                <Text style={{ fontWeight: '600', marginBottom: 6, color: COLORS.text }}>Форма оплаты</Text>

                <View style={{ position: 'relative', zIndex: 5 }}>
                  <TextInput
                    placeholder="Сумма (KGS)"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      backgroundColor: '#fff',
                      borderRadius: 10,
                      padding: 10,
                      marginBottom: 8,
                    }}
                  />

                  <Text style={{ fontWeight: '600', marginBottom: 6, color: COLORS.text }}>Способ оплаты</Text>

                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <Pressable
                      onPress={() => setPayKind('bank')}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        backgroundColor: payKind === 'bank' ? COLORS.primary : '#fff',
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                    >
                      <Text style={{ color: payKind === 'bank' ? '#fff' : COLORS.text, fontWeight: '700' }}>
                        Банк
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setPayKind('cash')}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        backgroundColor: payKind === 'cash' ? COLORS.primary : '#fff',
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                    >
                      <Text style={{ color: payKind === 'cash' ? '#fff' : COLORS.text, fontWeight: '700' }}>
                        Нал
                      </Text>
                    </Pressable>
                  </View>

                 
<TextInput
  placeholder="Комментарий"
  value={note}
  onChangeText={setNote}
  style={{
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  }}
/>
                  <WButton
                    onPress={addPayment}
                    disabled={!canAct}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: canAct ? '#10B981' : '#94a3b8',
                    }}
                  >
                    <Text style={{ color: '#000', textAlign: 'center', fontWeight: '700' }}>
                      Сохранить оплату
                    </Text>
                  </WButton>

                  <View style={{ height: 8 }} />

                  <WButton
                    onPress={() => setShowPayForm(false)}
                    style={{
                      padding: 12,
                      backgroundColor: '#fff',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    <Text style={{ textAlign: 'center', color: COLORS.text, fontWeight: '800' }}>
                      Скрыть форму
                    </Text>
                  </WButton>
                </View>
              </>
            );
          })()}
       </Animated.ScrollView>
          </View>
        </View>
      </View>
    );
  })()}
</Modal>



    <Modal visible={bellOpen} animationType="fade" onRequestClose={() => setBellOpen(false)} transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, maxHeight: '70%', borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 8, color: COLORS.text }}>Уведомления</Text>
          <ScrollView contentContainerStyle={{ gap: 8 }}>
            {notifs.length === 0 ? (
              <Text style={{ color: COLORS.sub }}>Нет непрочитанных</Text>
            ) : notifs.map((n: any) => (
              <View key={n.id} style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, backgroundColor: '#fff' }}>
                <Text style={{ fontWeight: '700', color: COLORS.text }}>{n.title}</Text>
                {!!n.body && <Text style={{ color: COLORS.sub, marginTop: 2 }}>{n.body}</Text>}
                <Text style={{ color: COLORS.sub, marginTop: 4, fontSize: 11 }}>
                  {new Date(n.created_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </ScrollView>

          <SafeView style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Pressable
              onPress={markAllRead}
              style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#111827' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Отметить прочитанными</Text>
            </Pressable>
            <Pressable
              onPress={() => setBellOpen(false)}
              style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff' }}>
              <Text style={{ color: COLORS.text, fontWeight: '700' }}>Закрыть</Text>
            </Pressable>
          </SafeView>
        </View>
      </View>
    </Modal>
  </SafeView>
);

}

/** пикер файла (web/native) */
async function pickAnyFile(): Promise<any | null> {
  try {
    if (Platform.OS === 'web') {
  return await new Promise<any | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';

    let done = false;

    const finish = (val: any | null) => {
      if (done) return;
      done = true;
      try { window.removeEventListener('focus', onFocus, true); } catch {}
      try { input.remove(); } catch {}
      resolve(val);
    };

    const onChange = () => {
      const f = (input.files && input.files[0]) || null;
      finish(f);
    };

    // ✅ когда диалог закрыли (в т.ч. Cancel) — фокус возвращается в окно
    const onFocus = () => {
      // даём браузеру долю секунды обновить input.files
      setTimeout(() => {
        const f = (input.files && input.files[0]) || null;
        // если Cancel → f=null → finish(null)
        finish(f);
      }, 250);
    };

    input.addEventListener('change', onChange, { once: true });
    window.addEventListener('focus', onFocus, true);

    document.body.appendChild(input);
    input.click();
  });
} else {
      // @ts-ignore
      const DocPicker = await import('expo-document-picker');
      const res = await (DocPicker as any).getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (res?.canceled) return null;
      return res?.assets?.[0] ?? res ?? null;
    }
  } catch (e) {
    safeAlert('Файл', (e as any)?.message ?? String(e));
    return null;
  }
}

