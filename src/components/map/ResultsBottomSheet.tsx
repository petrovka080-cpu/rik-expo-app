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
  type GestureResponderEvent,
  type ViewToken,
} from "react-native";
import type { ListingItemJson } from "./mapContracts";

const UI = {
  bgSolid: "#020617",
  card: "#0B1120",
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  accent: "#0EA5E9",
  ok: "#22C55E",
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
  onOpenDetails?: (row: Row) => void;
  onOpenShowcase?: (row: Row) => void;
  onOpenChat?: (row: Row) => void;
  modeLabel?: string | null;
  onClearMode?: () => void;
};

type ViewabilityChange = {
  viewableItems: Array<ViewToken & { item?: Row }>;
};

function readMovementY(event: GestureResponderEvent): number {
  const nativeEvent = event.nativeEvent as unknown;
  if (!nativeEvent || typeof nativeEvent !== "object") return 0;
  const movementY = (nativeEvent as Record<string, unknown>).movementY;
  return typeof movementY === "number" && Number.isFinite(movementY) ? movementY : 0;
}

export default function ResultsBottomSheet({
  count,
  rows,
  selectedId = null,
  onPick,
  onSendOffer,
  onOpenDetails,
  onOpenShowcase,
  onOpenChat,
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
    [containerH],
  );

  const screenW = Dimensions.get("window").width;
  const cardW = Math.min(screenW - 28, 420);
  const sidePad = Math.max(14, (screenW - cardW) / 2);

  const listRef = useRef<FlatList<Row> | null>(null);

  const idToIndex = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, index) => map.set(row.id, index));
    return map;
  }, [rows]);

  useEffect(() => {
    if (!selectedId) return;
    const idx = idToIndex.get(selectedId);
    if (idx == null) return;

    const timer = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      } catch {
        // no-op
      }
    }, Platform.OS === "web" ? 50 : 0);

    return () => clearTimeout(timer);
  }, [selectedId, idToIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: ViewabilityChange) => {
    const visible = viewableItems?.[0]?.item as Row | undefined;
    if (visible?.id) onPick(visible);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  const toggle = () => setSnap(sheetHeightRef.current < MID ? MID : MIN);

  const renderCard = ({ item }: { item: Row }) => {
    const active = item.id === selectedId;
    const items = Array.isArray(item.items_json) ? item.items_json : [];
    const top = items.slice(0, 3);

    return (
      <View style={[styles.card, { width: cardW }, active && styles.cardActive]}>
        <Pressable onPress={() => onPick(item)} style={styles.cardMain}>
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

          {item.side === "demand" && top.length > 0 ? (
            <View style={styles.itemsBox}>
              <Text style={styles.itemsTitle}>Нужно:</Text>
              {top.map((entry, index) => (
                <Text key={`${item.id}:${index}`} style={styles.itemLine} numberOfLines={1}>
                  • {entry.name || entry.rik_code || "Позиция"}
                  {entry.qty != null ? ` — ${entry.qty}` : ""}
                  {entry.uom ? ` ${entry.uom}` : ""}
                </Text>
              ))}
              {items.length > 3 ? (
                <Text style={styles.itemsMore}>+ еще {items.length - 3}</Text>
              ) : null}
            </View>
          ) : null}
        </Pressable>

        <View style={styles.actionsRow}>
          {onOpenDetails ? (
            <Pressable onPress={() => onOpenDetails(item)} style={styles.softBtn}>
              <Text style={styles.softBtnText}>Открыть</Text>
            </Pressable>
          ) : null}

          {onOpenShowcase ? (
            <Pressable onPress={() => onOpenShowcase(item)} style={styles.softBtn}>
              <Text style={styles.softBtnText}>Витрина</Text>
            </Pressable>
          ) : null}

          {onOpenChat ? (
            <Pressable onPress={() => onOpenChat(item)} style={styles.softBtn}>
              <Text style={styles.softBtnText}>Чат</Text>
            </Pressable>
          ) : null}

          {item.side === "demand" && onSendOffer ? (
            <Pressable onPress={() => onSendOffer(item)} style={styles.offerBtn}>
              <Text style={styles.offerBtnText}>Предложить</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
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
          onResponderMove={(event) => {
            if (Platform.OS !== "web") return;
            const dy = readMovementY(event);
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
          <View style={styles.miniCopy}>
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
          ref={(ref) => {
            listRef.current = ref;
          }}
          data={rows}
          keyExtractor={(item) => item.id}
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
  handleArea: {
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#4B5563",
  },
  miniBar: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  miniCopy: {
    flex: 1,
    minWidth: 0,
  },
  miniText: {
    color: UI.text,
    fontWeight: "900",
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: "#0B1120",
  },
  clearBtnText: {
    color: UI.text,
    fontWeight: "900",
  },
  listBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: UI.accent,
  },
  listBtnText: {
    color: "#0B1120",
    fontWeight: "900",
  },
  card: {
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 12,
    gap: 10,
    minHeight: 120,
  },
  cardMain: {
    flex: 1,
  },
  cardActive: {
    borderColor: UI.accent,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardTitle: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 14,
  },
  cardCity: {
    color: UI.sub,
    marginTop: 4,
    fontWeight: "700",
  },
  cardPrice: {
    color: UI.accent,
    marginTop: 10,
    fontWeight: "900",
  },
  itemsBox: {
    marginTop: 8,
  },
  itemsTitle: {
    color: UI.sub,
    fontWeight: "900",
    fontSize: 12,
  },
  itemLine: {
    color: UI.text,
    marginTop: 2,
    fontWeight: "800",
    fontSize: 12,
  },
  itemsMore: {
    color: UI.sub,
    marginTop: 2,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  softBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: "#111827",
  },
  softBtnText: {
    color: UI.text,
    fontWeight: "800",
    fontSize: 12,
  },
  offerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: UI.ok,
  },
  offerBtnText: {
    color: "#0B1120",
    fontWeight: "900",
  },
});
