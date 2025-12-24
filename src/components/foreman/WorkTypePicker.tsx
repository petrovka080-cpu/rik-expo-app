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
} from 'react-native';
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

const sanitize = (v: unknown) => (v == null ? '' : String(v).trim());

export default function WorkTypePicker({ visible, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('v_work_types_picker')
          .select('code, work_name_ru, family_code, family_short_name_ru, family_sort')
          .order('family_sort', { ascending: true })
          .order('work_name_ru', { ascending: true });

        if (fetchError) throw fetchError;

        const list: Row[] = Array.isArray(data)
          ? (data as any[]).map((r) => ({
              code: sanitize(r.code),
              work_name_ru: sanitize(r.work_name_ru),
              family_code: sanitize(r.family_code) || 'other',
              family_short_name_ru: sanitize(r.family_short_name_ru) || 'Прочее',
              family_sort: Number(r.family_sort ?? 999),
            }))
          : [];

        // dedupe по code
        const deduped = new Map<string, Row>();
        list.forEach((r) => {
          if (!r.code) return;
          if (!deduped.has(r.code)) deduped.set(r.code, r);
        });

        const finalList = Array.from(deduped.values());
        setRows(finalList);

        const firstFamily = finalList[0]?.family_code ?? 'other';
        setSelectedFamily((prev) => prev ?? firstFamily);
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
      const name = r.work_name_ru.toLowerCase();
      const code = r.code.toLowerCase();
      const fam = r.family_short_name_ru.toLowerCase();
      return name.includes(q) || code.includes(q) || fam.includes(q);
    });
  }, [rows, query]);

  const chips = useMemo(() => {
    const map = new Map<
      string,
      { family_code: string; family_short_name_ru: string; family_sort: number; count: number }
    >();

    filtered.forEach((r) => {
      const key = r.family_code || 'other';
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { family_code: key, family_short_name_ru: r.family_short_name_ru, family_sort: r.family_sort, count: 1 });
    });

    return Array.from(map.values()).sort(
      (a, b) => (a.family_sort - b.family_sort) || a.family_short_name_ru.localeCompare(b.family_short_name_ru, 'ru')
    );
  }, [filtered]);

  const listInside = useMemo(() => {
    const fam = selectedFamily ?? null;
    const arr = fam ? filtered.filter((r) => r.family_code === fam) : filtered;
    return arr.sort((a, b) => a.work_name_ru.localeCompare(b.work_name_ru, 'ru'));
  }, [filtered, selectedFamily]);

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
          ) : listInside.length === 0 ? (
            <View style={{ paddingVertical: 16 }}>
              <Text style={{ color: '#6b7280', textAlign: 'center' }}>
                {error ?? 'Не найдено подходящих видов работ'}
              </Text>
            </View>
          ) : (
            <>
              {/* ✅ ЧИПСЫ как на твоём старом скрине */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                {chips.map((c) => {
                  const active = (selectedFamily ?? 'other') === c.family_code;
                  return (
                    <Pressable
                      key={c.family_code}
                      onPress={() => setSelectedFamily(c.family_code)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 999,
                        marginRight: 8,
                        marginBottom: 8,
                        backgroundColor: active ? '#111827' : '#f3f4f6',
                      }}
                    >
                      <Text style={{ color: active ? '#fff' : '#111827', fontWeight: '700' }}>
                        {c.family_short_name_ru} {c.count}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* ✅ список работ */}
              <ScrollView style={{ maxHeight: 460, minWidth: 320 }}>
                {listInside.map((item) => (
                  <Pressable
                    key={item.code}
                    onPress={() => onSelect({ code: item.code, name: item.work_name_ru })}
                    style={({ pressed }) => ({
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: pressed ? '#f3f4f6' : 'transparent',
                    })}
                  >
                    <Text style={{ fontSize: 16 }}>{item.work_name_ru}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
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

