import { buildListingCatalogItem } from "./addListingCatalogItem";

describe("add listing catalog-item construction owner", () => {
  it("maps the selected catalog identity and applies the explicit city precedence", () => {
    expect(
      buildListingCatalogItem(
        {
          item: {
            rik_code: "MAT-001",
            name_human_ru: "Цемент",
            uom_code: "kg",
            kind: "material",
          },
          city: "",
          profileCity: "Бишкек",
          companyCity: "Ош",
          listingKind: "material",
        },
        () => "catalog-row-1",
      ),
    ).toEqual({
      id: "catalog-row-1",
      rik_code: "MAT-001",
      name: "Цемент",
      uom: "kg",
      qty: "",
      price: "",
      city: "Бишкек",
      kind: "material",
    });
  });
});
