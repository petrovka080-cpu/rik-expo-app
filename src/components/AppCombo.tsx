import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, TextInput } from 'react-native';

export type AppOption = { code: string; label: string };

function norm(s: string) {
  return (s || '').trim().replace(/\s+/g, ' ');
}

export default function AppCombo({
  value,
  options,
  placeholder = 'Область применения',
  allowCreate = true,
  onChange,           // (code|null, isNew:boolean, label?:string)
}: {
  value?: string | null;
  options: AppOption[];
  placeholder?: string;
  allowCreate?: boolean;
  onChange: (code: string | null, isNew: boolean, label?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return options.filter(o => (o.label + ' ' + o.code).toLowerCase().includes(needle));
  }, [q, options]);

  const currentLabel =
    options.find(o => o.code === value)?.label ??
    (value ? value : placeholder);

  function pick(o: AppOption) {
    setOpen(false);
    onChange(o.code || null, false, o.label);
  }
  function createOwn() {
    const label = norm(q);
    if (!label) return;
    setOpen(false);
    onChange(label, true, label); // код = введённая строка (можно позже сменить на строгий генератор)
  }

  const canCreate =
    allowCreate &&
    q.trim().length > 0 &&
    !options.some(o =>
      o.code.toLowerCase() === q.trim().toLowerCase() ||
      o.label.toLowerCase() === q.trim().toLowerCase()
    );

  return (
    <View>
      <Text style={{ marginBottom: 6, fontSize: 12, color: '#666' }}>Область применения</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}
      >
        <Text style={{ color: value ? '#111' : '#666' }}>{currentLabel}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setOpen(false)}>
          <View />
        </Pressable>

        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            top: 90,
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 12,
            elevation: 4,
          }}
        >
          <TextInput
            placeholder="Поиск или введите свою метку…"
            value={q}
            onChangeText={setQ}
            autoFocus
            style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 8 }}
          />

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code + '|' + item.label}
            renderItem={({ item }) => (
              <Pressable onPress={() => pick(item)} style={{ paddingVertical: 10 }}>
                <Text style={{ fontSize: 16 }}>{item.label}</Text>
                <Text style={{ color: '#666', fontSize: 12 }}>{item.code}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f0f0f0' }} />}
            style={{ maxHeight: 300 }}
          />

          {canCreate && (
            <Pressable
              onPress={createOwn}
              style={{ marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#111',
                       paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
            >
              <Text style={{ color: '#fff' }}>Создать: “{norm(q)}”</Text>
            </Pressable>
          )}
        </View>
      </Modal>
    </View>
  );
}
