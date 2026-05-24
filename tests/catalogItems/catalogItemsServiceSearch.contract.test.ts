import { mapCatalogPreviewRowToPickerItem } from "../../src/lib/catalog/catalogItemsService";

describe("catalog item search service", () => {
  it("maps catalog_items rows into picker items with catalog item identity", () => {
    const item = mapCatalogPreviewRowToPickerItem({
      id: "cat-1",
      rik_code: "RIK-1",
      name_human: "Бетон М300",
      uom_code: "м3",
      kind: "material",
      app_ids: [],
    } as never);
    expect(item).toMatchObject({
      catalogItemId: "cat-1",
      rikCode: "RIK-1",
      name: "Бетон М300",
      unit: "m3",
      sourceId: "catalog_items",
      sourceLabel: "catalog_items",
    });
  });
});
