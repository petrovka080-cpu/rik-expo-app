import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  useWindowDimensions,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import * as Location from "expo-location";
import DemandDetailsModal from "./DemandDetailsModal";

import TopSearchBar from "./TopSearchBar";
import CatalogSearchModal from "./CatalogSearchModal";
import FiltersModal from "./FiltersModal";
import ResultsBottomSheet from "./ResultsBottomSheet";
import MapRenderer from "./MapRenderer";
import MapFab from "./MapFab";
import type { Filters, CatalogItem } from "./types";

import {
  buildIndex,
  getClusters,
  getClusterLeaves,
  getExpansionZoom,
  zoomFromRegion,
} from "./pixelCluster";

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
  kind?: "material" | "work" | "service" | null;
};

export type MarketListing = {
  id: string;
  title: string;
  price: number | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  kind: string | null;
  items_json: ListingItemJson[] | null;
  side: "offer" | "demand";
  status?: string | null;
  catalog_item_ids?: string[] | null;
};

type MyLoc = {
  latitude: number;
  longitude: number;
  heading: number;
  accuracy: number | null;
};

const UI = {
  bg: "#020617",
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  ok: "#22C55E",
};

const defaultRegion: Region = {
  latitude: 42.8746,
  longitude: 74.5698,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

type Viewport = {
  zoom: number;
  bounds: { west: number; south: number; east: number; north: number };
};

const regionToBounds = (r: Region) => ({
  west: r.longitude - r.longitudeDelta / 2,
  east: r.longitude + r.longitudeDelta / 2,
  south: r.latitude - r.latitudeDelta / 2,
  north: r.latitude + r.latitudeDelta / 2,
});

export default function MapScreen() {
  const { width: screenW } = useWindowDimensions();

  const [listings, setListings] = useState<MarketListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [clusterMode, setClusterMode] = useState<{
    clusterId: string;
    title: string;
    rows: MarketListing[];
  } | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    side: "all",
    kind: "all",
    city: "",
    minPrice: null,
    maxPrice: null,
    catalogItem: null,
  });

  const activeFiltersCount =
    (filters.kind !== "all" ? 1 : 0) +
    (filters.side !== "all" ? 1 : 0) +
    (filters.city.trim() ? 1 : 0) +
    (filters.minPrice != null ? 1 : 0) +
    (filters.maxPrice != null ? 1 : 0) +
    (filters.catalogItem ? 1 : 0);

  const [region, setRegion] = useState<Region>(defaultRegion);
  const [myLoc, setMyLoc] = useState<MyLoc | null>(null);

  // ✅ viewport всегда НЕ null и всегда с bounds
  const [viewport, setViewport] = useState<Viewport>(() => ({
    zoom: zoomFromRegion(defaultRegion.longitudeDelta, 360),
    bounds: regionToBounds(defaultRegion),
  }));

  const [offerDemand, setOfferDemand] = useState<MarketListing | null>(null);
  const [demandDetails, setDemandDetails] = useState<MarketListing | null>(null);

  const [offerPrice, setOfferPrice] = useState("");
  const [offerDays, setOfferDays] = useState("");
  const [offerComment, setOfferComment] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);

  // ✅ debounce region updates (пересчёт кластеров только когда карта “остановилась”)
  const regionTimerRef = useRef<any>(null);
  const onRegionChangeDebounced = (r: Region) => {
    if (regionTimerRef.current) clearTimeout(regionTimerRef.current);
    regionTimerRef.current = setTimeout(() => {
      setRegion(r);

      const z = zoomFromRegion(r.longitudeDelta, screenW);
      setViewport((prev) => ({
        zoom: z,
        bounds: prev?.bounds ? prev.bounds : regionToBounds(r),
      }));
    }, 140);
  };

  // ===== load listings =====
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("market_listings_map")
        .select("id,title,price,city,lat,lng,kind,items_json,side,status,catalog_item_ids")
        .eq("status", "active")
        .limit(2000);

      if (error) {
        console.warn("MapScreen load error:", error.message);
        return;
      }

      const normalized = (data || []).map((x: any) => ({
        ...x,
        side: (x.side === "demand" ? "demand" : "offer") as "offer" | "demand",
        lat: x.lat != null ? Number(x.lat) : null,
        lng: x.lng != null ? Number(x.lng) : null,
        price: x.price != null ? Number(x.price) : null,
      }));

      setListings(normalized as MarketListing[]);
    };

    load();
  }, []);

  // ===== filter =====
  const filteredListings = useMemo(() => {
    const city = filters.city.trim().toLowerCase();
    const min = filters.minPrice != null ? Number(filters.minPrice) : null;
    const max = filters.maxPrice != null ? Number(filters.maxPrice) : null;

    return listings.filter((l) => {
      if (filters.side !== "all") {
        if (l.side !== filters.side) return false;
      }

      if (city && l.city && !l.city.toLowerCase().includes(city)) return false;

      if (min != null && l.price != null && l.price < min) return false;
      if (max != null && l.price != null && l.price > max) return false;

      if (filters.kind !== "all") {
        const k = filters.kind;
        if (l.kind === k) {
          // ok
        } else {
          const items = Array.isArray(l.items_json) ? l.items_json : [];
          const hasKind = items.some((it: any) => it.kind === k);
          if (!hasKind) return false;
        }
      }

      if (filters.catalogItem?.id) {
        const ids = Array.isArray(l.catalog_item_ids) ? l.catalog_item_ids : [];
        if (!ids.includes(filters.catalogItem.id)) return false;
      }

      return true;
    });
  }, [listings, filters]);

  // ===== supercluster index =====
  const clusterIndex = useMemo(() => buildIndex(filteredListings), [filteredListings]);

  // ===== clusters for viewport (pixel-based) =====
  const clusterFeatures = useMemo(() => {
    const b = viewport?.bounds;
    const z = viewport?.zoom;

    if (!b || b.west == null || b.east == null || b.south == null || b.north == null) return [];
    if (typeof z !== "number") return [];

    return getClusters(clusterIndex, b, z);
  }, [clusterIndex, viewport]);

  // ===== markers to draw =====
  const listingsForMap = useMemo(() => {
    const out: any[] = [];

    for (const f of clusterFeatures as any[]) {
      const [lng, lat] = f.geometry.coordinates;

      if (f.properties?.cluster) {
        out.push({
          id: `cluster:${f.properties.cluster_id}`,
          lat,
          lng,
          side: "demand",
          kind: "material",
          price: null,
          city: null,
          title: `НУЖНО (${f.properties.point_count})`,
          __clusterId: f.properties.cluster_id,
          __clusterCount: f.properties.point_count,
        });
      } else {
        const p = f.properties;
        out.push({
          id: p.id,
          lat,
          lng,
          side: p.side,
          kind: p.kind,
          price: p.price,
          city: p.city,
          title: p.title,
          items_json: p.items_json,
        });
      }
    }

    return out;
  }, [clusterFeatures]);

  // ===== bottom rows: либо clusterMode, либо все =====
  const rowsForBottom = useMemo(() => {
    if (clusterMode?.rows?.length) return clusterMode.rows;
    return filteredListings;
  }, [clusterMode, filteredListings]);

  // ===== spiderfy: если одинаковые координаты и zoom >= 17 =====
  const spiderPoints = useMemo(() => {
    if (!clusterMode?.rows?.length) return [];
    const zoom = viewport?.zoom ?? zoomFromRegion(region.longitudeDelta, screenW);
    if (zoom < 17) return [];

    const rows = clusterMode.rows.filter((x) => x.lat != null && x.lng != null);
    if (rows.length <= 1) return [];

    const baseLat = Number(rows[0].lat);
    const baseLng = Number(rows[0].lng);

    const same = rows.every((x) => Number(x.lat) === baseLat && Number(x.lng) === baseLng);
    if (!same) return [];

    const n = rows.length;
    const r = 0.00025;
    return rows.map((x, i) => {
      const a = (2 * Math.PI * i) / n;
      return {
        ...x,
        lat: baseLat + Math.sin(a) * r,
        lng: baseLng + Math.cos(a) * r,
        __spiderOf: clusterMode.clusterId,
      };
    });
  }, [clusterMode, viewport?.zoom, region.longitudeDelta, screenW]);

  // ===== Zillow zoom helper (smooth 2-step) =====
  const zoomTo = (lat: number, lng: number, zTarget: number) => {
    const z2 = Math.min(20, Math.max(1, zTarget));
    const z1 = Math.min(20, Math.max(1, z2 - 1));

    const mkDelta = (z: number) => {
      const lonDelta = 360 * (Math.max(320, screenW) / 256) / Math.pow(2, z);
      const latDelta = lonDelta;
      return {
        latitudeDelta: Math.max(0.003, latDelta),
        longitudeDelta: Math.max(0.003, lonDelta),
      };
    };

    const step1 = mkDelta(z1);
    const step2 = mkDelta(z2);

    setRegion({ latitude: lat, longitude: lng, ...step1 });
    setTimeout(() => {
      setRegion({ latitude: lat, longitude: lng, ...step2 });
    }, 180);
  };

  // ===== double tap on cluster (extra zoom) =====
  const lastClusterTapRef = useRef<{ id: string; t: number } | null>(null);

  // ===== click handler =====
  const focusById = (id: string) => {
    // ✅ cluster click
    if (String(id).startsWith("cluster:")) {
      const clusterId = Number(String(id).split(":")[1]);
      const leaves = getClusterLeaves(clusterIndex, clusterId, 200);

      const items = leaves
        .filter((x: any) => !x.properties?.cluster)
        .map((x: any) => ({
          id: x.properties.id,
          side: x.properties.side,
          kind: x.properties.kind,
          price: x.properties.price,
          city: x.properties.city,
          title: x.properties.title,
          items_json: x.properties.items_json,
          lat: x.geometry.coordinates[1],
          lng: x.geometry.coordinates[0],
        })) as MarketListing[];

      const center = (listingsForMap as any[]).find((x) => x.id === id);
      const lat = Number(center?.lat);
      const lng = Number(center?.lng);

      setDemandDetails(null);
      setSelectedId(null);

      setClusterMode({
        clusterId: id,
        title: `Спрос в этом месте: ${items.length}`,
        rows: items,
      });

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      // expansion zoom from supercluster
      const targetZoom = getExpansionZoom(clusterIndex, clusterId);

      // detect double tap
      const now = Date.now();
      const last = lastClusterTapRef.current;
      const isDouble = !!last && last.id === id && now - last.t < 320;
      lastClusterTapRef.current = { id, t: now };

      // ✅ single tap: smooth to expansionZoom
      // ✅ double tap: smooth to expansionZoom+1
      zoomTo(lat, lng, isDouble ? targetZoom + 1 : targetZoom);

      return;
    }

    // ✅ point click
    const anyItem: any =
      (listingsForMap as any[]).find((x) => x.id === id) ||
      filteredListings.find((x) => x.id === id);

    if (!anyItem) return;
    if (!anyItem.lat || !anyItem.lng) return;

    setClusterMode(null);
    setSelectedId(id);

    setRegion({
      latitude: Number(anyItem.lat),
      longitude: Number(anyItem.lng),
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });

    if (anyItem.side === "demand") setDemandDetails(anyItem);
  };

  const goToMyLocation = async () => {
    if (Platform.OS === "web") {
      // @ts-ignore
      const geo = globalThis?.navigator?.geolocation;
      if (!geo) {
        Alert.alert("Геолокация", "Недоступно в этом браузере");
        return;
      }

      geo.getCurrentPosition(
        (pos: any) => {
          const { latitude, longitude } = pos.coords;

          setMyLoc({
            latitude,
            longitude,
            heading: Number(pos.coords.heading ?? 0),
            accuracy: pos.coords.accuracy != null ? Number(pos.coords.accuracy) : null,
          });

          setSelectedId(null);
          setClusterMode(null);
          setRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
        },
        () => Alert.alert("Геолокация", "Нет доступа к геолокации"),
        { enableHighAccuracy: true, timeout: 8000 }
      );
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Геолокация", "Разрешение не выдано");
      return;
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = pos.coords;

    setMyLoc({
      latitude,
      longitude,
      heading: Number(pos.coords.heading ?? 0),
      accuracy: pos.coords.accuracy != null ? Number(pos.coords.accuracy) : null,
    });

    setSelectedId(null);
    setClusterMode(null);
    setRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  };

  const resetFilters = () => {
    setSelectedId(null);
    setClusterMode(null);
    setDemandDetails(null);

    setFilters({
      side: "all",
      kind: "all",
      city: "",
      minPrice: null,
      maxPrice: null,
      catalogItem: null,
    });
  };

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
    <View style={styles.root}>
      <View style={styles.stage}>
        <MapRenderer
          listings={listingsForMap as any}
          spiderPoints={spiderPoints as any}
          hideClusterId={clusterMode?.clusterId || null}
          selectedId={selectedId}
          region={region}
          myLoc={myLoc}
          onSelect={(id) => focusById(id)}
          onRegionChange={(r: any) => onRegionChangeDebounced(r)}
          onViewportChange={(v: any) => {
            // web пришлет bounds+zoom, native пришлет только zoom
            setViewport((prev) => ({
              zoom:
                typeof v?.zoom === "number"
                  ? v.zoom
                  : prev?.zoom ?? zoomFromRegion(region.longitudeDelta, screenW),
              bounds:
                v?.bounds?.west != null
                  ? v.bounds
                  : prev?.bounds ?? regionToBounds(region),
            }));
          }}
        />

        <TopSearchBar
          filters={filters}
          activeFiltersCount={activeFiltersCount}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenFilters={() => setFiltersOpen(true)}
        />

        <CatalogSearchModal
          visible={searchOpen}
          onClose={() => setSearchOpen(false)}
          onPick={(item: CatalogItem) => {
            setClusterMode(null);
            setSelectedId(null);
            setFilters((p) => ({ ...p, catalogItem: item, kind: item.kind }));
            setSearchOpen(false);
          }}
        />

        <FiltersModal
          visible={filtersOpen}
          value={filters}
          resultsCount={filteredListings.length}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setClusterMode(null);
            setSelectedId(null);
            setFilters(next);
          }}
          onReset={resetFilters}
        />

        <ResultsBottomSheet
          count={rowsForBottom.length}
          modeLabel={clusterMode?.title || null}
          onClearMode={clusterMode ? () => setClusterMode(null) : undefined}
          rows={rowsForBottom.map((x) => ({
            id: x.id,
            title: `${x.title} • ${x.id.slice(0, 6)}`,
            city: x.city,
            price: x.price,
            side: x.side ?? null,
            items_json: x.items_json ?? null,
          }))}
          selectedId={selectedId}
          onPick={(r: any) => {
            setSelectedId(r.id);

            const item =
              rowsForBottom.find((x) => x.id === r.id) ||
              filteredListings.find((x) => x.id === r.id);

            if (item?.lat != null && item?.lng != null) {
              setRegion({
                latitude: item.lat,
                longitude: item.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              });
            }

            if (item?.side === "demand") setDemandDetails(item);
          }}
          onSendOffer={(r) => {
            const item =
              rowsForBottom.find((x) => x.id === r.id) ||
              filteredListings.find((x) => x.id === r.id);
            if (item) setOfferDemand(item);
          }}
        />

        <DemandDetailsModal
          visible={!!demandDetails}
          title={demandDetails?.title || "Запрос"}
          city={demandDetails?.city || null}
          items={Array.isArray(demandDetails?.items_json) ? (demandDetails?.items_json as any) : []}
          onClose={() => setDemandDetails(null)}
        />

        <MapFab onGeo={goToMyLocation} onReset={resetFilters} />
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
              <Text style={styles.modalSendText}>{sendingOffer ? "Отправка..." : "Отправить"}</Text>
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
  stage: { flex: 1 },

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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
  },
  modalTitle: { color: UI.text, fontSize: 16, fontWeight: "900", marginBottom: 10 },
  modalInput: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
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
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalSendText: { color: "#0B1120", fontWeight: "900" },
  modalCancel: { marginTop: 10, alignItems: "center" },
  modalCancelText: { color: UI.sub, fontWeight: "900" },
});

