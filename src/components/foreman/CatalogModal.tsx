// src/components/foreman/CatalogModal.tsx
// ✅ UI/UX ONLY. ЛОГИКУ НЕ МЕНЯЮ: тот же поиск, тот же debounce, тот же add, тот же toast, тот же onCommitToDraft.
// ✅ Улучшения: нормальный хедер (как в топовых), "Закрыть" крестиком, кнопка добавления = наш Send-значок,
// ✅ поле количества аккуратнее, карточки премиум, меньше “колхоза”, лучше кликабельность.

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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ✅ ГЛОБАЛЬНЫЕ UI-КНОПКИ/ИКОНКИ (как в приложении)
import IconSquareButton from '../../ui/IconSquareButton';
import SendHomeIcon from '../../ui/icons/SendHomeIcon';

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
  onOpenDraft: () => void;
  draftCount: number;
}) {
  const { visible, onClose, rikQuickSearch, onCommitToDraft, onOpenDraft, draftCount } = props;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CatalogItem[]>([]);

  const [qtyByCode, setQtyByCode] = useState<Record<string, string>>({});
  const [addBusyByCode, setAddBusyByCode] = useState<Record<string, boolean>>({});

  const tRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);

  // toast
  const toastY = useRef(new Animated.Value(-24)).current;
  const [toastText, setToastText] = useState<string>('');
  const toastTimerRef = useRef<any>(null);

  const showToast = (text: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    setToastText(text);
    Animated.timing(toastY, { toValue: 0, duration: 180, useNativeDriver: true }).start();

    toastTimerRef.current = setTimeout(() => {
      Animated.timing(toastY, { toValue: -24, duration: 180, useNativeDriver: true }).start(() => {
        setToastText('');
      });
    }, 1300);
  };

  const canSearch = query.trim().length >= 2;

  const HEADER_PAD_TOP =
    Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ?? 0) + 12;

  // open: reset & focus
  useEffect(() => {
    if (!visible) return;

    setQuery('');
    setRows([]);
    setQtyByCode({});
    setAddBusyByCode({});
    setToastText('');

    setTimeout(() => inputRef.current?.focus?.(), 250);
  }, [visible]);

  // cleanup timers
  useEffect(() => {
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // search with debounce
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

  const resetSearchAndFocus = () => {
    setQuery('');
    setRows([]);
    setTimeout(() => inputRef.current?.focus?.(), 50);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ✅ На мобилке: тап по фону закрывает клаву */}
        <View style={{ flex: 1 }}>
          {Platform.OS !== 'web' ? (
            <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          ) : null}

          <View style={[s.container, { backgroundColor: COLORS.bg }]}>
            {/* header (премиум) */}
            <View style={[s.header, { paddingTop: HEADER_PAD_TOP }]}>
              <Text style={s.hTitle}>Каталог</Text>

              <Pressable onPress={onOpenDraft} hitSlop={16} style={s.hDraftPill}>
                <Ionicons name="document-text-outline" size={16} color="#166534" />
                <Text style={s.hDraftText}>Черновик {`(${draftCount ?? 0})`}</Text>
              </Pressable>

              <IconSquareButton
                onPress={() => {
                  if (Platform.OS !== 'web') Keyboard.dismiss();
                  onClose();
                }}
                width={44}
                height={44}
                radius={14}
                bg="#F3F4F6"
                bgPressed="#E5E7EB"
                bgDisabled="#F3F4F6"
                spinnerColor="#111827"
                accessibilityLabel="Закрыть"
              >
                <Ionicons name="close" size={22} color="#111827" />
              </IconSquareButton>
            </View>

            {/* toast */}
            {toastText ? (
              <Animated.View pointerEvents="none" style={[s.toastWrap, { transform: [{ translateY: toastY }] }]}>
                <View style={s.toast}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={s.toastText} numberOfLines={2}>
                    {toastText}
                  </Text>
                </View>
              </Animated.View>
            ) : null}

            {/* search */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <View style={s.searchWrap}>
                <Ionicons name="search" size={18} color="#64748B" />
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
                />
                {query.trim() ? (
                  <Pressable
                    onPress={() => {
                      setQuery('');
                      setRows([]);
                      setTimeout(() => inputRef.current?.focus?.(), 40);
                    }}
                    hitSlop={10}
                    style={s.clearBtn}
                  >
                    <Ionicons name="close-circle" size={18} color="#64748B" />
                  </Pressable>
                ) : null}
              </View>

              {loading ? (
                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator />
                  <Text style={{ color: COLORS.sub, fontWeight: '800' }}>Ищем…</Text>
                </View>
              ) : null}
            </View>

            {/* list */}
            <FlatList
              data={uniq}
              keyExtractor={(it, idx) => `rk:${String((it as any).rik_code ?? '')}:${idx}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              ListEmptyComponent={
                <Text style={{ color: COLORS.sub, textAlign: 'center', marginTop: 18, fontWeight: '800' }}>
                  {canSearch ? 'Ничего не найдено' : 'Введите минимум 2 символа'}
                </Text>
              }
              renderItem={({ item }) => {
                const title = titleOf(item);
                const uom = item.uom_code ? `Ед.: ${item.uom_code}` : '';
                const kind = item.kind ? String(item.kind) : '';
                const code = String(item.rik_code || '').trim();
                const qty = qtyByCode[code] ?? '';
                const adding = !!addBusyByCode[code];

                return (
                  <View style={s.row}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.rowTitle} numberOfLines={2}>
                        {title}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                        <Text style={s.rowMeta} numberOfLines={1}>
                          {uom || ' '}
                          {kind ? ` · ${kind}` : ''}
                        </Text>

                        {/* маленький бейдж с кодом (не колхоз) */}
                        {!!code ? (
                          <View style={s.codePill}>
                            <Text style={s.codePillText} numberOfLines={1}>
                              {code}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <View style={s.rightControls}>
                      <TextInput
                        value={qty}
                        onChangeText={(v) => setQtyByCode((p) => ({ ...p, [code]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="Кол-во"
                        placeholderTextColor="#94A3B8"
                        style={s.qtyInput}
                        selectTextOnFocus
                      />

                      {/* ✅ вместо плюсика — НАШ SEND-ЗНАК */}
                      <IconSquareButton
                        disabled={adding}
                        loading={adding}
                        onPress={async () => {
                          if (!code) return;

                          // ✅ если пусто — ставим 1 (быстрое добавление)
                          const raw = String(qty ?? '').trim();
                          const q = raw ? Number(raw.replace(',', '.')) : 1;
                          if (!Number.isFinite(q) || q <= 0) return;

                          const apps = Array.isArray(item.apps) ? item.apps.filter(Boolean) : [];
                          const appDefault = apps[0] || null;

                          try {
                            setAddBusyByCode((p) => ({ ...p, [code]: true }));

                            if (Platform.OS !== 'web') Keyboard.dismiss();

                            await Promise.resolve(
                              onCommitToDraft([
                                {
                                  rik_code: code,
                                  name: title,
                                  uom: item.uom_code ?? null,
                                  kind: item.kind ?? null,
                                  qty: String(q),
                                  app_code: appDefault,
                                  note: '',
                                  appsFromItem: apps.length ? apps : undefined,
                                },
                              ]),
                            );

                            const nextCount = Math.max(0, Number(draftCount || 0) + 1);
                            showToast(`Добавлено: ${title} × ${q}  ·  В черновике: ${nextCount}`);

                            setQtyByCode((p) => ({ ...p, [code]: '' }));
                            resetSearchAndFocus();
                          } finally {
                            setAddBusyByCode((p) => ({ ...p, [code]: false }));
                          }
                        }}
                        width={46}
                        height={46}
                        radius={16}
                        bg="#1B7F55"
                        bgPressed="#166846"
                        bgDisabled="#143327"
                        spinnerColor="#FFFFFF"
                        luxGreen
                        accessibilityLabel="Добавить"
                      >
                        <SendHomeIcon size={22} color="#FFFFFF" />
                      </IconSquareButton>
                    </View>
                  </View>
                );
              }}
            />
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
    gap: 12,
  },
  hTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },

  hDraftPill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  hDraftText: { color: '#166534', fontWeight: '900', fontSize: 14 },

  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: Platform.OS === 'ios' ? 92 : 86,
    zIndex: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(22,163,74,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(21,128,61,0.95)',
  },
  toastText: { color: '#fff', fontWeight: '900', fontSize: 13, flex: 1 },

  // search (иконка + clear)
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  search: {
    flex: 1,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: {
    marginTop: 10,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,

    // чуть “дороже” вид
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  rowTitle: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  rowMeta: { color: COLORS.sub, fontWeight: '800' },

  codePill: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    maxWidth: 190,
  },
  codePillText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.2,
  },

  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  qtyInput: {
    width: 88,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    textAlign: 'center',
    fontWeight: '900',
    color: COLORS.text,
  },
});
