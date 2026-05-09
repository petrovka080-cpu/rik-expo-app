import type { Filters } from "./types";
import type {
  ClusterListing,
  ListingItemJson,
  ListingSide,
  ListingRouteMeta,
  MapRegion,
  MapViewport,
  MarketListing,
} from "./mapContracts";

type MapPointFeature = {
  geometry: { coordinates: readonly number[] };
  properties: {
    id: string;
    side: ListingSide;
    kind: string | null;
    price: number | null;
    city: string | null;
    title: string;
    items_json: ListingItemJson[] | null;
    cluster?: false;
  };
};

type MapClusterFeature = {
  geometry: { coordinates: readonly number[] };
  properties: {
    cluster: true;
    cluster_id: number;
    point_count: number;
  };
};

export type MapScreenClusterFeature = MapPointFeature | MapClusterFeature;

export type MapClusterMode = {
  clusterId: string;
  title: string;
  rows: MarketListing[];
} | null;

export type RawListingRouteMeta = {
  id: string | null;
  title: string | null;
  user_id: string | null;
  company_id: string | null;
};

export const defaultRegion: MapRegion = {
  latitude: 42.8746,
  longitude: 74.5698,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

export const regionToBounds = (region: MapRegion): MapViewport["bounds"] => ({
  west: region.longitude - region.longitudeDelta / 2,
  east: region.longitude + region.longitudeDelta / 2,
  south: region.latitude - region.latitudeDelta / 2,
  north: region.latitude + region.latitudeDelta / 2,
});

export function normalizeListingRouteMeta(value: RawListingRouteMeta | null): ListingRouteMeta | null {
  if (!value?.id || !value.title || !value.user_id) return null;
  return {
    id: value.id,
    title: value.title,
    user_id: value.user_id,
    company_id: value.company_id,
  };
}

export const getRouteParamValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export function applyMapRouteFilters(
  previous: Filters,
  route: {
    side?: string;
    kind?: string;
    city?: string;
  },
): Filters {
  return {
    ...previous,
    side: route.side === "offer" || route.side === "demand" ? route.side : previous.side,
    kind:
      route.kind === "material" || route.kind === "work" || route.kind === "service"
        ? route.kind
        : previous.kind,
    city: typeof route.city === "string" && route.city.trim() ? route.city.trim() : previous.city,
  };
}

export function getActiveMapFiltersCount(filters: Filters): number {
  return (
    (filters.kind !== "all" ? 1 : 0) +
    (filters.side !== "all" ? 1 : 0) +
    (filters.city.trim() ? 1 : 0) +
    (filters.minPrice != null ? 1 : 0) +
    (filters.maxPrice != null ? 1 : 0) +
    (filters.catalogItem ? 1 : 0)
  );
}

export function filterMapListings(
  listings: readonly MarketListing[],
  filters: Filters,
): MarketListing[] {
  const city = filters.city.trim().toLowerCase();
  const min = filters.minPrice != null ? Number(filters.minPrice) : null;
  const max = filters.maxPrice != null ? Number(filters.maxPrice) : null;

  return listings.filter((listing) => {
    if (filters.side !== "all" && listing.side !== filters.side) return false;
    if (city && listing.city && !listing.city.toLowerCase().includes(city)) return false;
    if (min != null && listing.price != null && listing.price < min) return false;
    if (max != null && listing.price != null && listing.price > max) return false;

    if (filters.kind !== "all") {
      const kind = filters.kind;
      if (listing.kind !== kind) {
        const items = Array.isArray(listing.items_json) ? listing.items_json : [];
        if (!items.some((item) => item.kind === kind)) return false;
      }
    }

    if (filters.catalogItem?.id) {
      const ids = Array.isArray(listing.catalog_item_ids) ? listing.catalog_item_ids : [];
      if (!ids.includes(filters.catalogItem.id)) return false;
    }

    return true;
  });
}

export function resolveMapRowsForBottom(
  clusterMode: MapClusterMode,
  filteredListings: readonly MarketListing[],
): readonly MarketListing[] {
  if (clusterMode?.rows?.length) return clusterMode.rows;
  return filteredListings;
}

export function findFocusedMapListing(
  focusId: string | undefined,
  filteredListings: readonly MarketListing[],
  listings: readonly MarketListing[],
): MarketListing | null {
  if (!focusId) return null;
  return filteredListings.find((row) => row.id === focusId) || listings.find((row) => row.id === focusId) || null;
}

export function getFocusedMapRegion(listing: Pick<MarketListing, "lat" | "lng">): MapRegion | null {
  if (listing.lat == null || listing.lng == null) return null;
  return {
    latitude: Number(listing.lat),
    longitude: Number(listing.lng),
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };
}

export function getMapZoomSteps(zTarget: number): readonly [number, number] {
  const z2 = Math.min(20, Math.max(1, zTarget));
  const z1 = Math.min(20, Math.max(1, z2 - 1));
  return [z1, z2];
}

export function getMapRegionForZoom(
  lat: number,
  lng: number,
  zoom: number,
  screenWidth: number,
): MapRegion {
  const lonDelta = 360 * (Math.max(320, screenWidth) / 256) / Math.pow(2, zoom);
  const latDelta = lonDelta;
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: Math.max(0.003, latDelta),
    longitudeDelta: Math.max(0.003, lonDelta),
  };
}

function isMapClusterFeature(feature: MapScreenClusterFeature): feature is MapClusterFeature {
  return feature.properties.cluster === true;
}

function toPointClusterListing(feature: MapPointFeature): ClusterListing {
  const lng = Number(feature.geometry.coordinates[0]);
  const lat = Number(feature.geometry.coordinates[1]);
  const props = feature.properties;
  return {
    id: props.id,
    side: props.side,
    kind: props.kind,
    price: props.price,
    city: props.city,
    title: props.title,
    items_json: props.items_json,
    lat,
    lng,
  };
}

export function buildClusterListings(
  clusterFeatures: readonly MapScreenClusterFeature[],
  buildClusterTitle: (count: number) => string,
): ClusterListing[] {
  const out: ClusterListing[] = [];

  for (const feature of clusterFeatures) {
    const lng = Number(feature.geometry.coordinates[0]);
    const lat = Number(feature.geometry.coordinates[1]);

    if (isMapClusterFeature(feature)) {
      out.push({
        id: `cluster:${feature.properties.cluster_id}`,
        lat,
        lng,
        side: "demand",
        kind: "material",
        price: null,
        city: null,
        title: buildClusterTitle(feature.properties.point_count),
        items_json: null,
        __clusterId: feature.properties.cluster_id,
        __clusterCount: feature.properties.point_count,
      });
    } else {
      out.push(toPointClusterListing(feature));
    }
  }

  return out;
}

function getZoomFromRegion(longitudeDelta: number, viewWidthPx: number) {
  const lonDelta = Math.max(0.000001, Number(longitudeDelta) || 0.2);
  const width = Math.max(1, Number(viewWidthPx) || 360);
  const zoom = Math.log2((360 * (width / 256)) / lonDelta);
  return Math.max(1, Math.min(20, Math.round(zoom)));
}

export function buildSpiderPoints(params: {
  clusterMode: MapClusterMode;
  viewportZoom: number | undefined;
  regionLongitudeDelta: number;
  screenWidth: number;
}): ClusterListing[] {
  const { clusterMode } = params;
  if (!clusterMode?.rows?.length) return [];

  const zoom = params.viewportZoom ?? getZoomFromRegion(params.regionLongitudeDelta, params.screenWidth);
  if (zoom < 17) return [];

  const rows = clusterMode.rows.filter((row) => row.lat != null && row.lng != null);
  if (rows.length <= 1) return [];

  const baseLat = Number(rows[0].lat);
  const baseLng = Number(rows[0].lng);
  const same = rows.every((row) => Number(row.lat) === baseLat && Number(row.lng) === baseLng);
  if (!same) return [];

  const radius = 0.00025;
  return rows.map((row, index) => {
    const angle = (2 * Math.PI * index) / rows.length;
    return {
      ...row,
      lat: baseLat + Math.sin(angle) * radius,
      lng: baseLng + Math.cos(angle) * radius,
      __spiderOf: clusterMode.clusterId,
    };
  });
}
