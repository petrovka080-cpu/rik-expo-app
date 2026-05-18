import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { FlashList } from '@/src/ui/FlashList';
import { ds } from './DirectorSubcontractTab.styles';
import {
  SUBCONTRACT_DEFAULT_PAGE_SIZE,
  PRICE_TYPE_LABEL,
  STATUS_CONFIG,
  WORK_MODE_LABEL,
  approveSubcontract,
  countDirectorSubcontracts,
  fmtAmount,
  fmtDate,
  listDirectorSubcontractsPage,
  mergeSubcontractPages,
  type SubcontractListStatusFilter,
  rejectSubcontract,
  type Subcontract,
} from '../subcontracts/subcontracts.shared';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'closed';

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'pending', label: 'На утверждении' },
  { key: 'approved', label: 'В работе' },
  { key: 'rejected', label: 'Отклонено' },
  { key: 'closed', label: 'Закрыто' },
];

const DIRECTOR_SUBCONTRACT_LIST_FLATLIST_TUNING = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 32,
  windowSize: 7,
  removeClippedSubviews: false,
} as const;

const errText = (e: unknown, fallback: string) =>
  e instanceof Error && e.message.trim() ? e.message.trim() : fallback;

type DetailProps = {
  item: Subcontract;
  onClose: () => void;
  onApprove: () => void;
  onReject: (comment: string) => void;
  deciding: boolean;
};

function SubcontractDetail({ item, onClose, onApprove, onReject, deciding }: DetailProps) {
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const isPending = item.status === 'pending';
  const cfg = STATUS_CONFIG[item.status];

  const Row = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <View style={ds.detailRow}>
      <Text style={ds.detailLabel}>{label}</Text>
      <Text style={ds.detailValue}>{value || '-'}</Text>
    </View>
  );

  return (
    <Modal animationType="slide" transparent={false} visible onRequestClose={onClose}>
      <View style={ds.modalWrap}>
        <View style={ds.modalHeader}>
          <Text style={ds.modalTitle} numberOfLines={1}>
            {item.work_type || 'Подряд'} - {item.object_name || '-'}
          </Text>
          <View style={[ds.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[ds.badgeText, { color: cfg.fg }]}>{cfg.label}</Text>
          </View>
        </View>

        <ScrollView style={ds.modalScroll} keyboardShouldPersistTaps="handled">
          <Text style={ds.section}>Подрядчик</Text>
          <Row label="Организация" value={item.contractor_org} />
          <Row label="ИНН" value={item.contractor_inn} />
          <Row label="Представитель" value={item.contractor_rep} />
          <Row label="Телефон" value={item.contractor_phone} />
          <Row label="N договора" value={item.contract_number} />
          <Row label="Дата договора" value={item.contract_date} />

          <Text style={ds.section}>Работа</Text>
          <Row label="Объект" value={item.object_name} />
          <Row label="Зона/этаж" value={item.work_zone} />
          <Row label="Вид работы" value={item.work_type} />
          <Row label="Плановый объём" value={item.qty_planned != null ? `${fmtAmount(item.qty_planned)} ${item.uom ?? ''}` : null} />
          <Row label="Начало" value={fmtDate(item.date_start)} />
          <Row label="Окончание" value={fmtDate(item.date_end)} />

          <Text style={ds.section}>Условия</Text>
          <Row label="Режим" value={item.work_mode ? WORK_MODE_LABEL[item.work_mode] : null} />
          <Row label="Цена за единицу" value={item.price_per_unit != null ? fmtAmount(item.price_per_unit) : null} />
          <Row label="Общая сумма" value={item.total_price != null ? fmtAmount(item.total_price) : null} />
          <Row label="Тип расчёта" value={item.price_type ? PRICE_TYPE_LABEL[item.price_type] : null} />

          {item.foreman_comment ? (
            <>
              <Text style={ds.section}>Комментарий прораба</Text>
              <Text style={ds.commentText}>{item.foreman_comment}</Text>
            </>
          ) : null}

          {item.director_comment ? (
            <>
              <Text style={ds.section}>Решение директора</Text>
              <Text style={ds.commentText}>{item.director_comment}</Text>
            </>
          ) : null}

          <Text style={ds.section}>Информация</Text>
          <Row label="Прораб" value={item.foreman_name} />
          <Row label="Создан" value={fmtDate(item.created_at)} />

          {isPending ? (
            <View style={ds.actionBlock}>
              {!showRejectInput ? (
                <>
                  <Pressable style={[ds.btnApprove, deciding && ds.btnDisabled]} onPress={onApprove} disabled={deciding}>
                    {deciding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={ds.btnApproveText}>Утвердить</Text>}
                  </Pressable>

                  <Pressable
                    style={[ds.btnReject, deciding && ds.btnDisabled]}
                    onPress={() => setShowRejectInput(true)}
                    disabled={deciding}
                  >
                    <Text style={ds.btnRejectText}>Отклонить</Text>
                  </Pressable>
                </>
              ) : (
                <View>
                  <Text style={ds.rejectLabel}>Причина отклонения:</Text>
                  <TextInput
                    style={ds.rejectInput}
                    value={rejectComment}
                    onChangeText={setRejectComment}
                    placeholder="Укажи причину"
                    placeholderTextColor="#94A3B8"
                    multiline
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <Pressable
                      style={[ds.btnReject, { flex: 1 }, deciding && ds.btnDisabled]}
                      onPress={() => onReject(rejectComment)}
                      disabled={deciding}
                    >
                      {deciding ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={ds.btnRejectText}>Подтвердить отклонение</Text>
                      )}
                    </Pressable>
                    <Pressable style={[ds.btnCancel, { flex: 1 }]} onPress={() => setShowRejectInput(false)}>
                      <Text style={ds.btnCancelText}>Назад</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>

        <Pressable style={ds.closeBtn} onPress={onClose}>
          <Text style={ds.closeBtnText}>Закрыть</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

type CardProps = {
  item: Subcontract;
  onPress: (item: Subcontract) => void;
};

function SubCard({ item, onPress }: CardProps) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
  return (
    <Pressable style={ds.card} onPress={() => onPress(item)}>
      <View style={ds.cardTop}>
        <Text style={ds.cardTitle} numberOfLines={1}>
          {item.work_type || 'Без названия'}
        </Text>
        <View style={[ds.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[ds.badgeText, { color: cfg.fg }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={ds.cardMeta} numberOfLines={1}>
        {item.object_name || '-'} - {item.contractor_org || '-'}
      </Text>
      <Text style={ds.cardMeta2} numberOfLines={1}>
        Прораб: {item.foreman_name || '-'} - {item.qty_planned != null ? `${fmtAmount(item.qty_planned)} ${item.uom ?? ''}` : ''}
      </Text>
      {item.total_price || item.price_per_unit ? (
        <Text style={ds.cardPrice} numberOfLines={1}>
          {item.price_per_unit ? `${fmtAmount(item.price_per_unit)} / ед.` : `Итого: ${fmtAmount(item.total_price)}`}
        </Text>
      ) : null}
      <Text style={ds.cardDate}>{fmtDate(item.created_at)}</Text>
    </Pressable>
  );
}

type Props = {
  contentTopPad: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

export default function DirectorSubcontractTab({ contentTopPad, onScroll }: Props) {
  const [items, setItems] = useState<Subcontract[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Subcontract | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const nextOffsetRef = useRef(0);
  const loadSeqRef = useRef(0);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);

  const load = useCallback(async (options?: { reset?: boolean }) => {
    const reset = options?.reset !== false;
    const offset = reset ? 0 : nextOffsetRef.current;
    const seq = ++loadSeqRef.current;
    if (!reset && (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current)) return;
    if (reset) {
      loadingRef.current = true;
      setLoading(true);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    try {
      const [page, nextPendingCount] = await Promise.all([
        listDirectorSubcontractsPage({
          status: filter as SubcontractListStatusFilter,
          offset,
          pageSize: SUBCONTRACT_DEFAULT_PAGE_SIZE,
        }),
        reset ? countDirectorSubcontracts('pending') : Promise.resolve<number | null>(null),
      ]);
      if (seq !== loadSeqRef.current) return;
      nextOffsetRef.current = page.nextOffset ?? offset;
      hasMoreRef.current = page.hasMore;
      setHasMore(page.hasMore);
      setItems((current) => (reset ? page.items : mergeSubcontractPages(current, page.items)));
      if (nextPendingCount != null) {
        setPendingCount(nextPendingCount);
      }
    } catch (e: unknown) {
      if (__DEV__) console.warn('[DirectorSubcontractTab] load error:', errText(e, 'load failed'));
    } finally {
      if (seq === loadSeqRef.current) {
        if (reset) {
          loadingRef.current = false;
          setLoading(false);
        } else {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    }
  }, [filter]);

  useEffect(() => {
    void load({ reset: true });
  }, [filter, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ reset: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);
  const onEndReached = useCallback(() => {
    void load({ reset: false });
  }, [load]);

  const filtered = items;
  const keyExtractor = useCallback((item: Subcontract) => item.id, []);
  const renderItem = useCallback(({ item }: { item: Subcontract }) => <SubCard item={item} onPress={setSelected} />, []);

  const handleApprove = useCallback(async () => {
    if (!selected) return;
    setDeciding(true);
    try {
      await approveSubcontract(selected.id);
      Alert.alert('Утверждено', 'Подряд переведён в статус "В работе".');
      setSelected(null);
      await load({ reset: true });
    } catch (e: unknown) {
      Alert.alert('Не удалось утвердить', errText(e, 'Попробуйте еще раз.'));
    } finally {
      setDeciding(false);
    }
  }, [selected, load]);

  const handleReject = useCallback(
    async (comment: string) => {
      if (!selected) return;
      setDeciding(true);
      try {
        await rejectSubcontract(selected.id, comment);
        Alert.alert('Отклонено', 'Прораб увидит причину отклонения.');
        setSelected(null);
        await load({ reset: true });
      } catch (e: unknown) {
        Alert.alert('Не удалось отклонить', errText(e, 'Попробуйте еще раз.'));
      } finally {
        setDeciding(false);
      }
    },
    [selected, load],
  );

  return (
    <View style={{ flex: 1 }}>
      {selected ? (
        <SubcontractDetail
          item={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          deciding={deciding}
        />
      ) : null}

      <FlashList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        {...DIRECTOR_SUBCONTRACT_LIST_FLATLIST_TUNING}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: contentTopPad, paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />}
        onEndReachedThreshold={0.45}
        onEndReached={hasMore ? onEndReached : undefined}
        ListHeaderComponent={
          <View style={ds.filterRow}>
            {FILTER_TABS.map((t) => {
              const active = filter === t.key;
              const isBadge = t.key === 'pending' && pendingCount > 0;
              return (
                <Pressable key={t.key} onPress={() => setFilter(t.key)} style={[ds.filterBtn, active && ds.filterBtnActive]}>
                  <Text style={[ds.filterText, active && ds.filterTextActive]}>
                    {t.label}
                    {isBadge ? ` (${pendingCount})` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color="#0EA5E9" />
          ) : (
            <Text style={ds.emptyText}>
              {filter === 'pending'
                ? 'Нет подрядов на утверждении'
                : `Нет подрядов со статусом "${FILTER_TABS.find((t) => t.key === filter)?.label}"`}
            </Text>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color="#0EA5E9" />
            </View>
          ) : null
        }
      />
    </View>
  );
}
