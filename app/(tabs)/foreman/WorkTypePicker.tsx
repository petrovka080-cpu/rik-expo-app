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
  name_human_ru: string | null;
  name_ru: string | null;
  segment: string | null;
};

type Section = {
  title: string;
  data: Row[];
};

const toLower = (val: string | null | undefined) => (val ? String(val).toLowerCase() : '');

const sanitize = (value: unknown): string | null => {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
};

const pickDisplayName = (record: { name_human_ru?: unknown; name_ru?: unknown; code?: unknown }) =>
  sanitize(record.name_human_ru) ?? sanitize(record.name_ru) ?? sanitize(record.code) ?? '';

const normalizeGroupTitle = (row: Row) => {
  const trimmed = row.segment ? row.segment.trim() : '';
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

        const { data, error: fetchError } = await supabase
          .from('reno_work_types')
          .select('code, name_human_ru, name_ru, segment')
          .order('segment', { ascending: true })
          .order('name_human_ru', { ascending: true })
          .limit(2000);
        if (fetchError) throw fetchError;

        if (Array.isArray(data)) {
          const deduped = new Map<string, Row>();

          (data as any[]).forEach((record) => {
            const code = sanitize(record.code) ?? '';
            if (!code) return;
            const row: Row = {
              code,
              name_human_ru: sanitize(record.name_human_ru),
              name_ru: sanitize(record.name_ru),
              segment: sanitize(record.segment),
              name: pickDisplayName(record),
            };

            if (!deduped.has(code)) {
              deduped.set(code, row);
              return;
            }

            const existing = deduped.get(code)!;
            if (!existing.name || existing.name === existing.code) {
              deduped.set(code, row);
            }
          });

          const list = Array.from(deduped.values());
          if (list.length > 0) {
            setRows(list);
            return;
          }
        }

        setRows([]);
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
      const segment = toLower(r.segment);
      return name.includes(q) || code.includes(q) || segment.includes(q);
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
                  onPress={() => onSelect({ code: item.code, name: item.name })}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    backgroundColor: pressed ? '#f3f4f6' : 'transparent',
                  })}
                >
                  <Text style={{ fontSize: 16 }}>
                    {item.name_human_ru ?? item.name_ru ?? item.code}
                  </Text>
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
