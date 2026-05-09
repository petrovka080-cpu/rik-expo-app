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
  type MapScreenClusterFeature,
  normalizeListingRouteMeta,
  regionToBounds,
  resolveMapRowsForBottom,
} from "../../src/components/map/MapScreen.model";
import type { CatalogItem, Filters } from "../../src/components/map/types";
import type { MarketListing } from "../../src/components/map/mapContracts";

const catalogItem: CatalogItem = {
  id: "cat-1",
  rik_code: "001",
  kind: "service",
  name_human: "Delivery service",
};

const baseFilters: Filters = {
  side: "all",
  kind: "all",
  city: "",
  minPrice: null,
  maxPrice: null,
  catalogItem: null,
};

function listing(overrides: Partial<MarketListing>): MarketListing {
  return {
    id: "listing-1",
    title: "Listing",
    price: null,
    city: null,
    lat: 42,
    lng: 74,
    kind: "material",
    items_json: null,
    side: "offer",
    status: "active",
    catalog_item_ids: null,
    ...overrides,
  };
}

describe("MapScreen model", () => {
  it("normalizes route params into filters without replacing invalid existing state", () => {
    const previous: Filters = {
      ...baseFilters,
      side: "offer",
      kind: "material",
      city: "old city",
    };

    expect(getRouteParamValue(["demand", "offer"])).toBe("demand");
    expect(applyMapRouteFilters(previous, {
      side: "demand",
      kind: "work",
      city: "  Bishkek  ",
    })).toEqual({
      ...previous,
      side: "demand",
      kind: "work",
      city: "Bishkek",
    });

    expect(applyMapRouteFilters(previous, {
      side: "bad",
      kind: "bad",
      city: " ",
    })).toEqual(previous);
  });

  it("counts active filters using the same UI badges as the screen", () => {
    expect(getActiveMapFiltersCount({
      ...baseFilters,
      side: "demand",
      kind: "service",
      city: "Bishkek",
      minPrice: 10,
      maxPrice: 100,
      catalogItem,
    })).toBe(6);
  });

  it("filters listings while preserving existing null city and null price behavior", () => {
    const matchedByNestedKind = listing({
      id: "demand-with-null-city-price",
      side: "demand",
      kind: "work",
      city: null,
      price: null,
      items_json: [{ kind: "service", name: "Delivery" }],
      catalog_item_ids: ["cat-1"],
    });
    const wrongSide = listing({
      id: "offer-wrong-side",
      side: "offer",
      city: "Bishkek",
      price: 20,
      catalog_item_ids: ["cat-1"],
    });

    expect(filterMapListings([matchedByNestedKind, wrongSide], {
      ...baseFilters,
      side: "demand",
      kind: "service",
      city: "Bishkek",
      minPrice: 10,
      catalogItem,
    }).map((row) => row.id)).toEqual(["demand-with-null-city-price"]);
  });

  it("normalizes route metadata and focused listing regions", () => {
    expect(normalizeListingRouteMeta({
      id: "listing-1",
      title: "Listing",
      user_id: "user-1",
      company_id: null,
    })).toEqual({
      id: "listing-1",
      title: "Listing",
      user_id: "user-1",
      company_id: null,
    });
    expect(normalizeListingRouteMeta({
      id: "listing-1",
      title: "Listing",
      user_id: null,
      company_id: null,
    })).toBeNull();

    const fallback = listing({ id: "fallback", lat: 43, lng: 75 });
    const focused = findFocusedMapListing("fallback", [], [fallback]);
    expect(focused).toBe(fallback);
    expect(getFocusedMapRegion(fallback)).toEqual({
      latitude: 43,
      longitude: 75,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  });

  it("keeps viewport bounds and zoom region math deterministic", () => {
    const bounds = regionToBounds(defaultRegion);
    expect(bounds.west).toBeCloseTo(74.4698);
    expect(bounds.east).toBeCloseTo(74.6698);
    expect(bounds.south).toBeCloseTo(42.7746);
    expect(bounds.north).toBeCloseTo(42.9746);
    expect(getMapZoomSteps(1)).toEqual([1, 1]);
    expect(getMapZoomSteps(25)).toEqual([19, 20]);

    const zoomRegion = getMapRegionForZoom(42, 74, 20, 1);
    expect(zoomRegion.latitude).toBe(42);
    expect(zoomRegion.longitude).toBe(74);
    expect(zoomRegion.latitudeDelta).toBeGreaterThanOrEqual(0.003);
    expect(zoomRegion.longitudeDelta).toBeGreaterThanOrEqual(0.003);
  });

  it("maps cluster features and resolves bottom rows through the model boundary", () => {
    const sourceRows = [
      listing({ id: "a", lat: 42, lng: 74 }),
      listing({ id: "b", lat: 42.00001, lng: 74.00001 }),
    ];
    const features: MapScreenClusterFeature[] = [{
      geometry: { coordinates: [74, 42] },
      properties: {
        cluster: true,
        cluster_id: 1,
        point_count: 2,
      },
    }];

    const rows = buildClusterListings(features, (count) => `cluster ${count}`);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toMatch(/^cluster:/);
    expect(rows[0].title).toBe("cluster 2");
    expect(resolveMapRowsForBottom(null, sourceRows)).toBe(sourceRows);
    expect(resolveMapRowsForBottom({
      clusterId: "cluster:1",
      title: "Cluster",
      rows,
    }, sourceRows)).toBe(rows);
  });

  it("spiderfies only same-coordinate cluster rows at high zoom", () => {
    const rows = [
      listing({ id: "a", lat: 42, lng: 74 }),
      listing({ id: "b", lat: 42, lng: 74 }),
      listing({ id: "c", lat: 42, lng: 74 }),
    ];

    const spiderPoints = buildSpiderPoints({
      clusterMode: {
        clusterId: "cluster:7",
        title: "Cluster",
        rows,
      },
      viewportZoom: 17,
      regionLongitudeDelta: 0.05,
      screenWidth: 390,
    });

    expect(spiderPoints).toHaveLength(3);
    expect(spiderPoints.every((row) => row.__spiderOf === "cluster:7")).toBe(true);
    expect(new Set(spiderPoints.map((row) => `${row.lat}:${row.lng}`)).size).toBe(3);
    expect(buildSpiderPoints({
      clusterMode: {
        clusterId: "cluster:7",
        title: "Cluster",
        rows,
      },
      viewportZoom: 16,
      regionLongitudeDelta: 0.05,
      screenWidth: 390,
    })).toEqual([]);
  });
});
