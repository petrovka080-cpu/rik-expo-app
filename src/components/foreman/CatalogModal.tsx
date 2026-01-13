// src/components/foreman/CatalogModal.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  StyleSheet,
  Keyboard,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type CatalogItem = {
  rik_code: string;
  name_human_ru?: string | null;
  name_human?: string | null;
  name_ru?: string | null;
  display_name?: string | null;
  uom_code?: string | null;
  kind?: string | null;
  apps?: string[] | null;
};

const COLORS = {
  bg: '#F8FAFC',
  text: '#0F172A',
  sub: '#475569',
  border: '#E2E8F0',
  blue: '#2563EB',
  green: '#16A34A',
  greenBorder: '#15803D',
  red: '#DC2626',
};

export type PickedRow = {
  rik_code: string;
  name: string;
  uom?: string | null;
  kind?: string | null;
  qty: string;
  app_code?: string | null;
  note: string;
  appsFromItem?: string[];
};

export default function CatalogModal(props: {
  visible: boolean;
  onClose: () => void;
  rikQuickSearch: (q: string, limit?: number) => Promise<CatalogItem[]>;
  onCommitToDraft: (rows: PickedRow[]) => void | Promise<void>;
}) {
  const { visible, onClose, rikQuickSearch, onCommitToDraft } = props;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CatalogItem[]>([]);

  const [qtyByCode, setQtyByCode] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Record<string, PickedRow>>({});

  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);

  const tRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);

  const canSearch = query.trim().length >= 2;
  const pickedCount = Object.keys(picked).length;

  const HEADER_PAD_TOP =
    Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ?? 0) + 12;

  // фокус в поиск при открытии
  useEffect(() => {
    if (!visible) return;
    setSentOk(false);
    // не трогаем клавиатуру на web
    setTimeout(() => inputRef.current?.focus?.(), 250);
  }, [visible]);

  // поиск с дебаунсом
  useEffect(() => {
    if (!visible) return;
    if (tRef.current) clearTimeout(tRef.current);

    if (!canSearch) {
      setRows([]);
      return;
    }

    tRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const list = await rikQuickSearch(query, 60);
        setRows(Array.isArray(list) ? list : []);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, [query, canSearch, visible, rikQuickSearch]);

  const uniq = useMemo(() => {
    const seen = new Set<string>();
    return rows.filter((r) => {
      const k = String((r as any)?.rik_code ?? '').trim();
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [rows]);

  const titleOf = (it: CatalogItem) =>
    (it.name_human_ru || it.name_ru || it.name_human || it.display_name || it.rik_code || '—').trim();

  const clearAll = () => {
    setPicked({});
    setQtyByCode({});
    setSentOk(false);
  };

  const removePicked = (code: string) => {
    setPicked((prev) => {
      if (!prev[code]) return prev;
      const next = { ...prev };
      delete next[code];
      return next;
    });
  };

  const updatePickedQty = (code: string, qty: string) => {
    setPicked((prev) => {
      if (!prev[code]) return prev;
      return { ...prev, [code]: { ...prev[code], qty } };
    });
  };

  const commitPicked = async () => {
    const list = Object.values(picked);
    if (!list.length) return;

    // нормализуем qty
    const cleaned = list
      .map((r) => {
        const raw = String(r.qty ?? '').trim();
        const n = raw ? Number(raw.replace(',', '.')) : NaN;
        if (!Number.isFinite(n) || n <= 0) return null;
        return { ...r, qty: String(n) };
      })
      .filter(Boolean) as PickedRow[];

    if (!cleaned.length) return;

    try {
      setSending(true);
      if (Platform.OS !== 'web') Keyboard.dismiss();

      await Promise.resolve(onCommitToDraft(cleaned));

      setPicked({});
      setQtyByCode({});
      setSentOk(true);
      setTimeout(() => setSentOk(false), 1200);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ✅ НА WEB НЕ ЛОВИМ КЛИКИ, чтобы не ломать фокус.
            ✅ На мобилке: тап по фону закрывает клаву */}
        <View style={{ flex: 1 }}>
          {Platform.OS !== 'web' ? (
            <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          ) : null}

          <View style={[s.container, { backgroundColor: COLORS.bg }]}>
            {/* header */}
            <View style={[s.header, { paddingTop: HEADER_PAD_TOP }]}>
              <Text style={s.hTitle}>Каталог</Text>

              <Pressable onPress={onClose} hitSlop={16} style={s.hClose}>
                <Text style={s.hCloseText}>Закрыть</Text>
              </Pressable>
            </View>

            {/* search */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Поиск по каталогу… (бетон М250, шпаклёвка, доставка)"
                placeholderTextColor="#94A3B8"
                style={s.search}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setSentOk(false)}
              />
              {loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
            </View>

            {/* ✅ корзина внутри каталога */}
            {pickedCount > 0 ? (
              <View style={s.cartBox}>
                <View style={s.cartHead}>
                  <Text style={s.cartTitle}>Выбрано</Text>
                  <Text style={s.cartCount}>{pickedCount}</Text>
                  <Pressable onPress={clearAll} style={s.cartClearBtn}>
                    <Text style={s.cartClearText}>Очистить</Text>
                  </Pressable>
                </View>

                <FlatList
                  data={Object.values(picked)}
                  keyExtractor={(r) => `picked:${r.rik_code}`}
                  style={{ maxHeight: 180 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <View style={s.cartRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.cartRowTitle} numberOfLines={1}>{item.name}</Text>
                        <Text style={s.cartRowMeta} numberOfLines={1}>
                          {(item.uom ? `Ед.: ${item.uom}` : '') + (item.kind ? ` · ${item.kind}` : '')}
                        </Text>
                      </View>

                      <TextInput
                        value={String(item.qty ?? '')}
                        onChangeText={(v) => updatePickedQty(item.rik_code, v)}
                        keyboardType="decimal-pad"
                        placeholder="Кол-во"
                        placeholderTextColor="#94A3B8"
                        style={s.cartQty}
                        selectTextOnFocus
                      />

                      <Pressable onPress={() => removePicked(item.rik_code)} style={s.cartRemove}>
                        <Ionicons name="close" size={18} color="#fff" />
                      </Pressable>
                    </View>
                  )}
                />
              </View>
            ) : null}

            {/* list */}
            <FlatList
              data={uniq}
              keyExtractor={(it, idx) => `rk:${String((it as any).rik_code ?? '')}:${idx}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
              ListEmptyComponent={
                <Text style={{ color: COLORS.sub, textAlign: 'center', marginTop: 18 }}>
                  {canSearch ? 'Ничего не найдено' : 'Введите минимум 2 символа'}
                </Text>
              }
              renderItem={({ item }) => {
                const title = titleOf(item);
                const uom = item.uom_code ? `Ед.: ${item.uom_code}` : '';
                const kind = item.kind ? String(item.kind) : '';
                const code = String(item.rik_code || '').trim();
                const qty = qtyByCode[code] ?? '';

                return (
                  <View style={s.row}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.rowTitle} numberOfLines={2}>{title}</Text>
                      <Text style={s.rowMeta} numberOfLines={1}>
                        {(uom ? uom : ' ') + (kind ? ` · ${kind}` : '')}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TextInput
                        value={qty}
                        onChangeText={(v) => setQtyByCode((p) => ({ ...p, [code]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="Кол-во"
                        placeholderTextColor="#94A3B8"
                        style={s.qtyInput}
                        selectTextOnFocus
                      />

                      <Pressable
                        onPress={() => {
                          if (!code) return;

                          // ✅ если пусто — ставим 1 (быстрое добавление)
                          const raw = String(qty ?? '').trim();
                          const q = raw ? Number(raw.replace(',', '.')) : 1;
                          if (!Number.isFinite(q) || q <= 0) return;

                          const apps = Array.isArray(item.apps) ? item.apps.filter(Boolean) : [];
                          const appDefault = apps[0] || null;

                          setPicked((prev) => ({
                            ...prev,
                            [code]: {
                              rik_code: code,
                              name: title,
                              uom: item.uom_code ?? null,
                              kind: item.kind ?? null,
                              qty: String(q),
                              app_code: appDefault,
                              note: '',
                              appsFromItem: apps.length ? apps : undefined,
                            },
                          }));

                          // очищаем поле, чтобы не висела “1”
                          setQtyByCode((p) => ({ ...p, [code]: '' }));
                          setSentOk(false);
                        }}
                        style={[s.addBtnGreen, picked[code] ? { opacity: 0.85 } : null]}
                        hitSlop={10}
                      >
                        <Text style={s.addBtnText}>＋</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />

            {/* bottom bar */}
            <View style={s.bottomBar}>
              <Pressable
                onPress={clearAll}
                style={[s.bottomBtn, { backgroundColor: '#F3F4F6', borderColor: COLORS.border }]}
              >
                <Text style={{ fontWeight: '900', color: COLORS.text }}>Очистить</Text>
              </Pressable>

              <Pressable
                disabled={pickedCount === 0 || sending}
                onPress={commitPicked}
                style={[
                  s.bottomBtn,
                  { backgroundColor: COLORS.green, borderColor: COLORS.greenBorder },
                  (pickedCount === 0 || sending) && { opacity: 0.4 },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={{ fontWeight: '900', color: '#fff' }}>
                    {sentOk ? 'Добавлено ✓' : `В черновик (${pickedCount})`}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  hTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  hClose: { marginLeft: 'auto', paddingVertical: 10, paddingHorizontal: 12 },
  hCloseText: { color: COLORS.blue, fontWeight: '800', fontSize: 16 },

  search: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    color: COLORS.text,
    fontSize: 16,
  },

  cartBox: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  cartHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cartTitle: { fontSize: 14, fontWeight: '900', color: COLORS.text },
  cartCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    color: '#075985',
    fontWeight: '900',
  },
  cartClearBtn: { marginLeft: 'auto', paddingVertical: 6, paddingHorizontal: 10 },
  cartClearText: { color: COLORS.blue, fontWeight: '800' },

  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cartRowTitle: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  cartRowMeta: { marginTop: 2, color: COLORS.sub, fontWeight: '700', fontSize: 12 },
  cartQty: {
    width: 84,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    textAlign: 'center',
    fontWeight: '900',
    color: COLORS.text,
  },
  cartRemove: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowTitle: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  rowMeta: { marginTop: 4, color: COLORS.sub, fontWeight: '700' },

  qtyInput: {
    width: 84,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    textAlign: 'center',
    fontWeight: '900',
    color: COLORS.text,
    marginRight: 8,
  },

  addBtnGreen: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
  },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 22 },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    flexDirection: 'row',
    gap: 10,
  },
  bottomBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

