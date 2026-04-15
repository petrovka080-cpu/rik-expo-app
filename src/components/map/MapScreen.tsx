import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { router, useLocalSearchParams, type Href } from "expo-router";
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
import type {
  ClusterListing,
  ListingRouteMeta,
  MapRegion,
  MapViewport,
  MapViewportUpdate,
  MarketListing,
  MyLoc,
} from "./mapContracts";
import { useMapListingsQuery } from "./useMapListingsQuery";

import {
  buildIndex,
  getClusters,
  getClusterLeaves,
  getExpansionZoom,
  isPointClusterFeature,
  toClusterListing,
  zoomFromRegion,
} from "./pixelCluster";

const UI = {
  bg: "#020617",
  text: "#F9FAFB",
  sub: "#9CA3AF",
  border: "#1F2937",
  ok: "#22C55E",
};

const defaultRegion: MapRegion = {
  latitude: 42.8746,
  longitude: 74.5698,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

const regionToBounds = (r: MapRegion): MapViewport["bounds"] => ({
  west: r.longitude - r.longitudeDelta / 2,
  east: r.longitude + r.longitudeDelta / 2,
  south: r.latitude - r.latitudeDelta / 2,
  north: r.latitude + r.latitudeDelta / 2,
});

function normalizeListingRouteMeta(
  value: {
    id: string | null;
    title: string | null;
    user_id: string | null;
    company_id: string | null;
  } | null,
): ListingRouteMeta | null {
  if (!value?.id || !value.title || !value.user_id) return null;
  return {
    id: value.id,
    title: value.title,
    user_id: value.user_id,
    company_id: value.company_id,
  };
}

export default function MapScreen() {
  const { width: screenW } = useWindowDimensions();
  const params = useLocalSearchParams<{
    side?: string | string[];
    kind?: string | string[];
    city?: string | string[];
    focusId?: string | string[];
  }>();

  const { listings } = useMapListingsQuery();
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

  const [region, setRegion] = useState<MapRegion>(defaultRegion);
  const [myLoc, setMyLoc] = useState<MyLoc | null>(null);
  const routeMetaCacheRef = useRef<Map<string, ListingRouteMeta>>(new Map());

  // ✅ viewport всегда НЕ null и всегда с bounds
  const [viewport, setViewport] = useState<MapViewport>(() => ({
    zoom: zoomFromRegion(defaultRegion.longitudeDelta, 360),
    bounds: regionToBounds(defaultRegion),
  }));

  const [offerDemand, setOfferDemand] = useState<MarketListing | null>(null);
  const [demandDetails, setDemandDetails] = useState<MarketListing | null>(null);

  const [offerPrice, setOfferPrice] = useState("");
  const [offerDays, setOfferDays] = useState("");
  const [offerComment, setOfferComment] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);
  const routeSide = Array.isArray(params.side) ? params.side[0] : params.side;
  const routeKind = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const routeCity = Array.isArray(params.city) ? params.city[0] : params.city;
  const routeFocusId = Array.isArray(params.focusId) ? params.focusId[0] : params.focusId;

  // ✅ debounce region updates (пересчёт кластеров только когда карта “остановилась”)
  const regionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRegionChangeDebounced = (r: MapRegion) => {
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

  useEffect(() => {
    return () => {
      if (regionTimerRef.current) clearTimeout(regionTimerRef.current);
    };
  }, []);



  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      side: routeSide === "offer" || routeSide === "demand" ? routeSide : prev.side,
      kind: routeKind === "material" || routeKind === "work" || routeKind === "service" ? routeKind : prev.kind,
      city: typeof routeCity === "string" && routeCity.trim() ? routeCity.trim() : prev.city,
    }));
  }, [routeCity, routeKind, routeSide]);

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
          const hasKind = items.some((item) => item.kind === k);
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

  useEffect(() => {
    if (!routeFocusId) return;
    const match = filteredListings.find((row) => row.id === routeFocusId) || listings.find((row) => row.id === routeFocusId);
    if (!match || match.lat == null || match.lng == null) return;
    setClusterMode(null);
    setSelectedId(match.id);
    setRegion({
      latitude: Number(match.lat),
      longitude: Number(match.lng),
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
    if (match.side === "demand") setDemandDetails(match);
  }, [filteredListings, listings, routeFocusId]);

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
    const out: ClusterListing[] = [];

    for (const f of clusterFeatures) {
      const [lng, lat] = f.geometry.coordinates;

      if (!isPointClusterFeature(f)) {
        out.push({
          id: `cluster:${f.properties.cluster_id}`,
          lat,
          lng,
          side: "demand",
          kind: "material",
          price: null,
          city: null,
          title: `НУЖНО (${f.properties.point_count})`,
          items_json: null,
          __clusterId: f.properties.cluster_id,
          __clusterCount: f.properties.point_count,
        });
      } else {
        out.push(toClusterListing(f));
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

      const items = leaves.map((leaf) => toClusterListing(leaf));
      const center = listingsForMap.find((item) => item.id === id);
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
    const targetItem =
      listingsForMap.find((item) => item.id === id) ||
      filteredListings.find((item) => item.id === id);

    if (!targetItem) return;
    if (targetItem.lat == null || targetItem.lng == null) return;

    setClusterMode(null);
    setSelectedId(id);

    setRegion({
      latitude: Number(targetItem.lat),
      longitude: Number(targetItem.lng),
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });

    if (targetItem.side === "demand") setDemandDetails(targetItem);
  };

  const goToMyLocation = async () => {
    if (Platform.OS === "web") {
      const geo = globalThis?.navigator?.geolocation;
      if (!geo) {
        Alert.alert("Геолокация", "Недоступно в этом браузере");
        return;
      }

      geo.getCurrentPosition(
        (pos: GeolocationPosition) => {
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

  const openAssistant = useCallback(
    (row?: MarketListing | null) => {
      const selected =
        row ??
        demandDetails ??
        offerDemand ??
        filteredListings.find((item) => item.id === selectedId) ??
        null;

      const parts: string[] = ["Помоги сориентироваться по карте поставщиков GOX."];

      if (filters.side !== "all") parts.push(`Фильтр по стороне: ${filters.side}.`);
      if (filters.kind !== "all") parts.push(`Фильтр по типу: ${filters.kind}.`);
      if (filters.city.trim()) parts.push(`Город: ${filters.city.trim()}.`);
      if (filters.catalogItem?.name_human) {
        parts.push(`Каталожная позиция: ${filters.catalogItem.name_human}.`);
      }
      if (clusterMode?.title) {
        parts.push(`Сейчас открыт кластерный режим: ${clusterMode.title}.`);
      }
      if (selected) {
        parts.push(`Сейчас выделено объявление "${selected.title}".`);
        if (selected.city) parts.push(`Город объявления: ${selected.city}.`);
        parts.push(selected.side === "demand" ? "Это спрос." : "Это предложение.");
      } else {
        parts.push("Подскажи, как лучше использовать текущие фильтры и что открыть дальше.");
      }

      const href: Href = {
        pathname: "/(tabs)/ai",
        params: {
          prompt: parts.join(" "),
          autoSend: "1",
          context: "supplierMap",
        },
      };
      router.push(href);
    },
    [clusterMode?.title, demandDetails, filteredListings, filters, offerDemand, selectedId],
  );

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

  const resolveListingRouteMeta = useCallback(async (row: Pick<MarketListing, "id" | "title">) => {
    const cached = routeMetaCacheRef.current.get(row.id);
    if (cached) return cached;

    const result = await supabase
      .from("market_listings")
      .select("id,title,user_id,company_id")
      .eq("id", row.id)
      .maybeSingle();

    if (result.error) throw result.error;
    const nextMeta = normalizeListingRouteMeta(result.data);
    if (!nextMeta) return null;
    routeMetaCacheRef.current.set(row.id, nextMeta);
    return nextMeta;
  }, []);

  const openListingDetails = useCallback((row: Pick<MarketListing, "id">) => {
    const href: Href = { pathname: "/product/[id]", params: { id: row.id } };
    router.push(href);
  }, []);

  const openListingChat = useCallback((row: Pick<MarketListing, "id" | "title">) => {
    const href: Href = {
      pathname: "/chat",
      params: {
        listingId: row.id,
        title: row.title,
      },
    };
    router.push(href);
  }, []);

  const openListingShowcase = useCallback(
    async (row: Pick<MarketListing, "id" | "title">) => {
      try {
        const meta = await resolveListingRouteMeta(row);
        if (!meta?.user_id) {
          Alert.alert("Р’РёС‚СЂРёРЅР°", "РќРµ СѓРґР°Р»РѕСЃСЊ РЅР°Р№С‚Рё РїСЂРѕС„РёР»СЊ РїРѕСЃС‚Р°РІС‰РёРєР°.");
          return;
        }

        const href: Href = {
          pathname: "/supplierShowcase",
          params: {
            userId: meta.user_id,
            ...(meta.company_id ? { companyId: meta.company_id } : {}),
          },
        };
        router.push(href);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ РІРёС‚СЂРёРЅСѓ РїРѕСЃС‚Р°РІС‰РёРєР°.";
        Alert.alert("Р’РёС‚СЂРёРЅР°", message);
      }
    },
    [resolveListingRouteMeta],
  );

  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        <MapRenderer
          listings={listingsForMap}
          spiderPoints={spiderPoints}
          hideClusterId={clusterMode?.clusterId || null}
          selectedId={selectedId}
          region={region}
          myLoc={myLoc}
          onSelect={(id) => focusById(id)}
          onRegionChange={onRegionChangeDebounced}
          onViewportChange={(v: MapViewportUpdate) => {
            // web пришлет bounds+zoom, native пришлет только zoom
            setViewport((prev) => ({
              zoom: typeof v.zoom === "number" ? v.zoom : prev.zoom,
              bounds: v.bounds?.west != null ? v.bounds : prev.bounds,
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
          onPick={(row) => {
            setSelectedId(row.id);

            const item =
              rowsForBottom.find((x) => x.id === row.id) ||
              filteredListings.find((x) => x.id === row.id);

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
          onOpenDetails={(row) => openListingDetails(row)}
          onOpenShowcase={(row) => void openListingShowcase(row)}
          onOpenChat={(row) => openListingChat(row)}
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
          items={Array.isArray(demandDetails?.items_json) ? demandDetails.items_json : []}
          onOpenDetails={demandDetails ? () => openListingDetails(demandDetails) : undefined}
          onOpenShowcase={demandDetails ? () => void openListingShowcase(demandDetails) : undefined}
          onOpenChat={demandDetails ? () => openListingChat(demandDetails) : undefined}
          onAskAssistant={() => openAssistant(demandDetails)}
          onClose={() => setDemandDetails(null)}
        />

        <MapFab onGeo={goToMyLocation} onReset={resetFilters} onAssistant={() => openAssistant()} />
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
