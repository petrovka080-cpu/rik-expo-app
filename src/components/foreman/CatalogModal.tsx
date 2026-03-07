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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UI, TYPO } from '../../screens/foreman/foreman.ui';
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

/**
 * Component to render text with highlighted parts matching the search query
 */
const HighlightedText = ({ text, highlight, style, highlightStyle }: {
  text: string;
  highlight: string;
  style: any;
  highlightStyle: any;
}) => {
  if (!highlight.trim() || !text) return <Text style={style}>{text}</Text>;

  const tokens = highlight.trim().split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length === 0) return <Text style={style}>{text}</Text>;

  // Create a regex that matches any of the tokens
  const escapedTokens = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style}>
      {parts.map((part, i) => {
        const isMatch = tokens.some(t => part.toLowerCase() === t.toLowerCase());
        return (
          <Text key={i} style={isMatch ? highlightStyle : undefined}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
};

export default function CatalogModal(props: {
  visible: boolean;
  onClose: () => void;
  rikQuickSearch: (q: string, limit?: number) => Promise<CatalogItem[]>;
  onCommitToDraft: (rows: PickedRow[]) => void | Promise<void>;
  onOpenDraft: () => void;
  draftCount: number;
}) {
  const insets = useSafeAreaInsets();
  const { visible, onClose, rikQuickSearch, onCommitToDraft, onOpenDraft, draftCount } = props;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CatalogItem[]>([]);

  const [qtyByCode, setQtyByCode] = useState<Record<string, string>>({});
  const [addBusyByCode, setAddBusyByCode] = useState<Record<string, boolean>>({});

  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const toastY = useRef(new Animated.Value(-24)).current;
  const [toastText, setToastText] = useState<string>('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (text: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastText(text);
    Animated.timing(toastY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    toastTimerRef.current = setTimeout(() => {
      Animated.timing(toastY, { toValue: -24, duration: 200, useNativeDriver: true }).start(() => { setToastText(''); });
    }, 2000);
  };

  const canSearch = query.trim().length >= 2;
  const HEADER_PAD_TOP = Platform.OS === 'web' ? 16 : insets.top + 8;

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setRows([]);
    setQtyByCode({});
    setAddBusyByCode({});
    setToastText('');
    setTimeout(() => inputRef.current?.focus?.(), 400);
  }, [visible]);

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
        const list = await rikQuickSearch(query, 80);
        setRows(Array.isArray(list) ? list : []);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => { if (tRef.current) clearTimeout(tRef.current); };
  }, [query, canSearch, visible, rikQuickSearch]);

  // Smart Sorting & Filtering on client side
  const sortedRows = useMemo(() => {
    if (!rows.length) return [];
    const seen = new Set<string>();
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(t => t.length >= 2);

    const filtered = rows.filter((r) => {
      const code = String(r?.rik_code ?? '').trim();
      if (!code || seen.has(code)) return false;
      seen.add(code);
      return true;
    });

    if (!tokens.length) return filtered;

    return filtered.sort((a, b) => {
      const nameA = (a.name_human_ru || a.name_ru || a.name_human || '').toLowerCase();
      const nameB = (b.name_human_ru || b.name_ru || b.name_human || '').toLowerCase();

      // Priority 1: Exact match
      if (nameA === q && nameB !== q) return -1;
      if (nameB === q && nameA !== q) return 1;

      // Priority 2: Starts with query
      if (nameA.startsWith(q) && !nameB.startsWith(q)) return -1;
      if (nameB.startsWith(q) && !nameA.startsWith(q)) return 1;

      // Priority 3: Count matched tokens
      const matchesA = tokens.filter(t => nameA.includes(t)).length;
      const matchesB = tokens.filter(t => nameB.includes(t)).length;
      if (matchesA !== matchesB) return matchesB - matchesA;

      return 0;
    });
  }, [rows, query]);

  const titleOf = (it: CatalogItem) =>
    (it.name_human_ru || it.name_ru || it.name_human || it.display_name || it.rik_code || '-').trim();

  const resetSearchAndFocus = () => {
    setQuery('');
    setRows([]);
    setTimeout(() => inputRef.current?.focus?.(), 50);
  };

  const handleCommit = async (item: CatalogItem) => {
    const code = String(item.rik_code || '').trim();
    if (!code || addBusyByCode[code]) return;

    const rawQty = String(qtyByCode[code] || '').trim();
    const qValue = rawQty ? Number(rawQty.replace(',', '.')) : 0;
    if (!Number.isFinite(qValue) || qValue < 0) {
      alert('Укажите корректное количество');
      return;
    }
    if (qValue === 0) {
      alert('Количество должно быть больше 0');
      return;
    }

    const title = titleOf(item);
    const apps = Array.isArray(item.apps) ? item.apps.filter(Boolean) : [];
    const appDefault = apps[0] || null;

    try {
      setAddBusyByCode(p => ({ ...p, [code]: true }));
      if (Platform.OS !== 'web') Keyboard.dismiss();

      await onCommitToDraft([{
        rik_code: code,
        name: title,
        uom: item.uom_code ?? null,
        kind: item.kind ?? null,
        qty: String(qValue),
        app_code: appDefault,
        note: '',
        appsFromItem: apps.length ? apps : undefined,
      }]);

      showToast(`Добавлено: ${title}`);
      setQtyByCode(p => ({ ...p, [code]: '' }));
    } catch (e) {
      console.warn('Commit error:', e);
    } finally {
      setAddBusyByCode(p => ({ ...p, [code]: false }));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: UI.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1 }}>
          <View style={[s.header, { paddingTop: HEADER_PAD_TOP }]}>
            <View style={s.headerRow}>
              <Text style={s.hTitle}>Каталог</Text>

              <Pressable onPress={onOpenDraft} style={s.hDraftPill}>
                <Ionicons name="cart" size={18} color={UI.accent} />
                <View style={s.badge}>
                  <Text style={s.badgeText}>{draftCount ?? 0}</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => { Keyboard.dismiss(); onClose(); }}
                style={s.closeBtn}
              >
                <Ionicons name="close" size={26} color={UI.text} />
              </Pressable>
            </View>

            <View style={s.searchWrap}>
              <Ionicons name="search" size={20} color={UI.sub} style={{ marginLeft: 12 }} />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Что ищем? (бетон, арматура...)"
                placeholderTextColor={UI.sub}
                style={s.searchInput}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {!!query && (
                <Pressable onPress={() => { setQuery(''); setRows([]); }} style={s.clearSearch}>
                  <Ionicons name="close-circle" size={20} color={UI.sub} />
                </Pressable>
              )}
            </View>

            {loading && (
              <View style={s.loaderBar}>
                <ActivityIndicator size="small" color={UI.accent} />
                <Text style={s.loaderText}>Поиск в базе РИК...</Text>
              </View>
            )}
          </View>

          {toastText ? (
            <Animated.View pointerEvents="none" style={[s.toastContainer, { transform: [{ translateY: toastY }] }]}>
              <View style={s.toast}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={s.toastText}>{toastText}</Text>
              </View>
            </Animated.View>
          ) : null}

          <FlatList
            data={sortedRows}
            keyExtractor={(it) => `rk:${it.rik_code}`}
            contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 20 }]}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={s.empty}>
                <Ionicons
                  name={canSearch ? "search-outline" : "construct-outline"}
                  size={64}
                  color={UI.border}
                />
                <Text style={s.emptyText}>
                  {canSearch
                    ? loading ? "" : "Ничего не найдено\nПопробуйте изменить запрос"
                    : "Введите название материала\nминимум 2 символа"}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const title = titleOf(item);
              const code = String(item.rik_code || '').trim();
              const qty = qtyByCode[code] ?? '';
              const adding = !!addBusyByCode[code];

              return (
                <Animated.View style={s.card}>
                  <View style={s.cardHeader}>
                    <HighlightedText
                      text={title}
                      highlight={query}
                      style={s.cardTitle}
                      highlightStyle={s.highlight}
                    />
                    <Text style={s.cardCode}>{code}</Text>
                  </View>

                  <View style={s.cardFooter}>
                    <View style={s.metaRow}>
                      <View style={s.tag}>
                        <Text style={s.tagText}>{item.uom_code || 'ед'}</Text>
                      </View>
                      {!!item.kind && (
                        <View style={[s.tag, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                          <Text style={[s.tagText, { color: UI.sub }]}>{item.kind}</Text>
                        </View>
                      )}
                    </View>

                    <View style={s.actionRow}>
                      <TextInput
                        value={qty}
                        onChangeText={(v) => setQtyByCode(p => ({ ...p, [code]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={UI.sub}
                        style={s.qtyInput}
                        selectTextOnFocus
                      />
                      <IconSquareButton
                        disabled={adding}
                        loading={adding}
                        onPress={() => handleCommit(item)}
                        width={46}
                        height={46}
                        radius={14}
                        bg={UI.accent}
                        bgPressed="#16a34a"
                        bgDisabled={UI.border}
                        spinnerColor="#fff"
                        luxGreen
                      >
                        <SendHomeIcon size={20} color="#fff" />
                      </IconSquareButton>
                    </View>
                  </View>
                </Animated.View>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: UI.bg,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: UI.border,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  hTitle: {
    ...TYPO.titleLg,
    color: UI.text,
  },
  hDraftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    marginLeft: 'auto',
    marginRight: 12,
  },
  badge: {
    backgroundColor: UI.accent,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.btnNeutral,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    height: 50,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    color: UI.text,
    fontSize: 16,
    fontWeight: '700',
  },
  clearSearch: {
    padding: 10,
  },
  loaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  loaderText: {
    color: UI.sub,
    fontSize: 13,
    fontWeight: '700',
  },
  toastContainer: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    zIndex: 100,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: UI.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI.border,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    ...TYPO.bodyStrong,
    color: UI.text,
    fontSize: 16,
    lineHeight: 22,
  },
  highlight: {
    color: UI.accent,
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  cardCode: {
    color: UI.sub,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    color: UI.text,
    fontSize: 11,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyInput: {
    width: 70,
    height: 46,
    backgroundColor: UI.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    color: UI.text,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 15,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: UI.sub,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
    ...TYPO.bodyStrong,
  },
});
