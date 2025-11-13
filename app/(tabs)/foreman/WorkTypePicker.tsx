import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, FlatList, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../../../src/lib/supabaseClient';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (wt: { code: string; name: string }) => void;
};

type Row = { code: string; name: string };

export default function WorkTypePicker({ visible, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        setLoading(true);
        const { data: wt1, error: e1 } = await supabase
          .from('reno_work_types')
          .select('code, name_ru')
          .order('name_ru', { ascending: true })
          .limit(1000);

        if (!e1 && wt1 && wt1.length) {
          setRows(wt1.map(r => ({ code: r.code, name: r.name_ru ?? r.code })));
          return;
        }

        const { data: wt2, error: e2 } = await supabase
          .from('reno_norm_rules')
          .select('work_type_code')
          .limit(10000);

        if (e2) throw e2;
        const uniq = Array.from(new Set((wt2 ?? []).map(r => (r as any).work_type_code))).sort();
        setRows(uniq.map(code => ({ code, name: code })));
      } catch (e: any) {
        console.error('[WorkTypePicker]', e?.message ?? e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.name ?? '').toLowerCase().includes(q) ||
      (r.code ?? '').toLowerCase().includes(q)
    );
  }, [rows, query]);

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
              borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 8 : 10,
              marginBottom: 10
            }}
          />
          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(it) => it.code}
              style={{ maxHeight: 460, minWidth: 320 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => ({
                    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8,
                    backgroundColor: pressed ? '#f3f4f6' : 'transparent'
                  })}
                >
                  <Text style={{ fontSize: 16 }}>{item.name}</Text>
                  <Text style={{ color: '#6b7280', marginTop: 2 }}>{item.code}</Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            />
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6' }}>
              <Text style={{ fontWeight: '600' }}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

