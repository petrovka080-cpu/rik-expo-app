import fs from "node:fs";

describe("catalog item picker reuse", () => {
  it("uses a shared catalog picker/service instead of a request-only free-text widget", () => {
    const screen = fs.readFileSync("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx", "utf8");
    const picker = fs.readFileSync("src/features/catalog/CatalogItemPicker.tsx", "utf8");
    expect(screen).toContain("CatalogItemPicker");
    expect(picker).toContain("searchCatalogItemsForPicker");
    expect(picker).toContain("request-catalog-item-picker");
  });
});
