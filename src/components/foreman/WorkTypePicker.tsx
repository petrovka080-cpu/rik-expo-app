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

  // ✅ 2-уровневый UI:
  // null = экран семейств, иначе экран конкретного семейства
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    setQuery('');
    setError(null);
    setSelectedFamily(null);

    (async () => {
      try {
        setLoading(true);

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

        setRows(Array.from(deduped.values()));
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

  const families = useMemo(() => {
    const map = new Map<
      string,
      { family_code: string; family_short_name_ru: string; family_sort: number; count: number }
    >();

    filtered.forEach((r) => {
      const key = r.family_code || 'other';
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else
        map.set(key, {
          family_code: key,
          family_short_name_ru: r.family_short_name_ru,
          family_sort: r.family_sort,
          count: 1,
        });
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
  style={{
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end', // ✅ снизу как sheet
    paddingTop: 10,
    paddingHorizontal: 0,
    paddingBottom: 0,
  }}
>
<View
  style={{
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,

    height: '96%',        // ✅ почти весь экран
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 900 : undefined,
alignSelf: Platform.OS === 'web' ? 'center' : undefined,

  }}
>
          {/* HEADER */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 26, fontWeight: '900' }}>
                {selectedFamily ? currentFamilyTitle : 'Выберите вид работ'}
              </Text>
              <Text style={{ color: '#6b7280', marginTop: 4 }}>
                {selectedFamily
                  ? 'Выберите конкретную работу из списка'
                  : 'Сначала выберите раздел, затем конкретную работу'}
              </Text>
            </View>

            {/* справа: закрыть */}
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: '#f3f4f6',
              }}
            >
              <Text style={{ fontWeight: '800' }}>Закрыть</Text>
            </Pressable>
          </View>

          {/* SEARCH */}
          <View style={{ marginTop: 12 }}>
            <TextInput
              placeholder="Поиск по названию или коду (WT-...)"
              value={query}
              onChangeText={setQuery}
              placeholderTextColor="#94A3B8"
              style={{
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: Platform.OS === 'web' ? 10 : 12,
                backgroundColor: '#fff',
                fontSize: 16,
              }}
            />
          </View>

          {/* BODY */}
          <View style={{ flex: 1, marginTop: 14 }}>
            {loading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 10, color: '#6b7280', fontWeight: '700' }}>
                  Загружаем виды работ…
                </Text>
              </View>
            ) : (selectedFamily ? listInside.length === 0 : families.length === 0) ? (
              <View style={{ paddingVertical: 16 }}>
                <Text style={{ color: '#6b7280', textAlign: 'center' }}>
                  {error ?? 'Не найдено подходящих видов работ'}
                </Text>
              </View>
            ) : selectedFamily ? (
              <>
                {/* BACK */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 }}>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setSelectedFamily(null);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: '#111827',
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '900' }}>← Назад</Text>
                  </Pressable>
                </View>

                {/* LIST OF WORK TYPES */}
                <ScrollView
                  style={{ flex: 1 }}
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
                      style={({ pressed }) => ({
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        borderRadius: 14,
                        backgroundColor: pressed ? '#f3f4f6' : 'transparent',
                        borderWidth: 1,
                        borderColor: '#eef2f7',
                        marginBottom: 10,
                      })}
                    >
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>
                        {item.work_name_ru}
                      </Text>
                      <Text style={{ color: '#6b7280', marginTop: 3 }}>{item.code}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                {/* FAMILY CHIPS (только они на первом экране) */}
                <ScrollView
                  style={{ flex: 1 }}
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
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 999,
                        marginRight: 10,
                        marginBottom: 10,
                        backgroundColor: '#f3f4f6',
                      }}
                    >
                      <Text style={{ color: '#111827', fontWeight: '900', fontSize: 16 }}>
                        {f.family_short_name_ru} {f.count}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
