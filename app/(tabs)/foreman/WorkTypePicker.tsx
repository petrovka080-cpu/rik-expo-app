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

        const queryVariants = [
          'code, name_ru, group_code, group_name_ru, group_name',
          'code, name_ru, group_code, group_name_ru',
          'code, name_ru, group_code, group_name',
          'code, name_ru, group_code',
          'code, name_ru',
        ];

        let fetched: Row[] | null = null;
        for (const cols of queryVariants) {
          const { data, error: selectError } = await supabase
            .from('reno_work_types')
            .select(cols)
            .order('group_code', { ascending: true, nullsFirst: true })
            .order('name_ru', { ascending: true })
            .limit(2000);

          if (!selectError && data) {
            fetched = (data as any[]).map((r) => ({
              code: r.code,
              name: r.name_ru ?? r.name ?? r.code,
              groupCode: r.group_code ?? null,
              groupName:
                r.group_name_ru ??
                r.group_name ??
                r.group_title_ru ??
                r.group_title ??
                r.group ??
                null,
            }));
            break;
          }
        }

        if (fetched && fetched.length > 0) {
          setRows(fetched);
          return;
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
      const group = toLower(r.groupName);
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
                  <Text style={{ fontSize: 16 }}>{item.name}</Text>
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
