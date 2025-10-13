import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, ActivityIndicator,
  RefreshControl, Modal, TextInput, Platform, ScrollView, Alert
} from 'react-native';
import { supabase } from '../../src/lib/supabaseClient';
import {
  listAccountantInbox,
  type AccountantInboxRow,
  ensureMyProfile,
  getMyRole,
  accountantReturnToBuyer,
  // ⬇️ уведомления
  notifList,
  notifMarkRead,
} from '../../src/lib/rik_api';
import { uploadProposalAttachment, openAttachment } from '../../src/lib/files';
// звук + вибро (если доступны)
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

type Tab = 'К оплате' | 'Частично оплачено' | 'Оплачено' | 'На доработке (снабженец)';
const TABS: Tab[] = ['К оплате', 'Частично оплачено', 'Оплачено', 'На доработке (снабженец)'];

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
    if (typeof c === 'string') {
      return c.trim() ? <Text key={`t${i}`}>{c}</Text> : null;
    }
    return c;
  });
  return <View {...rest}>{kids}</View>;
}

// ---------- универсальная кнопка (web: гарантированный клик) ----------
function WButton({
  onPress, disabled, style, children,
}: { onPress: () => void; disabled?: boolean; style?: any; children: React.ReactNode; }) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ position: 'relative' }}>
        <Pressable
          // web: обработчик клика только на <button> ниже, иначе возможен двойной вызов
          onStartShouldSetResponder={() => false}
          accessibilityRole="button"
          disabled={disabled}
          hitSlop={8}
          style={[style, { position: 'relative', zIndex: 1, cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none' }]}
        >
          {children}
        </Pressable>
        <button
          type="button"
          disabled={!!disabled}
          onClick={disabled ? undefined : onPress}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: disabled ? 'not-allowed' : 'pointer', border: 0, background: 'transparent', zIndex: 2 }}
        />
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      onStartShouldSetResponder={() => true}
      onResponderRelease={onPress}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      style={style}
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

export default function AccountantScreen() {
  const [tab, setTab] = useState<Tab>('К оплате');
  const [rows, setRows] = useState<AccountantInboxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAccountant, setIsAccountant] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  // карточка
  const [current, setCurrent] = useState<AccountantInboxRow | null>(null);
  const [cardOpen, setCardOpen] = useState(false);

  // форма оплаты / возврата
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // ====== РОЛЬ ======
  const [role, setRole] = useState<string | null>(null);
  const canAct = isAccountant;

  // freeze обновлений списка, пока открыта карточка (фикс «прыжков»)
  const [freezeWhileOpen, setFreezeWhileOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await ensureMyProfile();
        const [roleStr, rpc] = await Promise.all([getMyRole(), supabase.rpc('is_accountant')]);
        setRole(roleStr ?? null);
        setIsAccountant(roleStr === 'accountant' || (rpc as any)?.data === true);
      } catch { setRole(null); setIsAccountant(false); }
      finally { setRoleLoading(false); }
    })();
  }, []);

  // запомним: RPC доступен/нет, чтобы не спамить 404
  const triedRpcOkRef = useRef<boolean>(true);

  // ====== загрузка ======
  const load = useCallback(async () => {
    if (freezeWhileOpen) return; // не дёргаем сеть, пока модалка открыта

    setLoading(true);
    try {
      let data: AccountantInboxRow[] = [];

      if (triedRpcOkRef.current) {
        try {
          const list = await listAccountantInbox(tab);
          if (Array.isArray(list) && list.length >= 0) data = list;
        } catch (e: any) {
          const msg = String(e?.message || e);
          if (msg.includes('Could not find') || msg.includes('/rpc/list_accountant_inbox') || msg.includes('404')) {
            triedRpcOkRef.current = false;
          }
        }
      }

    if (!Array.isArray(data) || data.length === 0) {
  const { data: props } = await supabase
    .from('proposals')
    .select('id, status, payment_status, invoice_number, invoice_date, invoice_amount, invoice_currency, supplier, sent_to_accountant_at')
.not('sent_to_accountant_at', 'is', null)
    // ⬇️ берём только то, что имеет отношение к бухгалтерии
    .or('payment_status.eq.К оплате,payment_status.eq.Оплачено,payment_status.ilike.Частично%,payment_status.ilike.На доработке%')
    .order('sent_to_accountant_at', { ascending: false, nullsFirst: false });

  let tmp: AccountantInboxRow[] = [];
  if (Array.isArray(props)) {
    const ids = props.map(p => String(p.id));
    let haveInvoice = new Set<string>();
    if (ids.length) {
      const q = await supabase
        .from('proposal_attachments')
        .select('proposal_id')
        .eq('group_key','invoice')
        .in('proposal_id', ids);
      if (!q.error && Array.isArray(q.data)) {
        haveInvoice = new Set(q.data.map(r => String(r.proposal_id)));
      }
    }
    tmp = (props as any[]).map((p: any) => ({
      proposal_id: String(p.id),
      supplier: p.supplier ?? null,
      invoice_number: p.invoice_number ?? null,
      invoice_date: p.invoice_date ?? null,
      invoice_amount: p.invoice_amount ?? null,
      invoice_currency: p.invoice_currency ?? 'KGS',
      payment_status: (p.payment_status ?? p.status ?? null) as string | null,
      total_paid: null,
      payments_count: null,
      has_invoice: haveInvoice.has(String(p.id)),
      sent_to_accountant_at: p.sent_to_accountant_at ?? null,
    }));
  }
  data = tmp;
}


      const filtered = (data || []).filter((r) => {
        const ps = String(r.payment_status ?? '').trim().toLowerCase();
        switch (tab) {
          case 'К оплате':                  return /^к оплате/.test(ps);
          case 'Частично оплачено':        return /^частично/.test(ps);
          case 'Оплачено':                 return /^оплачено/.test(ps);
          case 'На доработке (снабженец)': return /^на доработке/.test(ps);
          default: return true;
        }
      });

      if (!rowsShallowEqual(rows, filtered)) setRows(filtered);
    } finally { setLoading(false); }
  }, [tab, rows, freezeWhileOpen]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } }, [load]);

  // ====== 🔔 уведомления: список/звук/подписка ======
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const unread = notifs.length;

  const soundRef = useRef<Audio.Sound | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Пытаемся подключить звуковой файл ТОЛЬКО если он есть.
        // @ts-ignore
        const maybeSound = (() => { try { return require('../../assets/notify.mp3'); } catch { return null; } })();
        if (!maybeSound) return;

        const s = new Audio.Sound();
        await s.loadAsync(maybeSound);
        if (mounted) soundRef.current = s;
      } catch { /* без звука */ }
    })();

    return () => {
      mounted = false;
      try { soundRef.current?.unloadAsync(); } catch {}
    };
  }, []);

  const playDing = useCallback(async () => {
    try { await soundRef.current?.replayAsync(); } catch {}
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
  }, []);

  const loadNotifs = useCallback(async () => {
    try { const list = await notifList('accountant', 20); setNotifs(list); } catch {}
  }, []);
  const markAllRead = useCallback(async () => {
    try { await notifMarkRead('accountant'); setNotifs([]); } catch {}
    setBellOpen(false);
  }, []);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  // realtime-подписка
  useEffect(() => {
    const ch = supabase.channel('notif-accountant-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
        const n = payload?.new || {};
        if (n?.role !== 'accountant') return;
        setNotifs(prev => [n, ...prev].slice(0, 20));
        playDing();
        if (!freezeWhileOpen) load();
      })
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [playDing, load, freezeWhileOpen]);

  const openCard = useCallback((row: AccountantInboxRow) => {
    setCurrent(row);
    setCardOpen(true);
    setAmount(''); setMethod(''); setNote('');
    setFreezeWhileOpen(true);
  }, []);

  const closeCard = useCallback(() => {
    setCardOpen(false);
    setCurrent(null);
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
      if (method?.trim()) args.p_method = method.trim();
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
      // 1) основной адаптер (может сам дергать нужные RPC)
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

  // ====== UI ======
  const header = useMemo(() => (
    <SafeView style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, backgroundColor: COLORS.bg }}>
      <SafeView style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text }}>Бухгалтер</Text>

        {/* 🔔 Колокольчик справа */}
        <Pressable
          onPress={() => { setBellOpen(true); loadNotifs(); }}
          style={{
            marginLeft: 'auto',
            paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999,
            backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, position:'relative'
          }}>
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
            <Pressable key={t} onPress={() => setTab(t)}
              style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: active ? COLORS.primary : COLORS.tabInactiveBg }}>
              <Text style={{ color: active ? '#fff' : COLORS.tabInactiveText, fontWeight: '600' }}>{t}</Text>
            </Pressable>
          );
        })}
        {!isAccountant && !roleLoading && (
          <View style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FEF3C7', borderRadius: 999, marginLeft: 'auto' }}>
            <Text style={{ color: '#92400E', fontWeight: '600' }}>Нет прав бухгалтера — действия отключены</Text>
          </View>
        )}
      </SafeView>
    </SafeView>
  ), [tab, isAccountant, roleLoading, unread, loadNotifs]);

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

  const canOpenInvoice = !!current?.has_invoice || !!current?.invoice_number;
  const canOpenPayments = (current?.payments_count ?? 0) > 0;
  const currentDisplayStatus = useMemo(() => (current?.payment_status ?? 'К оплате'), [current]);

  const EmptyState = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 40, marginBottom: 8 }}>📄</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 }}>Здесь пока пусто</Text>
      <Text style={{ color: COLORS.sub, textAlign: 'center' }}>Выберите другую вкладку или дождитесь предложений от снабженца.</Text>
    </View>
  );

  return (
    <SafeView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {header}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>
      ) : rows.length === 0 ? <EmptyState /> : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.proposal_id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          removeClippedSubviews={Platform.OS === 'web' ? false : true}
        />
      )}

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

            {/* ===== Документы ===== */}
            <Text style={{ fontWeight: '600', marginBottom: 6, color: COLORS.text }}>Документы</Text>
            <SafeView style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* ОТКРЫТЬ СЧЁТ */}
              <View pointerEvents={canOpenInvoice ? 'auto' : 'none'} style={{ alignSelf: 'flex-start' }}>
                <WButton
                  onPress={() => {
                    if (!current?.proposal_id) return;
                    Promise.resolve(openAttachment(String(current.proposal_id), 'invoice'))
                      .catch((e: any) => { safeAlert('Счёт', e?.message ?? 'Счёт не прикреплён'); console.error('[open invoice]', e); });
                  }}
                  disabled={!canOpenInvoice}
                  style={{ padding: 10, backgroundColor: canOpenInvoice ? '#EEE' : '#E5E7EB', borderRadius: 10 }}
                >
                  <Text style={{ color: canOpenInvoice ? '#111' : '#9CA3AF', fontWeight: '600' }}>Открыть счёт</Text>
                </WButton>
              </View>

              {/* ПЛАТЁЖНЫЕ ДОКУМЕНТЫ */}
              <View pointerEvents={canOpenPayments ? 'auto' : 'none'} style={{ alignSelf: 'flex-start' }}>
                <WButton
                  onPress={() => {
                    if (!current?.proposal_id) return;
                    Promise.resolve(openAttachment(String(current.proposal_id), 'payment', { all: true }))
                      .catch((e: any) => { safeAlert('Документы', e?.message ?? 'Платёжные документы не найдены'); console.error('[open payment]', e); });
                  }}
                  disabled={!canOpenPayments}
                  style={{ padding: 10, backgroundColor: canOpenPayments ? '#EEE' : '#E5E7EB', borderRadius: 10 }}
                >
                  <Text style={{ color: canOpenPayments ? '#111' : '#9CA3AF', fontWeight: '600' }}>Платёжные документы</Text>
                </WButton>
              </View>
            </SafeView>

            <View style={{ height: 16 }} />

            <Text style={{ fontWeight: '600', marginBottom: 6, color: COLORS.text }}>Добавить оплату</Text>
            <View style={{ position: 'relative', zIndex: 5 }}>
              <TextInput placeholder="Сумма (KGS)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount}
                style={{ borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 8 }} />
              <TextInput placeholder="Способ (банк/нал)" value={method} onChangeText={setMethod}
                style={{ borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 8 }} />
              <TextInput placeholder="Комментарий" value={note} onChangeText={setNote}
                style={{ borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 8 }} />

              <WButton
                onPress={addPayment}
                disabled={!canAct}
                style={{ padding: 12, borderRadius: 10, backgroundColor: canAct ? '#10B981' : '#94a3b8' }}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Сохранить оплату</Text>
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

      {/* 🔔 Модалка списка уведомлений */}
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
