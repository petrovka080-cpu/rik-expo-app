import { resolveCountryRegionCity } from "../../src/lib/ai/globalLocalContext";
import {
  buildCatalogGapWarning,
  resolveCatalogRegion,
  resolveLocalCatalogCandidates,
  validateGlobalCatalogPolicy,
} from "../../src/lib/ai/globalCatalogPolicy";

describe("catalog gap warning", () => {
  it("requires catalog gap warning when no local candidate exists", () => {
    const context = resolveCountryRegionCity({ prompt: "estimate for well drilling in Nepal" });
    const catalogRegion = resolveCatalogRegion(context);
    const candidates = resolveLocalCatalogCandidates({ context, materialKey: "well_casing" });

    expect(candidates).toEqual([]);
    expect(validateGlobalCatalogPolicy([
      {
        materialKey: "well_casing",
        unit: "m",
        quantity: 80,
        catalogRegion,
        catalogCandidates: candidates,
        catalogGapWarning: buildCatalogGapWarning("well_casing", catalogRegion),
      },
    ]).valid).toBe(true);
  });
});
