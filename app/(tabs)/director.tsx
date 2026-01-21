// app/(tabs)/director.tsx — единый блок «Ожидает утверждения (прораб)», БЕЗ нижнего блока «шапок»
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, Alert, ActivityIndicator,
  RefreshControl, Platform, StyleSheet, TextInput, Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as XLSX from 'xlsx';
import {
  listDirectorProposalsPending, proposalItems,
  listDirectorInbox as fetchDirectorInbox, type DirectorInboxRow,
  RIK_API,
  exportRequestPdf,
} from '../../src/lib/catalog_api';
import { useGlobalBusy } from '../../src/ui/GlobalBusy';
import RNModal from "react-native-modal";
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
  bg: '#0B0F14',        // общий фон (почти чёрный)
  cardBg: '#101826',    // карточки/хедер (чуть светлее)
  text: '#F8FAFC',      // основной текст (белый)
  sub: '#9CA3AF',       // вторичный текст (серый)
  border: '#1F2A37',    // границы (тёмные)

  tabActiveBg: '#101826',
  tabInactiveBg: 'transparent',
  tabActiveText: '#F8FAFC',
  tabInactiveText: '#9CA3AF',

  btnApprove: '#22C55E', // зелёный
  btnReject:  '#EF4444', // красный
  btnNeutral: 'rgba(255,255,255,0.08)',


  accent: '#22C55E',     // акцент (для линий/рамок)
};
export default function DirectorScreen() {
  const busy = useGlobalBusy();
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
 // ===== Bottom Sheet (единая модалка) =====
type SheetKind = 'none' | 'request' | 'proposal';

const [sheetKind, setSheetKind] = useState<SheetKind>('none');
const [sheetRequest, setSheetRequest] = useState<Group | null>(null);
const [sheetProposalId, setSheetProposalId] = useState<string | null>(null);

const isSheetOpen = sheetKind !== 'none';

const closeSheet = useCallback(() => {
  setSheetKind('none');
  setSheetRequest(null);
  setSheetProposalId(null);
}, []);

const openRequestSheet = useCallback((g: Group) => {
  setSheetRequest(g);
  setSheetProposalId(null);
  setSheetKind('request');
}, []);

const openProposalSheet = useCallback((pid: string) => {
  setSheetProposalId(pid);
  setSheetRequest(null);
  setSheetKind('proposal');
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
const [propItemsCount, setPropItemsCount] = useState<Record<string, number>>({});
  const [loadingProps, setLoadingProps] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsByProp, setItemsByProp] = useState<Record<string, ProposalItem[]>>({});
  const [loadedByProp, setLoadedByProp] = useState<Record<string, boolean>>({});
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [pdfHtmlByProp, setPdfHtmlByProp] = useState<Record<string, string>>({});

  // ===== КЭШ НОМЕРОВ ЗАЯВОК =====
  const [displayNoByReq, setDisplayNoByReq] = useState<Record<string, string>>({});
const [submittedAtByReq, setSubmittedAtByReq] = useState<Record<string, string>>({});

  const labelForRequest = useCallback((rid: number | string | null | undefined, fallbackDocNo?: string | null) => {
    const key = String(rid ?? '');
    if (fallbackDocNo && fallbackDocNo.trim()) return fallbackDocNo.trim();
    const d = displayNoByReq[key];
    if (d && d.trim()) return d.trim();
    return `#${shortId(rid)}`;
  }, [displayNoByReq]);

  const preloadDisplayNos = useCallback(async (reqIds: Array<number | string>) => {
  const needed = Array.from(
    new Set(
      reqIds
        .map(x => String(x ?? '').trim())
        .filter(Boolean)
        .filter(id => displayNoByReq[id] == null || submittedAtByReq[id] == null)
    )
  );
  if (!needed.length) return;

  try {
    const { data, error } = await supabase
      .from('requests')
      .select('id, display_no, submitted_at')
      .in('id', needed);

    if (error) throw error;

    const mapDn: Record<string, string> = {};
    const mapSub: Record<string, string> = {};

    for (const r of (data ?? []) as any[]) {
      const id = String(r?.id ?? '').trim();
      if (!id) continue;

      const dn = String(r?.display_no ?? '').trim();
      const sa = r?.submitted_at ?? null;

      if (dn) mapDn[id] = dn;
      if (sa) mapSub[id] = String(sa);
    }

    if (Object.keys(mapDn).length) setDisplayNoByReq(prev => ({ ...prev, ...mapDn }));
    if (Object.keys(mapSub).length) setSubmittedAtByReq(prev => ({ ...prev, ...mapSub }));
  } catch (e) {
    console.warn('[director] preloadDisplayNos]:', (e as any)?.message ?? e);
  }
}, [displayNoByReq, submittedAtByReq]);


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
try {
  const propIds = filtered.map(h => h.id);
  if (propIds.length) {
    const qCnt = await supabase
      .from('proposal_items')
      .select('proposal_id')
      .in('proposal_id', propIds);

    const map: Record<string, number> = {};
    for (const r of (qCnt.data || []) as any[]) {
      const pid = String(r?.proposal_id ?? '');
      if (!pid) continue;
      map[pid] = (map[pid] || 0) + 1;
    }
    setPropItemsCount(map);
  } else {
    setPropItemsCount({});
  }
} catch {
  setPropItemsCount({});
}


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
    // ✅ Preview через ShareSheet — самый стабильный способ
    const ok = await Sharing.isAvailableAsync();
    if (!ok) {
      await Print.printAsync({ uri });
      return;
    }

    await new Promise((r) => setTimeout(r, 150));

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'PDF',
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e ?? '').toLowerCase();
    if (msg.includes('printing did not complete')) return;
    if (msg.includes('canceled') || msg.includes('cancel')) return;
    Alert.alert('PDF', e?.message ?? 'Не удалось открыть PDF');
  }
}
  /* ---------- PDF заявки (прораб) с безопасным window.open ---------- */
   const openRequestPdf = useCallback(async (g: any) => {
  const rid = String(g?.request_id ?? '');
  const key = `pdf:req:${rid}`;

  try {
    await busy.run(async () => {
      if (!rid) throw new Error('request_id пустой');

      const uri = await exportRequestPdf(rid, 'preview');
      if (!uri) {
        Alert.alert('PDF', 'Не удалось сформировать PDF-документ');
        return;
      }

      await openPdfPreviewOrFallbackShare(uri);
    }, { key, message: 'Открываю PDF…', minMs: 300 });
  } catch (e: any) {
    Alert.alert('Ошибка', e?.message ?? 'PDF не сформирован');
  }
}, [busy]);

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
// ✅ PROD: seed works/services right after director approve (best-effort)
const seedWorksAfterApprove = useCallback(async (proposalId: string) => {
  // 1) сначала пробуем прямой seed из proposal (идеально)
  try {
    const r = await supabase.rpc("work_seed_from_proposal" as any, {
      p_proposal_id: String(proposalId),
    } as any);
    if (!r.error) return;
    console.warn("[director] work_seed_from_proposal error:", r.error?.message);
  } catch (e) {
    console.warn("[director] work_seed_from_proposal throw:", e);
  }

  // 2) fallback: seed из purchase (если нет/не готова функция above)
  try {
    const purchaseId = await findPurchaseIdByProposal(String(proposalId));
    if (!purchaseId) return;

    const r2 = await supabase.rpc("work_seed_from_purchase" as any, {
      p_purchase_id: String(purchaseId),
    } as any);

    if (r2.error) {
      console.warn("[director] work_seed_from_purchase error:", r2.error?.message);
    }
  } catch (e) {
    console.warn("[director] work_seed_from_purchase throw:", e);
  }
}, [findPurchaseIdByProposal]);


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

/* ===== Карточка предложения (СНАБЖЕНЕЦ) — как у заявок ===== */
const ProposalRow = React.memo(({ p }: { p: ProposalHead }) => {
  const pidStr = String(p.id);
  const pretty = String(p.pretty ?? '').trim();
  const itemsCount = propItemsCount[pidStr] ?? 0;

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={s.groupHeader}>
        {/* LEFT */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.groupTitle} numberOfLines={1}>
            {pretty
              ? (pretty.toLowerCase().startsWith('предложение') ? pretty : `Предложение ${pretty}`)
              : `Предложение #${pidStr.slice(0, 8)}`}
          </Text>

          <Text style={s.cardMeta} numberOfLines={1}>
            Отправлено: {p.submitted_at ? new Date(p.submitted_at).toLocaleString() : '—'}
          </Text>
        </View>

        {/* RIGHT */}
        <View style={s.rightStack}>
          <View style={s.metaPill}>
            <Text style={s.metaPillText}>{`Позиций ${itemsCount}`}</Text>
          </View>

          <Pressable
            onPress={async () => {
              await toggleExpand(pidStr);  // ✅ грузим состав как раньше
              openProposalSheet(pidStr);   // ✅ открываем модалку
            }}
            style={s.openBtn}
          >
            <Text style={s.openBtnText}>Открыть</Text>
          </Pressable>
        </View>
      </View>
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
  const pidStr = String(proposalId);

  try {
    const chk = await supabase
      .from('proposals')
      .select('sent_to_accountant_at')
      .eq('id', pidStr)
      .maybeSingle();

    if (!chk.error && chk.data?.sent_to_accountant_at) {
      Alert.alert('Нельзя вернуть', 'Документ уже у бухгалтерии. Вернуть может только бухгалтер.');
      return;
    }

    setDecidingId(pidStr);

    // ✅ Берём ВСЕ request_item_id из БД
    const q = await supabase
      .from('proposal_items')
      .select('request_item_id')
      .eq('proposal_id', pidStr);

    if (q.error) throw q.error;

    const ids = Array.from(new Set(
      (q.data || []).map((r: any) => String(r?.request_item_id || '').trim()).filter(Boolean)
    ));

    if (!ids.length) {
      Alert.alert('Пусто', 'В предложении нет строк для возврата.');
      return;
    }

    const comment = (note || '').trim() || 'Отклонено директором';

    const payload = ids.map((rid) => ({
      request_item_id: rid,
      decision: 'rejected',
      comment,
    }));

    const res = await supabase.rpc('director_decide_proposal_items', {
      p_proposal_id: pidStr,
      p_decisions: payload,   // ✅ массив
      p_finalize: true,
    });

    if (res.error) throw res.error;

    // чистим кеши и обновляем список
    setExpanded(cur => (cur === pidStr ? null : cur));
    setItemsByProp(m => { const c = { ...m }; delete c[pidStr]; return c; });
    setLoadedByProp(m => { const c = { ...m }; delete c[pidStr]; return c; });
    setPdfHtmlByProp(m => { const c = { ...m }; delete c[pidStr]; return c; });

    await fetchProps();
    closeSheet();
  } catch (e: any) {
    Alert.alert('Ошибка', e?.message ?? 'Не удалось вернуть предложение');
  } finally {
    setDecidingId(null);
  }
}

  /* ---------- render ---------- */
  return (
  <View style={[s.container, { backgroundColor: UI.bg }]}>
    <StatusBar style="light" />
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
          <Text
  numberOfLines={1}
  style={{ color: active ? UI.text : UI.sub, fontWeight: '800' }}
>
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
  const submittedAt = submittedAtByReq[String(item.request_id ?? '').trim()] ?? null;

  return (
    <View style={s.group}>
      <View style={s.groupHeader}>
        {/* LEFT */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.groupTitle} numberOfLines={1}>
            Заявка {labelForRequest(item.request_id)}
          </Text>

          <Text style={s.cardMeta} numberOfLines={1}>
            Отправлено: {submittedAt ? new Date(submittedAt).toLocaleString() : '—'}
          </Text>
        </View>

        {/* RIGHT */}
        <View style={s.rightStack}>
          <View style={s.metaPill}>
            <Text style={s.metaPillText}>{`${item.items.length} позиций`}</Text>
          </View>

          <Pressable onPress={() => openRequestSheet(item)} style={s.openBtn}>
            <Text style={s.openBtnText}>Открыть</Text>
          </Pressable>
        </View>
      </View>
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
  contentContainerStyle={{
    paddingTop: HEADER_MAX + 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
  }}
/>
       )}
     {/* ===== ЕДИНАЯ BOTTOM-SHEET MODAL ===== */}
     <RNModal
  isVisible={isSheetOpen}
  onBackdropPress={closeSheet}
  onBackButtonPress={closeSheet}

  // ✅ NO SWIPE: только кнопка "Свернуть"
  backdropOpacity={0.55}
  useNativeDriver
  useNativeDriverForBackdrop
  hideModalContentWhileAnimating
  style={{ margin: 0, justifyContent: 'flex-end' }}
>

                 <View style={s.sheet}>
    <View style={s.sheetHandle} />

    {/* TOP BAR */}
    <View style={s.sheetTopBar}>
      <Text style={s.sheetTitle} numberOfLines={1}>
        {sheetKind === 'request' && sheetRequest
          ? `Заявка ${labelForRequest(sheetRequest.request_id)}`
          : sheetKind === 'proposal' && sheetProposalId
            ? (() => {
                const p = propsHeads.find(x => String(x.id) === String(sheetProposalId));
                const pretty = String(p?.pretty ?? '').trim();
                return pretty ? `Предложение ${pretty}` : `Предложение #${String(sheetProposalId).slice(0, 8)}`;
              })()
            : '—'}
      </Text>

      <Pressable onPress={closeSheet} style={s.sheetCloseBtn}>
        <Text style={s.sheetCloseText}>Свернуть</Text>
      </Pressable>
    </View>

    {/* ===== REQUEST (прораб) ===== */}
    {sheetKind === 'request' && sheetRequest ? (
      <View style={{ flex: 1, minHeight: 0 }}>
        {/* NOTE */}
        {(() => {
          const headerNote = sheetRequest.items.find(x => x.note)?.note || null;
          if (!headerNote) return null;

          const lines = headerNote
            .split(';')
            .map(x => x.trim())
            .filter(Boolean)
            .slice(0, 4);

          if (!lines.length) return null;

          return (
            <View style={s.reqNoteBox}>
              {lines.map((line, idx) => (
                <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
                  {line}
                </Text>
              ))}
            </View>
          );
        })()}

        <FlatList
          data={sheetRequest.items}
          keyExtractor={(it, idx) => (it.request_item_id ? `mri:${it.request_item_id}` : `mri:${idx}`)}
          contentContainerStyle={{ paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          scrollEnabled
          showsVerticalScrollIndicator={false}
          renderItem={({ item: it }) => (
            <View style={s.mobCard}>
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

                <Text style={s.mobMeta} numberOfLines={2}>
                  {`${it.qty} ${it.uom || ''}`.trim()}
                  {it.app_code ? ` · ${it.app_code}` : ''}
                </Text>
              </View>

              <Pressable
                disabled={!it.request_item_id || actingId === it.request_item_id}
                style={[
                  s.mobRejectBtn,
                  { opacity: (!it.request_item_id || actingId === it.request_item_id) ? 0.6 : 1 },
                ]}
                onPress={async () => {
                  if (!it.request_item_id) return;
                  setActingId(it.request_item_id);
                  try {
                    const { error } = await supabase.rpc('reject_request_item', {
                      request_item_id: it.request_item_id,
                      reason: null,
                    });
                    if (error) throw error;

                    setRows(prev => prev.filter(r => r.request_item_id !== it.request_item_id));
                    setSheetRequest(prev => prev
                      ? ({ ...prev, items: prev.items.filter(x => x.request_item_id !== it.request_item_id) })
                      : prev
                    );
                  } catch (e: any) {
                    Alert.alert('Ошибка', e?.message ?? 'Не удалось отклонить позицию');
                  } finally {
                    setActingId(null);
                  }
                }}
              >
                <Text style={s.mobRejectIcon}>✕</Text>
              </Pressable>
            </View>
          )}
        />

        {/* НИЖНЯЯ ПАНЕЛЬ — как было */}
        <View style={s.reqActionsBottom}>
          <Pressable
            onPress={() => openRequestPdf(sheetRequest)}
            style={[s.actionBtn, { backgroundColor: UI.btnNeutral }]}
          >
            <Text style={s.actionText}>PDF</Text>
          </Pressable>

          <Pressable
            onPress={() => exportRequestExcel(sheetRequest)}
            style={[s.actionBtn, { backgroundColor: UI.btnNeutral }]}
          >
            <Text style={s.actionText}>Excel</Text>
          </Pressable>

          <Pressable
            hitSlop={10}
            disabled={actingAll === sheetRequest.request_id}
            style={[s.iconBtnDanger, { opacity: actingAll === sheetRequest.request_id ? 0.6 : 1 }]}
            onPress={() => {
              const doIt = async () => {
                setActingAll(sheetRequest.request_id);
                try {
                  const reqId = toFilterId(sheetRequest.request_id);
                  if (reqId == null) throw new Error('request_id пустой');

                  const { error } = await supabase.rpc('reject_request_all', {
                    p_request_id: String(reqId),
                    p_reason: null,
                  });
                  if (error) throw error;

                  setRows(prev => prev.filter(r => r.request_id !== sheetRequest.request_id));
                  closeSheet();
                } catch (e: any) {
                  Alert.alert('Ошибка', e?.message ?? 'Не удалось отклонить все позиции');
                } finally {
                  setActingAll(null);
                }
              };

              if (Platform.OS === 'web') {
                const ok = window.confirm('Удалить заявку?\n\nОтклонить ВСЮ заявку вместе со всеми позициями?');
                if (!ok) return;
                void doIt();
                return;
              }

              Alert.alert(
                'Удалить заявку?',
                'Вы уверены, что хотите отклонить ВСЮ заявку вместе со всеми позициями?',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Да, удалить', style: 'destructive', onPress: () => void doIt() },
                ],
              );
            }}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>

          <Pressable
            hitSlop={10}
            disabled={actingAll === sheetRequest.request_id || (sheetRequest.items?.length ?? 0) === 0}
            style={[
              s.iconBtnApprove,
              {
                backgroundColor:
                  (actingAll === sheetRequest.request_id || (sheetRequest.items?.length ?? 0) === 0)
                    ? '#9CA3AF'
                    : UI.btnApprove
              },
            ]}
            onPress={async () => {
              setActingAll(sheetRequest.request_id);
              try {
                const reqId = toFilterId(sheetRequest.request_id);
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

                setRows(prev => prev.filter(r => r.request_id !== sheetRequest.request_id));
                await fetchDirectorReqs();
                await fetchProps();

                closeSheet();
                Alert.alert('Утверждено', `Заявка ${labelForRequest(sheetRequest.request_id)} утверждена и отправлена снабженцу`);
              } catch (e: any) {
                Alert.alert('Ошибка', e?.message ?? 'Не удалось утвердить и отправить заявку');
              } finally {
                setActingAll(null);
              }
            }}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    ) : null}

   {/* ===== PROPOSAL (снабженец) ===== */}
{sheetKind === 'proposal' && sheetProposalId ? (
  <View style={{ flex: 1, minHeight: 0 }}>
    {(() => {
      const pidStr = String(sheetProposalId);
      const key = pidStr;
      const loaded = !!loadedByProp[key];
      const items = itemsByProp[key] || [];

      const pretty = String(propsHeads.find(x => String(x.id) === pidStr)?.pretty ?? '').trim();

      const totalSum = (items || []).reduce((acc, it) => {
        const pr = Number((it as any).price ?? 0);
        const q = Number((it as any).total_qty ?? 0);
        return acc + pr * q;
      }, 0);

      if (!loaded) return <Text style={{ opacity: 0.7, color: UI.sub }}>Загружаю состав…</Text>;
      if (!items.length) return <Text style={{ opacity: 0.6, color: UI.sub }}>Состав пуст</Text>;

      return (
        <>
          <FlatList
            data={items}
            keyExtractor={(it, idx) => `pi:${key}:${it.id}:${idx}`}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            scrollEnabled
            showsVerticalScrollIndicator={false}
            renderItem={({ item: it }) => (
              <View style={s.mobCard}>
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
                    {it.price != null ? ` · сумма ${Math.round(Number(it.price) * Number(it.total_qty || 0))}` : ''}
                    {it.app_code ? ` · ${it.app_code}` : ''}
                  </Text>
                </View>

                <Pressable
  disabled={decidingId === pidStr}
  style={[s.mobRejectBtn, { opacity: decidingId === pidStr ? 0.6 : 1 }]}
  onPress={async () => {
    try {
      setDecidingId(pidStr);

      // ✅ Берём request_item_id железно из БД по proposal_items.id
      const q = await supabase
        .from('proposal_items')
        .select('request_item_id')
        .eq('proposal_id', pidStr)
        .eq('id', it.id) // it.id = proposal_items.id
        .maybeSingle();

      if (q.error) throw q.error;

      const rid = String(q.data?.request_item_id || '').trim();
      if (!rid) {
        Alert.alert('Ошибка', 'В строке предложения нет request_item_id (в базе).');
        return;
      }

      const beforeCount = (itemsByProp[pidStr] || items || []).length;
      const isLast = beforeCount <= 1;

      const payload = [{
        request_item_id: rid,
        decision: 'rejected',
        comment: 'Отклонено директором',
      }];

      // ✅ ВАЖНО: НИКАКОГО JSON.stringify
      const res = await supabase.rpc('director_decide_proposal_items', {
        p_proposal_id: pidStr,
        p_decisions: payload,
        p_finalize: isLast,
      });

      if (res.error) throw res.error;

      // локально убираем строку
      setItemsByProp(prev => {
        const before = prev[pidStr] || [];
        const nextItems = before.filter(x => Number(x.id) !== Number(it.id));
        return { ...prev, [pidStr]: nextItems };
      });

      if (isLast) {
        await fetchProps();
        closeSheet();
      }
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось отклонить позицию');
    } finally {
      setDecidingId(null);
    }
  }}
>
  <Text style={s.mobRejectIcon}>✕</Text>
</Pressable>

              </View>
            )}
          />

          {/* ✅ НИЖНЯЯ ПАНЕЛЬ СНАБЖЕНЦА — ВОССТАНОВЛЕНА 1:1 */}
          <View style={s.reqActionsBottom}>
            {/* PDF */}
            <Pressable
              style={[s.actionBtn, { backgroundColor: UI.btnNeutral }]}
              onPress={async () => {
                const keyPdf = `pdf:prop:${pidStr}`;
                try {
                  await busy.run(async () => {
                    if (Platform.OS === 'web') {
                      const w = window.open('about:blank', '_blank');
                      const { buildProposalPdfHtml } = await import('../../src/lib/rik_api');
                      const htmlDoc = await buildProposalPdfHtml(pidStr as any);
                      if (w) { w.document.open(); w.document.write(htmlDoc); w.document.close(); w.focus(); }
                      return;
                    }

                    const { exportProposalPdf } = await import('../../src/lib/rik_api');
                    const uri = await exportProposalPdf(pidStr as any, 'preview');
                    if (uri) await openPdfPreviewOrFallbackShare(uri);
                  }, { key: keyPdf, message: 'Открываю PDF…', minMs: 300 });
                } catch (e: any) {
                  Alert.alert('Ошибка', e?.message ?? 'PDF не сформирован');
                }
              }}
            >
              <Text style={s.actionText}>PDF</Text>
            </Pressable>

            {/* Excel */}
            <Pressable
              style={[s.actionBtn, { backgroundColor: UI.btnNeutral }]}
              onPress={async () => {
                try {
                  if (Platform.OS !== 'web') { Alert.alert('Excel', 'Excel экспорт сейчас реализован только для Web-версии.'); return; }
                  if (!items.length) { Alert.alert('Excel', 'Нет строк для выгрузки.'); return; }

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
            >
              <Text style={s.actionText}>Excel</Text>
            </Pressable>

            {/* вернуть */}
            <Pressable hitSlop={12} style={s.iconBtnDanger} onPress={() => onDirectorReturn(pidStr)}>
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>

            {/* утвердить */}
            <Pressable
              hitSlop={10}
              disabled={decidingId === pidStr}
              style={[s.iconBtnApprove, { backgroundColor: (decidingId === pidStr) ? '#9CA3AF' : UI.btnApprove }]}
              onPress={async () => {
                try {
                  setDecidingId(pidStr);

                  const { error } = await supabase.rpc('director_approve_min_auto', { p_proposal_id: pidStr, p_comment: null });
                  if (error) throw error;

                  await seedWorksAfterApprove(pidStr);

                  const rInc = await supabase.rpc('ensure_purchase_and_incoming_from_proposal', { p_proposal_id: pidStr });
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
                  closeSheet();
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
      );
    })()}
  </View>
) : null}

  </View>

      </RNModal>

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
  borderColor: UI.border,
  backgroundColor: UI.tabInactiveBg,
},
tabActive: {
  backgroundColor: UI.tabActiveBg,
  borderColor: UI.accent,
},
tabHalf: {
  flexBasis: '48%',     // ✅ две кнопки в ряд
  flexGrow: 1,
},

tabText: {
  color: UI.text,
  fontWeight: '800',
  textAlign: 'center',
  flexShrink: 1,
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

group: { marginBottom: 12, paddingHorizontal: 16, gap: 10 },

groupHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,

  padding: 14,
  borderRadius: 18,

  backgroundColor: UI.cardBg,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.18)',

  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.22,
  shadowRadius: 18,
  elevation: 6,
 minHeight: 72,
},


  groupTitle: { fontSize: 18, fontWeight: '900', color: UI.text },

  groupMeta: {
  marginTop: 4,
  alignSelf: 'flex-start',
  paddingVertical: 3,
  paddingHorizontal: 10,
  borderRadius: 999,
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
  color: '#E5E7EB',
  fontWeight: '800',
  fontSize: 12,
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
  borderColor: 'rgba(255,255,255,0.14)',
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 6,
  backgroundColor: 'rgba(255,255,255,0.06)',
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
  borderColor: 'rgba(255,255,255,0.14)',
  backgroundColor: 'rgba(255,255,255,0.06)',
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
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
},


 openBtn: {
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 999,
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
  minWidth: 96,
  alignItems: 'center',
},
openBtnText: {
  color: '#FFFFFF',
  fontWeight: '900',
  fontSize: 13,
  letterSpacing: 0.2,
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
  backgroundColor: '#0F172A',    // чуть темнее карточки
  borderWidth: 1,
  borderColor: UI.border,
  borderLeftWidth: 4,
  borderLeftColor: UI.accent,    // зелёный акцент
},
reqNoteLine: {
  color: UI.text,
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
  padding: 14,
  borderRadius: 18,

  backgroundColor: 'rgba(16,24,38,0.92)',
  borderWidth: 1.25,
  borderColor: 'rgba(255,255,255,0.16)',

  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.22,
  shadowRadius: 18,
  elevation: 6,

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
  backgroundColor: 'transparent',
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
  backgroundColor: UI.cardBg,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
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
cardMeta: {
  marginTop: 6,
  color: 'rgba(255,255,255,0.78)',  // ✅ ярче, чем #E5E7EB на твоём фоне
  fontSize: 12,
  fontWeight: '800',
  letterSpacing: 0.2,
},
metaRow: {
  marginTop: 6,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',        // ✅ перенос, но без смещения вправо
},
metaPill: {
  paddingVertical: 4,
  paddingHorizontal: 12,
  borderRadius: 999,
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
  alignItems: 'center',
  flexShrink: 0,          // ✅ не сжиматься в ноль
},
metaPillText: {
  color: '#E5E7EB',
  fontWeight: '900',
  fontSize: 12,
},

reqActionsBottom: {
  marginTop: 12,
  flexDirection: 'row',
  gap: 10,

  padding: 10,
  borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.04)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.10)',
},
actionBtn: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255,255,255,0.08)',
},

actionText: { color: '#fff', fontWeight: '900' },

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
sectionBox: {
  marginTop: 10,
  padding: 12,
  borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.04)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.10)',
},
sectionBoxTitle: {
  color: UI.sub,
  fontWeight: '900',
  fontSize: 12,
  letterSpacing: 0.4,
  marginBottom: 10,
},
rightStack: {
  alignItems: 'flex-end',
  justifyContent: 'center',
  gap: 8,
},
sheet: {
  height: '88%',
  backgroundColor: UI.cardBg,
  borderTopLeftRadius: 22,
  borderTopRightRadius: 22,
  paddingTop: 10,
  paddingHorizontal: 16,
  paddingBottom: 16,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.10)',
},
sheetHandle: {
  alignSelf: 'center',
  width: 44,
  height: 5,
  borderRadius: 999,
  backgroundColor: 'rgba(255,255,255,0.18)',
  marginBottom: 10,
},
sheetTitle: {
  flex: 1,
  minWidth: 0,
  color: UI.text,
  fontWeight: '900',
  fontSize: 18,
},
sheetTopBar: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  marginBottom: 10,
},

sheetCloseBtn: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 999,
  backgroundColor: '#E5E7EB',          // нейтральная кнопка
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.10)',
  flexShrink: 0,
},

sheetCloseText: {
  color: '#0B0F14',                   // чёрный текст
  fontWeight: '900',
  fontSize: 13,
},

});


