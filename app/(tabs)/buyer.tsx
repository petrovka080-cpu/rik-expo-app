// app/(tabs)/buyer.tsx — снабженец (боевой, без смены логики) + режим «Доработать»
import { formatRequestDisplay } from '../../src/lib/format';
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
  forwardRef, useImperativeHandle
} from 'react';
import {
  View, Text, FlatList, Pressable, Alert, ActivityIndicator,
  RefreshControl, StyleSheet, Platform, Modal, TextInput, ScrollView, Animated,
  StatusBar, Keyboard
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  listBuyerInbox,
  proposalCreate,
  proposalAddItems,
  proposalSubmit,
  exportProposalPdf,
  buildProposalPdfHtml,
  type BuyerInboxRow,
  proposalItems,
  proposalSnapshotItems,
  // @ts-ignore
  proposalSetItemsMeta,
  // @ts-ignore
  uploadProposalAttachment,
  proposalSendToAccountant,
  // 👇 батч для красивых номеров заявок
  batchResolveRequestLabels,
  resolveProposalPrettyTitle,
  buildProposalPdfHtmlPretty,
  createProposalsBySupplier as apiCreateProposalsBySupplier,
} from '../../src/lib/catalog_api';
import { RIK_API } from '../../src/lib/catalog_api';
import { supabase } from '../../src/lib/supabaseClient';
import { useFocusEffect } from "expo-router";
import { listSuppliers, type Supplier } from '../../src/lib/catalog_api';

function SafeView({ children, ...rest }: any) {
  const kids = React.Children.toArray(children).map((c: any, i: number) =>
    typeof c === 'string' ? (c.trim() ? <Text key={`t${i}`}>{c}</Text> : null) : c
  );
  return <View {...rest}>{kids}</View>;
}

const isWeb = Platform.OS === 'web';
const isAndroid = Platform.OS === 'android';
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);


// нормализуем название поставщика: убираем кавычки/лишние пробелы/регистр
const normName = (s?: string | null) =>
  String(s ?? '')
    .replace(/[«»"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

type Tab = 'inbox' | 'pending' | 'approved' | 'rejected';
type Group = { request_id: string; request_id_old?: number | null; items: BuyerInboxRow[] };
type LineMeta = { price?: string; supplier?: string; note?: string };
type Attachment = { name: string; url?: string; file?: any };
type AttachmentMap = Record<string, Attachment | undefined>;
const SUPP_NONE = '— без поставщика —';

/* ====== Палитра (как у Accountant) ====== */
const COLORS = {
  bg: '#F8FAFC',
  text: '#0F172A',
  sub: '#475569',
  border: '#E2E8F0',
  primary: '#111827',
  tabInactiveBg: '#E5E7EB',
  tabInactiveText: '#111827',
  chipGrayBg: '#E5E7EB',
  chipGrayText: '#111827',
  green: '#22C55E',
  yellow: '#CA8A04',
  red: '#EF4444',
  blue: '#3B82F6',
  amber: '#F59E0B',
};

/* =================== Статус-цвета =================== */
const statusColors = (s?: string | null) => {
  const v = (s ?? '').trim();
  if (v === 'Утверждено') return { bg: '#DCFCE7', fg: '#166534' };
  if (v === 'На утверждении') return { bg: '#DBEAFE', fg: '#1E3A8A' };
  if (v === 'На доработке' || v.startsWith('На доработке')) return { bg: '#FEE2E2', fg: '#991B1B' };
  return { bg: '#E5E7EB', fg: '#111827' };
};

const Chip = ({ label, bg, fg }: { label: string; bg: string; fg: string }) => (
  <View style={{ backgroundColor: bg, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
    <Text style={{ color: fg, fontWeight: '600', fontSize: 12 }}>{label}</Text>
  </View>
);

/* ===== счетчик табов (ТОПОВЫЙ ВАРИАНТ) ===== */
const TabCount = ({ n, active }: { n: number; active: boolean }) => {
  if (!n) return null;
  return (
    <View style={[s.tabBadge, active && s.tabBadgeActive]}>
      <Text style={[s.tabBadgeText, active && s.tabBadgeTextActive]}>
        {n}
      </Text>
    </View>
  );
};

/* ==== helper: красивые подписи + сумма по предложению ==== */
function useProposalPretty(proposalId: string | number) {
  const pid = String(proposalId);
  const [title, setTitle] = React.useState<string>('');
  const [total, setTotal] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      setBusy(true);
      try {
        const pi = await supabase
          .from('proposal_items')
          .select('request_item_id, qty, price')
          .eq('proposal_id', pid);

        if (pi.error) throw pi.error;

        const sum = (pi.data || []).reduce((acc: number, r: any) => {
          const qty = Number(r?.qty) || 0;
          const price = Number(String(r?.price ?? '').replace(',', '.')) || 0;
          return acc + qty * price;
        }, 0);

        const ids = Array.from(new Set((pi.data || [])
          .map((r: any) => String(r?.request_item_id))
          .filter(Boolean)));

        let requestIds: string[] = [];
        if (ids.length) {
          const rq = await supabase
            .from('request_items')
            .select('id, request_id')
            .in('id', ids);
          if (!rq.error && Array.isArray(rq.data)) {
            requestIds = Array.from(
              new Set((rq.data as any[]).map((x) => String(x.request_id)))
            );
          }
        }

        let label = '';
        if (requestIds.length) {
          let map: Record<string, string> = {};
          try { map = await batchResolveRequestLabels(requestIds); } catch {}
          const labels = requestIds.map((id) =>
            map?.[id] || (/^\d+$/.test(id) ? `#${id}` : `#${id.slice(0, 8)}`)
          );
          const uniq = Array.from(new Set(labels));
          label =
            uniq.length === 1 ? `${uniq[0]}` :
            uniq.length === 2 ? `${uniq[0]} + ${uniq[1]}` :
            `${uniq[0]} + ${uniq[1]} + … (${uniq.length} заявки)`;
        }

        if (!dead) { setTitle(label); setTotal(sum); }
      } catch {
        if (!dead) { setTitle(''); setTotal(null); }
      } finally {
        if (!dead) setBusy(false);
      }
    })();
    return () => { dead = true; };
  }, [pid]);

  return { title, total, busy };
}

/* ======= Вложения (web) — переименовано, чтобы не было дубля ======= */
function AttachmentUploaderWeb({
  label, onPick, current,
}: {
  label: string;
  onPick: (att: Attachment) => void;
  current?: Attachment;
}) {
  if (!isWeb) return null as any;

  const handlePick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = () => {
      const f = (input.files && input.files[0]) || null;
      if (!f) return;
      onPick({ name: f.name, file: f });
    };
    input.click();
  };

  return (
    <Pressable onPress={handlePick} style={[s.smallBtn, { borderColor: COLORS.primary }]}>
      <Text style={[s.smallBtnText, { color: COLORS.primary }]}>
        {current?.name ? `${label}: ${current.name}` : `Вложение: ${label}`}
      </Text>
    </Pressable>
  );
}

/* =================== Мемо-шапка =================== */
type SummaryHandle = { flush: () => string };
const SummaryBar = React.memo(forwardRef<SummaryHandle, {
  initialFio: string;
  onCommitFio: (fio: string) => void;
  tab: Tab; setTab: (t: Tab) => void;
  pendingCount: number; approvedCount: number; rejectedCount: number;
  pickedCount: number; pickedSum: number;
  onRefresh: () => void;
}>((props, ref) => {
  const {
    initialFio, onCommitFio, tab, setTab,
    pendingCount, approvedCount, rejectedCount,
    pickedCount, pickedSum, onRefresh
  } = props;

  const [draft, setDraft] = useState<string>(initialFio || '');
  const deb = useRef<any>(null);

  useEffect(() => { if (!draft && initialFio) setDraft(initialFio); }, [initialFio]);

  const commit = useCallback((v: string) => {
    const t = v.trim();
    onCommitFio(t);
    return t;
  }, [onCommitFio]);

  useImperativeHandle(ref, () => ({ flush: () => commit(draft) }), [draft, commit]);

  const TabBtn = ({ id, title }: { id: Tab; title: string }) => {
    const active = tab === id;
    return (
      <Pressable
        onPress={() => setTab(id)}
        style={{
          paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
          backgroundColor: active ? COLORS.primary : COLORS.tabInactiveBg
        }}
      >
        <Text style={{ color: active ? '#fff' : COLORS.tabInactiveText, fontWeight: '600' }}>{title}</Text>
      </Pressable>
    );
  };

  return (
    <View style={s.summaryWrap}>
      <Text style={s.summaryTitle}>Снабженец</Text>

      <View style={{ minWidth: 260 }}>
        <Text style={s.summaryMeta}>ФИО снабженца</Text>
        <TextInput
          value={draft}
          onChangeText={(t) => {
            setDraft(t);
            if (deb.current) clearTimeout(deb.current);
            deb.current = setTimeout(() => commit(t), 180);
          }}
          placeholder="введите ФИО"
          style={[s.input, { paddingVertical: 6, backgroundColor: '#fff', borderColor: COLORS.border }]}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <TabBtn id="inbox" title="Инбокс" />
        <TabBtn id="pending" title={`У директора (${pendingCount})`} />
        <TabBtn id="approved" title={`Утверждено (${approvedCount})`} />
        <TabBtn id="rejected" title={`На доработке (${rejectedCount})`} />
      </View>

      <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[s.summaryMeta, { fontWeight: '700', color: COLORS.text }]}>
          Выбрано: {pickedCount} · Сумма: {pickedSum.toLocaleString()} сом
        </Text>
        </View>
    </View>
  );
}));
const BuyerItemRow = React.memo(function BuyerItemRow(props: {
  it: BuyerInboxRow;
  selected: boolean;
  m: LineMeta;
  sum: number;
  prettyText: string;
  onTogglePick: () => void;
  onSetPrice: (v: string) => void;
  onSetSupplier: (v: string) => void;
  onSetNote: (v: string) => void;

  supplierSuggestions: string[];
  onPickSupplier: (name: string) => void;
}) {

  const { it, selected, m, sum, prettyText, onTogglePick, onSetPrice, onSetSupplier, onSetNote, supplierSuggestions, onPickSupplier } = props;

  return (
    <View style={[s.card, { backgroundColor: '#fff' }, selected && s.cardPicked]}>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[s.cardTitle, { color: COLORS.text }]}>{it.name_human}</Text>
              {it.app_code ? (
                <View style={{ backgroundColor: COLORS.chipGrayBg, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 }}>
                  <Text style={{ color: COLORS.chipGrayText, fontWeight: '600', fontSize: 12 }}>{it.app_code}</Text>
                </View>
              ) : null}
            </View>

            <Text style={[s.cardMeta, { color: COLORS.sub }]}>{prettyText}</Text>
          </View>

          <Pressable
            onPress={onTogglePick}
            style={[
              s.smallBtn,
              {
                borderColor: selected ? '#2563eb' : COLORS.border,
                backgroundColor: selected ? '#2563eb' : '#fff',
                minWidth: 86,
                alignItems: 'center',
              },
            ]}
          >
            <Text style={[s.smallBtnText, { color: selected ? '#fff' : COLORS.text }]}>
              {selected ? 'Снять' : 'Выбрать'}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 2 }}>
          <Text style={{ color: COLORS.sub }}>
            Цена: <Text style={{ color: COLORS.text, fontWeight: '700' }}>{m.price || '—'}</Text>{' '}
            • Поставщик: <Text style={{ color: COLORS.text, fontWeight: '700' }}>{m.supplier || '—'}</Text>{' '}
            • Прим.: <Text style={{ color: COLORS.text, fontWeight: '700' }}>{m.note || '—'}</Text>
          </Text>
          <Text style={{ color: COLORS.sub }}>
            Сумма по позиции: <Text style={{ color: COLORS.text, fontWeight: '700' }}>{sum ? sum.toLocaleString() : '0'}</Text> сом
          </Text>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <View style={{ marginLeft: 'auto' }}>
            {selected
              ? <Chip label="Выбрано" bg="#E0F2FE" fg="#075985" />
              : <Chip label="Заполни и выбери" bg="#F1F5F9" fg="#334155" />}
          </View>
        </View>
      </View>

      {selected && (
        <View style={{ marginTop: 10, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Цена</Text>
              <TextInput
                value={String(m.price ?? '')}
                onChangeText={onSetPrice}
                keyboardType="decimal-pad"
                placeholder="Цена"
                style={s.fieldInput}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Поставщик</Text>
              <TextInput
                value={String(m.supplier ?? '')}
                onChangeText={onSetSupplier}
                placeholder="Поставщик"
                style={s.fieldInput}
              />
{supplierSuggestions.length > 0 && (
  <View style={s.suggestBoxInline}>
    {supplierSuggestions.map((name) => (
      <Pressable
        key={name}
        onPress={() => onPickSupplier(name)}
        style={s.suggestItem}
      >
        <Text style={{ color: COLORS.text, fontWeight: '700' }}>{name}</Text>
      </Pressable>
    ))}
  </View>
)}

            </View>
          </View>

          <View>
            <Text style={s.fieldLabel}>Примечание</Text>
            <TextInput
              value={String(m.note ?? '')}
              onChangeText={onSetNote}
              placeholder="Примечание"
              multiline
              style={[s.fieldInput, { minHeight: 44 }]}
            />
          </View>
        </View>
      )}
    </View>
  );
});
const BuyerGroupBlock = React.memo(function BuyerGroupBlock(props: {
  g: Group;
  index: number;
  isOpen: boolean;
  gsum: number;
  headerTitle: string;
  headerMeta: string;
  onToggle: () => void;

  // items
  renderItemRow: (it: BuyerInboxRow, idx2: number) => React.ReactNode;

  // attachments
  isWeb: boolean;
  supplierGroups: string[];
  attachments: AttachmentMap;
  onPickAttachment: (key: string, att: Attachment) => void;
}) {
  const {
    g, isOpen, gsum, headerTitle, headerMeta, onToggle,
    renderItemRow,
    isWeb, supplierGroups, attachments, onPickAttachment,
  } = props;

  return (
    <View style={s.group}>
      <Pressable onPress={onToggle} style={s.groupHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.groupTitle} numberOfLines={1}>{headerTitle}</Text>
          <Text style={s.groupMeta} numberOfLines={1}>{headerMeta}</Text>
        </View>

        <Pressable onPress={onToggle} style={s.openBtn}>
          <Text style={s.openBtnText}>{isOpen ? 'Свернуть' : 'Открыть'}</Text>
        </Pressable>
      </Pressable>

      {isOpen ? (
        <View style={s.openBody}>
          {g.items.some(it => (it as any).director_reject_note) && (
            <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
              <View style={{ backgroundColor: '#FEE2E2', borderRadius: 10, padding: 8 }}>
                <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 13 }}>
                  Отклонено директором
                </Text>
              </View>
            </View>
          )}

          <View style={s.itemsPanel}>
            <View style={s.itemsBox}>
              <View style={s.innerStickyHeader}>
                <Text style={s.innerStickyTitle} numberOfLines={1}>{headerTitle}</Text>
                <Text style={s.innerStickyMeta} numberOfLines={1}>{headerMeta}</Text>
              </View>

              {g.items.map((item, idx2) => (
                <React.Fragment
                  key={item?.request_item_id ? `ri:${item.request_item_id}` : `f:${g.request_id}:${idx2}`}
                >
                  {renderItemRow(item, idx2)}
                </React.Fragment>
              ))}

              <View style={{ height: 12 }} />
            </View>
          </View>

          {isWeb && (
            <View style={{ marginTop: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
              <Text style={{ fontWeight: '600', marginBottom: 4, color: COLORS.text }}>
                Вложения (по группе поставщика):
              </Text>
              <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                {supplierGroups.map((key) => (
                  <AttachmentUploaderWeb
                    key={key}
                    label={key}
                    onPick={(att) => onPickAttachment(key, att)}
                    current={attachments[key]}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
});
const BuyerProposalCard = React.memo(function BuyerProposalCard(props: {
  head: any;
  onOpenPdf: (pidStr: string) => void;
  onOpenAccounting: (pidStr: string) => void;
  onOpenRework: (pidStr: string) => void;
}) {
  const { head, onOpenPdf, onOpenAccounting, onOpenRework } = props;

  const pidStr = String(head.id);
  const sc = statusColors(head.status);
  const headerText = `Предложение #${pidStr.slice(0, 8)}`;

  return (
    <View style={[s.card, { borderStyle: 'solid', backgroundColor: '#fff' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={[s.cardTitle, { color: COLORS.text }]}>{headerText}</Text>
        <Chip label={head.status} bg={sc.bg} fg={sc.fg} />

        <View style={{ backgroundColor: '#DBEAFE', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
          <Text style={{ color: '#1E3A8A', fontWeight: '700', fontSize: 12 }}>
            Сумма: {Number(head.total_sum ?? 0).toLocaleString()} сом
          </Text>
        </View>

        <Text style={[s.cardMeta, { color: COLORS.sub }]}>
          {head.submitted_at ? new Date(head.submitted_at).toLocaleString() : '—'}
        </Text>

        <Pressable
          onPress={() => onOpenPdf(pidStr)}
          style={[s.openBtn, { marginLeft: 'auto', minWidth: 86 }]}
        >
          <Text style={s.openBtnText}>PDF</Text>
        </Pressable>

        {head.status === 'Утверждено' && !head.sent_to_accountant_at && (
  <Pressable
    onPress={() => onOpenAccounting(pidStr)}
    style={[s.smallBtn, { marginLeft: 8, backgroundColor: '#2563eb', borderColor: '#2563eb' }]}
  >
    <Text style={[s.smallBtnText, { color: '#fff' }]}>В бухгалтерию</Text>
  </Pressable>
)}


        {String(head.status).startsWith('На доработке') && (
          <Pressable
            onPress={() => onOpenRework(pidStr)}
            style={[s.smallBtn, { marginLeft: 8, backgroundColor: '#f97316', borderColor: '#f97316' }]}
          >
            <Text style={[s.smallBtnText, { color: '#fff' }]}>Доработать</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});


/* ============================== Экран снабженца ============================== */
export default function BuyerScreen() {
  const [tab, setTab] = useState<Tab>('inbox');
  const [buyerFio, setBuyerFio] = useState<string>('');
const [rfqOpen, setRfqOpen] = useState(false);
const [rfqLastTenderId, setRfqLastTenderId] = useState<string | null>(null);
const [rfqDeadlineIso, setRfqDeadlineIso] = useState<string>(() => {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  return d.toISOString();
});

const SAFE_TOP =
  Platform.OS === 'ios' ? 0 :
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) :
  0;

// ✅ измеряем реальные высоты шапки
const [subH, setSubH] = useState(0);
const [tabsH, setTabsH] = useState(0);

const FALLBACK_TABS_ROW = 54;
const FALLBACK_SUB_ROW  = 92;

const MINI_ROW  = 28;
const TITLE_ROW = 34;

const fullTabs = (tabsH > 0) ? tabsH : FALLBACK_TABS_ROW;
const fullSub = FALLBACK_SUB_ROW;


// ✅ базовая часть шапки (всегда видна): safe + title + tabs
const headerBase = SAFE_TOP + TITLE_ROW + fullTabs;

// ✅ максимум: base + fio + mini
const HEADER_MAX = headerBase + fullSub + MINI_ROW;

// ✅ диапазон схлопывания (только ФИО блок)
const HEADER_SCROLL = fullSub;

// ✅ нормальный scrollY (без отрицательных значений)
const scrollYRaw = useRef(new Animated.Value(0)).current;

// ✅ clamp как у директора
const clampedY = useMemo(
  () => Animated.diffClamp(scrollYRaw, 0, HEADER_SCROLL),
  [scrollYRaw, HEADER_SCROLL]
);

// ✅ ФИО: НЕ трогаем height, только уводим вверх + гасим
const fioOpacity = useMemo(() => (
  clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL || 1],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })
), [clampedY, HEADER_SCROLL]);


// ✅ заголовок уменьшается
const titleSize = useMemo(() => (
  clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL || 1],
    outputRange: [22, 16],
    extrapolate: 'clamp',
  })
), [clampedY, HEADER_SCROLL]);

// ✅ мини-строка появляется когда ФИО “схлопнулось”
const miniOpacity = useMemo(() => (
  clampedY.interpolate({
    inputRange: [0, (HEADER_SCROLL || 1) * 0.8, HEADER_SCROLL || 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  })
), [clampedY, HEADER_SCROLL]);

const miniTranslateY = useMemo(() => (
  clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL || 1],
    outputRange: [6, 0],
    extrapolate: 'clamp',
  })
), [clampedY, HEADER_SCROLL]);
// ✅ мини-строка не должна занимать место, пока скрыта
const miniHeight = useMemo(() => (
  clampedY.interpolate({
    inputRange: [0, (HEADER_SCROLL || 1) * 0.8, HEADER_SCROLL || 1],
    outputRange: [0, 0, MINI_ROW],
    extrapolate: 'clamp',
  })
), [clampedY, HEADER_SCROLL]);

// ✅ ИДЕАЛ: реальная высота ФИО-блока
const fioHeight = useMemo(() => (
  clampedY.interpolate({
    inputRange: [0, HEADER_SCROLL || 1],
    outputRange: [fullSub, 0],
    extrapolate: 'clamp',
  })
), [clampedY, HEADER_SCROLL, fullSub]);

// ✅ ИДЕАЛ: реальная высота header = base + fioHeight + miniHeight
const headerHeightAnim = useMemo(() => (
  Animated.add(
    Animated.add(headerBase as any, fioHeight as any),
    miniHeight as any
  )
), [headerBase, fioHeight, miniHeight]);

const fmtLocal = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

const setDeadlineHours = (hours: number) => {
  const d = new Date(Date.now() + hours * 3600 * 1000);
  setRfqDeadlineIso(d.toISOString());
};

  // INBOX
  const [rows, setRows] = useState<BuyerInboxRow[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // выбор/мета
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [meta, setMeta] = useState<Record<string, LineMeta>>({});
  const [attachments, setAttachments] = useState<AttachmentMap>({});
  const [creating, setCreating] = useState(false);
  // вкладки статусов
  const [pending, setPending]   = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  
  // справочник поставщиков
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);

  const summaryRef = useRef<{ flush: () => string } | null>(null);

  // модалка «В бухгалтерию»
  const [acctOpen, setAcctOpen] = useState(false);
  const [acctProposalId, setAcctProposalId] = useState<string | number | null>(null);
  const [invNumber, setInvNumber] = useState('');
  const [invDate, setInvDate] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invCurrency, setInvCurrency] = useState('KGS');
  const [invFile, setInvFile] = useState<any | null>(null);
  const [acctBusy, setAcctBusy] = useState(false);
  // карточка поставщика для модалки бухгалтера (read-only)
  const [acctSupp, setAcctSupp] = useState<{
    name: string;
    inn?: string | null;
    bank?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null>(null);
const listRef = useRef<FlatList<any> | null>(null);
const tabsScrollRef = useRef<ScrollView | null>(null);
const scrollTabsToStart = useCallback((animated = true) => {
  try { tabsScrollRef.current?.scrollTo?.({ x: 0, y: 0, animated }); } catch {}
}, []);

const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
const [expandedReqIndex, setExpandedReqIndex] = useState<number | null>(null);

const toggleReq = useCallback((rid: string, index: number) => {
  setExpandedReqId(prev => (prev === rid ? null : rid));
  setExpandedReqIndex(prev => (prev === index ? null : index));

  requestAnimationFrame(() => {
    try {
      listRef.current?.scrollToIndex?.({ index, animated: true, viewPosition: 0 });
    } catch {}
  });
}, []);

  // документ предложения в модалке
  const [propDocAttached, setPropDocAttached] = useState<{ name: string; url?: string } | null>(null);
  const [propDocBusy, setPropDocBusy] = useState(false);
const focusedRef = useRef(false);
const lastInboxKickRef = useRef(0);
const lastBucketsKickRef = useRef(0);

  // мгновенная загрузка invoice (web/native)
  const invoiceInputRef = useRef<HTMLInputElement | null>(null);
  const [invoiceUploadedName, setInvoiceUploadedName] = useState<string>('');

  // КЭШ человекочитаемых номеров заявок
  const [displayNoByReq, setDisplayNoByReq] = useState<Record<string, string>>({});
  const prettyLabel = useCallback((rid: string, ridOld?: number | null) => {
    const key = String(rid).trim();
    const dn = displayNoByReq[key];
    if (dn) return `Заявка ${dn}`;
    return `Заявка ${formatRequestDisplay(String(rid), ridOld ?? null)}`;
  }, [displayNoByReq]);

  const preloadDisplayNos = useCallback(async (ids: string[]) => {
    const uniq = Array.from(new Set(ids.filter(Boolean)));
    const need = uniq.filter(id => displayNoByReq[id] == null);
    if (!need.length) return;
    try {
      const map = await batchResolveRequestLabels(need);
      if (map && typeof map === 'object') {
        setDisplayNoByReq(prev => ({ ...prev, ...map }));
      }
    } catch { /* no-op */ }
  }, [displayNoByReq]);

  const openInvoicePickerWeb = useCallback(() => {
    if (Platform.OS !== 'web') return;
    invoiceInputRef.current?.click?.();
  }, []);

  const onInvoiceFileChangeWeb = useCallback(async (e: any) => {
    try {
      const f = e?.target?.files?.[0];
      if (!f) return;
      if (!acctProposalId) { Alert.alert('Ошибка', 'Не выбран документ'); return; }
      const pidStr = String(acctProposalId);
      await uploadProposalAttachment(pidStr, f, f.name, 'invoice');
      setInvoiceUploadedName(f.name);
      Alert.alert('Готово', `Счёт прикреплён: ${f.name}`);
    } catch (err: any) {
      Alert.alert('Ошибка загрузки', err?.message ?? String(err));
    } finally {
      if (invoiceInputRef.current) (invoiceInputRef.current as any).value = '';
    }
  }, [acctProposalId]);

  // авто ФИО
  useEffect(() => {
    (async () => {
      try {
        if (buyerFio) return;
        const { data } = await supabase.auth.getUser();
        const fio =
          (data?.user?.user_metadata?.full_name?.trim()) ||
          (data?.user?.user_metadata?.name?.trim()) || '';
        if (fio) { setBuyerFio(fio); }
      } catch {}
    })();
  }, [buyerFio]);
// ✅ один раз (не уезжает вправо при кликах)
const didAutoScrollTabs = useRef(false);

useEffect(() => {
  if (Platform.OS === 'web') return;
  if (didAutoScrollTabs.current) return;
  didAutoScrollTabs.current = true;

  requestAnimationFrame(() => {
    scrollTabsToStart(false); // ✅ всегда в начало, без прыжка
  });
}, [scrollTabsToStart]);
  /* ==================== Загрузка ==================== */
  const fetchInbox = useCallback(async () => {
  if (!focusedRef.current) return;

 const now = Date.now();
if (now - lastInboxKickRef.current < 900) return;
lastInboxKickRef.current = now;

  setLoadingInbox(true);
  try {
    // 1) Берём инбокс только через API-слой:
    //    listBuyerInbox уже:
    //    - дергает RPC list_buyer_inbox
    //    - ЖЁСТКО режет статусы по ['Утверждено','К закупке']
    //    - имеет fallback по request_items
    let inbox: BuyerInboxRow[] = [];
    try {
      inbox = await listBuyerInbox();
    } catch (e) {
      console.warn('[buyer] listBuyerInbox ex:', (e as any)?.message ?? e);
      inbox = [];
    }

    // 2) Убираем позиции, которые уже попали в proposals,
//    НО только если предложение ещё "живое" (не отклонено/не завершено).
// 2) Убираем позиции, которые уже попали в proposals,
// но только если они в "живых" предложениях.
let taken = new Set<string>();
try {
  // 1) активные предложения
  const p = await supabase
    .from('proposals')
    .select('id')
    .in('status', ['На утверждении', 'Утверждено', 'На доработке']);

  const pids = (!p.error && Array.isArray(p.data))
    ? (p.data as any[]).map(x => String(x.id)).filter(Boolean)
    : [];

  // 2) request_item_id только из активных proposals
  if (pids.length) {
    const pi = await supabase
      .from('proposal_items')
      .select('request_item_id')
      .in('proposal_id', pids);

    if (!pi.error && Array.isArray(pi.data)) {
      taken = new Set(
        (pi.data as any[])
          .map(r => String(r?.request_item_id ?? ''))
          .filter(Boolean)
      );
    }
  }
} catch (e) {
  console.warn('[buyer] taken filter failed:', (e as any)?.message ?? e);
}

const filtered = (inbox || []).filter((r: any) => {
  const id = String(r?.request_item_id ?? '');
  return id && !taken.has(id);
});

setRows(filtered as BuyerInboxRow[]);



    // 3) предзагрузка красивых номеров заявок
    const ids = Array.from(new Set(filtered.map(r => String(r.request_id))));
    preloadDisplayNos(ids);
  } catch (e) {
    console.error('[buyer] fetchInbox:', (e as any)?.message ?? e);
    Alert.alert('Ошибка', 'Не удалось загрузить инбокс снабженца');
    setRows([]);
  } finally {
    setLoadingInbox(false);
  }
}, [preloadDisplayNos]);

  const fetchBuckets = useCallback(async () => {
  if (!focusedRef.current) return;

const now = Date.now();
if (now - lastBucketsKickRef.current < 900) return;
lastBucketsKickRef.current = now;

  setLoadingBuckets(true);
    try {
      // === У ДИРЕКТОРА ===
      const p = await supabase
        .from('proposals')
        .select('id, status, submitted_at')
        .eq('status', 'На утверждении')
        .order('submitted_at', { ascending: false });
      setPending(!p.error ? (p.data || []) : []);

     // === УТВЕРЖДЕНО (ПОКАЗЫВАЕМ ВСЕ: и у бухгалтера тоже) ===
const apQ = await supabase
  .from('v_proposals_summary')
  .select('proposal_id, status, submitted_at, sent_to_accountant_at, total_sum')
  .eq('status', 'Утверждено')
  // ✅ ВАЖНО: НЕ режем по sent_to_accountant_at
  .order('submitted_at', { ascending: false });

const approvedClean = (!apQ.error && Array.isArray(apQ.data))
  ? (apQ.data as any[]).map(x => ({
      id: String(x.proposal_id),
      status: String(x.status),
      submitted_at: x.submitted_at ?? null,
      total_sum: Number(x.total_sum ?? 0),
      sent_to_accountant_at: x.sent_to_accountant_at ?? null, // ✅ для UI
    }))
  : [];
setApproved(approvedClean);

      // === НА ДОРАБОТКЕ у снабженца ===
      const reDir = await supabase
        .from('proposals')
        .select('id, status, payment_status, submitted_at, created_at, sent_to_accountant_at')
        .ilike('status', '%На доработке%')
        .is('sent_to_accountant_at', null)
        .order('submitted_at', { ascending: false, nullsLast: true })
        .order('created_at',   { ascending: false, nullsLast: true });

      const reAcc = await supabase
        .from('proposals')
        .select('id, status, payment_status, submitted_at, created_at, sent_to_accountant_at')
        .ilike('payment_status', '%На доработке%')
        .order('submitted_at', { ascending: false, nullsLast: true })
        .order('created_at',   { ascending: false, nullsLast: true });

      const comb = [...(reDir.data || []), ...(reAcc.data || [])];
      const seen = new Set<string>();
      const rejectedRows = comb
        .filter((x: any) => {
          const id = String(x?.id ?? '').trim();
          if (!id || seen.has(id)) return false;
          seen.add(id);

          const st   = String(x?.status ?? '').toLowerCase();
          const ps   = String(x?.payment_status ?? '').toLowerCase();
          const sent = !!x?.sent_to_accountant_at;

          const isDirectorRework   = st.startsWith('на доработке') && !sent;
          const isAccountantRework = ps.startsWith('на доработке');
          return isDirectorRework || isAccountantRework;
        })
        .map((x: any) => {
          const ps = String(x.payment_status ?? '');
          const st = String(x.status ?? '');
          const submitted_at = x.submitted_at ?? x.created_at ?? null;
          const showStatus = ps.toLowerCase().startsWith('на доработке') ? ps : (st || 'На доработке');
          return { id: String(x.id), status: showStatus, submitted_at };
        });

      setRejected(rejectedRows);


    } catch (e) {
      console.warn('[buyer] fetchBuckets error:', (e as any)?.message ?? e);
    } finally {
      setLoadingBuckets(false);
    }
  }, []);

 useFocusEffect(
  useCallback(() => {
    focusedRef.current = true;

    fetchInbox();
    fetchBuckets();

    const chNotif = supabase
  .channel('notif-buyer-rt')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'role=eq.buyer' },
    (payload: any) => {
      if (!focusedRef.current) return;
      const n = payload?.new || {};
      Alert.alert(n.title || 'Уведомление', n.body || '');
      fetchBuckets();
    }
  )
  .subscribe();

// ✅ ИДЕАЛЬНО: слушаем proposals → любые изменения статусов сразу обновляют табы
const chProps = supabase
  .channel('buyer-proposals-rt')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'proposals' },
    () => {
      if (!focusedRef.current) return;
      fetchBuckets();
    }
  )
  .subscribe();

return () => {
  focusedRef.current = false;
  try { supabase.removeChannel(chNotif); } catch {}
  try { supabase.removeChannel(chProps); } catch {}
};

  }, [fetchInbox, fetchBuckets])
);

  const onRefresh = useCallback(async () => {
    
  setRefreshing(true);
  await fetchInbox();
  await fetchBuckets();
  setRefreshing(false);
}, [fetchInbox, fetchBuckets]);

  // — Загрузка справочника поставщиков один раз
  useEffect(() => {
    (async () => {
      if (suppliersLoaded) return;
      try {
        const list = await listSuppliers();
        setSuppliers(list);
        setSuppliersLoaded(true);
      } catch (e) {
        console.warn('[buyer] suppliers load failed', e);
      }
    })();
  }, [suppliersLoaded]);

  // ✅ подсказки поставщиков по введённому тексту
const getSupplierSuggestions = useCallback((q: string) => {
  const needle = normName(q);
  if (!needle) return [];
  return (suppliers || [])
    .filter((s) => normName((s as any)?.name).includes(needle))
    .slice(0, 8)
    .map((s) => (s as any).name as string)
    .filter(Boolean);
}, [suppliers]);


  /* ==================== Группировка и итоги ==================== */
  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>();
    for (const r of rows) {
      const rid = String((r as any).request_id);
      const ridOld = (r as any).request_id_old ?? null;
      if (!map.has(rid)) map.set(rid, { request_id: rid, request_id_old: ridOld, items: [] as BuyerInboxRow[] });
      map.get(rid)!.items.push(r);
    }
    return Array.from(map.values());
  }, [rows]);

  const pickedIds = useMemo(() => Object.keys(picked).filter(k => picked[k]), [picked]);

  // показываем человекочитаемое имя, но ключ — нормализованный
  const supplierGroups = useMemo(() => {
    const map = new Map<string, string>(); // key: normalized, val: display
    for (const id of pickedIds) {
      const raw = (meta[id]?.supplier || '').trim();
      const key = normName(raw) || SUPP_NONE;
      const display = raw || SUPP_NONE;
      if (!map.has(key)) map.set(key, display);
    }
    const out = Array.from(map.values());
    return out.length ? out : [SUPP_NONE];
  }, [pickedIds, meta]);

  const priceNum = (s?: string) => {
    const n = Number(String(s ?? '').replace(',', '.').trim());
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const lineTotal = (it: BuyerInboxRow) => {
    const key = it.request_item_id ?? '';
    const qty = Number(it.qty) || 0;
    return qty * priceNum(meta[key]?.price);
  };
  const requestSum = (g: Group) => g.items.reduce((acc, it) => acc + lineTotal(it), 0);
  const pickedTotal = useMemo(() => {
    let sum = 0; const set = new Set(pickedIds);
    for (const r of rows) if (r.request_item_id && set.has(r.request_item_id)) sum += lineTotal(r);
    return sum;
  }, [pickedIds, rows, meta]);

/* ==================== Выбор/редактирование ==================== */
  const togglePick = useCallback((ri: BuyerInboxRow) => {
    const key = ri.request_item_id ?? '';
    if (!key) return;
    setPicked(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const clearPick = useCallback(() => setPicked({}), []);
  // ===== helper: запись meta по строке =====
const setLineMeta = useCallback((id: string, patch: Partial<LineMeta>) => {
  if (!id) return;
  setMeta(prev => ({
    ...prev,
    [id]: { ...(prev[id] || {}), ...patch },
  }));
}, []);

// ===== helper: применить к выбранным в заявке =====
const applyToPickedInGroup = useCallback((g: Group, patch: Partial<LineMeta>) => {
  setMeta(prev => {
    const next = { ...prev };
    for (const it of g.items) {
      const id = String(it?.request_item_id || '');
      if (!id) continue;
      if (!picked[id]) continue;
      next[id] = { ...(next[id] || {}), ...patch };
    }
    return next;
  });
}, [picked]);

    const renderItemRow = useCallback((it: BuyerInboxRow, idx2: number) => {
  const key = String(it.request_item_id ?? '');
  const selected = !!picked[key];
  const m = (key && meta[key]) || {};
  const sum = lineTotal(it);
  const ridOld = (it as any).request_id_old as number | null | undefined;

  const prettyText = `${prettyLabel(String(it.request_id), ridOld)} · ${it.qty} ${it.uom || ''}`;
const sugg = getSupplierSuggestions(String(m.supplier ?? ''));

return (
  <BuyerItemRow
    it={it}
    selected={selected}
    m={m}
    sum={sum}
    prettyText={prettyText}
    onTogglePick={() => togglePick(it)}
    onSetPrice={(v) => setLineMeta(key, { price: v })}
    onSetSupplier={(v) => setLineMeta(key, { supplier: v })}
    onSetNote={(v) => setLineMeta(key, { note: v })}

    supplierSuggestions={sugg}
    onPickSupplier={(name) => {
  // 1) ставим supplier
  // 2) если нашли карточку поставщика — дописываем реквизиты в note (как раньше)
  const match = (suppliers || []).find(s => normName(s.name) === normName(name)) || null;

  let newNote = String(m.note ?? '').trim();

  if (match) {
    const parts: string[] = [];
    if (match.inn)          parts.push(`ИНН: ${match.inn}`);
    if (match.bank_account) parts.push(`Счёт: ${match.bank_account}`);
    if (match.phone)        parts.push(`Тел.: ${match.phone}`);
    if (match.email)        parts.push(`Email: ${match.email}`);

    if (parts.length) {
      const line = parts.join(' · ');
      // чтобы не дублировать реквизиты по 10 раз:
      const cleaned = newNote
        .split('\n')
        .filter(ln => !ln.includes('ИНН:') && !ln.includes('Счёт:') && !ln.includes('Тел.:') && !ln.includes('Email:'))
        .join('\n')
        .trim();

      newNote = cleaned ? `${cleaned}\n${line}` : line;
    }
  }

  setLineMeta(key, { supplier: name, note: newNote });
}}

  />
);
}, [picked, meta, lineTotal, prettyLabel, togglePick, setLineMeta, getSupplierSuggestions]);


const renderGroupBlock = useCallback((g: Group, index: number) => {
  const gsum = requestSum(g);
  const isOpen = expandedReqId === g.request_id;

  const headerTitle = prettyLabel(g.request_id, g.request_id_old ?? null);
  const headerMeta = `${g.items.length} позиций${gsum ? ` · итого ${gsum.toLocaleString()} сом` : ''}`;

  return (
    <BuyerGroupBlock
      g={g}
      index={index}
      isOpen={isOpen}
      gsum={gsum}
      headerTitle={headerTitle}
      headerMeta={headerMeta}
      onToggle={() => toggleReq(g.request_id, index)}
      renderItemRow={renderItemRow}
      isWeb={isWeb}
      supplierGroups={supplierGroups}
      attachments={attachments}
      onPickAttachment={(key, att) => setAttachments(prev => ({ ...prev, [key]: att }))}
    />
  );
}, [expandedReqId, prettyLabel, requestSum, toggleReq, renderItemRow, supplierGroups, attachments, setAttachments]);

  


  /* ==================== Снимок полей в proposal_items ==================== */
  const snapshotProposalItems = useCallback(async (proposalId: number | string, ids: string[]) => {
    try {
      let riData: any[] = [];
      try {
        const ri = await supabase
          .from('request_items')
          .select('id, name_human, uom, qty, app_code, rik_code')
          .in('id', ids);
        if (!ri.error && Array.isArray(ri.data)) riData = ri.data;
      } catch {}
      if (!riData.length) {
        const byId = new Map(rows.map(r => [String(r.request_item_id), r]));
        riData = ids.map(id => {
          const r = byId.get(String(id)) || ({} as any);
          return {
            id,
            name_human: (r as any).name_human ?? null,
            uom: (r as any).uom ?? null,
            qty: (r as any).qty ?? null,
            app_code: (r as any)?.app_code ?? null,
            rik_code: (r as any)?.rik_code ?? null,
          };
        });
      }

      for (const r of riData) {
        const m = meta[String(r.id)] || {};
        const upd: any = {
          name_human: r.name_human ?? null,
          uom: r.uom ?? null,
          qty: r.qty ?? null,
          app_code: r.app_code ?? null,
          rik_code: r.rik_code ?? null,
        };
        if (m.price != null && String(m.price).trim() !== '') {
          const pv = Number(String(m.price).replace(',', '.'));
          if (Number.isFinite(pv)) upd.price = pv;
        }
        // ⚠️ supplier здесь НЕ трогаем — уже задан единообразно при формировании пропозала
        if (m.note) upd.note = m.note;

        await supabase
          .from('proposal_items')
          .update(upd)
          .eq('proposal_id', String(proposalId))
          .eq('request_item_id', r.id);
      }
    } catch (e) {
      console.warn('[snapshotProposalItems]', e);
    }
  }, [rows, meta]);

  // buyer_fio в proposals
  async function setProposalBuyerFio(propId: string | number, typedFio?: string) {
    try {
      let fio = (typedFio ?? '').trim();
      if (!fio) {
        const { data } = await supabase.auth.getUser();
        fio =
          (data?.user?.user_metadata?.full_name?.trim()) ||
          (data?.user?.user_metadata?.name?.trim()) ||
          'Снабженец';
      }
      await supabase.from('proposals')
        .update({ buyer_fio: fio })
        .eq('id', String(propId));
    } catch (e) {
      console.warn('[buyer_fio]', (e as any)?.message ?? e);
    }
  }

  /* ======= helper: чанки по 50 для безопасной вставки ======= */
  const chunk = <T,>(arr: T[], n = 50) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  /* ==================== Отправка предложений ==================== */
  const validatePicked = useCallback(() => {
    const missing: string[] = [];
    for (const g of groups) {
      g.items.forEach((it, idx) => {
        const key = String(it.request_item_id || `${g.request_id}:${idx}`);
        if (!picked[key]) return;
        const m = meta[key] || {};
        if (!m.price || !m.supplier) missing.push(`• ${formatRequestDisplay(g.request_id, g.request_id_old)}: ${it.name_human}`);
      });
    }
    if (missing.length) {
      Alert.alert('Заполните данные', `Укажи цену и поставщика:\n\n${missing.slice(0,10).join('\n')}${missing.length>10?'\n…':''}`);
      return false;
    }
    return true;
  }, [groups, picked, meta]);

  const removeFromInboxLocally = useCallback((ids: string[]) => {
    setRows(prev => prev.filter(r => !ids.includes(String(r.request_item_id))));
  }, []);

  

  const handleCreateProposalsBySupplier = useCallback(async () => {
    const ids = pickedIds;
    if (ids.length === 0) { Alert.alert('Пусто', 'Выбери позиции'); return; }
    if (!validatePicked()) return;

    // --- НОРМАЛИЗОВАННАЯ группировка по поставщику ---
    // ключ = normName(raw), отображаемое имя = raw || SUPP_NONE
    const bySupp = new Map<string, { ids: string[]; display: string }>();
    for (const id of ids) {
      const raw = (meta[id]?.supplier || '').trim();
      const key = normName(raw) || SUPP_NONE;
      const display = raw || SUPP_NONE;
      if (!bySupp.has(key)) bySupp.set(key, { ids: [], display });
      bySupp.get(key)!.ids.push(id);
    }

    try {
      setCreating(true);
      const fioNow = summaryRef.current?.flush() || buyerFio;

      const payload = Array.from(bySupp.values()).map((bucket) => ({
        supplier: bucket.display === SUPP_NONE ? null : bucket.display,
        request_item_ids: bucket.ids,
        meta: bucket.ids.map((id) => ({
          request_item_id: id,
          price: meta[id]?.price ?? null,
          supplier: bucket.display || SUPP_NONE,
          note: meta[id]?.note ?? null,
        })),
      }));

      const result = await apiCreateProposalsBySupplier(payload, {
        buyerFio: fioNow,
        requestItemStatus: 'У директора',
      });

      const created = result?.proposals ?? [];
      if (!created.length) {
        Alert.alert('Внимание', 'Не удалось сформировать предложения');
        return;
      }

      const affectedIds = created.flatMap((p) => p.request_item_ids);
try {
  await supabase.from('request_items')
    .update({ director_reject_note: null, director_reject_at: null })
    .in('id', affectedIds);
} catch {}

      removeFromInboxLocally(affectedIds);
      clearPick();

      Alert.alert('Отправлено', `Создано предложений: ${created.length}`);
      await fetchInbox();
      await fetchBuckets();
      setTab('pending');
    } catch (e: any) {
      console.error('[buyer] createProposalsBySupplier:', e?.message ?? e);
      Alert.alert('Ошибка', e?.message ?? 'Не удалось сформировать предложения');
    } finally {
      setCreating(false);
    }
  }, [
    buyerFio,
    pickedIds,
    validatePicked,
    meta,
    clearPick,
    fetchInbox,
    fetchBuckets,
    removeFromInboxLocally,
    apiCreateProposalsBySupplier,
    setTab,
  ]);

  // ===== Fallback: строим простой HTML на клиенте, если серверный HTML пуст =====
  async function buildFallbackProposalHtmlClient(pid: string | number): Promise<string> {
    const pidStr = String(pid);

    // тянем строки предложения
    let rows: any[] = [];
    try {
      const r = await proposalItems(pidStr);
      rows = Array.isArray(r) ? r : [];
    } catch { rows = []; }

    // красивый заголовок
    let pretty = '';
    try { pretty = (await resolveProposalPrettyTitle(pidStr)) || ''; } catch {}

    // метаданные
    let meta: any = {};
    try {
      const q = await supabase
        .from('proposals')
        .select('buyer_fio,status,submitted_at')
        .eq('id', pidStr)
        .maybeSingle();
      if (!q.error && q.data) meta = q.data;
    } catch {}

    const esc = (s: any) =>
      String(s ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]!));

    let total = 0;
    const trs = rows.map((r: any, i: number) => {
      const qty = Number(r?.total_qty ?? r?.qty ?? 0) || 0;
      const uom = r?.uom ?? '';
      const name = r?.name_human ?? '';
      const rik = r?.rik_code ? ` (${r.rik_code})` : '';
      const price = r?.price != null ? Number(r.price) : NaN;
      const sum = Number.isFinite(price) ? qty * price : NaN;
      if (Number.isFinite(sum)) total += sum;
      return `<tr>
      <td>${i + 1}</td>
      <td>${esc(name)}${esc(rik)}</td>
      <td>${qty}</td>
      <td>${esc(uom)}</td>
      <td>${Number.isFinite(price) ? price.toLocaleString() : '—'}</td>
      <td>${Number.isFinite(sum) ? sum.toLocaleString() : '—'}</td>
    </tr>`;
    }).join('');

    const title =
      pretty ? `Предложение: ${esc(pretty)}` : `Предложение #${esc(pidStr).slice(0,8)}`;

    return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  :root{ --text:#0f172a; --sub:#475569; --border:#e2e8f0; --bg:#ffffff; }
  body{ font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; margin:24px; color:var(--text); background:var(--bg); }
  h1{ margin:0 0 8px; font-size:20px; }
  .meta{ color:var(--sub); margin-bottom:12px; }
  table{ width:100%; border-collapse:collapse; }
  th,td{ border:1px solid var(--border); padding:8px; text-align:left; vertical-align:top; }
  th{ background:#f8fafc; }
  tfoot td{ font-weight:700; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Статус: ${esc(meta.status ?? '—')} · Снабженец: ${esc(meta.buyer_fio ?? '—')} · Отправлено: ${meta.submitted_at ? new Date(meta.submitted_at).toLocaleString() : '—'}</div>

  <table>
    <thead>
      <tr><th>#</th><th>Наименование</th><th>Кол-во</th><th>Ед.</th><th>Цена</th><th>Сумма</th></tr>
    </thead>
    <tbody>
      ${trs || '<tr><td colspan="6" style="color:#64748b">Пусто</td></tr>'}
    </tbody>
    <tfoot>
      <tr><td colspan="5" style="text-align:right">Итого:</td><td>${total ? total.toLocaleString() : '0'}</td></tr>
    </tfoot>
  </table>
</body></html>`;
  }

  /* ==================== PDF (buyer): JSON-RPC → новая вкладка (надёжно) ==================== */
  const openPdfNewWindow = useCallback(async (pid: string | number) => {
    const writeSafe = (w: Window | null, html: string) => {
      if (!w) return;
      try { w.document.open(); w.document.write(html); w.document.close(); w.focus(); } catch {}
    };

    try {
      const fioNow = summaryRef.current?.flush() || buyerFio;
      await setProposalBuyerFio(pid, fioNow);

      if (!isWeb) { await exportProposalPdf(pid as any); return; }

      const w = window.open('about:blank', '_blank');
      if (!w) { Alert.alert('Pop-up', 'Разрешите всплывающие окна для сайта.'); return; }
      writeSafe(
        w,
        '<!doctype html><meta charset="utf-8"><title>Готовим…</title>' +
        '<body style="font-family:system-ui;padding:24px;color:#0f172a">' +
        '<h1>Готовим документ…</h1><p>Пожалуйста, подождите.</p></body>'
      );

      const html = await buildProposalPdfHtml(String(pid));
      writeSafe(w, html);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      const w = window.open('', '_blank');
      if (w) {
        writeSafe(w, `<!doctype html><meta charset="utf-8"><title>Ошибка</title>
        <body style="font-family:system-ui;padding:24px;color:#0f172a">
          <h1>Ошибка</h1>
          <pre style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:8px">${msg}</pre>
        </body>`);
        return;
      }
      Alert.alert('Ошибка', msg);
    }
  }, [buyerFio]);

  /* ====== файл предложения в модалке бухгалтера ====== */
  async function ensureProposalDocumentAttached(pidStr: string) {
    setPropDocBusy(true);
    try {
      const q = await supabase
        .from('proposal_attachments')
        .select('id, file_name')
        .eq('proposal_id', pidStr)
        .eq('group_key', 'proposal_pdf')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!q.error && q.data && q.data.length) {
        setPropDocAttached({ name: q.data[0].file_name });
      } else {
        const html = await buildProposalPdfHtml(pidStr);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const name = `proposal_${pidStr.slice(0, 8)}.html`;
        await uploadProposalAttachment(pidStr, blob as any, name, 'proposal_pdf');
        setPropDocAttached({ name });
      }
    } catch (e) {
      console.warn('[buyer] ensureProposalDocumentAttached]:', (e as any)?.message ?? e);
    } finally {
      setPropDocBusy(false);
    }
  }

  // подтягиваем сумму и карточку поставщика по proposal_id
  async function prefillAccountingFromProposal(pidStr: string) {
    try {
      const pi = await supabase
        .from('proposal_items')
        .select('supplier, qty, price')
        .eq('proposal_id', pidStr);

      const rows: any[] = (!pi.error && Array.isArray(pi.data)) ? (pi.data as any[]) : [];
      let total = 0;
      for (const r of rows) {
        const qty   = Number(r?.qty)   || 0;
        const price = Number(r?.price) || 0;
        total += qty * price;
      }
      if (total > 0) setInvAmount(String(total));  // автоподстановка суммы

      // определяем поставщика (если их несколько — берём первого)
      const names = Array.from(new Set(rows.map(r => String(r?.supplier || '').trim()).filter(Boolean)));
      const name = names[0] || '';

      if (name) {
        // ищем карточку в справочнике (без регистра)
        const cardQ = await supabase
          .from('suppliers')
          .select('name, inn, bank_account, phone, email')
          .ilike('name', name)
          .maybeSingle();

        const card: any = (!cardQ.error && cardQ.data) ? cardQ.data : { name };
        setAcctSupp({
          name: card.name || name,
          inn: card.inn || null,
          bank: card.bank_account || null,
          phone: card.phone || null,
          email: card.email || null,
        });
      } else {
        setAcctSupp(null);
      }
    } catch {
      setAcctSupp(null);
    }
  }

  /* ====== «В бухгалтерию» ====== */
  function openAccountingModal(proposalId: string | number) {
    setAcctProposalId(proposalId);
    setInvNumber('');
    setInvDate(new Date().toISOString().slice(0, 10));
    setInvAmount('');
    setInvCurrency('KGS');
    setInvFile(null);
    setPropDocAttached(null);
    setAcctSupp(null);
    setAcctOpen(true);
    ensureProposalDocumentAttached(String(proposalId));
    prefillAccountingFromProposal(String(proposalId));
  }

  async function pickInvoiceFile(): Promise<any | null> {
    try {
      if (Platform.OS === 'web') {
        return await new Promise<any | null>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pdf,.jpg,.jpeg,.png';
          input.onchange = () => {
            const f = (input.files && input.files[0]) || null;
            resolve(f);
          };
          input.click();
        });
      } else {
        // @ts-ignore
        const DocPicker = await import('expo-document-picker');
        const res = await (DocPicker as any).getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
        if (res?.canceled) return null;
        const f = res?.assets?.[0] ?? res;
        return f || null;
      }
    } catch (e) {
      Alert.alert('Файл', (e as any)?.message ?? String(e));
      return null;
    }
  }

  // гарантируем, что после отправки в бухгалтерию у заявки стоят флаги,
  // по которым она больше НИКОГДА не вернётся в «Утверждено»
  async function ensureAccountingFlags(pidStr: string, invoiceAmountNum?: number) {
    try {
      const chk = await supabase
        .from('proposals')
        .select('payment_status, sent_to_accountant_at, invoice_amount')
        .eq('id', pidStr)
        .maybeSingle();

      if (chk.error) return; // не мешаем UX

      const ps = String(chk.data?.payment_status ?? '').trim();
      const sent = !!chk.data?.sent_to_accountant_at;
      const shouldReset = ps.length === 0 || /^на доработке/i.test(ps);

      // если нет sent или статус пуст/«на доработке» — перевести в «К оплате»; дописать сумму, если её не было
      if (!sent || shouldReset || (chk.data?.invoice_amount == null && typeof invoiceAmountNum === 'number')) {
        const upd: any = {};
        if (!sent) upd.sent_to_accountant_at = new Date().toISOString();
        if (shouldReset) upd.payment_status = 'К оплате';
        if (chk.data?.invoice_amount == null && typeof invoiceAmountNum === 'number') {
          upd.invoice_amount = invoiceAmountNum;
        }
        if (Object.keys(upd).length) {
          await supabase.from('proposals').update(upd).eq('id', pidStr);
          await proposalSubmit(pidStr as any);   // чтобы статус согласования не «переехал» назад
        }
      }
    } catch (e) {
      // no-op: не блокируем UX при сетевых сбоях
    }
  }

  async function sendToAccounting() {
    if (!acctProposalId) return;

    // 1) валидация полей
    const amount = Number(String(invAmount).replace(',', '.'));
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(invDate.trim());
    if (!invNumber.trim()) { Alert.alert('№ счёта', 'Укажите номер счёта'); return; }
    if (!dateOk)          { Alert.alert('Дата счёта', 'Формат YYYY-MM-DD'); return; }
    if (!Number.isFinite(amount) || amount <= 0) { Alert.alert('Сумма', 'Введите положительную сумму'); return; }

    setAcctBusy(true);
    const pidStr = String(acctProposalId);

    try {
      // 2) если ещё не грузили мгновенно — прикрепим выбранный файл как invoice
      if (!invoiceUploadedName && invFile) {
        await uploadProposalAttachment(pidStr, invFile, (invFile.name ?? 'invoice.pdf'), 'invoice');
      }

      // 3) HTML предложения (если ещё нет) — создаём/обновляем
      try {
        const html = await buildProposalPdfHtml(pidStr);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        await uploadProposalAttachment(pidStr, blob as any, `proposal_${pidStr.slice(0, 8)}.html`, 'proposal_pdf');
      } catch (e: any) {
        console.warn('[buyer] attach proposal doc failed:', e?.message ?? e);
      }

      // 4) отправка в бухгалтерию (адаптер дергает рабочий RPC)
      let sentOk = false;
      try {
        await proposalSendToAccountant({
          proposalId: pidStr,
          invoiceNumber: invNumber.trim(),
          invoiceDate:   invDate.trim(),
          invoiceAmount: amount,
          invoiceCurrency: (invCurrency || 'KGS').trim(),
        });
        sentOk = true;
      } catch {
        const { error } = await supabase.rpc('proposal_send_to_accountant_min', {
          p_proposal_id: pidStr,
          p_invoice_number: invNumber.trim(),
          p_invoice_date:   invDate.trim(),
          p_invoice_amount: amount,
          p_invoice_currency: (invCurrency || 'KGS').trim(),
        });
        if (error) throw error;
        sentOk = true;
      }

      // ✅ ГАРАНТ-ФЛАГИ: помечаем, что ушло в бухгалтерию (и ставим 'К оплате', если пусто)
      await ensureAccountingFlags(pidStr, amount);

      // 5) контроль — локально убрать из «Утверждено» и обновить бакеты
      const chk = await supabase
        .from('proposals')
        .select('payment_status, sent_to_accountant_at')
        .eq('id', pidStr)
        .maybeSingle();
      if (chk.error) throw chk.error;

      setApproved(prev => prev.filter(p => String(p.id) !== pidStr));
      await fetchBuckets();

      Alert.alert('Готово', 'Счёт отправлен бухгалтеру.');
      setAcctOpen(false);
    } catch (e: any) {
      const msg = e?.message ?? e?.error_description ?? e?.details ?? String(e);
      Alert.alert('Ошибка отправки', msg);
    } finally {
      setAcctBusy(false);
    }
  }

  /* ==================== ДОРАБОТКА (Rework) ==================== */
  const [rwOpen, setRwOpen] = useState(false);
  const [rwBusy, setRwBusy] = useState(false);
  const [rwPid, setRwPid]   = useState<string | null>(null);
  const [rwReason, setRwReason] = useState<string>('');
  type RwItem = {
    request_item_id: string;
    name_human?: string | null;
    uom?: string | null;
    qty?: number | null;
    price?: string;
    supplier?: string;
    note?: string;
  };
  const [rwItems, setRwItems] = useState<RwItem[]>([]);

  const [rwInvNumber, setRwInvNumber] = useState('');
  const [rwInvDate, setRwInvDate]     = useState(new Date().toISOString().slice(0, 10));
  const [rwInvAmount, setRwInvAmount] = useState('');
  const [rwInvCurrency, setRwInvCurrency] = useState('KGS');
  const [rwInvFile, setRwInvFile] = useState<any | null>(null);
  const [rwInvUploadedName, setRwInvUploadedName] = useState('');

  // источник возврата: 'director' | 'accountant'
  const [rwSource, setRwSource] = useState<'director' | 'accountant'>('director');

  // — безопасный детектор (не требует доп. колонок)
  function detectReworkSourceSafe(r: any): 'director' | 'accountant' {
    const st = String(r?.status || '').toLowerCase();
    if (st.includes('бух')) return 'accountant';
    if (st.includes('дир')) return 'director';

    const base = String(r?.return_reason || r?.accountant_comment || r?.accountant_note || '').toLowerCase();
    if (base.includes('бух') || base.includes('account')) return 'accountant';
    if (base.includes('дир')) return 'director';

    return 'director';
  }

  // — расширенный детектор (если есть служебные поля)
  function detectReworkSource(r: any): 'director' | 'accountant' {
    if (r?.sent_to_accountant_at) return 'accountant';
    if (r?.payment_status) return 'accountant';
    if (r?.invoice_number) return 'accountant';

    const role = String(r?.returned_by_role || r?.return_source || '').toLowerCase();
    if (role.includes('account') || role.includes('бух')) return 'accountant';
    if (role.includes('director') || role.includes('дир')) return 'director';

    const st = String(r?.status || '').toLowerCase();
    if (st.includes('бух')) return 'accountant';
    if (st.includes('дир')) return 'director';

    const base = String(r?.return_reason || r?.accountant_comment || r?.accountant_note || '').toLowerCase();
    if (base.includes('бух') || base.includes('account')) return 'accountant';
    if (base.includes('дир')) return 'director';

    return 'director';
  }

  const openRework = useCallback(async (pidStr: string) => {
    setRwOpen(true);
    setRwBusy(true);
    setRwPid(pidStr);
    setRwReason('');
    setRwItems([]);
    setRwInvNumber('');
    setRwInvDate(new Date().toISOString().slice(0, 10));
    setRwInvAmount('');
    setRwInvCurrency('KGS');
    setRwInvFile(null);
    setRwInvUploadedName('');

    try {
      // 1) читаем только реально существующие поля (без 400)
      let r: any = null;
      try {
        const pr = await supabase
          .from('proposals')
          .select('status, redo_source, redo_comment, return_comment, accountant_comment')
          .eq('id', pidStr)
          .maybeSingle();

        if (!pr.error && pr.data) {
          r = pr.data;
        }
      } catch {
        // безопасно игнорируем сбой выборки
      }

      // 2) источник: сначала строго по redo_source, иначе безопасная эвристика
      let src: 'director' | 'accountant' =
        r?.redo_source === 'accountant' ? 'accountant'
        : r?.redo_source === 'director' ? 'director'
        : detectReworkSourceSafe(r || {});
      setRwSource(src);

      // 3) причина: приоритетно redo_comment → return_comment → accountant_comment
      let base = String(
        r?.redo_comment ??
        r?.return_comment ??
        r?.accountant_comment ??
        ''
      ).trim();

      // дописываем «Источник: …» один раз (для бейджа/визуалки)
      if (!/Источник:/i.test(base)) {
        base = base
          ? `${base}\nИсточник: ${src === 'accountant' ? 'бухгалтера' : 'директора'}`
          : `Источник: ${src === 'accountant' ? 'бухгалтера' : 'директора'}`;
      }
      setRwReason(base);

      // 4) строки предложения
      const pi = await supabase
        .from('proposal_items')
        .select('request_item_id, price, supplier, note')
        .eq('proposal_id', pidStr);

      const items = Array.isArray(pi.data) ? (pi.data as any[]) : [];

      // имена/единицы/количество по request_items
      const ids = Array.from(new Set(items.map((x) => String(x.request_item_id)).filter(Boolean)));
      const names = new Map<string, any>();
      if (ids.length) {
        const ri = await supabase
          .from('request_items')
          .select('id, name_human, uom, qty')
          .in('id', ids);

        if (!ri.error && Array.isArray(ri.data)) {
          for (const rr of ri.data) names.set(String(rr.id), rr);
        }
      }

      setRwItems(
        items.map((x) => {
          const n = names.get(String(x.request_item_id)) || {};
          return {
            request_item_id: String(x.request_item_id),
            name_human: n.name_human ?? null,
            uom: n.uom ?? null,
            qty: n.qty ?? null,
            price: x.price != null ? String(x.price) : '',
            supplier: x.supplier ?? '',
            note: x.note ?? '',
          } as RwItem;
        })
      );
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось открыть доработку');
    } finally {
      setRwBusy(false);
    }
  }, []);

  const rwSaveItems = useCallback(async () => {
    if (!rwPid) return;
    setRwBusy(true);
    try {
      for (const it of rwItems) {
        const upd: any = {};
        const pv = Number(String(it.price ?? '').replace(',', '.'));
        if (Number.isFinite(pv) && pv > 0) upd.price = pv;
        if (it.supplier != null) upd.supplier = it.supplier?.trim() || null;
        if (it.note != null)     upd.note     = it.note?.trim() || null;

        if (Object.keys(upd).length) {
          const q = await supabase
            .from('proposal_items')
            .update(upd)
            .eq('proposal_id', rwPid)
            .eq('request_item_id', it.request_item_id);
          if (q.error) throw q.error;
        }
      }
      Alert.alert('Сохранено', 'Изменения по позициям сохранены');
    } catch (e: any) {
      Alert.alert('Ошибка сохранения', e?.message ?? String(e));
    } finally {
      setRwBusy(false);
    }
  }, [rwPid, rwItems]);

  const rwPickInvoiceWeb = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async () => {
      const f = (input.files && input.files[0]) || null;
      if (!f || !rwPid) return;
      try {
        await uploadProposalAttachment(rwPid, f, f.name, 'invoice');
        setRwInvUploadedName(f.name);
        Alert.alert('Готово', `Счёт прикреплён: ${f.name}`);
      } catch (e: any) {
        Alert.alert('Ошибка загрузки', e?.message ?? String(e));
      }
    };
    input.click();
  }, [rwPid]);

  const rwPickInvoiceNative = useCallback(async () => {
    try {
      // @ts-ignore
      const DocPicker = await import('expo-document-picker');
      const res = await (DocPicker as any).getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (res?.canceled) return;
      const f = res?.assets?.[0] ?? res;
      setRwInvFile(f || null);
      if (f?.name) setRwInvUploadedName(f.name);
    } catch (e: any) {
      Alert.alert('Файл', e?.message ?? String(e));
    }
  }, []);

  // === ДОРАБОТКА → ДИРЕКТОРУ (без изменения логики маршрутов)
  const rwSendToDirector = useCallback(async () => {
    if (!rwPid) return;
    setRwBusy(true);
    try {
      // 0) сохранить правки позиций (как было)
      for (const it of rwItems) {
        const upd: any = {};
        const pv = Number(String(it.price ?? '').replace(',', '.'));
        if (Number.isFinite(pv) && pv > 0) upd.price = pv;
        if (it.supplier != null) upd.supplier = it.supplier?.trim() || null;
        if (it.note != null)     upd.note     = it.note?.trim() || null;
        if (Object.keys(upd).length) {
          const q = await supabase
            .from('proposal_items')
            .update(upd)
            .eq('proposal_id', rwPid)
            .eq('request_item_id', it.request_item_id);
          if (q.error) throw q.error;
        }
      }

      // 1) вернуть владение директору — убрать след бухгалтера
      await supabase
        .from('proposals')
        .update({ payment_status: null, sent_to_accountant_at: null })
        .eq('id', rwPid);

      // 2) статус "На утверждении"
      await proposalSubmit(rwPid as any);

      // 3) дублирующая подстраховка
      await supabase
        .from('proposals')
        .update({ sent_to_accountant_at: null })
        .eq('id', rwPid);

      // 4) обновляем списки/UI
      await fetchBuckets();
      setRejected(prev => prev.filter(p => String(p.id) !== rwPid));

      Alert.alert('Готово', 'Отправлено директору.');
      setRwOpen(false);
    } catch (e:any) {
      Alert.alert('Ошибка отправки', e?.message ?? String(e));
    } finally {
      setRwBusy(false);
    }
  }, [rwPid, rwItems, fetchBuckets]);

  const rwSendToAccounting = useCallback(async () => {
    if (!rwPid) return;

    const amt = Number(String(rwInvAmount).replace(',', '.'));
    const dateStr = (rwInvDate || '').trim();
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

    if (!rwInvNumber.trim()) { Alert.alert('№ счёта', 'Укажите номер счёта'); return; }
    if (!dateOk)             { Alert.alert('Дата счёта', 'Формат YYYY-MM-DD'); return; }
    if (!Number.isFinite(amt) || amt <= 0) { Alert.alert('Сумма', 'Введите положительную сумму'); return; }

    setRwBusy(true);
    try {
      // invoice — всегда грузим, не завязываемся на rwInvUploadedName
      if (rwInvFile) {
        await uploadProposalAttachment(rwPid!, rwInvFile, (rwInvFile.name ?? 'invoice.pdf'), 'invoice');
      }

      // html предложения (не влияет на статусы)
      try {
        const html = await buildProposalPdfHtml(rwPid!);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        await uploadProposalAttachment(rwPid!, blob as any, `proposal_${rwPid!.slice(0,8)}.html`, 'proposal_pdf');
      } catch {}

      // отправка в бухгалтерию — адаптер + RPC-фолбэк
      try {
        await proposalSendToAccountant({
          proposalId: rwPid!,
          invoiceNumber: rwInvNumber.trim(),
          invoiceDate:   dateStr,
          invoiceAmount: amt,
          invoiceCurrency: rwInvCurrency || 'KGS',
        });
      } catch {
        const { error } = await supabase.rpc('proposal_send_to_accountant_min', {
          p_proposal_id: rwPid!,
          p_invoice_number: rwInvNumber.trim(),
          p_proposal_date: undefined as any,
          p_invoice_date:   dateStr,
          p_invoice_amount: amt,
          p_invoice_currency: rwInvCurrency || 'KGS',
        });
        if (error) throw error;
      }

      await ensureAccountingFlags(rwPid!, amt);

      await fetchBuckets();
      setRejected(prev => prev.filter(p => String(p.id) !== rwPid));

      Alert.alert('Готово', 'Отправлено бухгалтеру.');
      setRwOpen(false);
    } catch (e: any) {
      Alert.alert('Ошибка отправки', e?.message ?? String(e));
    } finally {
      setRwBusy(false);
    }
  }, [rwPid, rwInvNumber, rwInvDate, rwInvAmount, rwInvCurrency, rwInvFile, rwInvUploadedName, fetchBuckets]);

  
 /* ==================== RENDER ==================== */
const pendingCount  = pending.length;
const approvedCount = approved.length;
const rejectedCount = rejected.length;

// ✅ 1) единый JSX для web + native
const ScreenBody = (
  <View style={[s.screen, { backgroundColor: COLORS.bg }]}>
    
    {/* ✅ СПИСОК */}
<Animated.View style={{ flex: 1 }}>
  <AnimatedFlatList
  ref={listRef as any}
  stickyHeaderIndices={[0]}

  initialNumToRender={8}
  maxToRenderPerBatch={10}
  windowSize={7}
  updateCellsBatchingPeriod={16}
  removeClippedSubviews={Platform.OS !== 'web'}

ListHeaderComponent={
  <Animated.View
  style={[
    s.collapsingHeader,
    { paddingTop: SAFE_TOP, height: headerHeightAnim, overflow: 'hidden' }
  ]}
>

    {/* ✅ Title row */}
    <Animated.View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
      <Animated.Text
        style={[s.collapsingTitle, { fontSize: titleSize }]}
        numberOfLines={1}
      >
        Снабженец
      </Animated.Text>
    </Animated.View>

    {/* ✅ Tabs row */}
    <View
      onLayout={(e) => {
        const h = e?.nativeEvent?.layout?.height ?? 0;
        if (h > 0) setTabsH(h);
      }}
      style={{ paddingHorizontal: 12, paddingBottom: 6, paddingTop: 6 }}
    >
      {Platform.OS === 'web' ? (
        <View style={s.tabsWrapWeb}>
  <Pressable
    onPress={() => {
      setTab('inbox');
      setExpandedReqId(null);
      setExpandedReqIndex(null);
    }}
    style={[s.tabPill, tab === 'inbox' && s.tabPillActive]}
  >
    <Text style={[s.tabPillText, tab === 'inbox' && s.tabPillTextActive]}>Вход</Text>
  </Pressable>

  <Pressable
    onPress={() => {
      setTab('pending');
      setExpandedReqId(null);
      setExpandedReqIndex(null);
    }}
    style={[s.tabPill, tab === 'pending' && s.tabPillActive]}
  >
    <Text style={[s.tabPillText, tab === 'pending' && s.tabPillTextActive]}>
      Контроль ({pending.length})
    </Text>
  </Pressable>

  <Pressable
    onPress={() => {
      setTab('approved');
      setExpandedReqId(null);
      setExpandedReqIndex(null);
    }}
    style={[s.tabPill, tab === 'approved' && s.tabPillActive]}
  >
    <Text style={[s.tabPillText, tab === 'approved' && s.tabPillTextActive]}>
      Готово ({approved.length})
    </Text>
  </Pressable>

  <Pressable
    onPress={() => {
      setTab('rejected');
      setExpandedReqId(null);
      setExpandedReqIndex(null);
    }}
    style={[s.tabPill, tab === 'rejected' && s.tabPillActive]}
  >
    <Text style={[s.tabPillText, tab === 'rejected' && s.tabPillTextActive]}>
      Правки ({rejected.length})
    </Text>
  </Pressable>
</View>

      ) : (
       <ScrollView
  ref={tabsScrollRef as any}
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={s.tabsRow}
  keyboardShouldPersistTaps="handled"
>
  <Pressable
    onPress={() => {
      scrollTabsToStart(true);
      setTab('inbox');
      setExpandedReqId(null);
      setExpandedReqIndex(null);
    }}
    style={[s.tabPill, tab === 'inbox' && s.tabPillActive]}
  >
    <Text style={[s.tabPillText, tab === 'inbox' && s.tabPillTextActive]}>Вход</Text>
  </Pressable>

  <Pressable
    onPress={() => {
      scrollTabsToStart(true);
      setTab('pending');
      setExpandedReqId(null);
      setExpandedReqIndex(null);
    }}
    style={[s.tabPill, tab === 'pending' && s.tabPillActive]}
  >
    <View style={s.tabLabelRow}>
      <Text style={[s.tabPillText, tab === 'pending' && s.tabPillTextActive]}>Контроль</Text>
      <TabCount n={pending.length} active={tab === 'pending'} />
    </View>
  </Pressable>

  <Pressable
    onPress={() => {
      scrollTabsToStart(true);
      setTab('approved');
      setExpandedReqId(null);
      setExpandedReqIndex(null);
    }}
    style={[s.tabPill, tab === 'approved' && s.tabPillActive]}
  >
    <View style={s.tabLabelRow}>
      <Text style={[s.tabPillText, tab === 'approved' && s.tabPillTextActive]}>Готово</Text>
      <TabCount n={approved.length} active={tab === 'approved'} />
    </View>
  </Pressable>

  <Pressable
    onPress={() => {
      scrollTabsToStart(true);
      setTab('rejected');
      setExpandedReqId(null);
      setExpandedReqIndex(null);
    }}
    style={[s.tabPill, tab === 'rejected' && s.tabPillActive]}
  >
    <View style={s.tabLabelRow}>
      <Text style={[s.tabPillText, tab === 'rejected' && s.tabPillTextActive]}>Правки</Text>
      <TabCount n={rejected.length} active={tab === 'rejected'} />
    </View>
  </Pressable>
</ScrollView>

      )}
    </View>

    {/* ✅ Mini row */}
    <Animated.View
  style={{
    height: miniHeight,
    overflow: 'hidden',
    paddingHorizontal: 12,
    justifyContent: 'center',
    opacity: miniOpacity,
    transform: [{ translateY: miniTranslateY }],
  }}
>

      <Text style={{ color: COLORS.sub, fontWeight: '800', fontSize: 12 }}>
        {tab === 'inbox'
          ? `Выбрано: ${pickedIds.length} · Сумма: ${pickedTotal.toLocaleString()} сом`
          : tab === 'pending'
          ? `У директора: ${pendingCount}`
          : tab === 'approved'
          ? `Готово: ${approvedCount}`
          : `Правки: ${rejectedCount}`}
      </Text>
    </Animated.View>

    {/* ✅ FIO row */}
    <Animated.View
      onLayout={(e) => {
        const h = e?.nativeEvent?.layout?.height ?? 0;
        if (h > 0) setSubH(h);
      }}
        style={{
    paddingHorizontal: 12,
    paddingBottom: 6,
    opacity: fioOpacity,
    height: fioHeight,
    overflow: 'hidden',
  }}
>

      <Text style={s.fioLabel}>ФИО</Text>
      <TextInput
        value={buyerFio}
        onChangeText={setBuyerFio}
        placeholder="введите ФИО"
        style={s.fioInput}
      />
    </Animated.View>
  </Animated.View>
}


  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollYRaw } } }],
    { useNativeDriver: false }
  )}
  scrollEventThrottle={16}

    data={
      tab === 'inbox' ? groups :
      tab === 'pending' ? pending :
      tab === 'approved' ? approved :
      rejected
    }
    keyExtractor={(item) =>
      tab === 'inbox'
        ? `g:${(item as Group).request_id}`
        : `p:${String((item as any).id)}`
    }
    renderItem={({ item, index }) => (
  <View style={{ marginBottom: 12 }}>
    {tab === 'inbox'
      ? renderGroupBlock(item as Group, index)
      : (
        <BuyerProposalCard
          head={item}
          onOpenPdf={(pid) => openPdfNewWindow(pid)}
          onOpenAccounting={(pid) => openAccountingModal(pid)}
          onOpenRework={(pid) => openRework(pid)}
        />
      )
    }
  </View>
)}

    
    removeClippedSubviews={false}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    ListEmptyComponent={
      loadingInbox || loadingBuckets
        ? <SafeView style={{ padding: 24, alignItems: 'center' }}><ActivityIndicator /></SafeView>
        : <SafeView style={{ padding: 24 }}><Text style={{ color: COLORS.sub }}>Пока пусто</Text></SafeView>
    }
    contentContainerStyle={{
  paddingHorizontal: 12,
  paddingBottom: tab === 'inbox' ? 120 : 24,
}}

    keyboardShouldPersistTaps="handled"
    keyboardDismissMode="on-drag"
    onScrollBeginDrag={() => { Keyboard.dismiss(); }}
    onScrollToIndexFailed={(info) => {
      setTimeout(() => {
        try {
          listRef.current?.scrollToOffset?.({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        } catch {}
      }, 50);
    }}
  />
</Animated.View>

    {/* ✅ НИЖНЯЯ ПАНЕЛЬ (только inbox) */}
    {tab === 'inbox' ? (
      <View style={s.bottomBar}>
        <View style={s.bottomRow}>
          <Pressable
            disabled={creating}
            onPress={handleCreateProposalsBySupplier}
            style={[s.sendFab, creating && { opacity: 0.5 }]}
            hitSlop={12}
          >
            <Ionicons name="send" size={22} color="#fff" />
          </Pressable>

          <Pressable
            disabled={creating || pickedIds.length === 0}
            onPress={() => setRfqOpen(true)}
            style={[
              s.tradeBtnBright,
              (creating || pickedIds.length === 0) && { opacity: 0.45 },
            ]}
          >
            <Ionicons name="pricetag-outline" size={18} color="#0F172A" />
            <Text style={s.tradeBtnBrightText}>ТОРГИ</Text>
          </Pressable>

          <Pressable
            onPress={clearPick}
            disabled={pickedIds.length === 0}
            style={[s.clearXDirector, pickedIds.length === 0 && { opacity: 0.4 }]}
            hitSlop={10}
          >
            <Text style={s.clearXDirectorText}>✕</Text>
          </Pressable>
        </View>
      </View>
    ) : null}
      {/* ======= Модалка «В бухгалтерию» ======= */}
      <Modal visible={acctOpen} transparent animationType="fade" onRequestClose={() => setAcctOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Отправить в бухгалтерию</Text>

            <Text style={s.modalHelp}>
              {acctProposalId ? `Документ: #${String(acctProposalId).slice(0,8)}` : 'Документ не выбран'}
            </Text>

            <Text style={s.modalHelp}>
              {propDocBusy ? 'Готовим файл предложения…' : (propDocAttached ? `Файл предложения: ${propDocAttached.name}` : 'Файл предложения будет прикреплён')}
            </Text>

            {/* карточка поставщика (read-only) */}
            {acctSupp && (
              <View style={{ marginTop: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 8, backgroundColor: '#fff' }}>
                <Text style={{ fontWeight: '800', color: COLORS.text }}>{acctSupp.name}</Text>
                <Text style={{ color: COLORS.sub, marginTop: 2 }}>
                  {acctSupp.inn ? `ИНН: ${acctSupp.inn} · ` : ''}
                  {acctSupp.bank ? `Счёт: ${acctSupp.bank} · ` : ''}
                  {acctSupp.phone ? `Тел.: ${acctSupp.phone} · ` : ''}
                  {acctSupp.email ? `Email: ${acctSupp.email}` : ''}
                </Text>
              </View>
            )}

            <Text style={{ fontSize: 12, color: COLORS.sub, marginTop: 4 }}>Номер счёта</Text>
            <TextInput placeholder="Номер счёта" value={invNumber} onChangeText={setInvNumber} style={s.input} />
            <Text style={{ fontSize: 12, color: COLORS.sub, marginTop: 6 }}>Дата (YYYY-MM-DD)</Text>
            <TextInput placeholder="Дата YYYY-MM-DD" value={invDate} onChangeText={setInvDate} style={s.input} />
            <Text style={{ fontSize: 12, color: COLORS.sub, marginTop: 6 }}>Сумма</Text>
            <TextInput placeholder="Сумма" value={invAmount} onChangeText={setInvAmount} keyboardType="decimal-pad" style={s.input} />
            <Text style={{ fontSize: 12, color: COLORS.sub, marginTop: 6 }}>Валюта</Text>
            <TextInput placeholder="Валюта (KGS)" value={invCurrency} onChangeText={setInvCurrency} style={s.input} />

            {isWeb ? (
              <>
                <Pressable onPress={openInvoicePickerWeb} style={[s.smallBtn, { borderColor: COLORS.primary }]}>
                  <Text style={[s.smallBtnText, { color: COLORS.primary }]}>
                    {invoiceUploadedName ? `Счёт прикреплён: ${invoiceUploadedName}` : 'Прикрепить счёт (PDF/JPG/PNG)'}
                  </Text>
                </Pressable>
                <input
  ref={invoiceInputRef as any}
  type="file"
  accept=".pdf,.jpg,.jpeg,.png"
  onChange={onInvoiceFileChangeWeb as any}
  style={{ display: 'none' }}
/>
              </>
            ) : (
              <Pressable
                onPress={async () => { const f = await pickInvoiceFile(); if (f) { setInvFile(f); Alert.alert('Файл', f.name ?? 'Выбрано'); } }}
                style={[s.smallBtn, { borderColor: COLORS.primary }]}
              >
                <Text style={[s.smallBtnText, { color: COLORS.primary }]}>
                  {invFile?.name ? `Счёт прикреплён: ${invFile.name}` : 'Прикрепить счёт (PDF/JPG/PNG)'}
                </Text>
              </Pressable>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable disabled={acctBusy} onPress={sendToAccounting} style={[s.smallBtn, { backgroundColor: COLORS.blue, borderColor: COLORS.blue, opacity: acctBusy ? 0.6 : 1 }]}>
                <Text style={[s.smallBtnText, { color: '#fff' }]}>{acctBusy ? 'Отправляем…' : 'Отправить'}</Text>
              </Pressable>
              <Pressable disabled={acctBusy} onPress={() => setAcctOpen(false)} style={[s.smallBtn, { borderColor: COLORS.border }]}>
                <Text style={[s.smallBtnText, { color: COLORS.text }]}>Отмена</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======= Модалка «Доработать» ======= */}
      <Modal visible={rwOpen} transparent animationType="fade" onRequestClose={() => setRwOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={[s.modalCard, { width: 720 }]}>
            <Text style={s.modalTitle}>Доработка предложения</Text>
            <Text style={s.modalHelp}>{rwPid ? `Документ: #${rwPid.slice(0,8)}` : 'Документ не выбран'}</Text>

            {!!rwReason && (
              <View style={{ padding: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: '#FFFBEB' }}>
                <Text style={{ fontWeight: '700', color: '#92400E', marginBottom: 4 }}>Причина возврата</Text>
                {/Источник:/i.test(rwReason) && (
                  <View style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: '#E0E7FF', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
                      <Text style={{ color: '#3730A3', fontWeight: '700', fontSize: 12 }}>
                        {String(rwReason).split('\n').find((ln) => /Источник:/i.test(ln))?.replace(/.*Источник:\s*/i, 'Источник: ').trim() || 'Источник: —'}
                      </Text>
                    </View>
                  </View>
                )}
                <Text style={{ color: '#78350F' }}>
                  {String(rwReason).split('\n').filter((ln) => !/Источник:/i.test(ln)).join('\n').trim() || '—'}
                </Text>
              </View>
            )}

            {/* переключатель источника */}
            <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Text style={{ fontSize: 12, color: COLORS.sub }}>От кого возврат?</Text>
              <Pressable
                onPress={() => setRwSource('director')}
                style={[s.smallBtn, { borderColor: rwSource === 'director' ? '#111827' : COLORS.border, backgroundColor: rwSource === 'director' ? '#111827' : '#fff' }]}
              >
                <Text style={[s.smallBtnText, { color: rwSource === 'director' ? '#fff' : COLORS.text }]}>Директор</Text>
              </Pressable>
              <Pressable
                onPress={() => setRwSource('accountant')}
                style={[s.smallBtn, { borderColor: rwSource === 'accountant' ? '#2563eb' : COLORS.border, backgroundColor: rwSource === 'accountant' ? '#2563eb' : '#fff' }]}
              >
                <Text style={[s.smallBtnText, { color: rwSource === 'accountant' ? '#fff' : COLORS.text }]}>Бухгалтер</Text>
              </Pressable>
            </View>

            <View style={{ height: 8 }} />

            {/* Таблица позиций */}
            <View style={{ maxHeight: 340 }}>
              <ScrollView>
                {rwItems.length === 0 ? (
                  <Text style={s.modalHelp}>{rwBusy ? 'Загрузка…' : 'Нет строк в предложении'}</Text>
                ) : rwItems.map((it, idx) => (
                  <View key={`${it.request_item_id}-${idx}`} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: COLORS.border }}>
                    <Text style={{ fontWeight: '700', color: COLORS.text }}>{it.name_human || `Позиция ${it.request_item_id}`}</Text>
                    <Text style={s.modalHelp}>{`${it.qty ?? '—'} ${it.uom ?? ''}`}</Text>

                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                      <View>
                        <Text style={{ fontSize: 12, color: COLORS.sub, marginBottom: 2 }}>Цена</Text>
                        <TextInput
                          placeholder="Цена"
                          keyboardType="decimal-pad"
                          value={it.price ?? ''}
                          onChangeText={(v) => { setRwItems(prev => prev.map((x, i) => i===idx ? { ...x, price: v } : x)); }}
                          style={[s.input, { minWidth: 120 }]}
                        />
                      </View>
                      <View>
                        <Text style={{ fontSize: 12, color: COLORS.sub, marginBottom: 2 }}>Поставщик</Text>
                        <TextInput
                          placeholder="Поставщик"
                          value={it.supplier ?? ''}
                          onChangeText={(v) => setRwItems(prev => prev.map((x, i) => i===idx ? { ...x, supplier: v } : x))}
                          style={[s.input, { minWidth: 220 }]}
                        />
                      </View>
                      <View>
                        <Text style={{ fontSize: 12, color: COLORS.sub, marginBottom: 2 }}>Примечание</Text>
                        <TextInput
                          placeholder="Примечание"
                          value={it.note ?? ''}
                          onChangeText={(v) => setRwItems(prev => prev.map((x, i) => i===idx ? { ...x, note: v } : x))}
                          style={[s.input, { minWidth: 260 }]}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Pressable disabled={rwBusy} onPress={rwSaveItems} style={[s.smallBtn, { backgroundColor: '#10b981', borderColor: '#10b981', opacity: rwBusy ? 0.6 : 1 }]}>
                <Text style={[s.smallBtnText, { color: '#fff' }]}>Сохранить правки</Text>
              </Pressable>
            </View>

            <View style={{ height: 12 }} />

            {/* Блок счёта */}
            <Text style={{ fontWeight: '700', color: COLORS.text, marginBottom: 4 }}>Счёт на оплату</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <View>
                <Text style={{ fontSize: 12, color: COLORS.sub, marginBottom: 2 }}>Номер счёта</Text>
                <TextInput placeholder="Номер счёта" value={rwInvNumber} onChangeText={setRwInvNumber} style={[s.input, { minWidth: 180 }]} />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: COLORS.sub, marginBottom: 2 }}>Дата (YYYY-MM-DD)</Text>
                <TextInput placeholder="Дата YYYY-MM-DD" value={rwInvDate} onChangeText={setRwInvDate} style={[s.input, { minWidth: 160 }]} />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: COLORS.sub, marginBottom: 2 }}>Сумма</Text>
                <TextInput placeholder="Сумма" value={rwInvAmount} onChangeText={setRwInvAmount} keyboardType="decimal-pad" style={[s.input, { minWidth: 140 }]} />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: COLORS.sub, marginBottom: 2 }}>Валюта</Text>
                <TextInput placeholder="Валюта (KGS)" value={rwInvCurrency} onChangeText={setRwInvCurrency} style={[s.input, { minWidth: 120 }]} />
              </View>

              {isWeb ? (
                <Pressable onPress={rwPickInvoiceWeb} style={[s.smallBtn, { borderColor: COLORS.primary }]}>
                  <Text style={[s.smallBtnText, { color: COLORS.primary }]}>
                    {rwInvUploadedName ? `Счёт: ${rwInvUploadedName}` : 'Прикрепить счёт'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable onPress={rwPickInvoiceNative} style={[s.smallBtn, { borderColor: COLORS.primary }]}>
                  <Text style={[s.smallBtnText, { color: COLORS.primary }]}>
                    {rwInvUploadedName || rwInvFile?.name ? `Счёт: ${rwInvUploadedName || rwInvFile?.name}` : 'Прикрепить счёт'}
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {rwSource === 'accountant' ? (
                <Pressable
                  disabled={rwBusy}
                  onPress={rwSendToAccounting}
                  style={[s.smallBtn, { backgroundColor: '#2563eb', borderColor: '#2563eb', opacity: rwBusy ? 0.6 : 1 }]}
                >
                  <Text style={[s.smallBtnText, { color: '#fff' }]}>{rwBusy ? 'Отправляем…' : 'В бухгалтерию'}</Text>
                </Pressable>
              ) : (
                <Pressable
                  disabled={rwBusy}
                  onPress={rwSendToDirector}
                  style={[s.smallBtn, { backgroundColor: '#111827', borderColor: '#111827', opacity: rwBusy ? 0.6 : 1 }]}
                >
                  <Text style={[s.smallBtnText, { color: '#fff' }]}>{rwBusy ? 'Отправляем…' : 'Директору'}</Text>
                </Pressable>
              )}

              <Pressable disabled={rwBusy} onPress={() => setRwOpen(false)} style={[s.smallBtn, { borderColor: COLORS.border }]}>
                <Text style={[s.smallBtnText, { color: COLORS.text }]}>Закрыть</Text>
              </Pressable>
            </View>
          </View>
        </View>
           </Modal>
{/* ======= Модалка «Создать торги (RFQ)» ======= */}
<Modal
  visible={rfqOpen}
  transparent
  animationType="fade"
  onRequestClose={() => setRfqOpen(false)}
>
  <View style={s.modalBackdrop}>
    <View style={s.modalCard}>
      <Text style={s.modalTitle}>Создать торги (RFQ)</Text>

      <Text style={s.modalHelp}>
        Дедлайн приёма предложений
      </Text>

      <Text style={{ fontWeight: '700', marginBottom: 6 }}>
        {fmtLocal(rfqDeadlineIso)}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Pressable onPress={() => setDeadlineHours(6)}  style={s.smallBtn}><Text>6 ч</Text></Pressable>
        <Pressable onPress={() => setDeadlineHours(12)} style={s.smallBtn}><Text>12 ч</Text></Pressable>
        <Pressable onPress={() => setDeadlineHours(24)} style={s.smallBtn}><Text>24 ч</Text></Pressable>
        <Pressable onPress={() => setDeadlineHours(48)} style={s.smallBtn}><Text>48 ч</Text></Pressable>
        <Pressable onPress={() => setDeadlineHours(72)} style={s.smallBtn}><Text>72 ч</Text></Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <Pressable
          onPress={() => setRfqOpen(false)}
          style={[s.smallBtn, { borderColor: COLORS.border }]}
        >
          <Text>Отмена</Text>
        </Pressable>

        <Pressable
          onPress={async () => {
  try {
    if (pickedIds.length === 0) {
      Alert.alert('Пусто', 'Выбери позиции для торгов');
      return;
    }

    const d = new Date(rfqDeadlineIso);
    if (Number.isNaN(d.getTime())) {
      Alert.alert('Дедлайн', 'Неверная дата');
      return;
    }
    if (d.getTime() < Date.now() + 5 * 60 * 1000) {
      Alert.alert('Дедлайн', 'Поставь минимум +5 минут от текущего времени');
      return;
    }

    // ✅ создаём tender (пока без адреса/координат, безопасно)
    const { data: tenderId, error } = await supabase.rpc(
  'tender_create_from_request_items',
  {
    p_request_item_ids: pickedIds,
    p_mode: 'rfq',
    p_deadline_at: d.toISOString(),
    p_city: null,
    p_lat: null,
    p_lng: null,
    p_radius_km: 10,
    p_visibility: 'open',
  }
);

if (error) throw error;

// ✅ ПУБЛИКАЦИЯ ТОРГОВ
const { error: pubErr } = await supabase.rpc('tender_publish', {
  p_tender_id: tenderId,
});

if (pubErr) throw pubErr;

setRfqLastTenderId(tenderId);
setRfqOpen(false);

Alert.alert(
  'Торги опубликованы',
  `RFQ #${String(tenderId).slice(0, 8)} опубликован и виден поставщикам`
);
  } catch (e: any) {
    Alert.alert('Ошибка', e?.message ?? String(e));
  }
}}

          style={[s.smallBtn, { backgroundColor: COLORS.blue, borderColor: COLORS.blue }]}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            Создать торги
          </Text>
        </Pressable>
      </View>
{rfqLastTenderId && (
  <Pressable
    onPress={async () => {
      try {
        const { error } = await supabase.rpc('tender_publish', {
          p_tender_id: rfqLastTenderId,
        });
        if (error) throw error;

        Alert.alert('Опубликовано', 'Спрос появился на карте supplierMap');
        setRfqOpen(false);
      } catch (e: any) {
        Alert.alert('Ошибка публикации', e?.message ?? String(e));
      }
    }}
    style={[s.smallBtn, { marginTop: 10, backgroundColor: COLORS.green, borderColor: COLORS.green }]}
  >
    <Text style={{ color: '#fff', fontWeight: '700' }}>
      Опубликовать на карте
    </Text>
  </Pressable>
)}

    </View>
  </View>
</Modal>
    </View>
  );
return ScreenBody;

}

/* ==================== Стили ==================== */
const s = StyleSheet.create({
  screen: { flex: 1 },

 collapsingHeader: {
  backgroundColor: '#fff',
  borderBottomWidth: 1,
  borderColor: COLORS.border,
  paddingBottom: 10,
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 14,
  elevation: 8,
},

  collapsingTitle: {
    fontWeight: '900',
    color: COLORS.text,
  },

  // ✅ tabs (mobile = horizontal)
 tabsRow: {
  flexDirection: 'row',
  gap: 8,
  alignItems: 'center',
  paddingRight: 16, // ✅ больше запас справа, чтобы последняя вкладка была доступна
  paddingVertical: 6,
},

  // ✅ tabs (web = wrap)
  tabsWrapWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 2,
  },

  tabPill: {
  paddingVertical: 6,
  paddingHorizontal: 8,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: '#fff',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
},

tabPillText: {
  color: COLORS.text,
  fontWeight: '800',
  fontSize: 11,
  lineHeight: 13,
  flexShrink: 0,
},

  tabPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  
  tabPillTextActive: {
    color: '#fff',
  },

  // ✅ meta under title
  summaryMeta: {
    fontSize: 12,
    color: COLORS.sub,
  },

  // ✅ inputs
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    minWidth: 220,
  },

  // ===== bottom bar =====
  bottomBar: {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  padding: 10,
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: COLORS.border,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -6 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 12,
},

 bottomRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},


  bottomBtnHalf: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },

  bottomBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },

  bottomLink: { alignSelf: 'center', paddingVertical: 6 },

  bottomLinkText: {
    color: COLORS.sub,
    fontWeight: '800',
    fontSize: 14,
  },

  // ===== group / cards =====
  group: {
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 14,
  backgroundColor: '#fff',
  marginBottom: 12,
  overflow: 'hidden',            // ✅ чтобы внутренности не “вылезали”
},


  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  groupTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },

  groupMeta: { fontSize: 12, color: COLORS.sub },

  card: {
    padding: 12,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },

  cardPicked: { backgroundColor: '#F8FAFF' },

  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },

  cardMeta: { fontSize: 12, color: COLORS.sub },

  // ===== inner items panel =====
  itemsPanel: {
    marginTop: 10,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F1F5F9',
  },
itemsBox: {
  // ✅ не режем высоту — пусть внешний экран скроллится
},

innerStickyHeader: {
  backgroundColor: '#F8FAFC',
  borderBottomWidth: 1,
  borderBottomColor: COLORS.border,
  paddingVertical: 8,
  paddingHorizontal: 10,
},

innerStickyTitle: {
  fontSize: 13,
  fontWeight: '900',
  color: COLORS.text,
},

innerStickyMeta: {
  marginTop: 2,
  fontSize: 11,
  fontWeight: '700',
  color: COLORS.sub,
},

openBody: {
  backgroundColor: '#F8FAFC',     // серый фон как подложка
  borderTopWidth: 1,
  borderTopColor: COLORS.border,
  paddingTop: 10,
  paddingBottom: 12,             // главный фикс “слияния”
},

  // ===== small buttons =====
  smallBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },

  smallBtnText: { fontWeight: '700', color: COLORS.text, fontSize: 12 },

  openBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
    minWidth: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },

  openBtnText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 16,
  },

  // ===== suggestions =====
  suggestBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 6,
    overflow: 'hidden',
  },

  suggestItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },

tradeBtnBright: {
  flex: 1,
  height: 52,
  borderRadius: 14,
  backgroundColor: '#3B82F6', // 🔵 ярко-синий
  borderWidth: 1,
  borderColor: '#2563EB',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  gap: 8,
},

tradeBtnBrightText: {
  color: '#0F172A', // ⚫ чёрный текст
  fontWeight: '900',
  fontSize: 14,
},

clearXDirector: {
  width: 52,
  height: 52,
  borderRadius: 12,          // ⬅️ как у директора
  backgroundColor: '#DC2626', // 🔴 директорский красный
  alignItems: 'center',
  justifyContent: 'center',
},

clearXDirectorText: {
  color: '#fff',
  fontSize: 22,
  fontWeight: '900',
  lineHeight: 22,
},

// Самолёт
sendFab: {
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: COLORS.primary,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: COLORS.primary,
},  
// ===== modal =====
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  modalCard: {
    width: 480,
    maxWidth: '95%',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 16,
    gap: 8,
  },

  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },

  modalHelp: { fontSize: 12, color: COLORS.sub },
fioRow: { marginTop: 6 },

fioLabel: {
  fontSize: 12,
  color: COLORS.sub,
  fontWeight: '700',
  marginBottom: 4,
},

fioInput: {
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 10,
  paddingHorizontal: 10,
  paddingVertical: 8,
  backgroundColor: '#fff',
},
fieldLabel: {
  fontSize: 12,
  color: COLORS.sub,
  fontWeight: '700',
  marginBottom: 4,
},
fieldInput: {
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 10,
  paddingHorizontal: 10,
  paddingVertical: 8,
  backgroundColor: '#fff',
},

suggestBoxInline: {
  marginTop: 6,
  borderWidth: 1,
  borderColor: COLORS.border,
  backgroundColor: '#fff',
  borderRadius: 10,
  overflow: 'hidden',
},

bulkBox: {
  marginHorizontal: 12,
  marginBottom: 10,
  padding: 10,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 14,
  backgroundColor: '#fff',
},
bulkTitle: {
  fontWeight: '900',
  color: COLORS.text,
  marginBottom: 8,
},
bulkRow: {
  flexDirection: 'row',
  gap: 8,
  flexWrap: 'wrap',
},

tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

tabBadge: {
  minWidth: 18,
  height: 18,
  paddingHorizontal: 6,
  borderRadius: 999,
  backgroundColor: '#E5E7EB',
  alignItems: 'center',
  justifyContent: 'center',
},

tabBadgeText: {
  fontSize: 11,
  fontWeight: '900',
  color: '#111827',
},

tabBadgeActive: { backgroundColor: '#fff' },
tabBadgeTextActive: { color: COLORS.primary },

});
