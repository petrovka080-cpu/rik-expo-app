import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  PanResponder,
  FlatList,
  Dimensions,
  Platform,
  useWindowDimensions,
} from "react-native";

const UI = {
  bgSolid: "#020617",
  card: "#0B1120",
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  accent: "#0EA5E9",
  ok: "#22C55E",
};

type ListingItemJson = {
  rik_code?: string | null;
  name?: string | null;
  uom?: string | null;
  qty?: number | null;
  price?: number | null;
  city?: string | null;
  kind?: "material" | "work" | "service" | null;
};

type Row = {
  id: string;
  title: string;
  city: string | null;
  price: number | null;
  side?: "offer" | "demand" | null;
  items_json?: ListingItemJson[] | null;
};

type Props = {
  count: number;
  rows: Row[];
  selectedId?: string | null;
  onPick: (row: Row) => void;
  onSendOffer?: (row: Row) => void;

  // ✅ режим кластера
  modeLabel?: string | null;
  onClearMode?: () => void;
};

export default function ResultsBottomSheet({
  count,
  rows,
  selectedId = null,
  onPick,
  onSendOffer,
  modeLabel = null,
  onClearMode,
}: Props) {
  const [sheetHeight, setSheetHeight] = useState(0.14);
  const sheetHeightRef = useRef(0.14);

  const { height: windowH } = useWindowDimensions();
  const containerH = Math.max(1, windowH || Dimensions.get("window").height || 1);

  const MIN = 0.14;
  const MID = 0.42;
  const MAX = 0.75;

  const setSnap = (h: number) => {
    const clamped = Math.max(MIN, Math.min(MAX, h));
    setSheetHeight(clamped);
    sheetHeightRef.current = clamped;
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => {
          const raw = sheetHeightRef.current + g.dy / -containerH;
          const clamped = Math.max(MIN, Math.min(MAX, raw));
          setSheetHeight(clamped);
          sheetHeightRef.current = clamped;
        },
        onPanResponderRelease: () => {
          const h = sheetHeightRef.current;
          const snapTo = h < (MIN + MID) / 2 ? MIN : MID;
          setSnap(snapTo);
        },
      }),
    [containerH]
  );

  const screenW = Dimensions.get("window").width;
  const cardW = Math.min(screenW - 28, 420);
  const sidePad = Math.max(14, (screenW - cardW) / 2);

  const listRef = useRef<FlatList<Row> | null>(null);

  const idToIndex = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r, i) => m.set(r.id, i));
    return m;
  }, [rows]);

  useEffect(() => {
    if (!selectedId) return;
    const idx = idToIndex.get(selectedId);
    if (idx == null) return;

    const t = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      } catch {}
    }, Platform.OS === "web" ? 50 : 0);

    return () => clearTimeout(t);
  }, [selectedId, idToIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const v = viewableItems?.[0]?.item as Row | undefined;
    if (v?.id) onPick(v);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  const toggle = () => setSnap(sheetHeightRef.current < MID ? MID : MIN);

  const renderCard = ({ item }: { item: Row }) => {
    const active = item.id === selectedId;
    const items = Array.isArray(item.items_json) ? item.items_json : [];
    const top = items.slice(0, 3);

    return (
      <Pressable onPress={() => onPick(item)} style={[styles.card, { width: cardW }, active && styles.cardActive]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.cardCity} numberOfLines={1}>
            {item.city || "Город не указан"}
          </Text>

          <Text style={styles.cardPrice} numberOfLines={1}>
            {item.side === "demand"
              ? "СПРОС"
              : item.price != null
              ? `${item.price.toLocaleString("ru-RU")} KGS`
              : "Цена по запросу"}
          </Text>

          {item.side === "demand" && top.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: UI.sub, fontWeight: "900", fontSize: 12 }}>Нужно:</Text>
              {top.map((it, idx) => (
                <Text
                  key={idx}
                  style={{ color: UI.text, marginTop: 2, fontWeight: "800", fontSize: 12 }}
                  numberOfLines={1}
                >
                  • {it.name || it.rik_code || "Позиция"}
                  {it.qty != null ? ` — ${it.qty}` : ""}
                  {it.uom ? ` ${it.uom}` : ""}
                </Text>
              ))}
              {items.length > 3 && (
                <Text style={{ color: UI.sub, marginTop: 2, fontSize: 12 }}>+ ещё {items.length - 3}</Text>
              )}
            </View>
          )}
        </View>

        {item.side === "demand" && onSendOffer && (
          <Pressable onPress={() => onSendOffer(item)} style={styles.offerBtn}>
            <Text style={styles.offerBtnText}>Предложить</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.sheet, { height: sheetHeight * containerH }]}>
        <View
          {...panResponder.panHandlers}
          style={styles.handleArea}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderMove={(e) => {
            if (Platform.OS !== "web") return;
            const dy = (e as any)?.nativeEvent?.movementY ?? 0;
            const raw = sheetHeightRef.current + dy / -containerH;
            const clamped = Math.max(MIN, Math.min(MAX, raw));
            setSheetHeight(clamped);
            sheetHeightRef.current = clamped;
          }}
          onResponderRelease={() => {
            if (Platform.OS !== "web") return;
            const h = sheetHeightRef.current;
            const snapTo = h < (MIN + MID) / 2 ? MIN : MID;
            setSnap(snapTo);
          }}
        >
          <View style={styles.handle} />
        </View>

        <View style={styles.miniBar}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.miniText} numberOfLines={1}>
              {modeLabel ? modeLabel : `Найдено: ${count}`}
            </Text>
          </View>

          {modeLabel && onClearMode ? (
            <Pressable onPress={onClearMode} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Сброс</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={toggle} style={styles.listBtn}>
            <Text style={styles.listBtnText}>{sheetHeight < MID ? "List" : "Map"}</Text>
          </Pressable>
        </View>

        <FlatList
          ref={(r) => { listRef.current = r; }}
          data={rows}
          keyExtractor={(x) => x.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardW + 12}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: sidePad, paddingBottom: 12 }}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={renderCard}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: cardW + 12,
            offset: (cardW + 12) * index,
            index,
          })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: UI.bgSolid,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },

  handleArea: { height: 18, alignItems: "center", justifyContent: "center" },
  handle: { width: 44, height: 4, borderRadius: 999, backgroundColor: "#4B5563" },

  miniBar: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  miniText: { color: UI.text, fontWeight: "900" },

  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: "#0B1120",
  },
  clearBtnText: { color: UI.text, fontWeight: "900" },

  listBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: UI.accent,
  },
  listBtnText: { color: "#0B1120", fontWeight: "900" },

  card: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    minHeight: 120,
  },
  cardActive: {
    borderColor: UI.accent,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  cardTitle: { color: UI.text, fontWeight: "900", fontSize: 14 },
  cardCity: { color: UI.sub, marginTop: 4, fontWeight: "700" },
  cardPrice: { color: UI.accent, marginTop: 10, fontWeight: "900" },

  offerBtn: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: UI.ok,
  },
  offerBtnText: { color: "#0B1120", fontWeight: "900" },
});

