import { resolveCountryRegionCity } from "../../src/lib/ai/globalLocalContext";
import {
  resolveCatalogRegion,
  resolveLocalCatalogCandidates,
  validateGlobalCatalogPolicy,
} from "../../src/lib/ai/globalCatalogPolicy";

describe("global catalog local candidate policy", () => {
  it("resolves catalog candidates by local region without fake supplier/stock", () => {
    const context = resolveCountryRegionCity({ prompt: "смета на гидроизоляцию крыши 100 кв м в Бишкеке" });
    const catalogRegion = resolveCatalogRegion(context);
    const candidates = resolveLocalCatalogCandidates({
      context,
      materialKey: "waterproofing_membrane",
    });

    expect(catalogRegion).toContain("KG");
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      materialKey: "waterproofing_membrane",
      region: catalogRegion,
    });
    expect(Object.keys(candidates[0])).not.toContain("supplierName");
    expect(Object.keys(candidates[0])).not.toContain("stockQuantity");

    expect(validateGlobalCatalogPolicy([
      {
        materialKey: "waterproofing_membrane",
        unit: "sq_m",
        quantity: 100,
        catalogRegion,
        catalogCandidates: candidates,
      },
    ]).valid).toBe(true);
  });
});
