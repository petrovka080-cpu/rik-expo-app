import { resolveRoadEstimateScopeV4 } from "../../src/lib/estimate/v4/asphalt";
import { ROAD_SCOPE_RESOLVER_FIXTURES_120_V4 } from "./roadScopeResolver120V4.fixture";

describe("Road Scope Resolver V4 static acceptance corpus", () => {
  test("contains the required independent category counts", () => {
    const count = (group: string) => ROAD_SCOPE_RESOLVER_FIXTURES_120_V4.filter((item) => item.group === group).length;
    expect(ROAD_SCOPE_RESOLVER_FIXTURES_120_V4).toHaveLength(120);
    expect(count("explicit")).toBe(48);
    expect(count("ambiguous")).toBe(24);
    expect(count("negation")).toBe(16);
    expect(count("collision")).toBe(16);
    expect(count("kyrgyz")).toBe(8);
    expect(count("mixed")).toBe(8);
    expect(new Set(ROAD_SCOPE_RESOLVER_FIXTURES_120_V4.map((item) => item.id)).size).toBe(120);
  });

  test.each(ROAD_SCOPE_RESOLVER_FIXTURES_120_V4)("$id", (fixture) => {
    const result = resolveRoadEstimateScopeV4({
      originalText: fixture.text,
      requestedCatalogWorkId: "asphalt_paving",
    });
    expect(result.resolverStatus).toBe(fixture.status);
    expect(result.selectedScopeId).toBe(fixture.scope);
  });
});
