import { GLOBAL_WORK_CATEGORIES, GLOBAL_WORK_TYPE_DEFINITIONS, resolveGlobalWorkType } from "../../src/lib/ai/globalEstimate";

describe("global work type resolver", () => {
  it("covers the production ontology and resolves normal construction aliases", () => {
    expect(GLOBAL_WORK_CATEGORIES).toContain("flooring");
    expect(GLOBAL_WORK_CATEGORIES).toContain("electrical");
    expect(GLOBAL_WORK_TYPE_DEFINITIONS.length).toBeGreaterThanOrEqual(40);
    expect(resolveGlobalWorkType({ text: "дай смету на укладку ламината 100 м²", language: "ru" }).workKey).toBe("laminate_laying");
    expect(resolveGlobalWorkType({ text: "Drywall installation 500 sq ft", language: "en" }).workKey).toBe("drywall_partition");
  });

  it("keeps bathroom turnkey tile requests out of standalone waterproofing", () => {
    expect(
      resolveGlobalWorkType({
        text: "estimate cost for bathroom turnkey tile waterproofing plumbing residential scenario alpha 107 sq_m",
        language: "en",
      }).workKey,
    ).toBe("bathroom_tile_full");
  });

  it("does not treat fireproofing as roof repair through substring fallback", () => {
    const falseRoofMatches = [
      "estimate cost for waterproofing insulation fireproofing primer membrane mastic residential phase1 gamma 52 sq_m",
      "estimate cost for fireproof coating 40 sq_m",
    ].map((text) => resolveGlobalWorkType({ text, language: "en" }));

    for (const resolved of falseRoofMatches) {
      expect(resolved.workKey).not.toBe("roof_repair");
      expect(resolved.category).not.toBe("roofing");
    }
    expect(resolveGlobalWorkType({ text: "estimate cost for roofing repair 70 sq_m", language: "en" }).workKey).toBe("roof_repair");
  });

  it("keeps waterproofing surface context explicit", () => {
    const generic = resolveGlobalWorkType({ text: "estimate cost for waterproofing 100 sq_m", language: "en" });
    const bathroom = resolveGlobalWorkType({
      text: "estimate cost for bathroom wet room waterproofing primer membrane mastic 30 sq_m",
      language: "en",
    });

    expect(generic.workKey).not.toBe("bathroom_waterproofing");
    expect(generic.workKey).not.toBe("waterproofing_bathroom");
    expect(bathroom.workKey).toBe("bathroom_waterproofing");
  });

  it("keeps micro hydro water intake infrastructure out of generic water supply plumbing", () => {
    const hydroIntake = resolveGlobalWorkType({
      text: "estimate cost for micro hydro water intake concrete channel infrastructure retail phase2 domain 11 variant 001 residential alpha 92 sq_m",
      language: "en",
    });
    const waterSupplyIntake = resolveGlobalWorkType({
      text: "estimate cost for water intake 100 linear_m",
      language: "en",
    });

    expect(hydroIntake.workKey).toBe("micro_hydro_preparation");
    expect(hydroIntake.category).toBe("concrete");
    expect(waterSupplyIntake.workKey).toBe("water_intake");
    expect(waterSupplyIntake.category).toBe("plumbing");
  });

  it("does not treat noise screen foundations as crane service through substring aliases", () => {
    const screenFoundation = resolveGlobalWorkType({
      text: "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442 \u044d\u043a\u0440\u0430\u043d\u0430 3 \u043e\u0431\u044a\u0435\u043a\u0442; \u0442\u0438\u043f \u0440\u0430\u0431\u043e\u0442: \u0448\u0443\u043c\u043e\u0437\u0430\u0449\u0438\u0442\u043d\u044b\u0435 \u044d\u043a\u0440\u0430\u043d\u044b",
      language: "ru",
    });
    const craneService = resolveGlobalWorkType({
      text: "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043a\u0440\u0430\u043d 1 \u0441\u043c\u0435\u043d\u0430",
      language: "ru",
    });

    expect(screenFoundation.workKey).toBe("foundation_concrete");
    expect(screenFoundation.category).toBe("foundation");
    expect(screenFoundation.workKey).not.toBe("crane_service");
    expect(craneService.workKey).toBe("crane_service");
  });

  it("keeps composite roadworks and bridge contexts ahead of conflicting single aliases", () => {
    const industrialRoadworks = resolveGlobalWorkType({
      text: "estimate cost for roadworks site grading base compaction industrial earthworks and site preparation package alpha 40 sqm",
      language: "en",
    });
    const bridgeCulvert = resolveGlobalWorkType({
      text: "estimate cost for concrete bridge culvert installation residential small bridges and culverts package alpha 84 sqm",
      language: "en",
    });

    expect(industrialRoadworks).toMatchObject({
      workKey: "road_subgrade",
      category: "roadworks",
      confidence: "high",
    });
    expect(bridgeCulvert).toMatchObject({
      workKey: "bridge_construction",
      category: "concrete",
      confidence: "high",
    });
  });
});
