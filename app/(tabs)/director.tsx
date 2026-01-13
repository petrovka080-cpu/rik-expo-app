// app/(tabs)/director.tsx — единый блок «Ожидает утверждения (прораб)», БЕЗ нижнего блока «шапок»
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, Alert, ActivityIndicator,
  RefreshControl, Platform, StyleSheet, TextInput, Animated
} from 'react-native';
import * as XLSX from 'xlsx';
import {
  listDirectorProposalsPending, proposalItems,
  listDirectorInbox as fetchDirectorInbox, type DirectorInboxRow,
  RIK_API,
  exportRequestPdf,
  directorReturnToBuyer,
} from '../../src/lib/catalog_api';
import { supabase, ensureSignedIn } from '../../src/lib/supabaseClient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

type Tab = 'foreman' | 'buyer';

type PendingRow = {
  id: number;
  request_id: number | string;
  request_item_id: string | null;
  name_human: string;
  qty: number;
  uom?: string | null;
  rik_code?: string | null;
  app_code?: string | null;
  item_kind?: string | null; // material | work | service
  note?: string | null;
};
type Group = { request_id: number | string; items: PendingRow[] };

type ProposalHead = { id: string; submitted_at?: string | null; pretty?: string | null };
type ProposalItem = {
  id: number;
  request_item_id: string | null;   // ✅ ДОБАВИЛИ
  rik_code: string | null;
  name_human: string;
  uom: string | null;
  app_code: string | null;
  total_qty: number;
  price?: number | null;
  item_kind?: string | null;
};

const toFilterId = (v: number | string | null | undefined) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return /^\d+$/.test(s) ? Number(s) : s;
};
const shortId = (rid: number | string | null | undefined) => {
  const s = String(rid ?? '');
  if (!s || s.toLowerCase() === 'nan') return '—';
  return /^\d+$/.test(s) ? s : s.slice(0, 8);
};

const UI = {
  bg: '#F8FAFC',
  text: '#0F172A',
  sub: '#475569',
  border: '#E2E8F0',
  tabActiveBg: '#0F172A',
  tabInactiveBg: '#E5E7EB',
  tabActiveText: '#FFFFFF',
  tabInactiveText: '#111827',
  btnApprove: '#16A34A',
  btnReject:  '#DC2626',
  btnNeutral: '#6B7280',
  cardBg: '#FFFFFF',
};

export default function DirectorScreen() {
  const [tab, setTab] = useState<Tab>('foreman');
  // ===== Collapsing header (как у прораба) =====
  const HEADER_MAX = 210;
  const HEADER_MIN = 76;
  const HEADER_SCROLL = HEADER_MAX - HEADER_MIN;

  const scrollY = useRef(new Animated.Value(0)).current;
  const clampedY = Animated.diffClamp(scrollY, 0, HEADER_SCROLL);

  const headerHeight = clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL],
    outputRange: [HEADER_MAX, HEADER_MIN],
    extrapolate: 'clamp',
  });

  const titleSize = clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL],
    outputRange: [24, 16],
    extrapolate: 'clamp',
  });

  const subOpacity = clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerShadow = clampedY.interpolate({
    inputRange: [0, 10],
    outputRange: [0, 0.12],
    extrapolate: 'clamp',
  });

  // ===== ПРОРАБ =====
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingAll, setActingAll] = useState<number | string | null>(null);
 
// ✅ accordion по заявкам прораба
const [expandedReq, setExpandedReq] = useState<string | null>(null);

// ✅ toggle accordion (должен быть тут, а не внутри toggleExpand)
const toggleReq = useCallback((rid: number | string) => {
  const key = String(rid);
  setExpandedReq(prev => (prev === key ? null : key));
}, []);
  // анти-мигание
  const didInit = useRef(false);
  const fetchTicket = useRef(0);
  const lastNonEmptyRows = useRef<PendingRow[]>([]);

  // ===== (оставил загрузку «шапок», но НЕ рендерю) =====
  const [directorReqs, setDirectorReqs] = useState<Array<{ request_id: string; items_count: number; submitted_at: string | null; doc_no?: string | null }>>([]);
  const [loadingDirReqs, setLoadingDirReqs] = useState(false);

  // ===== СНАБЖЕНЕЦ =====
  const [propsHeads, setPropsHeads] = useState<ProposalHead[]>([]);
const [buyerPropsCount, setBuyerPropsCount] = useState<number>(0);
const [buyerPositionsCount, setBuyerPositionsCount] = useState<number>(0);

  const [loadingProps, setLoadingProps] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsByProp, setItemsByProp] = useState<Record<string, ProposalItem[]>>({});
  const [loadedByProp, setLoadedByProp] = useState<Record<string, boolean>>({});
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [pdfHtmlByProp, setPdfHtmlByProp] = useState<Record<string, string>>({});
const [pdfBusyKey, setPdfBusyKey] = useState<string | null>(null);

  // ===== КЭШ НОМЕРОВ ЗАЯВОК =====
  const [displayNoByReq, setDisplayNoByReq] = useState<Record<string, string>>({});
  const labelForRequest = useCallback((rid: number | string | null | undefined, fallbackDocNo?: string | null) => {
    const key = String(rid ?? '');
    if (fallbackDocNo && fallbackDocNo.trim()) return fallbackDocNo.trim();
    const d = displayNoByReq[key];
    if (d && d.trim()) return d.trim();
    return `#${shortId(rid)}`;
  }, [displayNoByReq]);

  const preloadDisplayNos = useCallback(async (reqIds: Array<number | string>) => {
    const needed = Array.from(new Set(reqIds.map(x => String(x ?? '').trim()).filter(Boolean).filter(id => displayNoByReq[id] == null)));
    if (!needed.length) return;
    try {
      const { data, error } = await supabase.from('v_requests_display').select('id, display_no').in('id', needed);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of (data ?? [])) {
        if (!r) continue;
        const id = String((r as any).id ?? '').trim();
        const dn = String((r as any).display_no ?? '').trim();
        if (id && dn) map[id] = dn;
      }
      if (Object.keys(map).length) setDisplayNoByReq(prev => ({ ...prev, ...map }));
    } catch (e) {
      console.warn('[director] preloadDisplayNos]:', (e as any)?.message ?? e);
    }
  }, [displayNoByReq]);

  /* ---------- loaders ---------- */
  const fetchRows = useCallback(async () => {
    const my = ++fetchTicket.current;
    setLoadingRows(true);
    try {
      const { data, error } = await supabase.rpc('list_director_items_stable');
      if (error) throw error;

      const normalized: PendingRow[] = (data ?? []).map((r: any, idx: number) => ({
        id: idx,
        request_id: r.request_id,
        request_item_id: r.request_item_id != null ? String(r.request_item_id) : null,
        name_human: r.name_human ?? '',
        qty: Number(r.qty ?? 0),
        uom: r.uom ?? null,
        rik_code: r.rik_code ?? null,
        app_code: r.app_code ?? null,
       item_kind: r.item_kind ?? null,
        note: r.note ?? null,
      }));

      if (normalized.length === 0 && lastNonEmptyRows.current.length > 0) return;
      lastNonEmptyRows.current = normalized;
      if (my === fetchTicket.current) setRows(normalized);

      const ids = Array.from(new Set(normalized.map(r => String(r.request_id ?? '').trim()).filter(Boolean)));
      if (ids.length) await preloadDisplayNos(ids);
    } catch (e) {
      console.error('[director] list_director_items_stable]:', (e as any)?.message ?? e);
    } finally {
      if (my === fetchTicket.current) setLoadingRows(false);
    }
  }, [preloadDisplayNos]);

  const fetchDirectorReqs = useCallback(async () => {
    setLoadingDirReqs(true);
    try {
      const inbox = typeof fetchDirectorInbox === 'function'
        ? await fetchDirectorInbox('На утверждении')
        : await (RIK_API?.listDirectorInbox?.('На утверждении') ?? []);
      const reqRows = (inbox || []).filter(r => r.kind === 'request') as DirectorInboxRow[];

      const mapped = reqRows.map(r => ({
        request_id: String(r.request_id ?? ''),
        items_count: Number(r.items_count ?? 0),
        submitted_at: (r.submitted_at ?? null) as (string | null),
        doc_no: (r as any).doc_no ?? null,
      }));
      setDirectorReqs(mapped);

      const idsToPreload = mapped.filter(r => !r.doc_no).map(r => r.request_id).filter(Boolean);
      if (idsToPreload.length) await preloadDisplayNos(idsToPreload);
    } catch (e) {
      console.warn('[director] listDirectorInbox]:', (e as any)?.message ?? e);
      setDirectorReqs([]);
    } finally {
      setLoadingDirReqs(false);
    }
  }, [preloadDisplayNos]);

  const fetchProps = useCallback(async () => {
    setLoadingProps(true);
    try {
      // 1) как и раньше: список «На утверждении»
      const list = await listDirectorProposalsPending();
      const heads: ProposalHead[] = (list ?? [])
        .filter((x: any) => x && x.id != null && x.submitted_at != null)
        .map((x: any) => ({ id: String(x.id), submitted_at: x.submitted_at, pretty: null }));

      if (!heads.length) { setPropsHeads([]); return; }

      const ids = heads.map(h => h.id);

      // 2) подтягиваем красивые номера И границу «миграции» (не отправлено в бухгалтерию)
      const { data, error } = await supabase
        .from('proposals')
        .select('id, proposal_no, id_short, sent_to_accountant_at')
        .in('id', ids);

      if (error || !Array.isArray(data)) { setPropsHeads(heads); return; }

      // только те, что ЕЩЁ НЕ отправлены в бухгалтерию
      const okIds = new Set<string>(
        data.filter(r => !r?.sent_to_accountant_at).map(r => String(r.id))
      );

      const prettyMap: Record<string, string> = {};
for (const r of data) {
  const id = String((r as any).id);
  const pn = String((r as any).proposal_no ?? '').trim();   // ✅ PR-0024/2026
  const short = (r as any).id_short;                        // ✅ 178
  const pretty = pn || (short != null ? `PR-${String(short)}` : '');
  if (id && pretty) prettyMap[id] = pretty;
}

      let filtered = heads
  .filter(h => okIds.has(h.id))
  .map(h => ({ ...h, pretty: prettyMap[h.id] ?? h.pretty ?? null }));

// ✅ выкидываем предложения без строк (иначе “Состав пуст” будет мусором)
try {
  const propIds = filtered.map(h => h.id);
  if (propIds.length) {
    const q = await supabase
      .from('proposal_items')
      .select('proposal_id')
      .in('proposal_id', propIds);

    const nonEmpty = new Set((q.data || []).map((r: any) => String(r.proposal_id)));
    filtered = filtered.filter(h => nonEmpty.has(String(h.id)));
  }
} catch {}

setPropsHeads(filtered);

// KPI: кол-во предложений
setBuyerPropsCount(filtered.length);

// KPI: кол-во позиций по всем предложениям (быстро одним запросом)
try {
  const propIds = filtered.map(h => h.id);
  if (propIds.length) {
    const q = await supabase
      .from('proposal_items_view')
      .select('proposal_id')
      .in('proposal_id', propIds);

    setBuyerPositionsCount(!q.error && Array.isArray(q.data) ? q.data.length : 0);
  } else {
    setBuyerPositionsCount(0);
  }
} catch {
  setBuyerPositionsCount(0);
}

    } catch (e) {
      console.error('[director] proposals list]:', (e as any)?.message ?? e);
      setPropsHeads([]);
    } finally {
      setLoadingProps(false);
    }
  }, []);

  /* ---------- effects ---------- */
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    (async () => {
      try {
        await ensureSignedIn();
        await fetchRows();
        await fetchDirectorReqs();
        await fetchProps();
      } catch (e) {
        console.warn('[Director] ensureSignedIn]:', (e as any)?.message || e);
      }
    })();
  }, [fetchRows, fetchDirectorReqs, fetchProps]);

  useEffect(() => {
    const ch = supabase.channel('notif-director-rt')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: "role=eq.director"
      }, (payload: any) => {
        const n = payload?.new || {};
        Alert.alert(n.title || 'Уведомление', n.body || '');
        try { fetchDirectorInbox && fetchDirectorInbox(); } catch {}
      })
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, []);
    // Экспорт заявки в настоящий XLSX (без предупреждения Excel)
const exportRequestExcel = useCallback((g: Group) => {
  const rows = g.items;
  if (!rows.length) {
    Alert.alert('Экспорт', 'Нет позиций для выгрузки.');
    return;
  }

  const safe = (v: any) =>
    v === null || v === undefined ? '' : String(v).replace(/[\r\n]+/g, ' ').trim();

  const title = labelForRequest(g.request_id);
  const sheetName =
    title.replace(/[^\wА-Яа-я0-9]/g, '_').slice(0, 31) || 'Заявка';

  // Данные для Excel: первая строка — заголовки
  const data: any[][] = [];
  data.push(['№', 'Наименование', 'Кол-во', 'Ед. изм.', 'Применение', 'Примечание']);

  rows.forEach((it, idx) => {
    data.push([
      idx + 1,
      safe(it.name_human),
      safe(it.qty),
      safe(it.uom),
      safe(it.app_code),
      safe(it.note),
    ]);
  });

  try {
    // 1) создаём книгу и лист
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // чуть-чуть красоты: ширина колонок
    ws['!cols'] = [
      { wch: 4 },   // №
      { wch: 40 },  // Наименование
      { wch: 10 },  // Кол-во
      { wch: 10 },  // Ед. изм.
      { wch: 18 },  // Применение
      { wch: 60 },  // Примечание
    ];

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // 2) превращаем в бинарный массив
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    if (Platform.OS === 'web') {
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `request-${title}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      Alert.alert(
        'Экспорт',
        'XLSX экспорт сейчас реализован только для Web-версии.',
      );
    }
  } catch (e: any) {
    console.error('[exportRequestExcel]', e?.message ?? e);
    Alert.alert('Ошибка', e?.message ?? 'Не удалось сформировать Excel-файл');
  }
}, [labelForRequest]);

async function openPdfPreviewOrFallbackShare(uri: string) {
  if (Platform.OS === 'web') {
    const win = window.open(uri, '_blank', 'noopener,noreferrer');
    if (!win) Alert.alert('PDF', 'Разреши всплывающие окна.');
    return;
  }

  try {
    // ✅ у тебя exportRequestPdf/exportProposalPdf уже возвращают file://
    await Print.printAsync({ uri });

    Alert.alert('PDF', 'Поделиться файлом?', [
      { text: 'Нет', style: 'cancel' },
      {
        text: 'Поделиться',
        onPress: async () => {
          const ok = await Sharing.isAvailableAsync();
          if (ok) await Sharing.shareAsync(uri);
          else Alert.alert('PDF', 'Шаринг недоступен на этом устройстве.');
        },
      },
    ]);
  } catch (e: any) {
    const msg = String(e?.message ?? e ?? '').toLowerCase();
    if (msg.includes('printing did not complete')) return;
    Alert.alert('PDF', e?.message ?? 'Не удалось открыть PDF');
  }
}
  /* ---------- PDF заявки (прораб) с безопасным window.open ---------- */
   const openRequestPdf = useCallback(async (g: any) => {
  const rid = String(g?.request_id ?? '');
  const key = `req:${rid}`;

  try {
    setPdfBusyKey(key);

    if (!rid) throw new Error('request_id пустой');
    const uri = await exportRequestPdf(rid, 'preview');

    if (!uri) {
      Alert.alert('PDF', 'Не удалось сформировать PDF-документ');
      return;
    }

    await openPdfPreviewOrFallbackShare(uri);
  } catch (e: any) {
    Alert.alert('Ошибка', e?.message ?? 'PDF не сформирован');
  } finally {
    setPdfBusyKey((prev) => (prev === key ? null : prev));
  }
}, []);


    // Найти связанную закупку по proposal_id (для дальнейшего purchase_approve)
  const findPurchaseIdByProposal = useCallback(async (proposalId: string): Promise<string | null> => {
    // 1) прямая связка через view
    const q = await supabase
      .from('v_purchases')
      .select('id, proposal_id')
      .eq('proposal_id', proposalId)
      .limit(1)
      .maybeSingle();

    if (!q.error && q.data?.id) return String(q.data.id);

    // 2) fallback: просим сервер создать связь и вернуть id
    const r = await supabase.rpc('purchase_upsert_from_proposal', { p_proposal_id: String(proposalId) });
    if (!(r as any).error && (r as any).data) return String((r as any).data);

    return null;
  }, []);

  /* ---------- groups ---------- */
    const groups: Group[] = useMemo(() => {
    const map = new Map<number | string, PendingRow[]>();
    for (const r of rows) {
      const k = String(r.request_id ?? '');
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    let list = Array.from(map.entries()).map(([request_id, items]) => ({ request_id, items }));

    
    return list;
  }, [rows, labelForRequest]);


  const foremanRequestsCount = groups.length; // кол-во заявок
  const foremanPositionsCount = rows.length;  // кол-во позиций

  // (оставляем уникализацию «шапок» для совместимости, но НЕ используем в рендере)
  const directorReqsUnique = useMemo(() => {
    const seen = new Set<string>();
    return directorReqs.filter(r => {
      if (!r.request_id || seen.has(r.request_id)) return false;
      seen.add(r.request_id);
      return true;
    });
  }, [directorReqs]);

 /* ===== Вспомогательная карточка предложения (СНАБЖЕНЕЦ) ===== */
const ProposalRow = React.memo(({ p }: { p: ProposalHead }) => {
  const pidStr = String(p.id);
const pretty = String(p.pretty ?? '').trim(); // ✅ единственный источник, без морганий
  const isOpen = expanded === p.id;
  const key = pidStr;
  const items = itemsByProp[key] || [];
const totalSum = useMemo(() => {
  return (items || []).reduce((acc, it) => {
    const p = Number((it as any).price ?? 0);
    const q = Number((it as any).total_qty ?? 0);
    return acc + p * q;
  }, 0);
}, [items]);

  const loaded = !!loadedByProp[key];

const pdfKey = `prop:${pidStr}`;
const busyPdf = pdfBusyKey === pdfKey;


  return (
    <View style={[s.card, { borderStyle: 'dashed' }]}>
      {/* HEADER */}
      <View style={s.propHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.groupTitle} numberOfLines={2}>
  {pretty
    ? (pretty.toLowerCase().startsWith('предложение') ? pretty : `Предложение ${pretty}`)
    : `Предложение #${pidStr.slice(0, 8)}`}
</Text>

          <Text style={s.cardMeta}>
            Отправлено: {p.submitted_at ? new Date(p.submitted_at).toLocaleString() : '—'}
          </Text>
        </View>

        <Pressable onPress={() => toggleExpand(pidStr)} style={s.openBtn}>
          <Text style={s.openBtnText}>{isOpen ? 'Свернуть' : 'Открыть'}</Text>
        </Pressable>
      </View>

{isOpen ? (
  <>
    <View style={{ marginTop: 8 }}>
      {!loaded ? (
        <Text style={{ opacity: 0.7, color: UI.sub }}>Загружаю состав…</Text>
      ) : items.length === 0 ? (
        <Text style={{ opacity: 0.6, color: UI.sub }}>Состав пуст</Text>
      ) : (
        <>
          <View>
            {items.map((it, idx) => (
              <View key={`pi:${key}:${it.id}:${idx}`} style={s.mobCard}>
                <View style={s.mobMain}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={s.mobTitle} numberOfLines={3}>{it.name_human}</Text>

                    {it.item_kind ? (
                      <View style={s.kindPill}>
                        <Text style={s.kindPillText}>
                          {it.item_kind === 'material' ? 'Материал'
                            : it.item_kind === 'work' ? 'Работа'
                            : it.item_kind === 'service' ? 'Услуга'
                            : it.item_kind}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={s.mobMeta}>
                    {`${it.total_qty} ${it.uom || ''}`.trim()}
                    {it.price != null ? ` · цена ${it.price}` : ''}
                    {it.price != null ? ` · сумма ${Math.round(it.price * (it.total_qty || 0))}` : ''}
                    {it.app_code ? ` · ${it.app_code}` : ''}
                  </Text>
                </View>

                <Pressable
                  onPress={async () => {
                    try {
                      if (!it.request_item_id) {
                        Alert.alert('Ошибка', 'request_item_id пустой (не можем отклонить)');
                        return;
                      }
                      setDecidingId(pidStr);

                      const payload = [{
                        request_item_id: it.request_item_id,
                        decision: 'rejected',
                        comment: 'Отклонено директором',
                      }];

                      const { error } = await supabase.rpc('director_decide_proposal_items', {
                        p_proposal_id: pidStr,
                        p_decisions: payload,
                        p_finalize: false,
                      });
                      if (error) throw error;
                      
const beforeCount = (itemsByProp[pidStr] || items || []).length; // items у тебя уже есть выше
const isLast = beforeCount <= 1;

// 1) локально удаляем строку из UI
setItemsByProp(prev => {
  const before = prev[pidStr] || [];
  const nextItems = before.filter(x => String(x.request_item_id) !== String(it.request_item_id));
  return { ...prev, [pidStr]: nextItems };
});

// 2) если это была последняя — ВОЗВРАЩАЕМ ПРЕДЛОЖЕНИЕ (НЕ оставляем мусор)
if (isLast) {
  try {
    await directorReturnToBuyer({
      proposalId: pidStr,
      comment: 'Все позиции отклонены директором',
    });
  } catch (e2: any) {
    // если RPC не прошёл — всё равно хотя бы уберём карточку локально
    console.warn('[director] auto-return on last item failed:', e2?.message ?? e2);
  }

  // 3) убираем карточку из списка и чистим кэши
 setExpanded(cur => (cur === pidStr ? null : cur));
setItemsByProp(m => {
  const copy = { ...m };
  delete copy[pidStr];
  return copy;
});
setLoadedByProp(m => {
  const copy = { ...m };
  delete copy[pidStr];
  return copy;
});
setPdfHtmlByProp(m => {
  const copy = { ...m };
  delete copy[pidStr];
  return copy;
});

await fetchProps(); // ✅ перечитать список (он уже отфильтрует пустые)

}

                    } catch (e: any) {
                      Alert.alert('Ошибка', e?.message ?? 'Не удалось отклонить позицию');
                    } finally {
                      setDecidingId(null);
                    }
                  }}
                  disabled={decidingId === pidStr}
                  style={[s.mobRejectBtn, { opacity: decidingId === pidStr ? 0.6 : 1 }]}
                >
                  <Text style={s.mobRejectIcon}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>

          {/* ✅ НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ (как у прораба) */}
          <View style={s.reqActionsBottom}>
            <Pressable
              disabled={busyPdf}
              onPress={async () => {
                try {
                  setPdfBusyKey(pdfKey);

                  if (Platform.OS === 'web') {
                    const w = window.open('about:blank', '_blank');
                    try {
                      const { buildProposalPdfHtml } = await import('../../src/lib/rik_api');
                      const htmlDoc = await buildProposalPdfHtml(pidStr as any);
                      if (w) {
                        try { w.document.open(); w.document.write(htmlDoc); w.document.close(); w.focus(); }
                        catch {
                          const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          w.location.href = url;
                        }
                      }
                    } catch (e) {
                      try { if (w) w.close(); } catch {}
                      Alert.alert('Ошибка', (e as any)?.message ?? 'PDF не сформирован');
                    }
                    return;
                  }

                  const { exportProposalPdf } = await import('../../src/lib/rik_api');
                  const uri = await exportProposalPdf(pidStr as any, 'preview');
                  if (uri) await openPdfPreviewOrFallbackShare(uri);
                } catch (e: any) {
                  Alert.alert('Ошибка', e?.message ?? 'PDF не сформирован');
                } finally {
                  setPdfBusyKey((prev) => (prev === pdfKey ? null : prev));
                }
              }}
              style={[s.actionBtn, { backgroundColor: UI.btnNeutral, opacity: busyPdf ? 0.6 : 1 }]}
            >
              <Text style={s.actionText}>{busyPdf ? 'PDF…' : 'PDF'}</Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                try {
                  if (!loaded) { Alert.alert('Excel', 'Сначала открой предложение и дождись загрузки строк.'); return; }
                  if (!items.length) { Alert.alert('Excel', 'Нет строк для выгрузки.'); return; }
                  if (Platform.OS !== 'web') { Alert.alert('Excel', 'Excel экспорт сейчас реализован только для Web-версии.'); return; }

                  const safe = (v: any) => v == null ? '' : String(v).replace(/[\r\n]+/g, ' ').trim();
                  const title = (pretty || `PROPOSAL-${pidStr.slice(0, 8)}`).replace(/[^\wА-Яа-я0-9]/g, '_');
                  const sheetName = title.slice(0, 31) || 'Предложение';

                  const data: any[][] = [['№', 'Наименование', 'Кол-во', 'Ед. изм.', 'Применение']];
                  items.forEach((it, idx) => data.push([idx + 1, safe(it.name_human), safe(it.total_qty), safe(it.uom), safe(it.app_code)]));

                  const wb = XLSX.utils.book_new();
                  const ws = XLSX.utils.aoa_to_sheet(data);
                  XLSX.utils.book_append_sheet(wb, ws, sheetName);

                  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${sheetName}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (e: any) {
                  Alert.alert('Ошибка', e?.message ?? 'Не удалось сформировать Excel');
                }
              }}
              style={[s.actionBtn, { backgroundColor: UI.btnNeutral }]}
            >
              <Text style={s.actionText}>Excel</Text>
            </Pressable>

            <Pressable
  hitSlop={12}
  style={[s.iconBtnDanger, { zIndex: 20 }]}
  onPress={() => {
    console.log('[director] buyer return clicked', pidStr);
    onDirectorReturn(pidStr);
  }}
>
  <Ionicons name="close" size={20} color="#fff" />
</Pressable>
              
           <Pressable
  hitSlop={10}
  disabled={decidingId === pidStr}
  style={[s.iconBtnApprove, { backgroundColor: (decidingId === pidStr) ? '#9CA3AF' : UI.btnApprove }]}
  onPress={async () => {
    try {
      setDecidingId(pidStr);

      const { error } = await supabase.rpc('director_approve_min_auto', {
        p_proposal_id: pidStr,
        p_comment: null,
      });
      if (error) throw error;

      const rInc = await supabase.rpc('ensure_purchase_and_incoming_from_proposal', {
        p_proposal_id: pidStr,
      });
      if ((rInc as any)?.error) throw (rInc as any).error;

      const { error: accErr } = await supabase.rpc('proposal_send_to_accountant_min', {
        p_proposal_id: pidStr,
        p_invoice_number: null,
        p_invoice_date: null,
        p_invoice_amount: null,
        p_invoice_currency: 'KGS',
      });
      if (accErr) throw accErr;

      
      await fetchProps();
      Alert.alert('Готово', 'Утверждено → бухгалтер → склад');
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось утвердить');
    } finally {
      setDecidingId(null);
    }
  }}
>
                <Ionicons name="send" size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
            <Text style={{ fontWeight: '900', color: UI.text, fontSize: 16 }}>
              ИТОГО: {Math.round(totalSum)}
            </Text>
          </View>
        </>
      )}
    </View>
  </>
) : null}

    </View>
  );
});


  /* ---------- toggleExpand: грузим состав и HTML (web) ---------- */
  const toggleExpand = useCallback(async (pid: string) => {
    const next = expanded === pid ? null : pid;
    setExpanded(next);

    const key = String(pid);
    if (next === pid && !loadedByProp[key]) {
      try {
        // 1) сначала пробуем snapshot
        let rows: any[] | null = null;

        const qSnap = await supabase
          .from('proposal_snapshot_items')
          .select('id, request_item_id, rik_code, name_human, uom, app_code, total_qty')
          .eq('proposal_id', key)
          .order('id', { ascending: true });

        if (!qSnap.error && Array.isArray(qSnap.data)) {
          rows = qSnap.data;
        }

        // 2) если снапшота нет — обычные proposal_items (view)
        if (!rows) {
          const qItems = await supabase
            .from('proposal_items_view')
            .select('id, request_item_id, rik_code, name_human, uom, app_code, total_qty')
            .eq('proposal_id', key)
            .order('id', { ascending: true });

        if (!qItems.error && Array.isArray(qItems.data)) {
            rows = qItems.data;
          }
        }

        // ✅ берём proposal_items, потому что тут есть price
{
  const qPlain = await supabase
    .from('proposal_items')
    .select('id, request_item_id, rik_code, name_human, uom, app_code, qty, price')
    .eq('proposal_id', key)
    .order('id', { ascending: true });

  if (!qPlain.error && Array.isArray(qPlain.data)) {
    rows = qPlain.data.map((r: any) => ({ ...r, total_qty: r.qty }));
  }
}
        let norm = (rows ?? []).map((r: any, i: number) => ({
  id: Number(r.id ?? i),
  request_item_id: r.request_item_id != null ? String(r.request_item_id) : null,
  rik_code: r.rik_code ?? null,
  name_human: r.name_human ?? '',
  uom: r.uom ?? null,
  app_code: r.app_code ?? null,
  total_qty: Number(r.total_qty ?? r.qty ?? 0),
  price: r.price != null ? Number(r.price) : null,
  item_kind: null as any,
}));

// ✅ подтягиваем item_kind из request_items
try {
  const ids = Array.from(new Set(
    norm.map(x => String(x.request_item_id ?? '')).filter(Boolean)
  ));
  if (ids.length) {
    const qKinds = await supabase
      .from('request_items')
      .select('id, item_kind')
      .in('id', ids);

    if (!qKinds.error && Array.isArray(qKinds.data)) {
      const mapKind: Record<string, string> = {};
      for (const rr of qKinds.data as any[]) {
        const id = String(rr.id ?? '');
        const k = String(rr.item_kind ?? '').trim();
        if (id && k) mapKind[id] = k;
      }
      norm = norm.map(x => ({
        ...x,
        item_kind: x.request_item_id ? (mapKind[String(x.request_item_id)] ?? null) : null,
      }));
    }
  }
} catch {}

setItemsByProp(prev => ({ ...prev, [key]: norm }));

      } catch (e) {
        Alert.alert('Ошибка', (e as any)?.message ?? 'Не удалось загрузить строки предложения');
        setItemsByProp(prev => ({ ...prev, [key]: [] }));
      } finally {
        setLoadedByProp(prev => ({ ...prev, [key]: true }));
      }
    }

    if (Platform.OS === 'web' && !pdfHtmlByProp[key]) {
      try {
        const { buildProposalPdfHtml } = await import('../../src/lib/rik_api');
        const html = await buildProposalPdfHtml(key as any);
        setPdfHtmlByProp(prev => ({ ...prev, [key]: html }));
      } catch {}
    }
  }, [expanded, loadedByProp, pdfHtmlByProp]);

  /* ---------- решения директора по предложению ---------- */
  const decide = useCallback(async (pid: string, decision: 'approved' | 'rejected') => {
    try {
      setDecidingId(pid);

      if (decision === 'approved') {
        // 1) штатное утверждение
        const { data: ok, error } = await supabase.rpc('approve_one', { p_proposal_id: String(pid) });
        if (error) throw error;
 else if (!ok) {
          Alert.alert('Внимание', 'Нечего утверждать или неправильный статус/id');
        }

        // 2) гарантируем наличие закупки и проталкиваем на склад
        try {
          const r1 = await supabase.rpc('purchase_upsert_from_proposal', { p_proposal_id: String(pid) });
          if ((r1 as any).error) throw (r1 as any).error;

          let purchaseId: string | null = null;
          if ((r1 as any)?.data) {
            purchaseId = String((r1 as any).data);
          } else {
            const q = await supabase
              .from('v_purchases')
              .select('id')
              .eq('proposal_id', pid)
              .limit(1)
              .maybeSingle();
            if (!q.error && q.data?.id) purchaseId = String(q.data.id);
          }

          if (purchaseId) {
            const { error: apprErr } = await supabase.rpc('purchase_approve', { p_purchase_id: purchaseId });
            if (apprErr) console.warn('[purchase_approve] rpc error:', apprErr.message);
          } else {
            console.warn('[purchase] not found for proposal', pid);
          }
        } catch (e) {
          console.warn('[purchase migrate] fail:', (e as any)?.message ?? e);
        }
      } else {
      const { error } = await supabase.rpc('reject_one', { p_proposal_id: String(pid) });
      if (error) throw error;
    }

    await fetchProps();
    Alert.alert(
      decision === 'approved' ? 'Утверждено' : 'Отклонено',
      `Предложение #${String(pid).slice(0, 8)} ${decision === 'approved' ? 'утверждено' : 'отклонено'}`
    );
  } catch (e: any) {
    Alert.alert('Ошибка', e?.message ?? 'Не удалось применить решение');
  } finally {
    setDecidingId(null);
  }
}, [fetchProps]);

  async function onDirectorReturn(proposalId: string | number, note?: string) {
  try {
    const pid = String(proposalId);

    // 0) если уже у бухгалтерии — не даём вернуть
    const chk = await supabase
      .from('proposals')
      .select('sent_to_accountant_at')
      .eq('id', pid)
      .maybeSingle();

    if (!chk.error && chk.data?.sent_to_accountant_at) {
      Alert.alert(
        'Нельзя вернуть',
        'Документ уже у бухгалтерии. Вернуть может только бухгалтер (через «На доработке (снабженец)»).'
      );
      return;
    }

    setDecidingId(pid);

    // ✅ ВАЖНО: зовём ОДНУ стабильную функцию (она внутри вызывает правильный RPC)
    await directorReturnToBuyer({ proposalId: pid, comment: (note || '').trim() || undefined });

    // ✅ чтобы карточка не оставалась пустой “Состав пуст”
    setExpanded((prev) => (prev === pid ? null : prev));
    setItemsByProp(prev => ({ ...prev, [pid]: [] }));
    setLoadedByProp(prev => ({ ...prev, [pid]: true }));

    await fetchProps();
    Alert.alert('Возвращено', `Предложение #${pid.slice(0, 8)} отправлено снабженцу на доработку`);
  } catch (e: any) {
    Alert.alert('Ошибка', e?.message ?? 'Не удалось вернуть на доработку');
  } finally {
    setDecidingId(null);
  }
}


  /* ---------- render ---------- */
  return (
    <View style={[s.container, { backgroundColor: UI.bg }]}>
     {/* ✅ Collapsing Header */}
<Animated.View
  style={[
    s.collapsingHeader,
    { height: headerHeight, shadowOpacity: headerShadow, elevation: 6 },
  ]}
>
  <Animated.Text style={[s.collapsingTitle, { fontSize: titleSize }]} numberOfLines={1}>
    Контроль заявок
  </Animated.Text>

  {/* tabs (всегда видны) */}
  <View style={s.tabs}>
    {(['foreman', 'buyer'] as Tab[]).map((t) => {
      const active = tab === t;
      return (
        <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, active && s.tabActive]}>
          <Text numberOfLines={1} style={{ color: '#0F172A', fontWeight: '700' }}>
            {t === 'foreman' ? 'Прораб' : 'Снабженец'}
          </Text>
        </Pressable>
      );
    })}
  </View>

  {/* KPI + поиск (исчезают при скролле) */}
<Animated.View style={{ opacity: subOpacity }}>
  {tab === 'foreman' ? (
    <>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Ожидают утверждения</Text>
        <View style={s.kpiRow}>
          <View style={s.kpiPill}>
            <Text style={s.kpiLabel}>Заявок</Text>
            <Text style={s.kpiValue}>{loadingRows ? '…' : String(foremanRequestsCount)}</Text>
          </View>
          <View style={s.kpiPill}>
            <Text style={s.kpiLabel}>Позиций</Text>
            <Text style={s.kpiValue}>{loadingRows ? '…' : String(foremanPositionsCount)}</Text>
          </View>
        </View>
     </View>
  </>
) : (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>Предложения на утверждении</Text>
      <View style={s.kpiRow}>
        <View style={s.kpiPill}>
          <Text style={s.kpiLabel}>Предложений</Text>
          <Text style={s.kpiValue}>{loadingProps ? '…' : String(buyerPropsCount)}</Text>
        </View>
        <View style={s.kpiPill}>
          <Text style={s.kpiLabel}>Позиций</Text>
          <Text style={s.kpiValue}>{loadingProps ? '…' : String(buyerPositionsCount)}</Text>
        </View>
      </View>
    </View>
  )}
</Animated.View>
</Animated.View>
      {tab === 'foreman' ? (
        <>
                 
<FlatList
  data={groups}
  keyExtractor={(g, idx) => (g?.request_id ? `req:${String(g.request_id)}` : `g:${idx}`)}
  removeClippedSubviews={false}
keyboardShouldPersistTaps="handled"

  renderItem={({ item }) => {
    const ridKey = String(item.request_id);
    const isOpen = expandedReq === ridKey;
const headerNote = item.items.find(x => x.note)?.note || null;
    return (
  <View style={s.group}>
    {/* HEADER */}
    <View style={s.groupHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.groupTitle} numberOfLines={1}>
          Заявка {labelForRequest(item.request_id)}
        </Text>
        <Text style={s.groupMeta}>{item.items.length} позиций</Text>
      </View>

      <Pressable onPress={() => toggleReq(item.request_id)} style={s.openBtn}>
        <Text style={s.openBtnText}>{isOpen ? 'Свернуть' : 'Открыть'}</Text>
      </Pressable>
    </View>

    {/* NOTE — только когда открыто */}
    {isOpen && headerNote ? (
      <View style={s.reqNoteBox}>
        {headerNote
          .split(';')
          .map(x => x.trim())
          .filter(Boolean)
          .slice(0, 4)
          .map((line, idx) => (
            <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
              {line}
            </Text>
          ))}
      </View>
    ) : null}
        {/* ✅ ВЕСЬ СТАРЫЙ КОД ТЕПЕРЬ ТОЛЬКО КОГДА isOpen */}
        {isOpen ? (
          <>
    
{/* ✅ ЕДИНЫЙ ВИД (Procore): карточки и на WEB, и на Mobile */}
<View style={s.mobList}>
  {item.items.map((it, idx) => (
    <View
      key={it.request_item_id ? `mri:${it.request_item_id}` : `mri:${ridKey}:${idx}`}
      style={s.mobCard}
    >
      <View style={s.mobMain}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
  <Text style={s.mobTitle} numberOfLines={3}>
    {it.name_human}
  </Text>

  {it.item_kind ? (
    <View style={s.kindPill}>
      <Text style={s.kindPillText}>
        {it.item_kind === 'material' ? 'Материал'
          : it.item_kind === 'work' ? 'Работа'
          : it.item_kind === 'service' ? 'Услуга'
          : it.item_kind}
      </Text>
    </View>
  ) : null}
</View>

        <Text style={s.mobMeta} numberOfLines={2}>
          {`${it.qty} ${it.uom || ''}`.trim()}
          {it.app_code ? ` · ${it.app_code}` : ''}
        </Text>

        {/* опционально: номер заявки мелко (как у тебя было в таблице) */}
        <Text style={s.cardMeta} numberOfLines={1}>
          {`Заявка ${labelForRequest(it.request_id ?? item.request_id)}`}
        </Text>
      </View>

      <Pressable
        onPress={async () => {
          if (!it.request_item_id) return;
          setActingId(it.request_item_id);
          try {
            const { error } = await supabase.rpc('reject_request_item', {
              request_item_id: it.request_item_id,
              reason: null,
            });
            if (error) throw error;

            setRows(prev =>
              it.request_item_id
                ? prev.filter(r => r.request_item_id !== it.request_item_id)
                : prev,
            );
          } catch (e: any) {
            Alert.alert('Ошибка', e?.message ?? 'Не удалось отклонить позицию');
          } finally {
            setActingId(null);
          }
        }}
        disabled={!it.request_item_id || actingId === it.request_item_id}
        style={[
          s.mobRejectBtn,
          { opacity: !it.request_item_id || actingId === it.request_item_id ? 0.6 : 1 },
        ]}
      >
        <Text style={s.mobRejectIcon}>✕</Text>
      </Pressable>
    </View>
  ))}
</View>
{/* ✅ НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ — ПОСЛЕ списка */}
<View style={s.reqActionsBottom}>
  {/* PDF */}
  {(() => {
    const busy = pdfBusyKey === `req:${String(item.request_id ?? '')}`;
    return (
      <Pressable
        onPress={() => openRequestPdf(item)}
        disabled={busy}
        style={[s.actionBtn, { backgroundColor: UI.btnNeutral, opacity: busy ? 0.6 : 1 }]}
      >
        <Text style={s.actionText}>{busy ? 'PDF…' : 'PDF'}</Text>
      </Pressable>
    );
  })()}

  {/* Excel */}
  <Pressable
    onPress={() => exportRequestExcel(item)}
    style={[s.actionBtn, { backgroundColor: UI.btnNeutral }]}
  >
    <Text style={s.actionText}>Excel</Text>
  </Pressable>

<Pressable
  hitSlop={10}
  disabled={actingAll === item.request_id}
  style={[
    s.iconBtnDanger,
    { opacity: actingAll === item.request_id ? 0.6 : 1 },
  ]}
  onPress={() => {
    // ✅ WEB: window.confirm (чтобы точно работало)
    if (Platform.OS === 'web') {
      const ok = window.confirm('Удалить заявку?\n\nОтклонить ВСЮ заявку вместе со всеми позициями?');
      if (!ok) return;

      (async () => {
        setActingAll(item.request_id);
        try {
          const reqId = toFilterId(item.request_id);
          if (reqId == null) throw new Error('request_id пустой');

          const { error } = await supabase.rpc('reject_request_all', {
            p_request_id: String(reqId),
            p_reason: null,
          });
          if (error) throw error;

          setRows(prev => prev.filter(r => r.request_id !== item.request_id));
        } catch (e: any) {
          Alert.alert('Ошибка', e?.message ?? 'Не удалось отклонить все позиции');
        } finally {
          setActingAll(null);
        }
      })();

      return;
    }

    // ✅ MOBILE: Alert.alert (как было)
    Alert.alert(
      'Удалить заявку?',
      'Вы уверены, что хотите отклонить ВСЮ заявку вместе со всеми позициями?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Да, удалить',
          style: 'destructive',
          onPress: async () => {
            setActingAll(item.request_id);
            try {
              const reqId = toFilterId(item.request_id);
              if (reqId == null) throw new Error('request_id пустой');

              const { error } = await supabase.rpc('reject_request_all', {
                p_request_id: String(reqId),
                p_reason: null,
              });
              if (error) throw error;

              setRows(prev => prev.filter(r => r.request_id !== item.request_id));
            } catch (e: any) {
              Alert.alert('Ошибка', e?.message ?? 'Не удалось отклонить все позиции');
            } finally {
              setActingAll(null);
            }
          },
        },
      ],
    );
  }}
>
  <Ionicons name="close" size={20} color="#fff" />
</Pressable>

  {/* ✈️ Утвердить все (самолётик как у прораба) */}
{(() => {
  const disabled = actingAll === item.request_id || (item.items?.length ?? 0) === 0;

  return (
    <Pressable
      disabled={disabled}
      onPress={async () => {
        setActingAll(item.request_id);
        try {
          const reqId = toFilterId(item.request_id);
          if (reqId == null) throw new Error('request_id пустой');
          const reqIdStr = String(reqId);

          const updItems = await supabase
            .from('request_items')
            .update({ status: 'К закупке' })
            .eq('request_id', reqIdStr)
            .neq('status', 'Отклонено');
          if (updItems.error) throw updItems.error;

          const updReq = await supabase
            .from('requests')
            .update({ status: 'К закупке' })
            .eq('id', reqIdStr);
          if (updReq.error) throw updReq.error;

          setRows(prev => prev.filter(r => r.request_id !== item.request_id));
          await fetchDirectorReqs();
          await fetchProps();

          Alert.alert('Утверждено', `Заявка ${labelForRequest(item.request_id)} утверждена и отправлена снабженцу`);
        } catch (e: any) {
          Alert.alert('Ошибка', e?.message ?? 'Не удалось утвердить и отправить заявку');
        } finally {
          setActingAll(null);
        }
      }}
      style={[
        s.iconBtnApprove,
        { backgroundColor: disabled ? '#9CA3AF' : UI.btnApprove }, // серый → зелёный
      ]}
    >
      <Ionicons name="send" size={20} color="#fff" />
    </Pressable>
  );
})()}

</View>

          </>
        ) : null}
      </View>
    );
  }}
  ListEmptyComponent={
    !loadingRows ? (
      <Text style={{ opacity: 0.6, padding: 16, color: UI.sub }}>
        Нет ожидающих позиций
      </Text>
    ) : null
  }
  refreshControl={
  <RefreshControl
    refreshing={false}
    onRefresh={async () => {
      await ensureSignedIn();
      await fetchRows();
      await fetchDirectorReqs();
    }}
    title=""
    tintColor="transparent"
  />
}

onScroll={Animated.event(
  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
  { useNativeDriver: false }
)}
scrollEventThrottle={16}

  keyboardShouldPersistTaps="handled"
  windowSize={5}
  maxToRenderPerBatch={6}
  updateCellsBatchingPeriod={60}
  contentContainerStyle={{ paddingTop: HEADER_MAX + 12, paddingBottom: 24 }}

/>

        </>
      ) : (
       
                   <FlatList
            data={propsHeads}
            keyExtractor={(p, idx) => (p?.id ? `pp:${p.id}` : `pp:${idx}`)}
            removeClippedSubviews={false}
            renderItem={({ item: p }) => <ProposalRow p={p} />}
            refreshControl={
  <RefreshControl
    refreshing={false}
    onRefresh={async () => {
      await ensureSignedIn();
      await fetchProps();
    }}
    title=""
    tintColor="transparent"
  />
}
onScroll={Animated.event(
  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
  { useNativeDriver: false }
)}
scrollEventThrottle={16}
contentContainerStyle={{ paddingTop: HEADER_MAX + 12, paddingHorizontal: 16, paddingBottom: 24 }}

          />
         
       )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.cardBg,
  },
  title: { fontSize: 24, fontWeight: '800', color: UI.text, marginBottom: 8 },
  tabs: {
  flexDirection: 'row',
  flexWrap: 'wrap',     // ✅ разрешаем перенос
  gap: 8,
  alignItems: 'center',
},

  tab: {
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '#E2E8F0', // серая рамка
  backgroundColor: '#FFFFFF',
},
tabActive: {
  borderColor: '#0F172A',   // ЧЁРНЫЙ ОБОДОК
},
tabHalf: {
  flexBasis: '48%',     // ✅ две кнопки в ряд
  flexGrow: 1,
},
tabText: {
  color: '#0F172A',
  fontWeight: '700',
  textAlign: 'center',  // ✅ центрируем текст
  flexShrink: 1,        // ✅ не раздуваем
},

  sectionHeader: {
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 6,

  // ✅ на телефоне: колонка (текст сверху, KPI снизу)
  // ✅ на web: строка (как раньше)
  ...Platform.select({
    web: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    default: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 8,
    },
  }),
},

sectionHeaderTop: {
  width: '100%',
},


  sectionTitle: { fontSize: 20, fontWeight: '800', color: UI.text },
  sectionMeta: {
  color: UI.sub,
  fontWeight: '600',
  flexShrink: 0,        // ✅ не сжиматься в ноль
  maxWidth: 90,         // ✅ чтобы не вылезало
  textAlign: 'right',   // ✅ ровно справа
},


  group: { marginBottom: 14, paddingHorizontal: 16 },
  groupHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 8,
  paddingVertical: 6,
  borderBottomWidth: 1,
  borderColor: UI.border,
},

  groupTitle: { fontSize: 18, fontWeight: '900', color: UI.text },

  groupMeta: { color: UI.sub },

  
   card: {
    backgroundColor: UI.cardBg,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 14,
    marginBottom: 12,
  },
 
  
  pillBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  pillBtnText: { color: UI.text, fontWeight: '700' },   // для светлых кнопок
pillBtnTextOn: { color: '#fff', fontWeight: '800' },  // для тёмных кнопок

  // ===== Поиск и фильтр =====
  filterBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  filterLabel: {
    fontSize: 12,
    color: UI.sub,
    marginBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
    color: UI.sub,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 14,
    color: UI.text,
  },
  filterToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: '#FFFFFF',
  },
  filterToggleActive: {
    backgroundColor: '#E5E7EB',
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: UI.text,
  },

collapsingHeader: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 50,
  backgroundColor: UI.cardBg,
  borderBottomWidth: 1,
  borderColor: UI.border,
  paddingHorizontal: 16,
  paddingTop: Platform.OS === 'web' ? 10 : 12,
  paddingBottom: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowRadius: 14,
},
collapsingTitle: {
  fontWeight: '900',
  color: UI.text,
  marginBottom: 8,
},

  // ===== КНОПКА ОТКРЫТЬ (ВСЕГДА ВЛЕЗАЕТ НА IPHONE) =====
  propHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

 openBtn: {
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: 999,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: UI.border,
  alignSelf: 'flex-start',
minWidth: 86,
alignItems: 'center',

},

openBtnText: {
  color: UI.text,
  fontWeight: '700',
  fontSize: 13,
},

actionsRow: {
  flexDirection: 'row',
  gap: 8,
  marginTop: 10,
  flexWrap: 'wrap',
},
reqNoteBox: {
  marginTop: 8,
  marginBottom: 12,
  padding: 12,
  borderRadius: 14,
  backgroundColor: '#F1F5F9',
  borderLeftWidth: 4,
  borderLeftColor: '#0F172A',
},

reqNoteLine: {
  color: '#334155',
  fontSize: 14,
  lineHeight: 20,
  marginBottom: 4,
},

// ===== mobile cards =====
mobList: {
  marginTop: 10,
  gap: 10,
},

mobCard: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  padding: 12,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: UI.border,
  backgroundColor: UI.cardBg,
},

mobMain: {
  flex: 1,
  minWidth: 0,
},

mobTitle: {
  fontSize: 16,
  fontWeight: '800',
  color: UI.text,
},

mobMeta: {
  marginTop: 6,
  fontSize: 14,
  fontWeight: '700',
  color: UI.sub,
},

mobRejectBtn: {
  width: 44,
  height: 44,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: UI.btnReject,
},

mobRejectIcon: {
  color: '#fff',
  fontSize: 22,
  fontWeight: '900',
  lineHeight: 22,
},
kindPill: {
  paddingVertical: 4,
  paddingHorizontal: 10,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: UI.border,
  backgroundColor: '#FFFFFF',
},

kindPillText: {
  fontSize: 12,
  fontWeight: '700',
  color: UI.text,
},

kpiRow: {
  width: '100%',
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

kpiPill: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: UI.border,
  backgroundColor: '#FFFFFF',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,

  // ✅ чтобы на телефоне не уезжало — две пилюли в ряд
  flexGrow: 1,
  flexBasis: '48%',
},

kpiLabel: {
  color: UI.sub,
  fontWeight: '700',
  fontSize: 12,
},

kpiValue: {
  color: UI.text,
  fontWeight: '900',
  fontSize: 12,
},
reqActionsBottom: {
  marginTop: 12,
  flexDirection: 'row',
  gap: 8,
  zIndex: 50,
  elevation: 50,
},

actionBtn: {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
},

actionText: { color: UI.text, fontWeight: '800' },
actionTextOn: { color: '#fff', fontWeight: '900' },

iconBtnDanger: {
  width: 54,
  height: 44,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: UI.btnReject,
},

iconBtnApprove: {
  width: 54,
  height: 44,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
},

});


