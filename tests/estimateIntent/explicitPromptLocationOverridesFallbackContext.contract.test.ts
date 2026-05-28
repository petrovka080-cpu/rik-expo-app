import {
  buildGlobalEstimateInputFromRoute,
  routeUniversalEstimateIntent,
} from "../../src/lib/ai/estimateRouting";

describe("estimate route location priority", () => {
  it("keeps explicit prompt location ahead of assistant fallback context", () => {
    const route = routeUniversalEstimateIntent("estimate for asphalt paving 10000 m2 in Almaty");
    const input = buildGlobalEstimateInputFromRoute(route, {
      countryCode: "KG",
      city: "Bishkek",
    });

    expect(input.countryCode).toBe("KZ");
    expect(input.city).toBe("Almaty");
  });
});
