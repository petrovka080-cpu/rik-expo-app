// src/components/SupplierMap.native.tsx
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
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { supabase } from "../lib/supabaseClient";

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
};

export default function SupplierMapNative() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "material" | "service" | "rent">(
    "all"
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [region, setRegion] = useState<Region>(defaultRegion);

  const mapRef = useRef<MapView | null>(null);

  const [sheetHeight, setSheetHeight] = useState(0.35); // доля высоты экрана
  const containerHeightRef = useRef(1);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const deltaY = gesture.dy;
        const newHeightRaw =
          sheetHeight + deltaY / -containerHeightRef.current;
        const clamped = Math.max(0.2, Math.min(0.8, newHeightRaw));
        setSheetHeight(clamped);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const getKindColor = (
    kind?: "material" | "service" | "rent" | null
  ): string => {
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

  const kindLabel = (kind?: string | null) =>
    kind === "material"
      ? "Материал"
      : kind === "service"
      ? "Услуга"
      : kind === "rent"
      ? "Аренда"
      : "";

  // ===== 1. Загрузка объявлений =====
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("market_listings")
        .select("id,title,price,city,lat,lng,kind,items_json")
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

  // ===== 2. Фильтрация =====
  const filteredListings = useMemo(() => {
    const min = minPrice.trim() ? Number(minPrice.trim()) : null;
    const max = maxPrice.trim() ? Number(maxPrice.trim()) : null;
    const city = cityFilter.trim().toLowerCase();

    return listings.filter((l) => {
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
  }, [listings, minPrice, maxPrice, cityFilter, kindFilter]);

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
    mapRef.current?.animateToRegion(newRegion, 300);
  };

  const handleSelectFromList = (item: MarketListing) => {
    handleSelectFromMap(item);
  };

  const onContainerLayout = (e: LayoutChangeEvent) => {
    containerHeightRef.current = e.nativeEvent.layout.height || 1;
  };

  return (
    <View style={styles.root} onLayout={onContainerLayout}>
      {/* Хедер + фильтры */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Карта объявлений</Text>
        <Text style={styles.headerSub}>
          Тапайте по ценникам на карте или по карточкам в списке.
        </Text>

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
                onPress={() =>
                  setKindFilter(k.code as "all" | "material" | "service" | "rent")
                }
                style={[
                  styles.kindChip,
                  active && styles.kindChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.kindChipText,
                    active && styles.kindChipTextActive,
                  ]}
                >
                  {k.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Карта + bottom sheet */}
      <View style={styles.mapContainer}>
        {/* Карта */}
        <MapView
          ref={mapRef}
          style={[
            styles.map,
            { bottom: sheetHeight * containerHeightRef.current },
          ]}
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

              let mainTitle = item.title;
              if (activeKind && visibleItems[0]?.name) {
                mainTitle = visibleItems[0].name as string;
              }

              let mainPrice: number | null = item.price;
              if (
                activeKind &&
                visibleItems[0]?.price != null &&
                visibleItems[0].price !== 0
              ) {
                mainPrice = visibleItems[0].price as number;
              }

              const baseKind: "material" | "service" | "rent" | null =
                (activeKind as any) ??
                ((item.kind === "material" ||
                  item.kind === "service" ||
                  item.kind === "rent") &&
                  (item.kind as any));

              const bg = getKindColor(baseKind);
              const borderColor = isSelected ? "#F9FAFB" : "#1F2937";

              return (
                <Marker
                  key={item.id}
                  coordinate={{
                    latitude: item.lat as number,
                    longitude: item.lng as number,
                  }}
                  onPress={() => handleSelectFromMap(item)}
                >
                  <View
                    style={[
                      styles.markerBubble,
                      {
                        backgroundColor: bg,
                        borderColor,
                      },
                    ]}
                  >
                    <Text style={styles.markerText}>
                      {mainPrice != null
                        ? `${mainPrice.toLocaleString("ru-RU")} KGS`
                        : "Цена по запросу"}
                    </Text>
                  </View>
                </Marker>
              );
            })}
        </MapView>

        {/* Bottom sheet */}
        <View
          style={[
            styles.sheet,
            {
              height: sheetHeight * containerHeightRef.current,
            },
          ]}
        >
          {/* ручка */}
          <View
            {...panResponder.panHandlers}
            style={styles.sheetHandleArea}
          >
            <View style={styles.sheetHandle} />
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
          >
            {filteredListings.map((item) => {
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

              let mainTitle = item.title;
              if (activeKind && visibleItems[0]?.name) {
                mainTitle = visibleItems[0].name as string;
              }

              let mainPrice: number | null = item.price;
              if (
                activeKind &&
                visibleItems[0]?.price != null &&
                visibleItems[0].price !== 0
              ) {
                mainPrice = visibleItems[0].price as number;
              }

              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelectFromList(item)}
                  style={[
                    styles.card,
                    isSelected && styles.cardSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.cardTitle,
                      isSelected && styles.cardTitleSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {mainTitle}
                  </Text>

                  <Text style={styles.cardPrice}>
                    {mainPrice != null
                      ? `${mainPrice.toLocaleString("ru-RU")} KGS`
                      : "Цена по запросу"}
                  </Text>

                  <Text style={styles.cardCity}>
                    {item.city || "Город не указан"}
                  </Text>

                  {visibleItems.length > 0 && (
                    <View style={styles.cardItems}>
                      {visibleItems.slice(0, 3).map((pos, idx) => (
                        <Text key={idx} style={styles.cardItemRow}>
                          <Text style={styles.cardItemKind}>
                            {kindLabel(pos.kind)}{" "}
                            {pos.kind ? "· " : ""}
                          </Text>
                          {pos.name || "Позиция"}
                          {pos.qty != null &&
                            pos.qty !== 0 && (
                              <>
                                {" · "}Кол-во: {pos.qty}{" "}
                                {pos.uom ? pos.uom : ""}
                              </>
                            )}
                          {pos.price != null &&
                            pos.price !== 0 && (
                              <>
                                {" · "}Цена: {pos.price} KGS
                              </>
                            )}
                        </Text>
                      ))}

                      {visibleItems.length > 3 && (
                        <Text style={styles.cardMore}>
                          + ещё {visibleItems.length - 3} позиций
                        </Text>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.border,
    backgroundColor: UI.bg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: UI.text,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: UI.sub,
  },
  filtersRow: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
  filterBlock: {
    flexShrink: 0,
  },
  filterBlockWide: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 11,
    color: UI.sub,
    marginBottom: 2,
  },
  input: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI.border,
    color: UI.text,
    fontSize: 12,
    backgroundColor: "#020617",
  },
  kindRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  kindChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: "#020617",
  },
  kindChipActive: {
    backgroundColor: UI.accent,
    borderColor: UI.accent,
  },
  kindChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: UI.text,
  },
  kindChipTextActive: {
    color: "#0B1120",
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: UI.bg,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },
  sheetHandleArea: {
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#4B5563",
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  card: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  cardSelected: {
    backgroundColor: "#020617",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.text,
  },
  cardTitleSelected: {
    color: "#FFFFFF",
  },
  cardPrice: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: UI.accent,
  },
  cardCity: {
    marginTop: 2,
    fontSize: 12,
    color: UI.sub,
  },
  cardItems: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: UI.border,
    borderStyle: "dashed",
  },
  cardItemRow: {
    fontSize: 12,
    color: UI.text,
    marginBottom: 2,
  },
  cardItemKind: {
    color: UI.sub,
  },
  cardMore: {
    fontSize: 11,
    color: UI.sub,
    marginTop: 2,
  },
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
  markerText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
