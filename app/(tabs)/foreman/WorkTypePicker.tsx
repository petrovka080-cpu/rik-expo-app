import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  SectionList,
} from 'react-native';
import { supabase } from '../../../src/lib/supabaseClient';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (wt: { code: string; name: string }) => void;
};

type Row = {
  code: string;
  name: string;
  groupCode?: string | null;
  groupName?: string | null;
};

type Section = {
  title: string;
  data: Row[];
};

const toLower = (val: string | null | undefined) => (val ? String(val).toLowerCase() : '');

const POSTGRES_COLUMN_NOT_EXIST = '42703';

const PRIMARY_COLUMNS = [
  'code',
  'name_human_ru',
  'name',
  'group_code',
  'group_name_ru',
  'group_name',
];

const FALLBACK_SELECTS = [
  'code, name_human_ru, group_code, group_name_ru, group_name',
  'code, name_human_ru, group_code, group_name_ru',
  'code, name_human_ru, group_code, group_name',
  'code, name_human_ru, group_code',
  'code, name_human_ru',
  'code',
];

const normalizeGroupTitle = (row: Row) => {
  const name = row.groupName ?? row.groupCode;
  const trimmed = name ? String(name).trim() : '';
  if (trimmed.length > 0) return trimmed;
  return 'Прочие работы';
};

export default function WorkTypePicker({ visible, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        let fetched: Row[] | null = null;

        const { data, error: primaryError } = await supabase
          .from('reno_work_types')
          .select(PRIMARY_COLUMNS.join(', '))
          .limit(2000);

        const sanitize = (value: unknown) => {
          if (value == null) return null;
          const str = String(value).trim();
          return str.length > 0 ? str : null;
        };

        const pickName = (record: any) =>
          (sanitize(record.name_human_ru) as string | null) ??
          (sanitize(record.name) as string | null) ??
          (sanitize(record.code) as string | null) ??
          '';

        const pickGroupName = (record: any) =>
          (sanitize(record.group_name_ru) as string | null) ??
          (sanitize(record.group_name) as string | null) ??
          (sanitize(record.group_code) as string | null) ??
          null;

        const mapRow = (r: any): Row => ({
          code: String(r.code ?? '').trim(),
          name: pickName(r),
          groupCode: sanitize(r.group_code) as string | null,
          groupName: pickGroupName(r),
        });

        if (!primaryError && Array.isArray(data)) {
          fetched = (data as any[]).map(mapRow);
        }

        if (primaryError && primaryError.code !== POSTGRES_COLUMN_NOT_EXIST) {
          throw primaryError;
        }

        if (!fetched && primaryError?.code === POSTGRES_COLUMN_NOT_EXIST) {
          for (const cols of FALLBACK_SELECTS) {
            const { data: fallbackData, error: selectError } = await supabase
              .from('reno_work_types')
              .select(cols)
              .limit(2000);

            if (!selectError && Array.isArray(fallbackData)) {
              fetched = (fallbackData as any[]).map(mapRow);
              break;
            }

            if (selectError && selectError.code !== POSTGRES_COLUMN_NOT_EXIST) {
              throw selectError;
            }
          }
        }

        if (fetched && fetched.length > 0) {
          const deduped = new Map<string, Row>();
          fetched.forEach((row) => {
            if (!row.code) return;
            const existing = deduped.get(row.code);
            if (!existing) {
              deduped.set(row.code, row);
              return;
            }

            const existingName = existing.name?.trim();
            const nextName = row.name?.trim();
            if ((!existingName || existingName === existing.code) && nextName && nextName !== row.code) {
              deduped.set(row.code, row);
            }
          });

          const list = Array.from(deduped.values());
          if (list.length > 0) {
            setRows(list);
            return;
          }
        }

        const { data: wt2, error: e2 } = await supabase
          .from('reno_norm_rules')
          .select('work_type_code')
          .limit(10000);

        if (e2) throw e2;
        const uniq = Array.from(new Set((wt2 ?? []).map((r) => (r as any).work_type_code))).sort();
        setRows(uniq.map((code) => ({ code, name: code })));
      } catch (e: any) {
        console.error('[WorkTypePicker]', e);
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
      const name = toLower(r.name);
      const code = toLower(r.code);
      const group = toLower(r.groupName) || toLower(r.groupCode);
      return name.includes(q) || code.includes(q) || group.includes(q);
    });
  }, [rows, query]);

  const sections = useMemo<Section[]>(() => {
    if (!filtered.length) return [];
    const grouped = new Map<string, Row[]>();
    filtered.forEach((row) => {
      const title = normalizeGroupTitle(row);
      const current = grouped.get(title) ?? [];
      current.push(row);
      grouped.set(title, current);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'ru'))
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ru')),
      }));
  }, [filtered]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: '80%' }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Выберите вид работ</Text>
          <TextInput
            placeholder="Поиск по названию или коду (WT-...)"
            value={query}
            onChangeText={setQuery}
            style={{
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: Platform.OS === 'web' ? 8 : 10,
              marginBottom: 10,
            }}
          />
          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator />
            </View>
          ) : sections.length === 0 ? (
            <View style={{ paddingVertical: 16 }}>
              <Text style={{ color: '#6b7280', textAlign: 'center' }}>
                {error ?? 'Не найдено подходящих видов работ'}
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.code}
              stickySectionHeadersEnabled
              style={{ maxHeight: 460, minWidth: 320 }}
              renderSectionHeader={({ section }) => (
                <View style={{ backgroundColor: '#f8fafc', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155' }}>{section.title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    backgroundColor: pressed ? '#f3f4f6' : 'transparent',
                  })}
                >
                  <Text style={{ fontSize: 16 }}>{item.name || item.code}</Text>
                  <Text style={{ color: '#6b7280', marginTop: 2 }}>{item.code}</Text>
                </Pressable>
              )}
              SectionSeparatorComponent={() => <View style={{ height: 10 }} />}
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            />
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
            <Pressable
              onPress={onClose}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6' }}
            >
              <Text style={{ fontWeight: '600' }}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
