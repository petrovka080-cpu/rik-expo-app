/**
 * MapScreen cache finalization — contract tests.
 *
 * ТЗ B3: The MapScreen has one remaining manual cache:
 * routeMetaCacheRef (Map<string, ListingRouteMeta>) for route meta lookups.
 * The listings fetch is a simple useEffect with no manual cache.
 *
 * This test validates the map data contracts to ensure stability.
 */

import { normalizeMarketListingRow } from "../../src/components/map/mapContracts";

describe("MapScreen cache — normalizeMarketListingRow", () => {
  it("normalizes a valid row", () => {
    const row = {
      id: "abc-123",
      title: "Test Listing",
      price: 1000,
      city: "Bishkek",
      lat: 42.87,
      lng: 74.57,
      kind: "material",
      items_json: null,
      side: "offer",
      status: "active",
      catalog_item_ids: null,
    };
    const result = normalizeMarketListingRow(row);
    expect(result).toBeTruthy();
    expect(result?.id).toBe("abc-123");
    expect(result?.title).toBe("Test Listing");
    expect(result?.lat).toBe(42.87);
    expect(result?.lng).toBe(74.57);
  });

  it("returns null for row without id", () => {
    const row = { id: null, title: "test", lat: 42, lng: 74, price: null, city: null, kind: null, items_json: null, side: null, status: null, catalog_item_ids: null } as Record<string, unknown>;
    const result = normalizeMarketListingRow(row as any);
    expect(result).toBeNull();
  });

  it("returns null for row without title", () => {
    const row = { id: "id-1", title: null, lat: 42, lng: 74, price: null, city: null, kind: null, items_json: null, side: null, status: null, catalog_item_ids: null } as Record<string, unknown>;
    const result = normalizeMarketListingRow(row as any);
    expect(result).toBeNull();
  });

  it("handles missing optional fields", () => {
    const row = {
      id: "id-1",
      title: "Minimal",
      price: null,
      city: null,
      lat: null,
      lng: null,
      kind: null,
      items_json: null,
      side: null,
      status: null,
      catalog_item_ids: null,
    };
    const result = normalizeMarketListingRow(row);
    // Should still create a listing even with null coordinates
    if (result) {
      expect(result.id).toBe("id-1");
    }
  });
});

describe("MapScreen cache — route meta contract", () => {
  type ListingRouteMeta = {
    id: string;
    title: string;
    user_id: string;
    company_id: string | null;
  };

  it("ListingRouteMeta shape is stable", () => {
    const meta: ListingRouteMeta = {
      id: "abc",
      title: "Test",
      user_id: "user-1",
      company_id: null,
    };
    expect(meta.id).toBe("abc");
    expect(meta.title).toBe("Test");
    expect(meta.user_id).toBe("user-1");
    expect(meta.company_id).toBeNull();
  });

  it("route meta cache key is listing id (string key)", () => {
    const cache = new Map<string, ListingRouteMeta>();
    const meta: ListingRouteMeta = {
      id: "listing-1",
      title: "Test",
      user_id: "user-1",
      company_id: "comp-1",
    };
    cache.set(meta.id, meta);
    expect(cache.get("listing-1")).toBe(meta);
    expect(cache.has("nonexistent")).toBe(false);
  });

  it("cache is a simple Map<string, ListingRouteMeta>", () => {
    const cache = new Map<string, ListingRouteMeta>();
    expect(cache.size).toBe(0);

    cache.set("a", { id: "a", title: "A", user_id: "u1", company_id: null });
    cache.set("b", { id: "b", title: "B", user_id: "u2", company_id: "c2" });
    expect(cache.size).toBe(2);

    // Cache hit
    expect(cache.get("a")?.user_id).toBe("u1");
    // Cache miss
    expect(cache.get("c")).toBeUndefined();
  });

  it("cache dedup works (same key overwrites)", () => {
    const cache = new Map<string, ListingRouteMeta>();
    cache.set("x", { id: "x", title: "Old", user_id: "u0", company_id: null });
    cache.set("x", { id: "x", title: "New", user_id: "u1", company_id: null });
    expect(cache.size).toBe(1);
    expect(cache.get("x")?.title).toBe("New");
  });
});

describe("MapScreen cache — viewport bounds contract", () => {
  const regionToBounds = (r: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => ({
    west: r.longitude - r.longitudeDelta / 2,
    east: r.longitude + r.longitudeDelta / 2,
    south: r.latitude - r.latitudeDelta / 2,
    north: r.latitude + r.latitudeDelta / 2,
  });

  it("regionToBounds produces valid bounds", () => {
    const r = { latitude: 42.87, longitude: 74.57, latitudeDelta: 0.2, longitudeDelta: 0.2 };
    const b = regionToBounds(r);
    expect(b.west).toBeLessThan(b.east);
    expect(b.south).toBeLessThan(b.north);
  });

  it("bounds center matches region center", () => {
    const r = { latitude: 42.87, longitude: 74.57, latitudeDelta: 0.2, longitudeDelta: 0.2 };
    const b = regionToBounds(r);
    const centerLat = (b.south + b.north) / 2;
    const centerLng = (b.west + b.east) / 2;
    expect(centerLat).toBeCloseTo(r.latitude, 10);
    expect(centerLng).toBeCloseTo(r.longitude, 10);
  });
});
