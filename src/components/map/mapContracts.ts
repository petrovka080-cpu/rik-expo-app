import type { DbJson } from "../../lib/dbContract.types";
import type { MarketListingsMapRowDb } from "./mapContracts.db";

export type ListingSide = "offer" | "demand";
export type ListingKind = "material" | "work" | "service";

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapViewport = {
  zoom: number;
  bounds: { west: number; south: number; east: number; north: number };
};

export type MapViewportUpdate = {
  zoom: number;
  bounds?: MapViewport["bounds"];
};

export type MyLoc = {
  latitude: number;
  longitude: number;
  heading: number;
  accuracy: number | null;
};

export type ListingItemJson = {
  rik_code?: string | null;
  name?: string | null;
  uom?: string | null;
  qty?: number | null;
  price?: number | null;
  city?: string | null;
  kind?: ListingKind | null;
};

export type ListingRouteMeta = {
  id: string;
  title: string;
  user_id: string;
  company_id: string | null;
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
  side: ListingSide;
  status?: string | null;
  catalog_item_ids?: string[] | null;
};

export type ClusterListing = MarketListing & {
  __clusterId?: number;
  __clusterCount?: number;
  __clusterItems?: MarketListing[] | null;
  __spiderOf?: string | null;
};

export type MapRendererProps = {
  listings: ClusterListing[];
  spiderPoints?: ClusterListing[];
  hideClusterId?: string | null;
  selectedId: string | null;
  region: MapRegion;
  myLoc: MyLoc | null;
  onSelect: (id: string) => void;
  onRegionChange: (region: MapRegion) => void;
  onViewportChange: (viewport: MapViewportUpdate) => void;
};

export type MarketListingsMapRow = MarketListingsMapRowDb;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toText(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeListingItem(value: unknown): ListingItemJson | null {
  const record = asRecord(value);
  if (!record) return null;

  return {
    rik_code: toText(record.rik_code),
    name: toText(record.name),
    uom: toText(record.uom),
    qty: toNumber(record.qty),
    price: toNumber(record.price),
    city: toText(record.city),
    kind:
      record.kind === "material" ||
      record.kind === "work" ||
      record.kind === "service"
        ? record.kind
        : null,
  };
}

export function normalizeListingItems(value: DbJson | null): ListingItemJson[] | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .map((entry) => normalizeListingItem(entry))
    .filter((entry): entry is ListingItemJson => Boolean(entry));
  return items.length ? items : [];
}

export function normalizeMarketListingRow(
  row: MarketListingsMapRow,
): MarketListing | null {
  const id = toText(row.id);
  const title = toText(row.title);
  if (!id || !title) return null;

  return {
    id,
    title,
    price: toNumber(row.price),
    city: toText(row.city),
    lat: toNumber(row.lat),
    lng: toNumber(row.lng),
    kind: toText(row.kind),
    items_json: normalizeListingItems(row.items_json),
    side: row.side === "demand" ? "demand" : "offer",
    status: toText(row.status),
    catalog_item_ids: Array.isArray(row.catalog_item_ids)
      ? row.catalog_item_ids.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0,
        )
      : null,
  };
}
