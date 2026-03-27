import Supercluster from "supercluster";
import type { ClusterListing, ListingItemJson, MarketListing } from "./mapContracts";

export type Bounds = { west: number; south: number; east: number; north: number };

export type ClusterPointProps = {
  id: string;
  side: "offer" | "demand";
  kind: string | null;
  price: number | null;
  city: string | null;
  title: string;
  items_json: ListingItemJson[] | null;
};

type ClusterAccumulator = Record<string, never>;
type PointFeature = Supercluster.PointFeature<ClusterPointProps>;
type ClusterFeature = Supercluster.ClusterFeature<ClusterAccumulator>;

export type AnyClusterFeature = PointFeature | ClusterFeature;

function isClusterFeature(feature: AnyClusterFeature): feature is ClusterFeature {
  return "cluster" in feature.properties && feature.properties.cluster === true;
}

export function isPointClusterFeature(feature: AnyClusterFeature): feature is PointFeature {
  return !isClusterFeature(feature);
}

export function buildIndex(points: MarketListing[]) {
  const idx = new Supercluster<ClusterPointProps, ClusterAccumulator>({
    radius: 58, // px (Zillow-like)
    maxZoom: 20,
    minZoom: 1,
  });

  const features: PointFeature[] = points
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [Number(p.lng), Number(p.lat)] as [number, number],
      },
      properties: {
        id: p.id,
        side: p.side,
        kind: p.kind ?? null,
        price: p.price ?? null,
        city: p.city ?? null,
        title: p.title,
        items_json: p.items_json ?? null,
      },
    }));

  idx.load(features);
  return idx;
}

export function getClusters(
  idx: Supercluster<ClusterPointProps, ClusterAccumulator>,
  bounds: Bounds,
  zoom: number,
) {
  const bbox: [number, number, number, number] = [bounds.west, bounds.south, bounds.east, bounds.north];
  return idx.getClusters(bbox, zoom) as AnyClusterFeature[];
}

export function getClusterLeaves(
  idx: Supercluster<ClusterPointProps, ClusterAccumulator>,
  clusterId: number,
  limit = 200,
) {
  return idx.getLeaves(clusterId, limit);
}

export function getExpansionZoom(
  idx: Supercluster<ClusterPointProps, ClusterAccumulator>,
  clusterId: number,
) {
  return idx.getClusterExpansionZoom(clusterId);
}

export function toClusterListing(feature: PointFeature): ClusterListing {
  const [lng, lat] = feature.geometry.coordinates;
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

export function zoomFromRegion(longitudeDelta: number, viewWidthPx: number) {
  const lonDelta = Math.max(0.000001, Number(longitudeDelta) || 0.2);
  const w = Math.max(1, Number(viewWidthPx) || 360);
  const z = Math.log2((360 * (w / 256)) / lonDelta);
  return Math.max(1, Math.min(20, Math.round(z)));
}
