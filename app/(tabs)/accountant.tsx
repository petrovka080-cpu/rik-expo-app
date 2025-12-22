import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, ActivityIndicator,
  RefreshControl, Modal, TextInput, Platform, ScrollView, Alert
} from 'react-native';
import { supabase } from '../../src/lib/supabaseClient';
import { useFocusEffect } from 'expo-router';

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
  | 'Частично оплачено'
  | 'Оплачено'
  | 'На доработке (снабженец)'
  | 'История';
const TABS: Tab[] = ['К оплате', 'Частично оплачено', 'Оплачено', 'На доработке (снабженец)', 'История'];


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
  paid_at: string; // timestamptz
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
};

export default function AccountantScreen() {
  const [tab, setTab] = useState<Tab>('К оплате');
  const [rows, setRows] = useState<AccountantInboxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAccountant, setIsAccountant] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
const focusedRef = useRef(false);
const lastKickRef = useRef(0);

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
  const [method, setMethod] = useState<string>('');
  const [note, setNote] = useState<string>('');
// способ оплаты
const [payKind, setPayKind] = useState<'bank' | 'cash'>('bank');

  // ====== РОЛЬ ======
  const [role, setRole] = useState<string | null>(null);
 const canAct = true; // временно: не блокируем действия


  // freeze обновлений списка, пока открыта карточка (фикс «прыжков»)
  const [freezeWhileOpen, setFreezeWhileOpen] = useState(false);

 useEffect(() => {
  setIsAccountant(true);
  setRoleLoading(false);
}, []);

  // запомним: RPC доступен/нет, чтобы не спамить 404
  const triedRpcOkRef = useRef<boolean>(true);
const loadHistory = useCallback(async () => {
  if (!focusedRef.current) return;

  const now = Date.now();
  if (now - lastKickRef.current < 900) return;
  lastKickRef.current = now;

  setHistoryLoading(true);
  try {
    const { data, error } = await supabase.rpc('list_accountant_payments_history', {
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
  const load = useCallback(async () => {
  if (!focusedRef.current) return;
  if (freezeWhileOpen) return;

  const now = Date.now();
  if (now - lastKickRef.current < 900) return;
  lastKickRef.current = now;

  setLoading(true);


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
        case 'Частично оплачено': return ps.startsWith('частично');
        case 'Оплачено': return ps.startsWith('оплачено');
        case 'На доработке (снабженец)': return ps.startsWith('на доработке');
        default: return true;
      }
    });

    setRows(prev => (rowsShallowEqual(prev, filtered) ? prev : filtered));

  } catch (e: any) {
    console.error('[accountant load]', e?.message ?? e);
  } finally {
    setLoading(false);
  }
}, [tab, freezeWhileOpen]);
useFocusEffect(
  useCallback(() => {
    focusedRef.current = true;

    // первичная загрузка при входе на экран
    if (tab === 'История') loadHistory();
    else load();

    // уведомления подтянем один раз при входе
    loadNotifs();

    return () => {
      // уходим со страницы — больше ничего не грузим
      focusedRef.current = false;
    };
  }, [tab, load, loadHistory, loadNotifs])
);

   const onRefresh = useCallback(async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } }, [load]);

  // ====== 🔔 уведомления: список/звук/подписка ======
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const unread = notifs.length;
async function loadNotifs() {
  if (!focusedRef.current) return;
  try {
    const list = await notifList('accountant', 20);
    setNotifs(list);
  } catch {}
}

  // инициализация/освобождение звука (кроссплатформенно: web/native)
  useEffect(() => {
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
        if (!freezeWhileOpen) load();
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
    setAmount(''); setMethod(''); setNote('');
    setFreezeWhileOpen(true);
  }, []);

  const closeCard = useCallback(() => {
  setCardOpen(false);
  setCurrent(null);
  setCurrentPaymentId(null); // ✅ ВОТ ЭТО
  setFreezeWhileOpen(false);
  setTimeout(() => { load(); }, 0);
}, [load]);


  // ====== действия ======
  const addPayment = useCallback(async () => {
    if (!canAct) { safeAlert('Нет прав', 'Нужна роль «accountant».'); return; }
    if (!current?.proposal_id) return;

    const val = Number(String(amount).replace(',', '.'));
    if (!val || val <= 0) { safeAlert('Введите сумму', 'Сумма оплаты должна быть больше 0'); return; }

    try {
      const args: any = { p_proposal_id: String(current.proposal_id), p_amount: val };
      args.p_method = payKind === 'bank' ? 'банк' : 'нал';
      if (note?.trim())   args.p_note   = note.trim();

      const { error } = await supabase.rpc('acc_add_payment_min', args);
      if (error) throw error;

      safeAlert('Оплата добавлена', 'Прикрепите платёжный документ, если нужно.');
      await load();
      closeCard();
    } catch (e: any) {
      const msg = e?.message ?? e?.error_description ?? e?.details ?? String(e);
      safeAlert('Ошибка оплаты', msg);
      console.error('[acc_add_payment_min]', msg);
    }
  }, [canAct, amount, method, note, current, load, closeCard]);

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
  <SafeView style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, backgroundColor: COLORS.bg }}>
    <SafeView style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text }}>Бухгалтер</Text>
{/* ✅ КНОПКИ СПРАВА */}
      <View style={{ marginLeft: 16, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
               
        <Pressable
          onPress={() => safeAlert('Excel', 'Скоро добавим.')}
          style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border }}
        >
          <Text style={{ fontWeight: '700', color: COLORS.text }}>Excel</Text>
        </Pressable>
      </View>
      {/* 🔔 Колокольчик справа */}
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
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>{unread}</Text>
          </View>
        )}
      </Pressable>
    </SafeView>

    <View style={{ height: 10 }} />

    <SafeView style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {TABS.map((t) => {
        const active = tab === t;
        return (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: active ? COLORS.primary : COLORS.tabInactiveBg,
            }}
          >
            <Text style={{ color: active ? '#fff' : COLORS.tabInactiveText, fontWeight: '600' }}>{t}</Text>
          </Pressable>
        );
      })}
   
    </SafeView>
  </SafeView>
), [tab, unread, loadNotifs]);


  const statusColors = (s?: string | null) => {
    const v = (s ?? '').trim();
    switch (v) {
      case 'Оплачено': return { bg: '#DCFCE7', fg: '#166534' };
      case 'Частично оплачено': return { bg: '#FEF3C7', fg: '#92400E' };
      case 'К оплате': return { bg: '#DBEAFE', fg: '#1E3A8A' };
    }
    if (v.startsWith('На доработке')) return { bg: '#FEE2E2', fg: '#991B1B' };
    return { bg: '#DBEAFE', fg: '#1E3A8A' };
  };

  const Chip = ({ label, bg, fg }: { label: string; bg: string; fg: string }) => (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
      <Text style={{ color: fg, fontWeight: '600', fontSize: 12 }}>{label}</Text>
    </View>
  );

  const renderItem = useCallback(({ item }: { item: AccountantInboxRow }) => {
    try {
      const total = Number(item.total_paid ?? 0);
      const sum = Number(item.invoice_amount ?? 0);
      const rest = sum > 0 ? Math.max(0, sum - total) : 0;
      const displayStatus = item.payment_status ?? 'К оплате';
      const isPaidFull = rest === 0 && displayStatus === 'Оплачено';
      const sc = statusColors(displayStatus);

      return (
        <Pressable onPress={() => openCard(item)}
          style={{ backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12 }}>
          <SafeView style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontWeight: '700', color: COLORS.text }}>
              {(item.supplier || '—') + ' • ' + (item.invoice_number || 'без №') + ' (' + (item.invoice_date || '—') + ')'}
            </Text>
            <Chip label={displayStatus} bg={sc.bg} fg={sc.fg} />
            {!!item.has_invoice && <Chip label="invoice" bg="#E0E7FF" fg="#3730A3" />}
            {(item.payments_count ?? 0) > 0 && <Chip label={`payments: ${item.payments_count}`} bg="#E0F2FE" fg="#075985" />}
          </SafeView>
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
  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
    <FlatList
      style={{ flex: 1 }}
      data={(tab === 'История' ? (historyRows as any) : (rows as any)) as any[]}
      keyExtractor={(item: any) =>
        tab === 'История'
          ? String(item.payment_id)
          : String(item.proposal_id)
      }
      ListHeaderComponent={() => {
        if (tab !== 'История') return <View>{header}</View>;

        const total = (historyRows || []).reduce((s, r) => s + Number((r as any)?.amount ?? 0), 0);
        const cur = (historyRows?.[0] as any)?.invoice_currency ?? 'KGS';

        return (
          <View>
            {header}

            {/* фильтры */}
            <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
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
            </View>
          </View>
        );
      }}
      renderItem={({ item }: any) => {
        if (tab === 'История') {
          return (
            <Pressable
              onPress={() => {
                setCurrentPaymentId(Number(item.payment_id));
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
                {new Date(item.paid_at).toLocaleString()} •{' '}
                <Text style={{ fontWeight: '800', color: COLORS.text }}>
                  {Number(item.amount).toFixed(2)} {item.invoice_currency || 'KGS'}
                </Text>
                {!!item.method ? ` • ${item.method}` : ''}
              </Text>
              <Text style={{ color: COLORS.sub, marginTop: 2 }}>
                Счёт:{' '}
                <Text style={{ color: COLORS.text, fontWeight: '700' }}>
                  {item.invoice_number || 'без №'}
                </Text>
                {!!item.note ? ` • ${item.note}` : ''}
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
      contentContainerStyle={{ paddingBottom: 140 }}
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

    {/* твои модалки оставляем как были */}
    <Modal visible={cardOpen} animationType="slide" onRequestClose={closeCard}>
      <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.bg }}>
        <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={{ paddingBottom: 48 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: COLORS.text }}>Карточка предложения</Text>
          <Text style={{ color: COLORS.sub, marginBottom: 6 }}>
            ID: <Text style={{ color: COLORS.text, fontFamily: 'monospace' }}>{current?.proposal_id || '—'}</Text>
          </Text>

          <Text style={{ color: COLORS.sub }}>Поставщик: <Text style={{ color: COLORS.text }}>{current?.supplier || '—'}</Text></Text>
          <Text style={{ color: COLORS.sub }}>Счёт: <Text style={{ color: COLORS.text }}>{current?.invoice_number || '—'}</Text> от <Text style={{ color: COLORS.text }}>{current?.invoice_date || '—'}</Text></Text>
          <Text style={{ color: COLORS.sub }}>Сумма: <Text style={{ color: COLORS.text }}>{(Number(current?.invoice_amount ?? 0)) + ' ' + (current?.invoice_currency || 'KGS')}</Text></Text>
          <Text style={{ color: COLORS.sub }}>Статус: <Text style={{ color: COLORS.text }}>{currentDisplayStatus}</Text></Text>

          <View style={{ height: 12 }} />

          <Text style={{ fontWeight: '600', marginBottom: 6, color: COLORS.text }}>Документы</Text>

          <SafeView style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <View>
              <WButton
                onPress={() => openAttachment(String(current?.proposal_id), 'invoice')}
                disabled={!canOpenInvoice}
                style={{ padding: 10, backgroundColor: '#EEE', borderRadius: 10 }}
              >
                <Text>Открыть счёт</Text>
              </WButton>
            </View>

            <View>
              <WButton
                onPress={() => openAttachment(String(current?.proposal_id), 'payment', { all: true })}
                disabled={!canOpenPayments}
                style={{ padding: 10, backgroundColor: '#EEE', borderRadius: 10 }}
              >
                <Text>Платёжные документы</Text>
              </WButton>
            </View>

            <View>
              <WButton
                onPress={() => exportProposalPdf(String(current?.proposal_id))}
                style={{ padding: 10, backgroundColor: '#EEE', borderRadius: 10 }}
              >
                <Text>PDF предложения</Text>
              </WButton>
            </View>

            <View>
              <WButton
                onPress={() => {
                  if (!currentPaymentId) {
                    safeAlert('Платёжка', 'Открой платеж из вкладки «История»');
                    return;
                  }
                  exportPaymentOrderPdf(currentPaymentId);
                }}
                style={{ padding: 10, backgroundColor: '#EEE', borderRadius: 10 }}
              >
                <Text>Платёжка</Text>
              </WButton>
            </View>
          </SafeView>

          <View style={{ height: 16 }} />

          <Text style={{ fontWeight: '600', marginBottom: 6, color: COLORS.text }}>Добавить оплату</Text>
          <View style={{ position: 'relative', zIndex: 5 }}>
            <TextInput
              placeholder="Сумма (KGS)"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              style={{ borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 8 }}
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
                <Text style={{ color: payKind === 'bank' ? '#fff' : COLORS.text, fontWeight: '700' }}>Банк</Text>
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
                <Text style={{ color: payKind === 'cash' ? '#fff' : COLORS.text, fontWeight: '700' }}>Нал</Text>
              </Pressable>
            </View>

            <TextInput
              placeholder="Комментарий"
              value={note}
              onChangeText={setNote}
              style={{ borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 8 }}
            />

            <WButton
              onPress={addPayment}
              disabled={!canAct}
              style={{ padding: 12, borderRadius: 10, backgroundColor: canAct ? '#10B981' : '#94a3b8' }}
            >
              <Text style={{ color: '#000', textAlign: 'center', fontWeight: '700' }}>
                Сохранить оплату
              </Text>
            </WButton>
          </View>

          <View style={{ height: 12 }} />

          {currentDisplayStatus !== 'Оплачено' && (
            <Pressable
              onPress={onReturnToBuyer}
              disabled={!canAct}
              style={{ padding: 12, borderRadius: 10, backgroundColor: canAct ? COLORS.red : '#d1d5db' }}
            >
              <Text style={{ color: canAct ? '#fff' : '#6b7280', textAlign: 'center', fontWeight: '700' }}>
                Вернуть на доработку снабженцу
              </Text>
            </Pressable>
          )}

          <View style={{ height: 12 }} />
          <WButton
            onPress={closeCard}
            style={{ padding: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border }}
          >
            <Text style={{ textAlign: 'center', color: COLORS.text, fontWeight: '600' }}>Закрыть</Text>
          </WButton>
        </ScrollView>
      </View>
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
  </View>
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
        input.onchange = () => resolve((input.files && input.files[0]) || null);
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

