// app/(tabs)/director.tsx — единый блок «Ожидает утверждения (прораб)», БЕЗ нижнего блока «шапок»
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, Alert, ActivityIndicator,
  RefreshControl, Platform, StyleSheet
} from 'react-native';
import {
  listDirectorProposalsPending, proposalItems,
  listDirectorInbox as fetchDirectorInbox, type DirectorInboxRow,
  RIK_API,
  buildRequestPdfHtml, exportRequestPdf,
  resolveProposalPrettyTitle, // красивый заголовок
  directorReturnToBuyer, 
} from '../../src/lib/rik_api';
import { supabase, ensureSignedIn } from '../../src/lib/supabaseClient';

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
  note?: string | null;
};
type Group = { request_id: number | string; items: PendingRow[] };

type ProposalHead = { id: string; submitted_at?: string | null; pretty?: string | null };
type ProposalItem = {
  id: number;
  rik_code: string | null;
  name_human: string;
  uom: string | null;
  app_code: string | null;
  total_qty: number;
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

  // ===== ПРОРАБ =====
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingAll, setActingAll] = useState<number | string | null>(null);

  // анти-мигание
  const didInit = useRef(false);
  const fetchTicket = useRef(0);
  const lastNonEmptyRows = useRef<PendingRow[]>([]);

  // ===== (оставил загрузку «шапок», но НЕ рендерю) =====
  const [directorReqs, setDirectorReqs] = useState<Array<{ request_id: string; items_count: number; submitted_at: string | null; doc_no?: string | null }>>([]);
  const [loadingDirReqs, setLoadingDirReqs] = useState(false);

  // ===== СНАБЖЕНЕЦ =====
  const [propsHeads, setPropsHeads] = useState<ProposalHead[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsByProp, setItemsByProp] = useState<Record<string, ProposalItem[]>>({});
  const [loadedByProp, setLoadedByProp] = useState<Record<string, boolean>>({});
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [pdfHtmlByProp, setPdfHtmlByProp] = useState<Record<string, string>>({});

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

      // 2) подтягиваем красивые номера И ГРАНИЦУ МИГРАЦИИ
      const { data, error } = await supabase
        .from('proposals')
        .select('id, doc_no, display_no, sent_to_accountant_at')
        .in('id', ids);

      if (error || !Array.isArray(data)) { setPropsHeads(heads); return; }

      // только те, что ЕЩЁ НЕ отправлены в бухгалтерию
      const okIds = new Set<string>(
        data.filter(r => !r?.sent_to_accountant_at).map(r => String(r.id))
      );

      const prettyMap: Record<string, string> = {};
      for (const r of data) {
        const id = String((r as any).id);
        const pretty = String((r as any).doc_no ?? (r as any).display_no ?? '').trim();
        if (id && pretty) prettyMap[id] = pretty;
      }

      const filtered = heads
        .filter(h => okIds.has(h.id))
        .map(h => ({ ...h, pretty: prettyMap[h.id] ?? h.pretty ?? null }));

      setPropsHeads(filtered);
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

  /* ---------- PDF заявки (прораб) с безопасным window.open ---------- */
  const openRequestPdf = useCallback(async (g: Group | { request_id: string | number; items: any[] }) => {
    try {
      const rid = g?.request_id;
      if (!rid) throw new Error('request_id пустой');

      if (Platform.OS === 'web') {
        const w = window.open('about:blank', '_blank'); // открыть сразу — не блокируется
        try {
          const html = await buildRequestPdfHtml(rid as any);
          if (w) {
            try { w.document.open(); w.document.write(html); w.document.close(); w.focus(); }
            catch {
              const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              w.location.href = url;
            }
          }
        } catch (e) {
          try { if (w) w.close(); } catch {}
          throw e;
        }
      } else {
        await exportRequestPdf(rid as any);
      }
    } catch (e) {
      console.error('[openRequestPdf]:', (e as any)?.message ?? e);
      Alert.alert('Ошибка', (e as any)?.message ?? 'Не удалось сформировать PDF');
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
    return Array.from(map.entries()).map(([request_id, items]) => ({ request_id, items }));
  }, [rows]);

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

    // 1) локальное состояние
    const [pretty, setPretty] = useState<string>(p.pretty?.trim() || '');

    // 2) если props.pretty обновился после запроса — подхватить его
    useEffect(() => {
      const ext = (p.pretty || '').trim();
      if (ext && ext !== pretty) setPretty(ext);
    }, [p.pretty, pretty]);

    // 3) если так и нет — добить через RPC (как было)
    useEffect(() => {
      if (pretty) return;
      let dead = false;
      (async () => {
        try {
          const t = await resolveProposalPrettyTitle(pidStr);
          if (!dead && t && t.trim()) setPretty(t.trim());
        } catch {}
      })();
      return () => { dead = true; };
    }, [pidStr, pretty]);

    // ... остальной компонент без изменений

    const isOpen = expanded === p.id;
    const key = pidStr;
    const items = itemsByProp[key] || [];
    const loaded = !!loadedByProp[key];

    return (
      <View style={[s.card, { borderStyle: 'dashed' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={s.cardTitle}>
            {pretty ? `Предложение: ${pretty}` : `Предложение #${pidStr.slice(0, 8)}`}
          </Text>
          <Text style={[s.cardMeta, { marginLeft: 8 }]}>
            Отправлено: {p.submitted_at ? new Date(p.submitted_at).toLocaleString() : '—'}
          </Text>
          <Pressable
            onPress={() => toggleExpand(pidStr)}
            style={[s.pillBtn, { marginLeft: 'auto', backgroundColor: UI.tabActiveBg }]}
          >
            <Text style={s.pillBtnText}>{isOpen ? 'Свернуть' : 'Открыть'}</Text>
          </Pressable>
        </View>
        {isOpen && (
          <>
            <View style={{ marginTop: 8 }}>
              {!loaded ? (
                <Text style={{ opacity: 0.7, color: UI.sub }}>Загружаю состав…</Text>
              ) : items.length === 0 ? (
                <Text style={{ opacity: 0.6, color: UI.sub }}>Состав пуст</Text>
              ) : (
                <View>
                  {items.map((it) => (
                    <View key={`pi:${key}:${it.id}`} style={{ paddingVertical: 4 }}>
                      <Text style={{ fontWeight: '600', color: UI.text }}>{it.name_human}</Text>
                      <Text style={s.cardMeta}>
                        {(it.rik_code ? `${it.rik_code} · ` : '')}
                        {it.total_qty} {it.uom || ''}{it.app_code ? ` · ${it.app_code}` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable
                onPress={async () => { await decide(pidStr, 'approved'); }}
                disabled={decidingId === p.id}
                style={[s.pillBtn, { backgroundColor: UI.btnApprove, opacity: decidingId === p.id ? 0.6 : 1 }]}
              >
                <Text style={s.pillBtnText}>Утвердить</Text>
              </Pressable>

              {/* единственная красная кнопка — «Вернуть» */}
              <Pressable
                onPress={async () => { await onDirectorReturn(pidStr); }}
                disabled={decidingId === p.id}
                style={[s.pillBtn, { backgroundColor: UI.btnReject, opacity: decidingId === p.id ? 0.6 : 1 }]}
              >
                <Text style={s.pillBtnText}>Вернуть</Text>
              </Pressable>

              {/* ===== PDF (СНАБЖЕНЕЦ) — твой безопасный onPress ===== */}
              <Pressable
                onPress={async () => {
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
                  } else {
                    try {
                      const { exportProposalPdf } = await import('../../src/lib/rik_api');
                      await exportProposalPdf(pidStr as any);
                    } catch (e) {
                      Alert.alert('Ошибка', (e as any)?.message ?? 'PDF не сформирован');
                    }
                  }
                }}
                style={[s.pillBtn, { backgroundColor: UI.btnNeutral }]}
              >
                <Text style={s.pillBtnText}>PDF</Text>
              </Pressable>
            </View>
          </>
        )}
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
          .select('id, rik_code, name_human, uom, app_code, total_qty')
          .eq('proposal_id', key)
          .order('id', { ascending: true });

        if (!qSnap.error && Array.isArray(qSnap.data)) {
          rows = qSnap.data;
        }

        // 2) если снапшота нет — обычные proposal_items
        if (!rows) {
          const qItems = await supabase
            .from('proposal_items_view')
            .select('id, rik_code, name_human, uom, app_code, total_qty')
            .eq('proposal_id', key)
            .order('id', { ascending: true });

          if (!qItems.error && Array.isArray(qItems.data)) {
            rows = qItems.data;
          }
        }

        // 3) последний fallback: proposal_items
        if (!rows) {
          const qPlain = await supabase
            .from('proposal_items')
            .select('id, rik_code, name_human, uom, app_code, qty')
            .eq('proposal_id', key)
            .order('id', { ascending: true });

          if (!qPlain.error && Array.isArray(qPlain.data)) {
            rows = qPlain.data.map(r => ({ ...r, total_qty: r.qty }));
          }
        }

        const norm = (rows ?? []).map((r: any, i: number) => ({
          id: Number(r.id ?? i),
          rik_code: r.rik_code ?? null,
          name_human: r.name_human ?? '',
          uom: r.uom ?? null,
          app_code: r.app_code ?? null,
          total_qty: Number(r.total_qty ?? r.qty ?? 0),
        }));

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
        if (error) {
          console.warn('[approve_one] rpc error → fallback UPDATE:', error.message);
          const upd = await supabase.from('proposals').update({ status: 'Утверждено' }).eq('id', pid);
          if (upd.error) throw upd.error;
        } else if (!ok) {
          Alert.alert('Внимание', 'Нечего утверждать или неправильный статус/id');
        }

        // 2) гарантируем наличие закупки и проталкиваем на склад
        try {
          // создаём/находим закупку
          const r1 = await supabase.rpc('purchase_upsert_from_proposal', { p_proposal_id: String(pid) });
          if ((r1 as any).error) throw (r1 as any).error;

          let purchaseId: string | null = null;
          if ((r1 as any)?.data) {
            purchaseId = String((r1 as any).data);
          } else {
            // запасной поиск
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
        // rejected
        const { data: ok, error } = await supabase.rpc('reject_one', { p_proposal_id: String(pid) });
        if (error) {
          console.warn('[reject_one] rpc error → fallback UPDATE:', error.message);
          const upd = await supabase.from('proposals').update({ status: 'Отклонено' }).eq('id', pid);
          if (upd.error) throw upd.error;
        }
      }

      await fetchProps();
      Alert.alert(decision === 'approved' ? 'Утверждено' : 'Отклонено',
        `Предложение #${pid.slice(0,8)} ${decision === 'approved' ? 'утверждено' : 'отклонено'}`);
    } catch (e) {
      Alert.alert('Ошибка', (e as any)?.message ?? 'Не удалось применить решение');
    } finally {
      setDecidingId(null);
    }
  }, [fetchProps]);

  async function onDirectorReturn(proposalId: string | number, note?: string) {
    try {
      const pid = String(proposalId);

      // 0) пред-проверка: если уже у бухгалтера — честно сказать об этом
      const chk = await supabase
        .from('proposals')
        .select('sent_to_accountant_at')
        .eq('id', pid)
        .maybeSingle();

      if (!chk.error && chk.data?.sent_to_accountant_at) {
        Alert.alert('Нельзя вернуть', 'Документ уже у бухгалтерии. Вернуть может только бухгалтер (через «На доработке (снабженец)»).');
        return;
      }

      setDecidingId(pid);

      // 1) реальный возврат (RPC-обёртка)
      await directorReturnToBuyer({ proposalId: pid, comment: (note || '').trim() || undefined });

      Alert.alert('Возвращено', `Предложение #${pid.slice(0,8)} отправлено снабженцу на доработку`);
      await fetchProps(); // перечитать «на утверждении»
    } catch (e) {
      Alert.alert('Ошибка', (e as any)?.message ?? 'Не удалось вернуть на доработку');
    } finally {
      setDecidingId(null);
    }
  }

  /* ---------- render ---------- */
  return (
    <View style={[s.container, { backgroundColor: UI.bg }]}>
      {/* Header / Tabs */}
      <View style={s.header}>
        <Text style={s.title}>Директор</Text>
        <View style={s.tabs}>
          {(['foreman','buyer'] as Tab[]).map((t) => {
            const active = tab === t;
            return (
              <Pressable key={t} onPress={() => setTab(t)}
                style={[s.tab, { backgroundColor: active ? UI.tabActiveBg : UI.tabInactiveBg }]}>
                <Text style={{ color: active ? UI.tabActiveText : UI.tabInactiveText, fontWeight: '700' }}>
                  {t === 'foreman' ? 'Прораб' : 'Снабженец'}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={async () => {
              await ensureSignedIn();
              await fetchRows(); await fetchDirectorReqs(); await fetchProps();
            }}
            style={[s.refreshBtn]}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Обновить</Text>
          </Pressable>
        </View>
      </View>

      {tab === 'foreman' ? (
        <>
          {/* ===== ЕДИНЫЙ БЛОК ПРОРАБА (БЕЗ нижнего блока) ===== */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Ожидает утверждения (прораб)</Text>
            <Text style={s.sectionMeta}>
              {loadingRows ? '…' : `${rows.length} поз.`}
            </Text>
          </View>

          <FlatList
            data={groups}
            keyExtractor={(g, idx) => (g?.request_id ? `req:${String(g.request_id)}` : `g:${idx}`)}
            removeClippedSubviews={false}
            renderItem={({ item }) => (
              <View style={s.group}>
                <View style={s.groupHeader}>
                  <Text style={s.groupTitle}>Заявка {labelForRequest(item.request_id)}</Text>
                  <Text style={s.groupMeta}>{item.items.length} поз.</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
                    {/* PDF заявки (прораб) — безопасный onPress */}
                    <Pressable onPress={() => openRequestPdf(item)} style={[s.pillBtn, { backgroundColor: UI.btnNeutral }]}>
                      <Text style={s.pillBtnText}>PDF</Text>
                    </Pressable>

                    <Pressable
                      onPress={async () => {
                        setActingAll(item.request_id);
                        try {
                          const reqId = toFilterId(item.request_id);
                          if (reqId == null) throw new Error('request_id пустой');
                          const { error } = await supabase.rpc('director_decide_request', {
                            p_request_id: String(reqId),
                            p_decision: 'approve',
                          });
                          if (error) throw error;
                          Alert.alert('Отправлено', `Заявка ${labelForRequest(item.request_id)} отправлена снабженцу`);
                          await fetchRows(); await fetchDirectorReqs(); await fetchProps();
                        } catch (e) {
                          Alert.alert('Ошибка', (e as any)?.message ?? 'Не удалось отправить снабженцу');
                        } finally { setActingAll(null); }
                      }}
                      disabled={actingAll === item.request_id}
                      style={[s.pillBtn, { backgroundColor: UI.btnApprove, opacity: actingAll === item.request_id ? 0.6 : 1 }]}
                    >
                      <Text style={s.pillBtnText}>Отправить снабженцу</Text>
                    </Pressable>

                    <Pressable
                      onPress={async () => {
                        setActingAll(item.request_id);
                        try {
                          const reqId = toFilterId(item.request_id);
                          if (reqId == null) throw new Error('request_id пустой');
                          const { error } = await supabase.rpc('approve_request_all', { p_request_id: String(reqId) });
                          if (error) {
                            console.warn('[approve_request_all] rpc error:', error.message, '→ fallback UPDATE');
                            const upd = await supabase.from('request_items').update({ status: 'Утверждено' }).eq('request_id', reqId as any);
                            if (upd.error) throw upd.error;
                          }
                          setRows(prev => prev.filter(r => r.request_id !== item.request_id));
                        } catch (e) {
                          Alert.alert('Ошибка', (e as any)?.message ?? 'Не удалось утвердить все позиции');
                        } finally { setActingAll(null); }
                      }}
                      disabled={actingAll === item.request_id}
                      style={[s.pillBtn, { backgroundColor: UI.btnApprove, opacity: actingAll === item.request_id ? 0.6 : 1 }]}
                    >
                      <Text style={s.pillBtnText}>Утвердить все</Text>
                    </Pressable>

                    <Pressable
                      onPress={async () => {
                        setActingAll(item.request_id);
                        try {
                          const reqId = toFilterId(item.request_id);
                          if (reqId == null) throw new Error('request_id пустой');
                          const { error } = await supabase.rpc('reject_request_all', { p_request_id: String(reqId), p_reason: null });
                          if (error) {
                            console.warn('[reject_request_all] rpc error:', error.message, '→ fallback UPDATE');
                            const upd = await supabase.from('request_items').update({ status: 'Отклонено' }).eq('request_id', reqId as any);
                            if (upd.error) throw upd.error;
                          }
                          setRows(prev => prev.filter(r => r.request_id !== item.request_id));
                        } catch (e) {
                          Alert.alert('Ошибка', (e as any)?.message ?? 'Не удалось отклонить все позиции');
                        } finally { setActingAll(null); }
                      }}
                      disabled={actingAll === item.request_id}
                      style={[s.pillBtn, { backgroundColor: UI.btnReject, opacity: actingAll === item.request_id ? 0.6 : 1 }]}
                    >
                      <Text style={s.pillBtnText}>Отклонить все</Text>
                    </Pressable>
                  </View>
                </View>

                <FlatList
                  data={item.items}
                  keyExtractor={(x, idx) =>
                    x.request_item_id ? `ri:${x.request_item_id}` : `req:${String(item.request_id)}:row:${idx}`}
                  removeClippedSubviews={false}
                  renderItem={({ item: it }) => (
                    <View style={s.card}>
                      <Text style={s.cardTitle}>{it.name_human}</Text>
                      <Text style={s.cardMeta}>
                        {`Заявка ${labelForRequest(it.request_id ?? item.request_id)} · ${it.qty} ${it.uom || ''}`}
                      </Text>
                      <View style={s.rowBtns}>
                        <Pressable
                          onPress={async () => {
                            if (!it.request_item_id) return;
                            setActingId(it.request_item_id);
                            try {
                              const { error } = await supabase.rpc('approve_request_item', { p_request_item_id: it.request_item_id });
                              if (error) {
                                console.warn('[approve_request_item] rpc error:', error.message, '→ fallback UPDATE');
                                const upd = await supabase.from('request_items').update({ status: 'Утверждено' }).eq('id', it.request_item_id);
                                if (upd.error) throw upd.error;
                              }
                              setRows(prev => it.request_item_id ? prev.filter(r => r.request_item_id !== it.request_item_id) : prev);
                            } catch (e) {
                              Alert.alert('Ошибка', (e as any)?.message ?? 'Не удалось утвердить позицию');
                            } finally { setActingId(null); }
                          }}
                          disabled={!it.request_item_id || actingId === it.request_item_id}
                          style={[
                            s.actionBtn,
                            { backgroundColor: UI.btnApprove, opacity: (!it.request_item_id || actingId === it.request_item_id) ? 0.6 : 1 },
                          ]}
                        >
                          <Text style={s.actionBtnText}>Утвердить</Text>
                        </Pressable>

                        <Pressable
                          onPress={async () => {
                            if (!it.request_item_id) return;
                            setActingId(it.request_item_id);
                            try {
                              const { error } = await supabase.rpc('reject_request_item', { p_request_item_id: it.request_item_id, p_reason: null });
                              if (error) {
                                console.warn('[reject_request_item] rpc error:', error.message, '→ fallback UPDATE');
                                const upd = await supabase.from('request_items').update({ status: 'Отклонено' }).eq('id', it.request_item_id);
                                if (upd.error) throw upd.error;
                              }
                              setRows(prev => it.request_item_id ? prev.filter(r => r.request_item_id !== it.request_item_id) : prev);
                            } catch (e) {
                              Alert.alert('Ошибка', (e as any)?.message ?? 'Не удалось отклонить позицию');
                            } finally { setActingId(null); }
                          }}
                          disabled={!it.request_item_id || actingId === it.request_item_id}
                          style={[
                            s.actionBtn,
                            { backgroundColor: UI.btnReject, opacity: (!it.request_item_id || actingId === it.request_item_id) ? 0.6 : 1 },
                          ]}
                        >
                          <Text style={s.actionBtnText}>Отклонить</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                />
              </View>
            )}
            /* ⛔️ УДАЛЕНО: ListFooterComponent со «шапками» */
            ListEmptyComponent={!loadingRows ? <Text style={{ opacity: 0.6, padding: 16, color: UI.sub }}>Нет ожидающих позиций</Text> : null}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={async () => {
                await ensureSignedIn();
                await fetchRows();
                await fetchDirectorReqs();
              }} />
            }
            keyboardShouldPersistTaps="handled"
            windowSize={5}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={60}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          />
        </>
      ) : (
        <>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Предложения на утверждении (снабженец)</Text>
            {loadingProps ? <ActivityIndicator /> : <Text style={s.sectionMeta}>{propsHeads.length} шт.</Text>}
          </View>

          <FlatList
            data={propsHeads}
            keyExtractor={(p, idx) => (p?.id ? `pp:${p.id}` : `pp:${idx}`)}
            removeClippedSubviews={false}
            renderItem={({ item: p }) => <ProposalRow p={p} />}
            refreshControl={<RefreshControl refreshing={false} onRefresh={async () => { await ensureSignedIn(); await fetchProps(); }} />}
            keyboardShouldPersistTaps="handled"
            windowSize={5}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={60}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          />
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderColor: UI.border },
  title: { fontSize: 20, fontWeight: '800', color: UI.text, marginBottom: 8 },
  tabs: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  refreshBtn: { marginLeft: 'auto', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#111827' },

  sectionHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: UI.text },
  sectionMeta: { color: UI.sub, marginLeft: 'auto' },

  group: { marginBottom: 14, paddingHorizontal: 16 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  groupTitle: { fontSize: 16, fontWeight: '800', color: UI.text },
  groupMeta: { color: UI.sub },

  card: {
    backgroundColor: UI.cardBg,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8
  },
  cardTitle: { fontWeight: '700', color: UI.text },
  cardMeta: { color: UI.sub, marginTop: 4 },

  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700' },

  pillBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  pillBtnText: { color: '#fff', fontWeight: '700' },
});

