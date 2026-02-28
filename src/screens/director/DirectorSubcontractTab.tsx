import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import {
  PRICE_TYPE_LABEL,
  STATUS_CONFIG,
  WORK_MODE_LABEL,
  approveSubcontract,
  fmtAmount,
  fmtDate,
  listDirectorSubcontracts,
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
  onScroll: any;
};

export default function DirectorSubcontractTab({ contentTopPad, onScroll }: Props) {
  const [items, setItems] = useState<Subcontract[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [selected, setSelected] = useState<Subcontract | null>(null);
  const [deciding, setDeciding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listDirectorSubcontracts();
      setItems(list);
    } catch (e: any) {
      console.warn('[DirectorSubcontractTab] load error:', e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const filtered = items.filter((x) => x.status === filter);
  const pendingCount = items.filter((x) => x.status === 'pending').length;

  const handleApprove = useCallback(async () => {
    if (!selected) return;
    setDeciding(true);
    try {
      await approveSubcontract(selected.id);
      Alert.alert('Утверждено', 'Подряд переведён в статус "В работе".');
      setSelected(null);
      await load();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось утвердить');
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
        await load();
      } catch (e: any) {
        Alert.alert('Ошибка', e?.message ?? 'Не удалось отклонить');
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

      <FlatList
        data={filtered}
        keyExtractor={(x) => x.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: contentTopPad, paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />}
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
        renderItem={({ item }) => <SubCard item={item} onPress={setSelected} />}
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
      />
    </View>
  );
}

const ds = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  cardMeta: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  cardMeta2: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  cardPrice: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '800',
    marginTop: 4,
  },
  cardDate: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 4,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 4,
    marginBottom: 4,
  },
  filterBtnActive: {
    backgroundColor: '#0F172A',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  emptyText: {
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    flex: 1,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '800',
    flex: 2,
    textAlign: 'right',
  },
  commentText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  actionBlock: {
    marginTop: 24,
    gap: 10,
  },
  btnApprove: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  btnApproveText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  btnReject: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  btnRejectText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  btnCancel: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  btnCancelText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  rejectLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  rejectInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  closeBtn: {
    margin: 16,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 15,
  },
});
