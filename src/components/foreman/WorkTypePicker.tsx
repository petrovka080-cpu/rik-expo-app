import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createGuardedPagedQuery,
  isRecordRow,
  normalizePage,
  type PagedQuery,
} from '../../lib/api/_core';
import { supabase } from '../../../src/lib/supabaseClient';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (wt: { code: string; name: string }) => void;
};

type Row = {
  code: string;
  work_name_ru: string;
  family_code: string;
  family_short_name_ru: string;
  family_sort: number;
};

type FamilyRow = {
  family_code: string;
  family_short_name_ru: string;
  family_sort: number;
  count: number;
};

const WORK_TYPE_PICKER_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 };

type PagedWorkTypeResult<T> = {
  data: T[] | null;
  error: unknown;
};

const loadPagedWorkTypeRows = async <T,>(
  queryFactory: () => PagedQuery<T>,
): Promise<PagedWorkTypeResult<T>> => {
  const rows: T[] = [];

  for (let pageIndex = 0; ; pageIndex += 1) {
    const page = normalizePage({ page: pageIndex }, WORK_TYPE_PICKER_PAGE_DEFAULTS);
    const result = await queryFactory().range(page.from, page.to);
    if (result.error) return { data: null, error: result.error };

    const pageRows = Array.isArray(result.data) ? result.data : [];
    rows.push(...pageRows);
    if (pageRows.length < page.pageSize) return { data: rows, error: null };
  }
};

const sanitize = (v: unknown) => (v == null ? '' : String(v).trim());

const toRow = (r: Record<string, unknown>): Row | null => {
  const code = sanitize(r.code);
  if (!code) return null;
  return {
    code,
    work_name_ru: sanitize(r.work_name_ru),
    family_code: sanitize(r.family_code) || 'other',
    family_short_name_ru: sanitize(r.family_short_name_ru) || 'Прочее',
    family_sort: Number(r.family_sort ?? 999),
  };
};

export default function WorkTypePicker({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2-level UI: null = family list, otherwise selected family details.
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    setQuery('');
    setError(null);
    setSelectedFamily(null);

    (async () => {
      try {
        setLoading(true);

        const { data, error: fetchError } = await loadPagedWorkTypeRows<Record<string, unknown>>(() =>
          createGuardedPagedQuery(
            supabase
              .from('v_work_types_picker')
              .select('code, work_name_ru, family_code, family_short_name_ru, family_sort')
              .order('family_sort', { ascending: true })
              .order('work_name_ru', { ascending: true })
              .order('code', { ascending: true }),
            isRecordRow,
            'WorkTypePicker.v_work_types_picker',
          ),
        );

        if (fetchError) throw fetchError;

        const list = Array.isArray(data)
          ? data.map(toRow).filter((r): r is Row => !!r)
          : [];

        // Dedupe by code.
        const deduped = new Map<string, Row>();
        list.forEach((r) => {
          if (!deduped.has(r.code)) deduped.set(r.code, r);
        });

        setRows(Array.from(deduped.values()));
      } catch (e) {
        if (__DEV__) console.error('[WorkTypePicker]', e);
        setRows([]);
        setError('Не удалось получить список работ');
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = r.work_name_ru.toLowerCase();
      const code = r.code.toLowerCase();
      const fam = r.family_short_name_ru.toLowerCase();
      return name.includes(q) || code.includes(q) || fam.includes(q);
    });
  }, [rows, query]);

  const families = useMemo(() => {
    const map = new Map<string, FamilyRow>();

    filtered.forEach((r) => {
      const key = r.family_code || 'other';
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else {
        map.set(key, {
          family_code: key,
          family_short_name_ru: r.family_short_name_ru,
          family_sort: r.family_sort,
          count: 1,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        a.family_sort - b.family_sort ||
        a.family_short_name_ru.localeCompare(b.family_short_name_ru, 'ru'),
    );
  }, [filtered]);

  const currentFamilyTitle = useMemo(() => {
    if (!selectedFamily) return '';
    const found = families.find((f) => f.family_code === selectedFamily);
    return found?.family_short_name_ru ?? 'Вид работ';
  }, [families, selectedFamily]);

  const listInside = useMemo(() => {
    if (!selectedFamily) return [];
    const arr = filtered.filter((r) => r.family_code === selectedFamily);
    return arr.sort((a, b) => a.work_name_ru.localeCompare(b.work_name_ru, 'ru'));
  }, [filtered, selectedFamily]);
  const sheetTopPad = Platform.OS === 'web' ? 10 : Math.max(10, insets.top + 6);
  const sheetBottomPad = Platform.OS === 'web' ? 0 : Math.max(12, insets.bottom);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[localStyles.backdrop, { paddingTop: sheetTopPad }]}
      >
        <View
          style={[
            localStyles.sheet,
            {
              paddingTop: 16 + Math.min(insets.top, 12),
              paddingBottom: 16 + sheetBottomPad,
              maxWidth: Platform.OS === 'web' ? 900 : undefined,
              alignSelf: Platform.OS === 'web' ? 'center' : undefined,
            },
          ]}
        >
          <View style={localStyles.headerRow}>
            <View style={localStyles.headerCopy}>
              <Text style={localStyles.title}>
                {selectedFamily ? currentFamilyTitle : 'Выберите вид работ'}
              </Text>
              <Text style={localStyles.subtitle}>
                {selectedFamily
                  ? 'Выберите конкретную работу из списка'
                  : 'Сначала выберите раздел, затем конкретную работу'}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              style={localStyles.closeButton}
            >
              <Text style={localStyles.closeText}>Закрыть</Text>
            </Pressable>
          </View>

          <View style={localStyles.searchBlock}>
            <TextInput
              placeholder="Поиск по названию или коду (WT-...)"
              value={query}
              onChangeText={setQuery}
              placeholderTextColor="#94A3B8"
              style={[
                localStyles.searchInput,
                {
                  paddingVertical: Platform.OS === 'web' ? 10 : 12,
                },
              ]}
            />
          </View>

          <View style={localStyles.content}>
            {loading ? (
              <View style={localStyles.loadingBox}>
                <ActivityIndicator size="large" />
                <Text style={localStyles.loadingText}>
                  Загружаем виды работ...
                </Text>
              </View>
            ) : (selectedFamily ? listInside.length === 0 : families.length === 0) ? (
              <View style={localStyles.emptyBox}>
                <Text style={localStyles.emptyText}>
                  {error ?? 'Не найдено подходящих видов работ'}
                </Text>
              </View>
            ) : selectedFamily ? (
              <>
                <View style={localStyles.backRow}>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setSelectedFamily(null);
                    }}
                    style={localStyles.backButton}
                  >
                    <Text style={localStyles.backButtonText}>Назад</Text>
                  </Pressable>
                </View>

                <ScrollView
                  style={localStyles.list}
                  contentContainerStyle={{ paddingBottom: 12 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {listInside.map((item) => (
                    <Pressable
                      key={item.code}
                      onPress={() => {
                        Keyboard.dismiss();
                        onSelect({ code: item.code, name: item.work_name_ru });
                      }}
                      style={({ pressed }) => [
                        localStyles.workItem,
                        pressed && localStyles.workItemPressed,
                      ]}
                    >
                      <Text style={localStyles.workItemTitle}>
                        {item.work_name_ru}
                      </Text>
                      <Text style={localStyles.workItemCode}>{item.code}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : (
              <ScrollView
                style={localStyles.list}
                contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 12 }}
                keyboardShouldPersistTaps="handled"
              >
                {families.map((f) => (
                  <Pressable
                    key={f.family_code}
                    onPress={() => {
                      Keyboard.dismiss();
                      setSelectedFamily(f.family_code);
                    }}
                    style={localStyles.familyChip}
                  >
                    <Text style={localStyles.familyChipText}>
                      {f.family_short_name_ru} {f.count}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,
    height: '96%',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 4,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  closeText: {
    fontWeight: '800',
  },
  searchBlock: {
    marginTop: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  content: {
    flex: 1,
    marginTop: 14,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
    fontWeight: '700',
  },
  emptyBox: {
    paddingVertical: 16,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
  },
  backRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '900',
  },
  list: {
    flex: 1,
  },
  workItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#eef2f7',
    marginBottom: 10,
  },
  workItemPressed: {
    backgroundColor: '#f3f4f6',
  },
  workItemTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  workItemCode: {
    color: '#6b7280',
    marginTop: 3,
  },
  familyChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
  },
  familyChipText: {
    color: '#111827',
    fontWeight: '900',
    fontSize: 16,
  },
});
