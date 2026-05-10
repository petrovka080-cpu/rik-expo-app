import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import * as Location from "expo-location";
import type { Filters } from "./types";
import type {
  ListingRouteMeta,
  MapRegion,
  MapViewport,
  MarketListing,
  MyLoc,
} from "./mapContracts";
import { useMapListingsQuery } from "./useMapListingsQuery";
import {
  applyMapRouteFilters,
  buildClusterListings,
  buildSpiderPoints,
  defaultRegion,
  filterMapListings,
  findFocusedMapListing,
  getActiveMapFiltersCount,
  getFocusedMapRegion,
  getMapRegionForZoom,
  getMapZoomSteps,
  getRouteParamValue,
  normalizeListingRouteMeta,
  regionToBounds,
  resolveMapRowsForBottom,
  type MapClusterMode,
} from "./MapScreen.model";
import { loadMapScreenCurrentAuthUser } from "./MapScreen.auth.transport";
import {
  loadMapScreenListingRouteMeta,
  submitMapScreenDemandOffer,
} from "./MapScreen.market.transport";

import {
  buildIndex,
  getClusters,
  getClusterLeaves,
  getExpansionZoom,
  toClusterListing,
  zoomFromRegion,
} from "./pixelCluster";

export function useMapScreenController() {
  const { width: screenW } = useWindowDimensions();
  const params = useLocalSearchParams<{
    side?: string | string[];
    kind?: string | string[];
    city?: string | string[];
    focusId?: string | string[];
  }>();

  const { listings } = useMapListingsQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [clusterMode, setClusterMode] = useState<MapClusterMode>(null);

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

  const activeFiltersCount = getActiveMapFiltersCount(filters);

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
  const routeSide = getRouteParamValue(params.side);
  const routeKind = getRouteParamValue(params.kind);
  const routeCity = getRouteParamValue(params.city);
  const routeFocusId = getRouteParamValue(params.focusId);

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
    setFilters((prev) => applyMapRouteFilters(prev, {
      side: routeSide,
      kind: routeKind,
      city: routeCity,
    }));
  }, [routeCity, routeKind, routeSide]);

  // ===== filter =====
  const filteredListings = useMemo(() => filterMapListings(listings, filters), [listings, filters]);

  useEffect(() => {
    if (!routeFocusId) return;
    const match = findFocusedMapListing(routeFocusId, filteredListings, listings);
    if (!match) return;
    const focusedRegion = getFocusedMapRegion(match);
    if (!focusedRegion) return;
    setClusterMode(null);
    setSelectedId(match.id);
    setRegion(focusedRegion);
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
  const listingsForMap = useMemo(
    () => buildClusterListings(clusterFeatures, (count) => `НУЖНО (${count})`),
    [clusterFeatures],
  );

  // ===== bottom rows: либо clusterMode, либо все =====
  const rowsForBottom = useMemo(
    () => resolveMapRowsForBottom(clusterMode, filteredListings),
    [clusterMode, filteredListings],
  );

  // ===== spiderfy: если одинаковые координаты и zoom >= 17 =====
  const spiderPoints = useMemo(
    () => buildSpiderPoints({
      clusterMode,
      viewportZoom: viewport?.zoom,
      regionLongitudeDelta: region.longitudeDelta,
      screenWidth: screenW,
    }),
    [clusterMode, viewport?.zoom, region.longitudeDelta, screenW],
  );

  // ===== Zillow zoom helper (smooth 2-step) =====
  const zoomTo = (lat: number, lng: number, zTarget: number) => {
    const [z1, z2] = getMapZoomSteps(zTarget);
    const step1 = getMapRegionForZoom(lat, lng, z1, screenW);
    const step2 = getMapRegionForZoom(lat, lng, z2, screenW);

    setRegion(step1);
    setTimeout(() => {
      setRegion(step2);
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
      const user = await loadMapScreenCurrentAuthUser();
      if (!user) {
        Alert.alert("Вход", "Нужно войти в аккаунт");
        return;
      }

      const { error } = await submitMapScreenDemandOffer({
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

    const result = await loadMapScreenListingRouteMeta(row.id);

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

  return {
    listingsForMap,
    spiderPoints,
    clusterMode,
    selectedId,
    region,
    myLoc,
    focusById,
    onRegionChangeDebounced,
    setViewport,
    filters,
    activeFiltersCount,
    searchOpen,
    setSearchOpen,
    filtersOpen,
    setFiltersOpen,
    filteredListings,
    setClusterMode,
    setSelectedId,
    setFilters,
    resetFilters,
    rowsForBottom,
    setRegion,
    openListingDetails,
    openListingShowcase,
    openListingChat,
    setOfferDemand,
    demandDetails,
    setDemandDetails,
    openAssistant,
    goToMyLocation,
    offerDemand,
    offerPrice,
    setOfferPrice,
    offerDays,
    setOfferDays,
    offerComment,
    setOfferComment,
    sendingOffer,
    submitOffer,
  };
}

export type MapScreenController = ReturnType<typeof useMapScreenController>;
