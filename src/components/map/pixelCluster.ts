import Supercluster from "supercluster";
import type { MarketListing } from "./MapScreen";

export type Bounds = { west: number; south: number; east: number; north: number };

export type ClusterPointProps = {
  id: string;
  side: "offer" | "demand";
  kind: string | null;
  price: number | null;
  city: string | null;
  title: string;
  items_json: any[] | null;
};

export type AnyClusterFeature =
  | {
      type: "Feature";
      geometry: { type: "Point"; coordinates: [number, number] };
      properties: ClusterPointProps & { cluster?: false };
    }
  | {
      type: "Feature";
      geometry: { type: "Point"; coordinates: [number, number] };
      properties: {
        cluster: true;
        cluster_id: number;
        point_count: number;
        point_count_abbreviated: number | string;
      };
    };

export function buildIndex(points: MarketListing[]) {
  const idx = new Supercluster<ClusterPointProps, any>({
    radius: 58, // px (Zillow-like)
    maxZoom: 20,
    minZoom: 1,
  });

  const features = points
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

  idx.load(features as any);
  return idx;
}

export function getClusters(idx: Supercluster<ClusterPointProps, any>, bounds: Bounds, zoom: number) {
  const bbox: [number, number, number, number] = [bounds.west, bounds.south, bounds.east, bounds.north];
  return idx.getClusters(bbox, zoom) as AnyClusterFeature[];
}

export function getClusterLeaves(idx: Supercluster<ClusterPointProps, any>, clusterId: number, limit = 200) {
  return idx.getLeaves(clusterId, limit) as AnyClusterFeature[];
}

export function getExpansionZoom(idx: Supercluster<ClusterPointProps, any>, clusterId: number) {
  return idx.getClusterExpansionZoom(clusterId);
}

export function zoomFromRegion(longitudeDelta: number, viewWidthPx: number) {
  const lonDelta = Math.max(0.000001, Number(longitudeDelta) || 0.2);
  const w = Math.max(1, Number(viewWidthPx) || 360);
  const z = Math.log2((360 * (w / 256)) / lonDelta);
  return Math.max(1, Math.min(20, Math.round(z)));
}
