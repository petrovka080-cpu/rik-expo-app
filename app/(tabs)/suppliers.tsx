import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, Platform, Modal, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../src/lib/supabaseClient';
import { listSuppliers, upsertSupplier, listSupplierFiles, type Supplier } from '../../src/lib/catalog_api';
import { uploadSupplierFile } from '../../src/lib/files';

const COLORS = {
  bg: '#F8FAFC',
  text: '#0F172A',
  sub: '#475569',
  border: '#E2E8F0',
  primary: '#111827',
  blue: '#2563eb',
};

const isWeb = Platform.OS === 'web';
const normalize = (s?: string | null) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

export default function SuppliersScreen() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Supplier[]>([]);
  const [busy, setBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<Supplier>>({});
  const [files, setFiles] = useState<any[]>([]);
  const [filesBusy, setFilesBusy] = useState(false);

  const invoiceInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async (qq?: string) => {
    setBusy(true);
    try {
      const list = await listSuppliers(qq);
      setRows(list);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const n = normalize(q);
    return rows.filter(
      (s) =>
        normalize(s.name).includes(n) ||
        normalize(s.inn).includes(n) ||
        normalize(s.specialization).includes(n)
    );
  }, [q, rows]);

  const openCreate = () => {
    setEditDraft({});
    setFiles([]);
    setEditOpen(true);
  };

  const openEdit = async (s: Supplier) => {
    setEditDraft(s);
    setEditOpen(true);
    try {
      setFilesBusy(true);
      const ff = await listSupplierFiles(s.id);
      setFiles(ff);
    } catch {
      /* no-op */
    } finally {
      setFilesBusy(false);
    }
  };

  const pickFileWeb = useCallback(() => {
    if (!isWeb) return;
    invoiceInputRef.current?.click?.();
  }, []);

  const onFileChangeWeb = useCallback(
    async (e: any) => {
      try {
        const f = e?.target?.files?.[0];
        if (!f) return;
        if (!editDraft?.id) {
          Alert.alert('Сначала сохраните поставщика');
          return;
        }
        const { url } = await uploadSupplierFile(editDraft.id!, f, f.name, 'price');
        setFiles((prev) => [
          { file_name: f.name, file_url: url, group_key: 'price' },
          ...prev,
        ]);
        Alert.alert('Готово', 'Файл загружен');
      } catch (err: any) {
        Alert.alert('Ошибка загрузки', err?.message ?? String(err));
      } finally {
        if (invoiceInputRef.current) (invoiceInputRef.current as any).value = '';
      }
    },
    [editDraft?.id]
  );

  const pickFileNative = useCallback(async () => {
    try {
      // @ts-ignore
      const DocPicker = await import('expo-document-picker');
      const res = await (DocPicker as any).getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res?.canceled) return;
      const f = res?.assets?.[0] ?? res;
      if (!f) return;
      if (!editDraft?.id) {
        Alert.alert('Сначала сохраните поставщика');
        return;
      }
      const { url } = await uploadSupplierFile(
        editDraft.id!,
        f,
        f.name ?? 'file.bin',
        'price'
      );
      setFiles((prev) => [
        { file_name: f.name ?? 'file', file_url: url, group_key: 'price' },
        ...prev,
      ]);
      Alert.alert('Готово', 'Файл загружен');
    } catch (e: any) {
      Alert.alert('Файл', e?.message ?? String(e));
    }
  }, [editDraft?.id]);

  // --- ФИКС: сохраняем все поля как объект
  const save = useCallback(async () => {
    try {
      const payload: Partial<Supplier> = {
        id: editDraft.id,
        name: (editDraft.name || '').trim(),
        inn: editDraft.inn || null,
        bank_account: editDraft.bank_account || null,
        specialization: editDraft.specialization || null,
        contact_name: editDraft.contact_name || null,
        phone: editDraft.phone || null,
        email: editDraft.email || null,
        website: editDraft.website || null,
        address: editDraft.address || null,
        notes: editDraft.notes || null,
      };
      const saved = await upsertSupplier(payload);
      setEditDraft(saved);
      await load(q);
      Alert.alert('Сохранено', 'Данные поставщика сохранены');
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? String(e));
    }
  }, [editDraft, q, load]);

  const SupplierRow = ({ s }: { s: Supplier }) => (
    <Pressable onPress={() => openEdit(s)} style={styles.card}>
      <Text style={styles.cardTitle}>{s.name}</Text>
      <Text style={styles.cardMeta}>
        {(s.inn ? `ИНН: ${s.inn} · ` : '')}
        {s.specialization || 'Специализация не указана'}
      </Text>
      {s.phone || s.email || s.website ? (
        <Text style={styles.cardMeta2}>
          {[s.phone, s.email, s.website].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: COLORS.bg }]}>
      {/* toolbar */}
      <View style={styles.toolbar}>
        <Text style={styles.title}>Поставщики</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1 }}>
          <TextInput
            value={q}
            onChangeText={(t) => setQ(t)}
            placeholder="Поиск: название / ИНН / специализация"
            style={[styles.input, { flex: 1 }]}
          />
          <Pressable
            onPress={() => load(q)}
            style={[styles.smallBtn, { borderColor: COLORS.primary }]}
          >
            <Text style={[styles.smallBtnText, { color: COLORS.primary }]}>
              Найти
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={openCreate}
          style={[styles.smallBtn, { backgroundColor: COLORS.blue, borderColor: COLORS.blue }]}
        >
          <Text style={[styles.smallBtnText, { color: '#fff' }]}>Добавить</Text>
        </Pressable>
      </View>

      {busy ? (
        <View style={{ padding: 24 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(x) => x.id}
          renderItem={({ item }) => <SupplierRow s={item} />}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          ListEmptyComponent={<Text style={{ padding: 12, color: COLORS.sub }}>Пока пусто</Text>}
        />
      )}

      {/* edit dialog */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { width: 760 }]}>
            <Text style={styles.modalTitle}>
              {editDraft?.id ? 'Правка поставщика' : 'Новый поставщик'}
            </Text>
            <Text style={styles.modalHelp}>
              Обязательное поле — «Название». Остальные поля заполняются по мере необходимости.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flexGrow: 1, minWidth: 300 }}>
                <Text style={styles.label}>Название *</Text>
                <TextInput
                  style={styles.input}
                  placeholder='ООО «Ромашка» / ИП Иванов'
                  value={editDraft.name || ''}
                  onChangeText={(v) => setEditDraft((d) => ({ ...d, name: v }))}
                />
              </View>
              <View style={{ width: 220 }}>
                <Text style={styles.label}>ИНН</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ИНН"
                  value={editDraft.inn || ''}
                  onChangeText={(v) => setEditDraft((d) => ({ ...d, inn: v }))}
                />
              </View>
              <View style={{ width: 300 }}>
                <Text style={styles.label}>Счёт</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Расчётный счёт"
                  value={editDraft.bank_account || ''}
                  onChangeText={(v) => setEditDraft((d) => ({ ...d, bank_account: v }))}
                />
              </View>
              <View style={{ width: 300 }}>
                <Text style={styles.label}>Специализация</Text>
                <TextInput
                  style={styles.input}
                  placeholder="бетон, арматура…"
                  value={editDraft.specialization || ''}
                  onChangeText={(v) => setEditDraft((d) => ({ ...d, specialization: v }))}
                />
              </View>
              <View style={{ width: 220 }}>
                <Text style={styles.label}>Контактное лицо</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ФИО"
                  value={editDraft.contact_name || ''}
                  onChangeText={(v) => setEditDraft((d) => ({ ...d, contact_name: v }))}
                />
              </View>
              <View style={{ width: 200 }}>
                <Text style={styles.label}>Телефон</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+996…"
                  value={editDraft.phone || ''}
                  onChangeText={(v) => setEditDraft((d) => ({ ...d, phone: v }))}
                />
              </View>
              <View style={{ width: 260 }}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="mail@company.kg"
                  value={editDraft.email || ''}
                  onChangeText={(v) => setEditDraft((d) => ({ ...d, email: v }))}
                />
              </View>
              <View style={{ width: 260 }}>
                <Text style={styles.label}>Сайт</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://…"
                  value={editDraft.website || ''}
                  onChangeText={(v) => setEditDraft((d) => ({ ...d, website: v }))}
                />
              </View>
              <View style={{ flexBasis: '100%' }}>
                <Text style={styles.label}>Адрес</Text>
                <TextInput
                  style={styles.input}
                  placeholder="г. Бишкек, ул.…"
                  value={editDraft.address || ''}
                  onChangeText={(v) => setEditDraft((d) => ({ ...d, address: v }))}
                />
              </View>
              <View style={{ flexBasis: '100%' }}>
                <Text style={styles.label}>Комментарий</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Примечания"
                  value={editDraft.notes || ''}
                  onChangeText={(v) => setEditDraft((d) => ({ ...d, notes: v }))}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Pressable
                onPress={save}
                style={[styles.smallBtn, { backgroundColor: COLORS.blue, borderColor: COLORS.blue }]}
              >
                <Text style={[styles.smallBtnText, { color: '#fff' }]}>
                  Сохранить
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setEditOpen(false)}
                style={[styles.smallBtn, { borderColor: COLORS.border }]}
              >
                <Text style={[styles.smallBtnText, { color: COLORS.text }]}>
                  Закрыть
                </Text>
              </Pressable>
            </View>

            {/* Файлы */}
            <Text style={{ marginTop: 16, fontWeight: '800', color: COLORS.text }}>
              Прайсы / фото (опционально)
            </Text>

            {isWeb ? (
              <>
                <Pressable
                  onPress={pickFileWeb}
                  style={[styles.smallBtn, { borderColor: COLORS.primary }]}
                >
                  <Text style={[styles.smallBtnText, { color: COLORS.primary }]}>
                    Прикрепить файл
                  </Text>
                </Pressable>
                <input
  ref={fileRef as any}           // если у тебя другое имя — оставь своё
  type="file"
  accept=".pdf,.jpg,.jpeg,.png"
  onChange={onPickSupplierFile as any}  // оставь свой обработчик
  style={{ display: 'none' }}
/>
              </>
            ) : (
              <Pressable
                onPress={pickFileNative}
                style={[styles.smallBtn, { borderColor: COLORS.primary }]}
              >
                <Text style={[styles.smallBtnText, { color: COLORS.primary }]}>
                  Прикрепить файл
                </Text>
              </Pressable>
            )}

            <View style={{ marginTop: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 8 }}>
              {filesBusy ? (
                <ActivityIndicator />
              ) : files.length ? (
                files.map((f: any, i: number) => (
                  <Text key={i} style={{ color: COLORS.sub, paddingVertical: 2 }}>
                    • {f.file_name}
                  </Text>
                ))
              ) : (
                <Text style={{ color: COLORS.sub }}>
                  Файлы не прикреплены
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: {
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginRight: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  smallBtnText: { fontWeight: '700', color: COLORS.text, fontSize: 12 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.sub, marginTop: 2 },
  cardMeta2: { fontSize: 12, color: COLORS.sub, marginTop: 2 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: 480,
    maxWidth: '95%',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 16,
    gap: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalHelp: { fontSize: 12, color: COLORS.sub },
  label: { fontSize: 12, color: COLORS.sub, marginBottom: 4 },
});
