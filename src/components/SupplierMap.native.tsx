import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  PanResponder,
  LayoutChangeEvent,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "../lib/supabaseClient";

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type ListingItemJson = {
  rik_code?: string | null;
  name?: string | null;
  uom?: string | null;
  qty?: number | null;
  price?: number | null;
  city?: string | null;
  kind?: "material" | "service" | "rent" | null;
};

type MarketListing = {
  id: string;
  title: string;
  price: number | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  kind: string | null;
  items_json: ListingItemJson[] | null;
  side?: "offer" | "demand" | null;
};

const defaultRegion: Region = {
  latitude: 42.8746,
  longitude: 74.5698,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

const UI = {
  bg: "#020617",
  card: "#0B1120",
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  accent: "#0EA5E9",
  demand: "#EF4444",
  ok: "#22C55E",
};

export default function SupplierMapNative() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "material" | "service" | "rent">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [region, setRegion] = useState<Region>(defaultRegion);
  const [block, setBlock] = useState<"all" | "offer" | "demand">("all");

  const [offerDemand, setOfferDemand] = useState<MarketListing | null>(null);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerDays, setOfferDays] = useState("");
  const [offerComment, setOfferComment] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);

  const mapRef = useRef<any>(null);

  const [sheetHeight, setSheetHeight] = useState(0.35);
  const sheetHeightRef = useRef(0.35);
  useEffect(() => {
    sheetHeightRef.current = sheetHeight;
  }, [sheetHeight]);

  const containerHeightRef = useRef(1);
  const onContainerLayout = (e: LayoutChangeEvent) => {
    containerHeightRef.current = e.nativeEvent.layout.height || 1;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const deltaY = gesture.dy;
        const newHeightRaw =
          sheetHeightRef.current + deltaY / -containerHeightRef.current;
        const clamped = Math.max(0.2, Math.min(0.8, newHeightRaw));
        setSheetHeight(clamped);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const getKindColor = (kind?: "material" | "service" | "rent" | null): string => {
    switch (kind) {
      case "material":
        return "#22C55E";
      case "service":
        return "#0EA5E9";
      case "rent":
        return "#8B5CF6";
      default:
        return "#7C3AED";
    }
  };

  // ===== load =====
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("market_listings")
        .select("id,title,price,city,lat,lng,kind,items_json,side")
        .eq("status", "active")
        .limit(200);

      if (error) {
        console.warn("supplierMap NATIVE load error:", error.message);
        return;
      }
      setListings((data || []) as MarketListing[]);
    };
    load();
  }, []);

  // ===== filter =====
  const filteredListings = useMemo(() => {
    const min = minPrice.trim() ? Number(minPrice.trim()) : null;
    const max = maxPrice.trim() ? Number(maxPrice.trim()) : null;
    const city = cityFilter.trim().toLowerCase();

    return listings.filter((l) => {
      if (block !== "all") {
        if ((l.side || "offer") !== block) return false;
      }
      if (min != null && l.price != null && l.price < min) return false;
      if (max != null && l.price != null && l.price > max) return false;
      if (city && l.city && !l.city.toLowerCase().includes(city)) return false;

      if (kindFilter !== "all") {
        if (l.kind === kindFilter) return true;
        if (Array.isArray(l.items_json) && l.items_json.length > 0) {
          const hasKind = l.items_json.some((it) => it.kind === kindFilter);
          if (!hasKind) return false;
        } else {
          if (l.kind !== kindFilter) return false;
        }
      }
      return true;
    });
  }, [listings, minPrice, maxPrice, cityFilter, kindFilter, block]);

  const handleSelectFromMap = (item: MarketListing) => {
    if (!item.lat || !item.lng) return;

    setSelectedIds([item.id]);
    const newRegion: Region = {
      latitude: item.lat,
      longitude: item.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion?.(newRegion, 300);
  };

  const handleSelectFromList = (item: MarketListing) => handleSelectFromMap(item);

  const submitOffer = async () => {
    if (!offerDemand) return;

    const priceNum = Number(String(offerPrice).replace(",", "."));
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      Alert.alert("Цена", "Введите корректную цену");
      return;
    }

    const daysNumRaw = offerDays.trim() ? Number(offerDays.trim()) : null;
    const deliveryDays =
      daysNumRaw != null && Number.isFinite(daysNumRaw) && daysNumRaw > 0 ? daysNumRaw : null;

    setSendingOffer(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        Alert.alert("Вход", "Нужно войти в аккаунт");
        return;
      }

      const { error } = await supabase.from("demand_offers").insert({
        demand_id: offerDemand.id,
        supplier_id: user.id,
        price: priceNum,
        delivery_days: deliveryDays,
        comment: offerComment || null,
      });

      if (error) {
        Alert.alert("Ошибка", error.message);
        return;
      }

      setOfferDemand(null);
      setOfferPrice("");
      setOfferDays("");
      setOfferComment("");
      Alert.alert("Готово", "Коммерческое предложение отправлено");
    } finally {
      setSendingOffer(false);
    }
  };

  return (
    <View style={styles.root} onLayout={onContainerLayout}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Карта объявлений</Text>

        <View style={styles.blockRow}>
          {[
            { code: "all", label: "Все" },
            { code: "offer", label: "Предложения" },
            { code: "demand", label: "Спрос" },
          ].map((b) => {
            const active = block === (b.code as any);
            return (
              <Pressable
                key={b.code}
                onPress={() => setBlock(b.code as any)}
                style={[styles.kindChip, active && { backgroundColor: UI.ok, borderColor: UI.ok }]}
              >
                <Text style={[styles.kindChipText, active && { color: "#0B1120" }]}>
                  {b.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.filtersRow}>
          <View style={styles.filterBlock}>
            <Text style={styles.filterLabel}>Мин. цена</Text>
            <TextInput
              value={minPrice}
              onChangeText={setMinPrice}
              placeholder="от"
              placeholderTextColor={UI.sub}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
          <View style={styles.filterBlock}>
            <Text style={styles.filterLabel}>Макс. цена</Text>
            <TextInput
              value={maxPrice}
              onChangeText={setMaxPrice}
              placeholder="до"
              placeholderTextColor={UI.sub}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
          <View style={styles.filterBlockWide}>
            <Text style={styles.filterLabel}>Город</Text>
            <TextInput
              value={cityFilter}
              onChangeText={setCityFilter}
              placeholder="Бишкек…"
              placeholderTextColor={UI.sub}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.kindRow}>
          {[
            { code: "all", label: "Все" },
            { code: "material", label: "Материалы" },
            { code: "service", label: "Услуги" },
            { code: "rent", label: "Аренда" },
          ].map((k) => {
            const active = kindFilter === k.code;
            return (
              <Pressable
                key={k.code}
                onPress={() => setKindFilter(k.code as any)}
                style={[styles.kindChip, active && styles.kindChipActive]}
              >
                <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>
                  {k.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
  ref={mapRef}
  style={StyleSheet.absoluteFill}
          initialRegion={defaultRegion}
          region={region}
          onRegionChangeComplete={setRegion}
        >
          {filteredListings
            .filter((l) => l.lat != null && l.lng != null)
            .map((item) => {
              const isSelected = selectedIds.includes(item.id);

              const items = Array.isArray(item.items_json)
                ? (item.items_json as ListingItemJson[])
                : [];

              const activeKind =
                kindFilter === "all"
                  ? null
                  : (kindFilter as "material" | "service" | "rent");

              const visibleItems =
                activeKind && items.length > 0
                  ? items.filter((pos) => pos.kind === activeKind)
                  : items;

              let mainPrice: number | null = item.price;
              if (activeKind && visibleItems[0]?.price != null && visibleItems[0].price !== 0) {
                mainPrice = visibleItems[0].price as number;
              }

              const baseKind: "material" | "service" | "rent" | null =
                (activeKind as any) ??
                ((item.kind === "material" ||
                  item.kind === "service" ||
                  item.kind === "rent") &&
                  (item.kind as any));

              const bg = item.side === "demand" ? UI.demand : getKindColor(baseKind);
              const borderColor = isSelected ? "#F9FAFB" : "#1F2937";

              return (
                <Marker
                  key={item.id}
                  coordinate={{ latitude: item.lat as number, longitude: item.lng as number }}
                  onPress={() => handleSelectFromMap(item)}
                >
                  <View style={[styles.markerBubble, { backgroundColor: bg, borderColor }]}>
                    <Text style={styles.markerText}>
                      {item.side === "demand"
                        ? "НУЖНО"
                        : mainPrice != null
                        ? `${mainPrice.toLocaleString("ru-RU")} KGS`
                        : "Цена по запросу"}
                    </Text>
                  </View>
                </Marker>
              );
            })}
        </MapView>

        <View style={[styles.sheet, { height: sheetHeight * containerHeightRef.current }]}>
          <View {...panResponder.panHandlers} style={styles.sheetHandleArea}>
            <View style={styles.sheetHandle} />
          </View>

          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}>
            {filteredListings.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleSelectFromList(item)}
                style={styles.card}
              >
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardCity}>{item.city || "Город не указан"}</Text>

                {item.side === "demand" && (
                  <Pressable onPress={() => setOfferDemand(item)} style={styles.offerBtn}>
                    <Text style={styles.offerBtnText}>Отправить предложение</Text>
                  </Pressable>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      <Modal
        visible={!!offerDemand}
        transparent
        animationType="fade"
        onRequestClose={() => setOfferDemand(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Коммерческое предложение</Text>

            <TextInput
              placeholder="Цена (сом)"
              placeholderTextColor={UI.sub}
              value={offerPrice}
              onChangeText={setOfferPrice}
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Срок поставки (дней)"
              placeholderTextColor={UI.sub}
              value={offerDays}
              onChangeText={setOfferDays}
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Комментарий / условия"
              placeholderTextColor={UI.sub}
              value={offerComment}
              onChangeText={setOfferComment}
              style={styles.modalInput}
              multiline
            />

            <Pressable
              onPress={submitOffer}
              disabled={sendingOffer}
              style={[styles.modalSend, sendingOffer && { opacity: 0.6 }]}
            >
              <Text style={styles.modalSendText}>
                {sendingOffer ? "Отправка..." : "Отправить"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setOfferDemand(null);
                setOfferPrice("");
                setOfferDays("");
                setOfferComment("");
              }}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>Отмена</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },

  header: {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  zIndex: 50,

  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 10,

  backgroundColor: "rgba(2,6,23,0.92)",
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: UI.border,
},

  headerTitle: { fontSize: 20, fontWeight: "700", color: UI.text },

  blockRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },

  filtersRow: { flexDirection: "row", marginTop: 8, gap: 8 },
  filterBlock: { flexShrink: 0 },
  filterBlockWide: { flex: 1 },
  filterLabel: { fontSize: 11, color: UI.sub, marginBottom: 2 },

  input: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI.border,
    color: UI.text,
    fontSize: 12,
    backgroundColor: "#020617",
  },

  kindRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  kindChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: "#020617",
  },
  kindChipActive: { backgroundColor: UI.accent, borderColor: UI.accent },
  kindChipText: { fontSize: 12, fontWeight: "600", color: UI.text },
  kindChipTextActive: { color: "#0B1120" },

  mapContainer: { flex: 1 },
  map: { position: "absolute", left: 0, right: 0, top: 0 },

  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: UI.bg,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },
  sheetHandleArea: { height: 20, alignItems: "center", justifyContent: "center" },
  sheetHandle: { width: 42, height: 4, borderRadius: 999, backgroundColor: "#4B5563" },
  sheetScroll: { flex: 1 },
  sheetScrollContent: { paddingHorizontal: 16, paddingBottom: 12 },

  card: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: UI.border },
  cardTitle: { fontSize: 14, fontWeight: "600", color: UI.text },
  cardCity: { marginTop: 2, fontSize: 12, color: UI.sub },

  markerBubble: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  markerText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },

  offerBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: UI.accent,
    alignSelf: "flex-start",
  },
  offerBtnText: { color: "#020617", fontWeight: "700", fontSize: 12 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: 320,
    backgroundColor: UI.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
  },
  modalTitle: { color: UI.text, fontSize: 16, fontWeight: "800", marginBottom: 10 },
  modalInput: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.border,
    color: UI.text,
    backgroundColor: "#020617",
    marginBottom: 8,
    fontSize: 13,
  },
  modalSend: {
    marginTop: 6,
    backgroundColor: UI.ok,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalSendText: { color: "#0B1120", fontWeight: "800" },
  modalCancel: { marginTop: 10, alignItems: "center" },
  modalCancelText: { color: UI.sub, fontWeight: "700" },
});
